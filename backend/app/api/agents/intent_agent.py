"""
Intent Recognition Agent (Agent1)
意图识别Agent (Agent1)
Responsible for identifying user intent and generating follow-up questions
负责识别用户意图和生成联想问题
"""
from typing import Dict, Any, List
import logging
import json
from app.api.agents.base_agent import BaseAgent
from app.services.dashscope_service import DashscopeService
from app.utils.json_parser import JsonParser
# Configure logging / 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IntentAgent(BaseAgent):
    """
    Intent Recognition Agent
    意图识别Agent
    Responsible for identifying user intent and generating follow-up questions
    负责识别用户意图和生成联想问题
    """
    
    def __init__(self):
        """
        Initialize Intent Agent
        初始化意图Agent
        """
        super().__init__("intent_agent")
        self.llm_service = DashscopeService(use_fast_model=True)
        
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], medical_record: str = "", **kwargs) -> Dict[str, Any]:
        """
        Process user message, identify intent and generate follow-up questions
        处理用户消息，识别意图并生成联想问题
        
        Args:
            session_id: Session ID / 会话ID
            message_id: Message ID / 消息ID
            user_message: User message content / 用户消息内容
            chat_history: Chat history / 聊天历史
            medical_record: Medical record / 医疗记录
            **kwargs: Other parameters / 其他参数
            
        Returns:
            Processing result containing intent and follow-up questions / 处理结果，包含意图和联想问题
        """
        try:
            # Build prompt / 构建提示词
            system_prompt = """
            You are a medical dialogue intent analysis assistant, your tasks are:
            1. Analyze the user's question, identify the user's medical-related intent
            2. Based on the user's intent and dialogue history, generate 3 related follow-up questions, these should be reasonable questions that users might ask
            
            Please return the result in JSON format:
            {
                "intent": "Brief description of user intent",
                "follow_up_questions": ["Question 1", "Question 2", "Question 3"]
            }
            
            Return only JSON format content, do not include any other explanations.
            """
            
            # Build messages, including user's current message and chat history / 构建消息，包含用户当前消息和聊天历史
            messages = chat_history[-5:] if chat_history else []  # Use the last 5 chat records / 使用最近5条聊天记录
            messages.append({"role": "user", "content": user_message})
                     
            # Call LLM / 调用LLM
            response = await self.llm_service.chat_with_prompt(messages, system_prompt)
            if not response.get("success", False):
                logger.error(f"Intent Agent LLM call failed: {response.get('error')}")
                return {
                    "intent": "Failed to identify intent",
                    "follow_up_questions": []
                }
            
            # Parse LLM response / 解析LLM返回的结果
            try:
                result_text = response["response"]
                result = JsonParser(result_text,'json')
                print("Intent successfully parsed to JSON")
                intent = result.get("intent", "Failed to identify intent")
                follow_up_questions = result.get("follow_up_questions", [])
                print("Related questions")
                print(follow_up_questions)
                
                # Ensure 3 questions are returned / 确保返回3个问题
                while len(follow_up_questions) < 3:
                    follow_up_questions.append(f"Do you have any other questions about {intent}?")
                
                return {
                    "intent": intent,
                    "follow_up_questions": follow_up_questions[:3]  # Return at most 3 questions / 最多返回3个问题
                }
            except json.JSONDecodeError:
                logger.error(f"Failed to parse Intent Agent result: {result_text}")
                return {
                    "intent": "Failed to identify intent",
                    "follow_up_questions": [
                        "Could you describe your symptoms in more detail?",
                        "Have you had any related examinations recently?",
                        "Do you have any other health concerns to discuss?"
                    ]
                }
                
        except Exception as e:
            logger.error(f"Intent Agent processing exception: {str(e)}")
            return {
                "intent": "Processing exception",
                "follow_up_questions": [
                    "Could you describe your symptoms in more detail?",
                    "Have you had any related examinations recently?",
                    "Do you have any other health concerns to discuss?"
                ]
            } 