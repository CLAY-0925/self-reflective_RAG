"""
病例总结Agent (Agent3)
负责总结和更新患者的病例信息
"""
from typing import Dict, Any, List
import logging
import json
from app.api.agents.base_agent import BaseAgent
from app.services.dashscope_service import DashscopeService
from app.services.cache_service import SharedCache
from app.utils.json_parser import JsonParser
# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MedicalRecordAgent(BaseAgent):
    """
    病例总结Agent
    负责总结和更新患者的病例信息
    """
    
    def __init__(self):
        """
        初始化病例Agent
        """
        super().__init__("medical_record_agent")
        self.llm_service = DashscopeService()
        self.cache = SharedCache()
        
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], medical_record: str = "", **kwargs) -> Dict[str, Any]:
        """
        处理用户消息，提取并更新病例信息
        
        Args:
            session_id: 会话ID
            message_id: 消息ID
            user_message: 用户消息内容
            chat_history: 聊天历史
            medical_record: 当前的医疗记录
            **kwargs: 其他参数
            
        Returns:
            处理结果，包含更新后的病例信息
        """
        try:
            # 提取并更新病例信息
            updated_record = await self._update_medical_record(user_message, chat_history, medical_record)
            
            # 更新缓存中的病例信息
            self.cache.update_medical_record(session_id, updated_record)
            
            return {
                "previous_record": medical_record,
                "updated_record": updated_record
            }
                
        except Exception as e:
            logger.error(f"病例Agent处理异常: {str(e)}")
            return {
                "previous_record": medical_record,
                "updated_record": medical_record  # 发生异常时不更新
            }
    
    async def update_medical_record(self, session_id: int, record_content: str = None) -> str:
        """
        更新医疗记录（外部API调用接口）
        
        Args:
            session_id: 会话ID
            record_content: 新的记录内容
            
        Returns:
            更新后的医疗记录
        """
        try:
            # 如果提供了直接的记录内容，则直接更新
            if record_content:
                self.cache.update_medical_record(session_id, record_content)
                return record_content
            
            # 否则，从聊天历史中提取
            chat_history = self.cache.get_chat_history(session_id)
            current_record = self.cache.get_medical_record(session_id)

            
            if not chat_history:
                return current_record
            
            # 使用最近的用户消息更新病例
            user_messages = [msg for msg in chat_history if msg["role"] == "user"]
            if user_messages:
                latest_user_message = user_messages[-1]["content"]
                updated_record = await self._update_medical_record(latest_user_message, chat_history, current_record)
                self.cache.update_medical_record(session_id, updated_record)
                return updated_record
            
            return current_record
                
        except Exception as e:
            logger.error(f"更新医疗记录异常: {str(e)}")
            return self.cache.get_medical_record(session_id)
    
    async def _update_medical_record(self, user_message: str, chat_history: List[Dict[str, str]], current_record: str) -> str:
        """
        从用户消息中提取并更新病例信息
        
        Args:
            user_message: 用户消息
            chat_history: 聊天历史
            current_record: 当前的医疗记录
            
        Returns:
            更新后的病例信息
        """
        # 构建提示词
        system_prompt = """
        你是一个医疗病例记录员。
        """
        user_prompt = f"""
        # 任务：
        1. 从用户的问题和描述中提取出可能与其病情相关的信息，如症状、病史、用药情况等。
        2. 将这些信息整合成一份结构化的病例记录。
        3. 如果已有病例记录，请在其基础上进行更新，而不是重新创建。  
        4. "pending_clues"记录需要进一步澄清/验证的线索。
        5. 计算信息收集完整程度、鉴别诊断完备程度。  
        请维持记录的简洁性，只记录与医疗相关的重要信息。
        # 消息
        {chat_history}
        "user": "{user_message}"
        """
        # 构建消息

        
        
        # 如果已有病例信息，将其添加到提示中
        if current_record:
            user_prompt += f"\n# 当前病例记录：\n{current_record}\n\n请基于此记录和用户的新信息，更新病例记录。"
        
        user_prompt += f"""
        \n输出json格式病例，confirmed_info、pending_clues中的值只能使用str格式，stage中的值只能使用int格式，不做额外输出：
        {{
        "confirmed_info": {{
            "基本信息": "年龄,性别等",
            "主诉": "患者的主要不适或来诊原因",
            "症状描述": "对患者的每个症状用一个医学领域相对专业的词汇描述",
            "现病史": "症状的详细描述,包括发病时间、症状的性质、变化、伴随症状等",
            "既往史": "疾病史,手术史,过敏史",
            "用药情况": "正在使用的药物和过敏药物",
            "家族史": "家族中的相关疾病情况"
        }},
        "pending_clues": {{
            "待确认症状": "",
            "需澄清细节": ""
        }},
        "stage": {{
            "信息收集": "0-100",  
            "鉴别诊断": "0-100"
        }}
        }}
        """
        messages =[] 
        messages.append({"role": "user", "content": user_prompt})
        # 调用LLM
        print(f"病例总结的prompt！！！！！{user_prompt}")
        response = await self.llm_service.chat_with_prompt(messages, system_prompt,temperature=0.1)
        
        if not response.get("success", False):
            logger.error(f"病例更新LLM调用失败: {response.get('error')}")
            return current_record  # 返回当前记录不变
        
        # 获取LLM返回的病例更新结果
        try:
            updated_record = JsonParser(response["response"], "json")
            print(f"updated_record！！！！！{updated_record}")
            # 将字典转换为字符串
            return json.dumps(updated_record, ensure_ascii=False)
        except Exception as e:
            logger.error(f"解析病例更新结果失败: {str(e)}")
            return current_record

 