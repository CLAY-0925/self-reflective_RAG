"""
AI Summary Service
AI摘要服务
"""
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
# Configure logging / 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
COOKIE = os.getenv('COOKIE')

class AiSummaryService:
    """
    AI Summary Service
    AI摘要服务
    """
    
    def __init__(self, llm_service: DashscopeService):
        """
        Initialize summary service / 初始化摘要服务
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
        self.llm_service = llm_service  # Ensure dependency injection / 确保注入依赖

    async def asyco_crawler(self, selected_links=[], medical_record='', message='', args=''):
        """
        Asynchronous crawler for multiple links / 多链接异步爬虫
        
        Args:
            selected_links: List of links to crawl / 要爬取的链接列表
            medical_record: Medical record information / 医疗记录信息
            message: User message / 用户消息
            args: Additional arguments / 额外参数
            
        Returns:
            List of crawled and summarized results / 爬取和摘要结果列表
        """
        tasks = []
        for i, link_info in enumerate(selected_links):
            # Generate random delay between 1-2 seconds, accumulating sequentially / 生成1-2秒的随机延迟，且按顺序累加
            delay = i * (1 + random.random())
            tasks.append(self.fetch_and_summarize(link_info, delay, medical_record, message, args))
        
        # Execute all tasks concurrently / 并发执行所有任务
        results = await asyncio.gather(*tasks)
        final_results = []
        
        for i, result in enumerate(results):
            # Add to final results list / 添加到最终结果列表
            if isinstance(result, dict):
                if "title" not in result and selected_links[i].get('tittle'):
                    result["title"] = selected_links[i].get('tittle', 'Unknown')
                final_results.append(result)
            else:
                # If result is not a dictionary, which shouldn't happen, but we handle it for robustness / 如果返回的不是字典，这是不应该发生的，但为了健壮性我们处理这种情况
                final_results.append({
                    "title": selected_links[i].get('tittle', 'Unknown'),
                    "content": f"Invalid processing result: {str(result)[:100]}"
                })
        
        return final_results

    async def summarize_ai(self, content, medical_record, message, args):
        """
        Generate AI summary of content / 生成内容的AI摘要
        
        Args:
            content: Content to summarize / 要摘要的内容
            medical_record: Medical record information / 医疗记录信息
            message: User message / 用户消息
            args: Additional arguments / 额外参数
            
        Returns:
            List of summarized results / 摘要结果列表
        """
        system_prompt = f"""
        Patient case:
        {medical_record}
        Reference content:
        {content}
        Patient question:
        {message}
        Task requirements:
        1. Analyze the relevance between patient's question, patient's case (if any) and reference content
        2. For each relevant content, **generate concise themes** as JSON keys (e.g., "Treatment Plan", "Contraindications", etc.)
        3. Summarize the value part in 3-4 sentences, total word count < 250
        4. Return empty list [] if no relevant content

        Output format example:
        [
            {{"Key Theme 1": "Summary content 1"}},
            {{"Key Theme 2": "Summary content 2"}}
        ]
        """
        print(f"Executing {args}: summary task started at: {time.strftime('%X')}")
        # Build messages / 构建消息
        messages = [{"role": "user", "content": message}]

        # Initialize result_text to ensure it always has a value / 初始化result_text，确保在任何情况下都有值
        result_text = "[]"
        
        try:
            # Call LLM / 调用LLM
            response = await self.llm_service.chat_with_prompt(messages, system_prompt)
            
            print("User's question")
            print(messages)
            
            # Ensure response is not None and contains "response" key / 确保response不为None且包含"response"键
            if response and isinstance(response, dict) and "response" in response:
                result_text = response["response"]
                print("Summary content")
                print(response)
            else:
                logger.warning("LLM returned invalid or empty result")
                return []
            
            # Parse JSON result / 解析JSON结果
            results = JsonParser(result_text, "list")  
            # results contains filtered documents / results包含了筛选的四篇文档
            if not results or len(results) == 0:
                logger.error("Content summary is empty")
                return []
            
            return results
        except Exception as e:
            print(f"Summary result: {result_text}")
            logger.error(f"Failed to parse AI summary result: {result_text}, {str(e)}")
            # Return empty list instead of throwing exception, so we can continue processing other links / 返回空列表而不是抛出异常，这样可以继续处理其他链接
            return []
        finally:
            print(f"Executing {args}: summary task ended at: {time.strftime('%X')}")

    async def fetch_and_summarize(self, link_info, delay, medical_record, message, args):
        """
        Fetch and summarize content from a single link / 爬取单个链接内容
        
        Args:
            link_info: Link information / 链接信息
            delay: Delay before fetching / 爬取前的延迟
            medical_record: Medical record information / 医疗记录信息
            message: User message / 用户消息
            args: Additional arguments / 额外参数
            
        Returns:
            Dictionary containing fetched and summarized content / 包含爬取和摘要内容的字典
        """
        start_time = time.time()
        try:
            # Random delay to avoid anti-crawling / 随机延迟以避免反爬
            await asyncio.sleep(delay)
            link = link_info.get('link', '')
            title = link_info.get('tittle', '')
            
            if not link:
                return {"title": title, "content": "Invalid link", "source": link}
            
            print(f"Starting full content crawl: {title}, delay: {delay:.2f} seconds")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(link, headers=self.headers, timeout=10) as response:
                    if response.status != 200:
                        return {"title": title, "content": f"Crawl failed: HTTP status code {response.status}", "source": link}
                    
                    html_content = await response.text()
            
            # Parse webpage content / 解析网页内容
            soup = BeautifulSoup(html_content, 'html.parser')

            async def content(soup, type):
                extracted_content = {}
                try:
                    async def content_crawler(element='', extracted_content={}, title_num=1, type=None):
                        if type == 'drug':
                            if not isinstance(element, NavigableString):
                                content = ''
                                for elementchiled in element.contents:
                                    if elementchiled.name is not None and 'h' in elementchiled.name:
                                        title = elementchiled.name
                                        text = elementchiled.get_text(strip=True)
                                        title_num += 1
                                        extracted_content[f'h{title_num}Title:{text}'] = {}

                                    elif elementchiled.name == 'div' and elementchiled.attrs.get('class', []) == ['page_content__zHHQZ']:
                                        content += elementchiled.get_text(strip=True) + "\n"
                                        extracted_content[f'h{title_num}Title:{text}']["content"] = content

                        else:
                            if not isinstance(element, NavigableString):
                                content = ''
                                for elementchiled in element.contents:
                                    if elementchiled.name is not None and 'h' in elementchiled.name:
                                        text = elementchiled.get_text(strip=True)
                                        title_num += 1
                                        extracted_content[f'h{title_num}Title:{text}'] = {}
                                        extracted_content = extracted_content[f'h{title_num}Title:{text}']

                                    elif elementchiled.name == 'div' and not elementchiled.attrs.get('data-menu-index', []) and not elementchiled.attrs.get('class', []):
                                        content += elementchiled.get_text(strip=True) + "\n"
                                        extracted_content["content"] = content
                                    else:
                                        await content_crawler(elementchiled, extracted_content, title_num, 'case')

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
    # test
    link = [{'tittle': '头痛', 'content': '）烧灼嘴综合征（十）新发每日持续性头痛（二）药物过量性头痛（十二）持续性特发性面痛II.继发性头痛（三）缘于物质戒断的头痛（十三）中枢性神经病理性疼痛', 'link': 'https://drugs.dxy.cn//pc/clinicalDecision/6D5sjZxY3wxprKz2BNAN9A==?ky=%E5%A4%B4%E7%97%9B%20%E8%84%91%E9%83%A8%20%E7%96%BC%E7%97%9B#%E5%9F%BA%E7%A1%80%E7%9F%A5%E8%AF%86'}, 
                {'tittle': '紧张型头痛', 'content': '的特征是反复发作的轻至中度疼痛。头痛通常是双侧的，有时被描述为"帽带"样分布，疼痛也可能发生在前额、后脑区域和颈部。头痛的特征还包括', 'link': 'https://drugs.dxy.cn//pc/clinicalDecision/mepepmhB5jBflIp1QbRR86cPsmepepmg==?ky=%E5%A4%B4%B8%E7%97%9B%20%E8%84%91%E9%83%A8%20%E7%96%BC%E7%97%9B#%E5%9F%BA%E7%A1%80%E7%9F%A5%E8%AF%86'}, 
                {'tittle': '偏头痛', 'content': '因的过量摄入、精神疾病、基线头痛频率水平较高、药物过度使用、生活变故、 头颈部损伤、皮肤痛觉超敏、女性、共患其他疼痛障碍疾病等。发病机制', 'link': 'https://drugs.dxy.cn//pc/clinicalDecision/ChQPD03JVJRFCU0DhvaxCQ==?ky=%E5%A4%B4%E7%97%9B%20%E8%84%91%E9%83%A8%20%E7%96%BC%E7%97%9B#%E5%9F%BA%E7%A1%80%E7%9F%A5%E8%AF%86'}]
    
    summary_service = AiSummaryService()
    results = asyncio.run(summary_service.asyco_crawler(link,'case'))

    # with open("crawler.json", "w", encoding="utf-8") as f:
    #     json.dump(results, f, ensure_ascii=False, indent=4)  # indent 美化格式
            