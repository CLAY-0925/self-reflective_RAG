"""
响应生成Agent (Agent4)
负责结合病例信息、爬取到的医疗知识信息，针对患者问题给出最终回复
"""
from typing import Dict, Any, List
import logging
from app.api.agents.base_agent import BaseAgent
from app.services.dashscope_service import DashscopeService

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResponseAgent(BaseAgent):
    """
    响应生成Agent
    负责生成最终回复
    """
    
    def __init__(self):
        """
        初始化响应Agent
        """
        super().__init__("response_agent")
        self.llm_service = DashscopeService()
        
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], 
                     medical_record: str = "", intent_result: Dict = None, medical_info_result: Dict = None, 
                     **kwargs) -> Dict[str, Any]:
        """
        处理用户消息，生成最终回复
        
        Args:
            session_id: 会话ID
            message_id: 消息ID
            user_message: 用户消息内容
            chat_history: 聊天历史
            medical_record: 医疗记录
            intent_result: 意图Agent的处理结果
            medical_info_result: 医疗信息Agent的处理结果
            **kwargs: 其他参数
            
        Returns:
            处理结果，包含回复内容和推荐问题
        """
        try:
            # 获取意图和联想问题
            intent = "未知意图"
            follow_up_questions = []
            
            if intent_result:
                intent = intent_result.get("intent", "未知意图")
                follow_up_questions = intent_result.get("follow_up_questions", [])
            
            # 获取医疗信息
            medical_info = ""
            if medical_info_result:
                medical_info = medical_info_result.get("medical_info", "")
            
            # 生成回复
            response_content = await self._generate_response(
                user_message, 
                chat_history, 
                medical_record, 
                intent, 
                medical_info
            )
            
            return {
                "response": response_content,
                "follow_up_questions": follow_up_questions
            }
                
        except Exception as e:
            logger.error(f"响应Agent处理异常: {str(e)}")
            return {
                "response": "抱歉，我暂时无法回答您的问题。请问您能重新描述一下您的问题吗？",
                "follow_up_questions": []
            }
    
    async def _generate_response(self, user_message: str, chat_history: List[Dict[str, str]], 
                                medical_record: str, intent: str, medical_info: str) -> str:
        """
        生成最终回复
        
        Args:
            user_message: 用户消息
            chat_history: 聊天历史
            medical_record: 医疗记录
            intent: 用户意图
            medical_info: 医疗信息
            
        Returns:
            生成的回复内容
        """
        # 构建提示词
        system_prompt = """
        你是一个专业的医学顾问，你的回答需要基于以下信息来为患者提供清晰、准确的医疗建议：

        1. 患者的问题和聊天历史
        2. 患者的医疗记录
        3. 互联网搜索得到的相关医疗知识

        请遵循以下原则：
        1. 回答要专业、准确且易于理解
        2. 态度友善、耐心，使用礼貌的语言
        3. 不要自行诊断，而是提供教育性的医疗信息
        4. 必要时建议患者咨询医生
        5. 回答要基于搜索到的权威医疗知识，但请用自己的话语总结
        6. 不要直接复制粘贴搜索结果，而是整合信息提供连贯的回答
        7. 回答应该针对用户当前的问题，不要偏离主题
        
        请不要在回复中提及你是基于什么信息回答的，直接给出专业的回答即可。
        """
        
        # 构建消息
        messages = []
        
        # 添加聊天历史
        if chat_history:
            messages.extend(chat_history[-5:])  # 使用最近5条聊天记录
            
        # 添加当前消息
        messages.append({"role": "user", "content": user_message})
        
        # 补充附加信息到提示词中
        if intent and intent != "未知意图":
            system_prompt += f"\n\n用户当前意图：{intent}"
            
        if medical_record:
            system_prompt += f"\n\n患者病例记录：\n{medical_record}"
            
        if medical_info:
            system_prompt += f"\n\n相关医疗知识：\n{medical_info}"
        
        # 调用LLM
        response = await self.llm_service.chat_with_prompt(messages, system_prompt)
        print('以下是response：'+ '\n')
        print(response)
        if not response.get("success", False):
            logger.error(f"响应生成LLM调用失败: {response.get('error')}")
            return "抱歉，我暂时无法回答您的问题。请问您能重新描述一下您的问题吗？"
        
        # 获取LLM返回的结果

        result = response["response"]
        
        return result 