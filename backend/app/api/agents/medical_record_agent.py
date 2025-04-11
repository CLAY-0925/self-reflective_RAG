"""
Medical Record Agent (Agent3)
Responsible for summarizing and updating patient medical records
"""
from typing import Dict, Any, List
import logging
import json
from app.api.agents.base_agent import BaseAgent
from app.services.dashscope_service import DashscopeService
from app.services.cache_service import SharedCache
from app.utils.json_parser import JsonParser
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MedicalRecordAgent(BaseAgent):
    """
    Medical Record Agent
    Responsible for summarizing and updating patient medical records
    """
    
    def __init__(self):
        """
        Initialize Medical Record Agent
        """
        super().__init__("medical_record_agent")
        self.llm_service = DashscopeService()
        self.cache = SharedCache()
        
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], medical_record: str = "", **kwargs) -> Dict[str, Any]:
        """
        Process user message, extract and update medical record information
        
        Args:
            session_id: Session ID
            message_id: Message ID
            user_message: User message content
            chat_history: Chat history
            medical_record: Current medical record
            **kwargs: Other parameters
            
        Returns:
            Processing result containing updated medical record information
        """
        try:
            # Extract and update medical record information
            updated_record = await self._update_medical_record(user_message, chat_history, medical_record)
            
            # Update medical record in cache
            self.cache.update_medical_record(session_id, updated_record)
            
            return {
                "medical_record": updated_record
            }
            
        except Exception as e:
            logger.error(f"Medical Record Agent processing error: {str(e)}")
            return {
                "medical_record": medical_record,
                "error": str(e)
            }
    
    async def update_medical_record(self, session_id: int, record_content: str = None) -> str:
        """
        Update medical record for a session
        
        Args:
            session_id: Session ID
            record_content: New record content
            
        Returns:
            Updated medical record
        """
        try:
            # Get current medical record from cache
            current_record = self.cache.get_medical_record(session_id)
            
            if record_content:
                # If new content is provided, update directly
                self.cache.update_medical_record(session_id, record_content)
                return record_content
            
            # If no new content, return current record
            return current_record or ""
            
        except Exception as e:
            logger.error(f"Update medical record error: {str(e)}")
            return ""
    
    async def _update_medical_record(self, user_message: str, chat_history: List[Dict[str, str]], current_record: str) -> str:
        """
        Extract and update medical record information from user messages
        
        Args:
            user_message: User input message
            chat_history: Conversation history
            current_record: Current medical record
            
        Returns:
            Updated medical record information
        """
        # Build prompts
        system_prompt = """
        You are a medical record keeper.
        """
        user_prompt = f"""
        # Task:
        1. Extract potentially relevant medical information from user questions/descriptions (symptoms, medical history, medications, etc.)
        2. Organize this information into structured medical records
        3. If existing records exist, update them rather than creating new ones
        4. "pending_clues" tracks items needing clarification/verification
        5. Calculate completeness scores for information collection and differential diagnosis
        Maintain concise records including only medically significant information.
        
        # Messages
        {chat_history}
        "user": "{user_message}"
        """
        
        # Add current record if exists
        if current_record:
            user_prompt += f"\n# Current medical record:\n{current_record}\n\nPlease update this record with new user information."
        
        user_prompt += f"""
        \nOutput JSON format medical record. Values in confirmed_info and pending_clues must use str format. Stage values must use int format. No additional output:
        {{
        "confirmed_info": {{
            "Basic_Info": "Age, gender etc.",
            "Chief_Complaint": "Patient's primary concern/reason for visit",
            "Symptom_Description": "Describe each symptom using medically appropriate terminology",
            "History_of_Present_Illness": "Detailed symptom description including onset time, nature, progression, associated symptoms",
            "Past_Medical_History": "Disease history, surgeries, allergies",
            "Medications": "Current medications and drug allergies",
            "Family_History": "Relevant family medical history"
        }},
        "pending_clues": {{
            "Symptoms_to_Confirm": "",
            "Details_Needing_Clarification": ""
        }},
        "stage": {{
            "Medical record progress": "0-100",  
            "Diagnosis and treatment progress": "0-100"
        }}
        }}
        """
        messages =[] 
        messages.append({"role": "user", "content": user_prompt})
        # 调用LLM
        response = await self.llm_service.chat_with_prompt(messages, system_prompt,temperature=0.1)
        
        if not response.get("success", False):
            logger.error(f"medical_profile_LLM_fail: {response.get('error')}")
            return current_record  # 返回当前记录不变
        
        # 获取LLM返回的病例更新结果
        try:
            updated_record = JsonParser(response["response"], "json")
            # 将字典转换为字符串
            return json.dumps(updated_record, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to parse medical record update results: {str(e)}")
            return current_record
 