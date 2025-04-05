"""
医疗信息查询Agent (Agent2)
负责根据用户问题生成查询关键词，并从丁香园和默沙东爬取医疗知识信息
"""
from typing import Dict, Any, List
import logging
import json
from app.api.agents.base_agent import BaseAgent
from app.services.dashscope_service import DashscopeService
from app.services.crawler_service import MedicalCrawlerService
from app.utils.json_parser import JsonParser
# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MedicalInfoAgent(BaseAgent):
    """
    医疗信息查询Agent
    负责关键词提取和医疗信息爬取
    """
    
    def __init__(self):
        """
        初始化医疗信息Agent
        """
        super().__init__("medical_info_agent")
        self.llm_service = DashscopeService()
        self.crawler_service = MedicalCrawlerService(self.llm_service)
        
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], medical_record: str = "", **kwargs) -> Dict[str, Any]:
        """
        处理用户消息，提取关键词并查询医疗信息
        
        Args:
            session_id: 会话ID
            message_id: 消息ID
            user_message: 用户消息内容
            chat_history: 聊天历史
            medical_record: 医疗记录
            **kwargs: 其他参数
            
        Returns:
            处理结果，包含关键词和医疗信息
        """
        try:
            # 第一步：提取关键词
            keywords = await self._extract_keywords(user_message, chat_history, medical_record)
            print(f"keyword{keywords}")
            # 第二步：使用关键词搜索医疗信息
            medical_info = await self.crawler_service.search_medical_info(keywords, user_message, medical_record)

            return {
                "keywords": keywords,
                "raw_results": medical_info.get("raw_results", [])
            }
                
        except Exception as e:
            logger.error(f"医疗信息Agent处理异常: {str(e)}")
            return {
                "keywords": [],
                "medical_info": "无法获取相关医疗信息，请稍后再试。",
                "raw_results": []
            }
    
    async def _extract_keywords(self, user_message: str, chat_history: List[Dict[str, str]], medical_record: str) -> List[str]:
        """
        从用户消息中提取医疗搜索关键词
        
        Args:
            user_message: 用户消息
            chat_history: 聊天历史
            medical_record: 医疗记录
            
        Returns:
            关键词列表
        """
        # 构建提示词
        system_prompt =f"""
        用户病例：
        {medical_record}
        你是一个医疗关键词提取助手。根据用户的问题和用户病例，提取出3-5个可以用于搜索医疗信息的关键词。
        这些关键词应该是医学术语，能够准确反映用户咨询的医疗问题。
        请以JSON格式返回结果：
        {{
            "keywords": ["关键词1", "关键词2", "关键词3"]
        }}
        
        只返回JSON格式内容，不要有其他任何解释,也不要回复用户问题，只提取关键词。每个关键词应该是1-3个字的医学术语。
        """
        
        # 构建消息
        messages = chat_history[-3:] if chat_history else []  # 使用最近3条聊天记录
        messages.append({"role": "user", "content": user_message})

        # # 添加病例信息（如果有）
        # if medical_record:
        #     system_prompt += f"\n\n患者病例信息概要：\n{medical_record}"
        
        # 调用LLM
        response = await self.llm_service.chat_with_prompt(messages, system_prompt,temperature=0.1)

        if not response.get("success", False):
            logger.error(f"关键词提取LLM调用失败: {response.get('error')}")
            # 返回默认关键词
            return self._get_default_keywords(user_message)
        
        # 解析LLM返回的结果
        try:
            result_text = response["response"]
            result = JsonParser(result_text,'json')
            print(f"关键字提取结果！！！！！{result}")
            keywords = result.get("keywords", [])
            
            # 确保至少返回一个关键词
            if not keywords:
                keywords = self._get_default_keywords(user_message)
                
            return keywords
        except json.JSONDecodeError:
            logger.error(f"解析关键词提取结果失败: {result_text}")
            return self._get_default_keywords(user_message)
    
    def _get_default_keywords(self, user_message: str) -> List[str]:
        """
        获取默认关键词（从用户消息中提取的主要词语）
        
        Args:
            user_message: 用户消息
            
        Returns:
            默认关键词列表
        """
        # 简单的分词，提取最长的3个词作为关键词
        words = user_message.split()
        words.sort(key=len, reverse=True)
        
        keywords = words[:3] if len(words) >= 3 else words
        
        # 如果还是没有关键词，使用一些通用医疗术语
        if not keywords:
            keywords = ["症状", "治疗", "诊断"]
            
        return keywords

    async def select(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], medical_record: str = "", **kwargs) -> Dict[str, Any]:
        """
        处理用户消息，识别意图并生成联想问题
        
        Args:
            session_id: 会话ID
            message_id: 消息ID
            user_message: 用户消息内容
            chat_history: 聊天历史
            medical_record: 医疗记录
            **kwargs: 其他参数
            
        Returns:
            处理结果，包含意图和联想问题
        """
        try:
            # 构建提示词
            system_prompt = """
            你是一个医疗对话意图分析助手，你的任务是：
            1. 分析用户的问题，识别出用户的医疗相关意图
            2. 根据用户意图和对话历史，生成3个相关的后续问题，这些问题应该是用户可能会问的合理问题
            请以JSON格式返回结果：
            {
                "intent": "用户意图的简洁描述",
                "follow_up_questions": ["问题1", "问题2", "问题3"]
            }
            只返回JSON格式内容，不要有其他任何解释。
            """
            
            # 构建消息，包含用户当前消息和聊天历史
            messages = chat_history[-5:] if chat_history else []  # 使用最近5条聊天记录
            messages.append({"role": "user", "content": user_message})
                     
            # 调用LLM
            response = await self.llm_service.chat_with_prompt(messages, system_prompt)
            
            if not response.get("success", False):
                logger.error(f"意图Agent LLM调用失败: {response.get('error')}")
                return {
                    "intent": "未能识别意图",
                    "follow_up_questions": []
                }
            
            # 解析LLM返回的结果
            try:
                result_text = response["response"]
                result = JsonParser(result_text,'json')
                print("intent成功解析为json")
                intent = result.get("intent", "未能识别意图")
                follow_up_questions = result.get("follow_up_questions", [])
                print("相关问题")
                print(follow_up_questions)
                
                # 确保返回3个问题
                while len(follow_up_questions) < 3:
                    follow_up_questions.append(f"您还有其他关于{intent}的问题吗？")
                
                return {
                    "intent": intent,
                    "follow_up_questions": follow_up_questions[:3]  # 最多返回3个问题
                }
            except json.JSONDecodeError:
                logger.error(f"解析意图Agent结果失败: {result_text}")
                return {
                    "intent": "未能识别意图",
                    "follow_up_questions": [
                        "您能再描述一下您的症状吗？",
                        "您最近是否有进行过相关检查？",
                        "您有什么其他健康问题需要咨询吗？"
                    ]
                }
                
        except Exception as e:
            logger.error(f"意图Agent处理异常: {str(e)}")
            return {
                "intent": "处理异常",
                "follow_up_questions": [
                    "您能再描述一下您的症状吗？",
                    "您最近是否有进行过相关检查？",
                    "您有什么其他健康问题需要咨询吗？"
                ]
            }  