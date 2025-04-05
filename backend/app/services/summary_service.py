import requests
from bs4 import BeautifulSoup, NavigableString
import logging
from typing import List, Dict, Any
import os
import time
import asyncio
from app.utils.json_parser import JsonParser
from app.services.dashscope_service import DashscopeService
import random
import aiohttp
# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
COOKIE = os.getenv('COOKIE')

class AiSummaryService():
    def __init__(self, llm_service :DashscopeService):
            """
            初始化爬虫服务
            """
            self.headers = {
            'cache-control': 'max-age=0',
            'Cookie': COOKIE,
            'sec-ch-ua':'"Not)A;Brand";v="99", "Microsoft Edge";v="127", "Chromium";v="127"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0'
            }

            self.novip_headers = {
            'cache-control': 'max-age=0',
            'sec-ch-ua':'"Not)A;Brand";v="99", "Microsoft Edge";v="127", "Chromium";v="127"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0'
            }
            self.llm_service = llm_service  # 确保注入依赖

    async def asyco_crawler(self, selected_links = [], medical_record = '', message = '', args = ''):
        tasks = []
        for i, link_info in enumerate(selected_links):
            # 生成1-2秒的随机延迟，且按顺序累加
            delay = i * (1 + random.random())
            tasks.append(self.fetch_and_summarize(link_info, delay, medical_record, message, args))
        
        # 并发执行所有任务
        results = await asyncio.gather(*tasks)
        final_results = []
        
        for i, result in enumerate(results):
            # 添加到最终结果列表
            if isinstance(result, dict):
                if "title" not in result and selected_links[i].get('tittle'):
                    result["title"] = selected_links[i].get('tittle', '未知')
                final_results.append(result)
            else:
                # 如果返回的不是字典，这是不应该发生的，但为了健壮性我们处理这种情况
                final_results.append({
                    "title": selected_links[i].get('tittle', '未知'),
                    "content": f"处理结果无效: {str(result)[:100]}"
                })
        
        return final_results

    async def summarize_ai(self, content , medical_record, message, args):
        system_prompt =f"""
        用户病例：
        {medical_record}
        参考文献：
        {content}
        患者问题：
        {message}
        任务要求：
        1. 分析患者问题、患者病例（如果有）与参考文献的关联性
        2. 根据user的提问，为每个相关内容**自主生成简明主题**作为JSON键（如"治疗方案"、"禁忌症"等）
        3. 值部分用3-4句话总结，总字数<250字
        4. 若无相关内容则返回空列表[]

        输出格式示例：
        [
            {{"关键主题1": "总结内容1"}},
            {{"关键主题2": "总结内容2"}}
        ]
        """
        print(f"执行{args}:总结任务started at: {time.strftime('%X')}")
        # 构建消息
        messages = [{"role": "user", "content": message }]

        # # 添加病例信息（如果有）
        # if medical_record:
        #     system_prompt += f"\n\n患者病例信息概要：\n{medical_record}"
        
        # 初始化result_text，确保在任何情况下都有值
        result_text = "[]"
        
        try:
            # 调用LLM
            response = await self.llm_service.chat_with_prompt(messages, system_prompt)
            
            print("用户的提问")
            print(messages)
            
            # 确保response不为None且包含"response"键
            if response and isinstance(response, dict) and "response" in response:
                result_text = response["response"]
                print("总结的内容")
                print(response)
            else:
                logger.warning("LLM返回结果无效或为空")
                return []
            
            # 解析JSON结果
            results = JsonParser(result_text, "list")  
            #results包含了筛选的四篇文档
            if not results or len(results) == 0:
                logger.error(f"内容总结为空")
                return []
            
            return results
        except Exception as e:
            print(f"总结结果 ：{result_text}")
            logger.error(f"解析内容总结AI的结果失败: {result_text}, {str(e)}")
            # 返回空列表而不是抛出异常，这样可以继续处理其他链接
            return []
        finally:
            print(f"执行{args}:总结任务ended at: {time.strftime('%X')}")

    async def fetch_and_summarize(self, link_info, delay, medical_record, message, args):
        start_time = time.time()
        # print(f"执行{link_info.get('tittle', '')}总结任务started at: {time.strftime('%X')}")
        """爬取单个链接内容"""
        try:
            # 随机延迟以避免反爬
            await asyncio.sleep(delay)
            link = link_info.get('link', '')
            title = link_info.get('tittle', '')
            
            if not link:
                return {"title": title, "content": "链接无效", "source": link}
            
            print(f"开始完整内容爬取: {title}, 延迟: {delay:.2f}秒")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(link, headers=self.headers, timeout=10) as response:
                    if response.status != 200:
                        return {"title": title, "content": f"爬取失败：HTTP状态码 {response.status}", "source": link}
                    
                    html_content = await response.text()
            
            # 2. 解析网页内容
            soup = BeautifulSoup(html_content, 'html.parser')

            async def content(soup, type):
                extracted_content = {}
                try:
                    async def content_crawler( element='', extracted_content={}, title_num = 1, type = None):
                        if type == 'drug':
                            if  not isinstance(element, NavigableString):
                                content = ''
                                for elementchiled in element.contents:
                                    if elementchiled.name is not None and 'h' in elementchiled.name:
                                        title = elementchiled.name
                                        text = elementchiled.get_text(strip=True)
                                        title_num += 1
                                        extracted_content[f'h{title_num}标题:{text}'] = {}

                                    elif elementchiled.name == 'div' and elementchiled.attrs.get('class', []) == ['page_content__zHHQZ']:

                                        content +=  elementchiled.get_text(strip=True) + "\n"

                                        extracted_content[f'h{title_num}标题:{text}']["content"] = content

                        else:
                            if  not isinstance(element, NavigableString):
                                content = ''
                                for elementchiled in element.contents:
                                    if elementchiled.name is not None and 'h' in elementchiled.name:
                                        text = elementchiled.get_text(strip=True)
                                        title_num += 1
                                        extracted_content[f'h{title_num}标题:{text}'] = {}
                                        extracted_content = extracted_content[f'h{title_num}标题:{text}']

                                    elif elementchiled.name == 'div' and not elementchiled.attrs.get('data-menu-index', []) and not elementchiled.attrs.get('class', []):

                                        content +=  elementchiled.get_text(strip=True) + "\n"

                                        extracted_content["content"] = content
                                    else:
                                        await content_crawler(elementchiled, extracted_content , title_num , 'case')

                    title_divs = soup.find('h1')
                    title = title_divs .get_text(strip=True) if title_divs  else "未找到标题"
                    extracted_content[f'h1总标题:{title}'] = {}
                    
                    if type == "drug":
                        content_div = soup.find_all('div', class_='page_item__3NVRC')

                        for item in content_div:
                            await content_crawler( item, extracted_content[f'h1总标题:{title}'],1,'drug')
                        #print(extracted_content)
                    elif type == "case":
                        content_div = soup.find('div', class_='page_fields__ScN7A')
                        await content_crawler( content_div, extracted_content[f'h1总标题:{title}'],1,'case')
                except Exception as e:
                    logger.error(f"内容解析错误: {str(e)}")
                    return {"error": f"内容解析错误: {str(e)}"}
                finally:
                    return extracted_content 

            end_time = time.time()
            extracted_content = {}
            extracted_content = await content(soup=soup, type = args)
            print(f"结束完整内容爬取：{title}, 共用时: {end_time - start_time:.2f}秒")
            
            # 检查是否有解析错误
            if isinstance(extracted_content, dict) and "error" in extracted_content:
                return {"content": f"内容解析错误: {extracted_content['error']}", "source": link_info}
            
            # 尝试总结内容
            try:
                contents = await self.summarize_ai(extracted_content, medical_record, message, args)
                return {
                    "content": contents,
                    "source": link_info
                }
            except Exception as e:
                logger.error(f"内容总结错误: {str(e)}")
                return {
                    "content": f"内容总结错误: {str(e)}",
                    "source": link_info
                }
            
        except asyncio.TimeoutError as e:
            logger.error(f"爬取超时: {str(e)}")
            return {"title": link_info.get('tittle', '未知'), "content": "爬取超时", "source": link_info.get('link', '')}
        
        except Exception as e:
            logger.error(f"爬取或摘要生成异常: {str(e)}")
            return {"title": link_info.get('tittle', '未知'), "content": f"处理异常: {str(e)[:100]}", "source": link_info.get('link', '')}
        
if __name__ == "__main__":
    # 运行主协程
    link = [{'tittle': '头痛', 'content': '）烧灼嘴综合征（十）新发每日持续性头痛（二）药物过量性头痛（十二）持续性特发性面痛II.继发性头痛（三）缘于物质戒断的头痛（十三）中枢性神经病理性疼痛', 'link': 'https://drugs.dxy.cn//pc/clinicalDecision/6D5sjZxY3wxprKz2BNAN9A==?ky=%E5%A4%B4%E7%97%9B%20%E8%84%91%E9%83%A8%20%E7%96%BC%E7%97%9B#%E5%9F%BA%E7%A1%80%E7%9F%A5%E8%AF%86'}, 
                {'tittle': '紧张型头痛', 'content': '的特征是反复发作的轻至中度疼痛。头痛通常是双侧的，有时被描述为"帽带"样分布，疼痛也可能发生在前额、后脑区域和颈部。头痛的特征还包括', 'link': 'https://drugs.dxy.cn//pc/clinicalDecision/mepepmhB5jBflIp1QbRR86cPsmepepmg==?ky=%E5%A4%B4%B8%E7%97%9B%20%E8%84%91%E9%83%A8%20%E7%96%BC%E7%97%9B#%E5%9F%BA%E7%A1%80%E7%9F%A5%E8%AF%86'}, 
                {'tittle': '偏头痛', 'content': '因的过量摄入、精神疾病、基线头痛频率水平较高、药物过度使用、生活变故、 头颈部损伤、皮肤痛觉超敏、女性、共患其他疼痛障碍疾病等。发病机制', 'link': 'https://drugs.dxy.cn//pc/clinicalDecision/ChQPD03JVJRFCU0DhvaxCQ==?ky=%E5%A4%B4%E7%97%9B%20%E8%84%91%E9%83%A8%20%E7%96%BC%E7%97%9B#%E5%9F%BA%E7%A1%80%E7%9F%A5%E8%AF%86'}]
    
    summary_service = AiSummaryService()
    results = asyncio.run(summary_service.asyco_crawler(link,'case'))

    # with open("crawler.json", "w", encoding="utf-8") as f:
    #     json.dump(results, f, ensure_ascii=False, indent=4)  # indent 美化格式
    print(results)
            