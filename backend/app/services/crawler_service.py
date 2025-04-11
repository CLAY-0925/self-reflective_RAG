"""
Medical Information Crawler Service
医疗信息爬虫服务
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
from app.services.summary_service import AiSummaryService
import random
import aiohttp

# Configure logging / 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
COOKIE = os.getenv('COOKIE')

class MedicalCrawlerService:
    """
    Medical Information Crawler Service
    医疗信息爬虫服务
    """
    
    def __init__(self, llm_service: DashscopeService):
        """
        Initialize crawler service / 初始化爬虫服务
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
        self.llm_service = llm_service  # Ensure dependency injection, using singleton pattern / 确保注入依赖,使用单例模式
        self.summary_service = AiSummaryService(llm_service)
        
    async def search_dingxiang(self, keywords: List[str], max_results: int = 3) -> List[Dict[str, Any]]:
        """
        Search medical information from DXY / 从丁香园搜索医疗信息
        
        Args:
            keywords: Search keyword list / 搜索关键词列表
            max_results: Maximum number of results to return / 最大返回结果数
            
        Returns:
            Search result list / 搜索结果列表
        """
        results = []
        keyword_str = ' '.join(keywords)
        
        try:
            # DXY search URL / 丁香园搜索URL
            search_url = f"https://www.dxy.cn/search/index?keyword={keyword_str}"
            
            response = requests.get(search_url, headers=self.headers, timeout=10)
            if response.status_code != 200:
                logger.error(f"DXY search request failed: {response.status_code}")
                return results
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Parse search results / 解析搜索结果
            search_results = soup.select('.search-result-list .item')
            
            for i, result in enumerate(search_results):
                if i >= max_results:
                    break
                    
                title_element = result.select_one('.title')
                summary_element = result.select_one('.summary')
                url_element = result.select_one('a')
                
                if title_element and summary_element and url_element:
                    title = title_element.text.strip()
                    summary = summary_element.text.strip()
                    url = url_element.get('href', '')
                    
                    results.append({
                        'source': 'DXY',
                        'title': title,
                        'summary': summary,
                        'url': url
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"DXY search exception: {str(e)}")
            return results
            
    async def search_msd(self, keywords: List[str], max_results: int = 3) -> List[Dict[str, Any]]:
        """
        Search medical information from MSD Manual / 从默沙东医学手册搜索医疗信息
        
        Args:
            keywords: Search keyword list / 搜索关键词列表
            max_results: Maximum number of results to return / 最大返回结果数
            
        Returns:
            Search result list / 搜索结果列表
        """
        results = []
        keyword_str = ' '.join(keywords)
        
        try:
            # MSD Manual search URL / 默沙东搜索URL
            search_url = f"https://www.msdmanuals.cn/search?query={keyword_str}"
            
            response = requests.get(search_url, headers=self.headers, timeout=10)
            if response.status_code != 200:
                logger.error(f"MSD Manual search request failed: {response.status_code}")
                return results
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Parse search results / 解析搜索结果
            search_results = soup.select('.search-results .result-item')
            
            for i, result in enumerate(search_results):
                if i >= max_results:
                    break
                    
                title_element = result.select_one('.result-item-title')
                summary_element = result.select_one('.result-item-snippet')
                url_element = result.select_one('a')
                
                if title_element and summary_element and url_element:
                    title = title_element.text.strip()
                    summary = summary_element.text.strip()
                    url = url_element.get('href', '')
                    
                    results.append({
                        'source': 'MSD Manual',
                        'title': title,
                        'summary': summary,
                        'url': url
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"MSD Manual search exception: {str(e)}")
            return results
            
    async def search_medical_info(self, keywords: List[str], user_message, medical_record) -> Dict[str, Any]:
        """
        Comprehensive medical information search / 综合搜索医疗信息
        
        Args:
            keywords: Search keyword list / 搜索关键词列表
            
        Returns:
            Search results / 搜索结果
        """
        # Parallel search from two sources / 并行搜索两个来源
        dingxiang_results = await self.dingxiang_search_key(keywords, user_message, medical_record)
        print(f"DXY results: {dingxiang_results}")
        msd_results = await self.search_msd(keywords)

        return {
            'raw_results': dingxiang_results
        } 
    
    async def dingxiang_search_crawler(self, url, type):
        """
        Sub-call of dingxiang_search_key for crawling search results / dingxiang_search_key的子调用,爬取检索结果
            
        Returns:
            Crawled results / 爬取结果
        """
        print(f"执行{type}爬取任务started at: {time.strftime('%X')}")
        content = []
        try:
            session = requests.Session()
            response = session.get(url, headers=self.novip_headers)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
            #爬取临床决策检索结果
            if type == "case":
            # 找到内容容器
                content_div = soup.find_all('a', class_='TextItem_link__b9JOr')
                if content_div:
                    for link in content_div:
                        extracted_content = ""
                        extracted_tittle = ""
                        href = 'https://drugs.dxy.cn/' + link.attrs.get('href', [])
                        for child in link:
                            if 'TextItem_box-title___sGxi' in child.attrs.get('class', []):
                                extracted_tittle += '标题:' + child.get_text(strip=True)
                            else:
                                extracted_content += child.get_text(strip=True) 
                        content.append({   
                            'extracted_tittle': extracted_tittle,
                            'extracted_content':extracted_content,
                            'link':href })
            #爬取药品检索结果
            elif type == "drug":
            # 找到内容容器
                content_div = soup.find_all('a', class_='DrugsItem_link__2VsM1')
                if content_div:
                    for link in content_div:
                        extracted_content = ""
                        extracted_tittle = ""
                        href = 'https://drugs.dxy.cn' + link.attrs.get('href', [])
                        for child in link:
                            if 'DrugsItem_drugs-item-name__ttrZ7' in child.attrs.get('class', []):
                                extracted_tittle += '标题:' + child.get_text(strip=True)
                            else:
                                extracted_content += child.get_text(strip=True) 
                        content.append({ 
                            'extracted_tittle': extracted_tittle,
                            'extracted_content':extracted_content,
                            'link':href })
            return content      
        except Exception as e:
            logger.error(f"丁香园搜索异常: {str(e)}")
            return content
        finally:
            print(f"执行{type}爬取任务ended at: {time.strftime('%X')}")


    async def dingxiang_search_key(self, keys, user_message, medical_record):
        content = []
        try:
            query_word = "+".join(keys)
            
            # 第一个爬虫任务（病例）
            url_case = f'https://drugs.dxy.cn/pc/search?keyword={query_word}&type=clinicalDecision&querySpellCheck=true'
            case_data = await self.dingxiang_search_crawler(url_case, 'case')
            
            # 第一个select任务（如果有数据）

            # 等待3秒后再执行第二个爬虫
            time.sleep(2)
            
            # 第二个爬虫任务（药品）
            url_drug = f'https://drugs.dxy.cn/pc/search?keyword={query_word}&type=drug&querySpellCheck=true'
            drug_data = await self.dingxiang_search_crawler(url_drug, 'drug')
            
            # 第二个select任务（如果有数据）

            results = await asyncio.gather(self.select(case_data, medical_record, user_message, 'case'), self.select(drug_data, medical_record, user_message, 'drug'), return_exceptions=True)
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Select任务出错: {str(result)}")
                elif result:  # 只有结果非空时才处理
                    try:
                        content.extend(result)
                    except Exception as e:
                        logger.error(f"结果处理错误: {str(e)}, 结果类型: {type(result)}, 内容: {result}")

            return content

        except Exception as e:
            logger.error(f"[ERROR] 关键词检索发生未预期错误: {str(e)}")
            return content
    
    async def dingxiang_content(self,url,type):
        """
        Scrape specific content from Dingxiangyuan (a medical platform), either clinical decision support or drug information.

        Args:
            url: The target URL  
            type: Type of the link  
                drug: Drug information  
                case: Clinical decision support  

        Returns:
            string: The scraped result  
        """
        extracted_content = {}
        try:
            session = requests.Session()
            response = session.get(url, headers=self.headers)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
            # 等待页面加载完成
            # 根据需要调整等待时间
            # 获取网页内容并使用BeautifulSoup解析
            def content_crawler( element='', extracted_content={}, title_num = 1, type = None):
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
                                title = elementchiled.name
                                text = elementchiled.get_text(strip=True)
                                title_num += 1

                                extracted_content[f'h{title_num}标题:{text}'] = {}
                                extracted_content = extracted_content[f'h{title_num}标题:{text}']

                            elif elementchiled.name == 'div' and not elementchiled.attrs.get('data-menu-index', []) and not elementchiled.attrs.get('class', []):
                                content +=  elementchiled.get_text(strip=True) + "\n"

                                extracted_content["content"] = content
                            else:
                                content_crawler(elementchiled, extracted_content , title_num , 'case')

            title_divs = soup.find('h1')
            title = title_divs .get_text(strip=True) if title_divs  else "未找到标题"
            extracted_content[f'h1总标题:{title}'] = {}
            
            if type == "drug":
                content_div = soup.find_all('div', class_='page_item__3NVRC')

                for item in content_div:
                    content_crawler( item, extracted_content[f'h1总标题:{title}'],1,'drug')

            elif type == "case":
                content_div = soup.find('div', class_='page_fields__ScN7A')
                content_crawler( content_div, extracted_content[f'h1总标题:{title}'],1,'case')

        finally:
            return extracted_content  
        
    async def select(self, content,medical_record,user_message,args):
        '''
        return:[]
        
        '''
        system_prompt = f"""
        Patient Medical Record:
        {medical_record}
        Link Collection:
        {content}
        Link Filtering and Extraction Task: Given a patient's medical record and a retrieved collection of medical {args} links (provided in JSON format), 
        select the 3 most relevant disease links based on the patient's symptoms and demographic information (e.g., male, female, child, etc.). 
        Only provide the links—no explanations or additional output.

        Strictly return a list in the following format (only 3 links, no extra output):
        [
            {{"title": "Example1", "content": "Disease summary", "link": "https://example1.com" }},
            {{"title": "Example2", "content": "Disease summary", "link": "https://example2.com" }}
        ]
        """
        print(f"Executing {args} selection task started at: {time.strftime('%X')}")
        # Construct the message
        messages = [{"role": "user", "content": user_message }]

        # # 添加病例信息（如果有）
        # if medical_record:
        #     system_prompt += f"\n\n患者病例信息概要：\n{medical_record}"
        
        # 调用LLM进行链接筛选
        response = await self.llm_service.chat_with_prompt(messages, system_prompt)
        
        
        if not response.get("success", False):
            logger.error(f"关键词提取LLM调用失败: {response.get('error')}")
            # 返回默认关键词
            return []
        
        # 解析LLM返回的结果
        try:
            result_text = response["response"]
            results = JsonParser(result_text, 'list')  
            #results包含了筛选的3篇文档
            if not results  or len(results ) == 0:
                logger.error("链接筛选结果为空")
                return []

            results = results[:3]
            print(f"执行{args}选取任务ended at: {time.strftime('%X')}")
            summary_result = []
            summary_result = await self.summary_service.asyco_crawler(results, medical_record, messages, args)
                #并发的根据链接爬取四篇文档，并调用大模型为爬取内容生成摘要。

            return summary_result
        
        except Exception as e:
            print(f"挑选链接结果 ：{result_text},resultype:{type(results)}")
            logger.error(f"解析关键词提取结果失败: {result_text},{e}")
            return []
            