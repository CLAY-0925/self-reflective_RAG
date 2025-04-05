"""
意图识别Agent (Agent1)
负责识别用户意图和生成联想问题
"""
from typing import Dict, Any, List
import logging
import json
from app.api.agents.base_agent import BaseAgent
from app.services.dashscope_service import DashscopeService
from app.utils.json_parser import JsonParser
# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IntentAgent(BaseAgent):
    """
    意图识别Agent
    负责识别用户意图和生成联想问题
    """
    
    def __init__(self):
        """
        初始化意图Agent
        """
        super().__init__("intent_agent")
        self.llm_service = DashscopeService(use_fast_model=True)
        
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], medical_record: str = "", **kwargs) -> Dict[str, Any]:
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