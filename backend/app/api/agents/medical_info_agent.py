"""
Medical Information Query Agent (Agent2)
医疗信息查询Agent (Agent2)
Responsible for generating search keywords based on user questions and crawling medical knowledge from Dingxiangyuan and Merck Manual
负责根据用户问题生成查询关键词，并从丁香园和默沙东爬取医疗知识信息
"""
from typing import Dict, Any, List
import logging
import json
from app.api.agents.base_agent import BaseAgent
from app.services.dashscope_service import DashscopeService
from app.services.crawler_service import MedicalCrawlerService
from app.utils.json_parser import JsonParser

# Configure logging / 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MedicalInfoAgent(BaseAgent):
    """
    Medical Information Query Agent
    医疗信息查询Agent
    Responsible for keyword extraction and medical information crawling
    负责关键词提取和医疗信息爬取
    """
    
    def __init__(self):
        """
        Initialize Medical Information Agent
        初始化医疗信息Agent
        """
        super().__init__("medical_info_agent")
        self.llm_service = DashscopeService()
        self.crawler_service = MedicalCrawlerService(self.llm_service)
        
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], medical_record: str = "", **kwargs) -> Dict[str, Any]:
        """
        Process user message, extract keywords and query medical information
        处理用户消息，提取关键词并查询医疗信息
        
        Args:
            session_id: Session ID / 会话ID
            message_id: Message ID / 消息ID
            user_message: User message content / 用户消息内容
            chat_history: Chat history / 聊天历史
            medical_record: Medical record / 医疗记录
            **kwargs: Other parameters / 其他参数
            
        Returns:
            Processing result containing keywords and medical information / 处理结果，包含关键词和医疗信息
        """
        try:
            # Step 1: Extract keywords / 第一步：提取关键词
            keywords = await self._extract_keywords(user_message, chat_history, medical_record)
            print(f"keyword{keywords}")
            # Step 2: Search medical information using keywords / 第二步：使用关键词搜索医疗信息
            medical_info = await self.crawler_service.search_medical_info(keywords, user_message, medical_record)
            
            return {
                "keywords": keywords,
                "medical_info": medical_info
            }
            
        except Exception as e:
            logger.error(f"Medical Info Agent processing error: {str(e)}")
            return {
                "keywords": [],
                "medical_info": None,
                "error": str(e)
            }
    
    async def _extract_keywords(self, user_message: str, chat_history: List[Dict[str, str]], medical_record: str) -> List[str]:
        """
        Extract medical search keywords from user message
        从用户消息中提取医疗搜索关键词
        
        Args:
            user_message: User message / 用户消息
            chat_history: Chat history / 聊天历史
            medical_record: Medical record / 医疗记录
            
        Returns:
            List of keywords / 关键词列表
        """
        # Build system prompt / 构建提示词
        system_prompt =f"""
        User case:
        {medical_record}
        You are a medical keyword extraction assistant. Based on the user's question and user case, extract 3-5 keywords that can be used to search for medical information.
        These keywords should be medical terms, able to accurately reflect the user's medical consultation.
        Please return the result in JSON format:
        {{
            "keywords": ["Keyword1", "Keyword2", "Keyword3"]
        }}
        
        Please return only JSON format content, do not explain anything, and do not reply to user questions, just extract keywords. Each keyword should be a 1-3 character medical term.
        """
        
        # Build messages / 构建消息
        messages = chat_history[-3:] if chat_history else []  # Use the last 3 chat records
        messages.append({"role": "user", "content": user_message})

        # # Add patient case information (if any)
        # if medical_record:
        #     system_prompt += f"\n\nPatient case information summary:\n{medical_record}"
        
        # Call LLM / 调用LLM
        response = await self.llm_service.chat_with_prompt(messages, system_prompt,temperature=0.1)

        if not response.get("success", False):
            logger.error(f"Keyword extraction LLM call failed: {response.get('error')}")
            # Return default keywords / 返回默认关键词
            return self._get_default_keywords(user_message)
        
        # Parse LLM return result / 解析LLM返回的结果
        try:
            result_text = response["response"]
            result = JsonParser(result_text,'json')
            keywords = result.get("keywords", [])
            
            # Ensure at least one keyword is returned
            if not keywords:
                keywords = self._get_default_keywords(user_message)
                
            return keywords
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse keyword extraction result: {e}")
            return self._get_default_keywords(user_message)
    
    def _get_default_keywords(self, user_message: str) -> List[str]:
        """
        Get default keywords (main words extracted from user message)
        获取默认关键词（从用户消息中提取的主要词语）
        
        Args:
            user_message: User message / 用户消息
            
        Returns:
            List of default keywords / 默认关键词列表
        """
        # Simple word segmentation, extract the longest 3 words as keywords
        words = user_message.split()
        words.sort(key=len, reverse=True)
        
        keywords = words[:3] if len(words) >= 3 else words
        
        # If there are still no keywords, use some general medical terms
        if not keywords:
            keywords = ["Symptoms", "Treatment", "Diagnosis"]
            
        return keywords
    