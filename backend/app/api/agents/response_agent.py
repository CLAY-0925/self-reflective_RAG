"""
Response Generation Agent (Agent4)
Responsible for combining medical record information and crawled medical knowledge to provide final responses to patient questions
"""
from typing import Dict, Any, List
import logging
from app.api.agents.base_agent import BaseAgent
from app.services.dashscope_service import DashscopeService
import json
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResponseAgent(BaseAgent):
    """
    Response Generation Agent
    Responsible for generating final responses
    """
    
    def __init__(self):
        """
        Initialize Response Agent
        """
        super().__init__("response_agent")
        self.llm_service = DashscopeService()
        
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], 
                     medical_record: str = "", intent_result: Dict = None, medical_info_result: Dict = None, 
                     **kwargs) -> Dict[str, Any]:
        """
        Process user message and generate final response
        
        Args:
            session_id: Session ID
            message_id: Message ID
            user_message: User message content
            chat_history: Chat history
            medical_record: Medical record
            intent_result: Intent Agent processing result
            medical_info_result: Medical Info Agent processing result
            **kwargs: Other parameters
            
        Returns:
            Processing result containing response content and recommended questions
        """
        try:
            # Get intent and follow-up questions
            intent = "Unknown intent"
            follow_up_questions = []
            
            if intent_result:
                intent = intent_result.get("intent", "Unknown intent")
                follow_up_questions = intent_result.get("follow_up_questions", [])
            
            # Get medical information
            medical_info = ""
            if medical_info_result:
                medical_info = medical_info_result
            
            # Generate response
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
            logger.error(f"Response Agent processing error: {str(e)}")
            return {
                "response": "I'm sorry, I cannot answer your question at the moment. Could you please rephrase your question?",
                "follow_up_questions": []
            }
    
    async def _generate_response(self, user_message: str, chat_history: List[Dict[str, str]], 
                                medical_record: str, intent: str, medical_info: str) -> str:
        """
        Generate final response
        
        Args:
            user_message: User message
            chat_history: Chat history
            medical_record: Medical record
            intent: User intent
            medical_info: Medical information
            
        Returns:
            Generated response content
        """
        # Build prompt
        system_prompt = ""
        if intent and intent != "Unknown intent":
            system_prompt += f"\n\nCurrent user intent: {intent}"
            
        if medical_record:
            system_prompt += f"\n\nPatient medical record:\n{medical_record}"
            
        if medical_info:
            print(f"Medical knowledge used for final response:\n{medical_info},type:{type(medical_info)}")
            medical_info = self.process_medical_data(medical_info)

            system_prompt += f"\n\nRelevant medical knowledge:\n{medical_info}"
            
        system_prompt +="""
        You are a professional medical consultant. Your responses should provide clear and accurate medical advice based on the following information:

        **Available Information:**
        1. Patient's questions and chat history  
        2. Patient's medical records (e.g., lab tests, medical history)  
        3. Relevant medical knowledge from internet search, including disease and medication information
        4. Patient's intent (consultation/diagnosis/medication guidance, etc.)  

        **Response Requirements:**

        1. Diagnosis should start with the most common and mild possibilities ("common conditions first" principle)
        2. Only consider serious conditions when there are clear indications
        3. Avoid directly mentioning serious disease names unless symptoms strongly match
        4. Follow medical principles, maintain professionalism without causing excessive anxiety

        **Thinking Process (Chain-of-Thought Reasoning):**  
        Please think in the following logical order:  

        ### **1. Information Gathering**  
        - **Chief Complaint**: Summarize the patient's core issue (e.g., "cough for 3 days with yellow sputum").  
        - **Key Clues**: List known information (e.g., "normal temperature, no chest pain").  
        - **Missing Information**: Check `pending_clues` to identify needed key information (e.g., "smoking history? blood in sputum?").  

        ### **2. Initial Analysis (Hypothesis Generation)**  
        - **Possible Causes**: Based on available information, list 2-3 most likely diagnoses, starting with common, mild causes (e.g., "allergic rhinitis, sinusitis"). Only consider other possibilities when there are clear warning signs.    

        ### **3. Recommendations (Action Plan)**  
        - **Medication Advice** (Read relevant medical knowledge about medications, if suitable, recommend medication usage):  
        - Medication name.  
        - Usage method (e.g., "500mg, every 8 hours, 7-day course").  
        - Precautions (e.g., "may cause gastrointestinal reactions, take after meals").
        - **Test Recommendations** (if needed):  
        - Test items  
        - Test purpose 
        - **Diagnostic Suggestions** (only when information completeness ≥60%):  
        - Give most likely diagnosis in 1 sentence.  
        - Explain reasons.  
        - **Information to Confirm**:  
        - Select 1-2 most critical questions from `pending_clues` (e.g., "allergy history? symptoms worse at night?").  

        ### **4. Safety Reminders**  
        - Must include the following reminders:  
        - "If [dangerous symptoms, such as difficulty breathing, high fever] occur, seek medical attention immediately."  
        - "This advice cannot replace face-to-face medical consultation, please follow clinical doctor's judgment."  

        **Final response format example:**  
        1. **Understanding Your Symptoms**: Your main issue is cough with yellow sputum, no fever.  
        2. **Possible Causes**:  
        - Bacterial bronchitis  
        - Allergic rhinitis with secondary cough (need to confirm if there's nasal itching/sneezing)  
        3. **Recommendations**:  
        - May try amoxicillin (500mg, 3 times daily), observe for 3 days.
        - Recommend complete blood count to assess infection.
        - Need to confirm: smoking history? blood in sputum?  
        4. **Reminder**: If chest pain or shortness of breath occurs, seek emergency care immediately.  
        """
        # Build messages
        messages = []
        
        # Add chat history
        if chat_history:
            messages.extend(chat_history[-5:])  # Use last 5 chat records
            
        # Add current message
        messages.append({"role": "user", "content": user_message})
        
        # Add additional information to prompt
        
        # Call LLM
        response = await self.llm_service.chat_with_prompt(messages, system_prompt)
        print('Response below:'+ '\n')
        print(response)
        if not response.get("success", False):
            logger.error(f"Response generation LLM call failed: {response.get('error')}")
            return "I'm sorry, I cannot answer your question at the moment. Could you please rephrase your question?"
        
        # Get LLM response result

        result = response["response"]
        prompt = """
        This is the chat history
        {chat_history}
        This is the LLM generated response, think about whether it's reasonable
        {result}
        Please provide your response
        Format as follows, only provide your optimized response:
        {{new response content}}
"""
        return result 
    

    def process_medical_data(self, json_data):
        """
        Process medical data by combining content and maintaining source information.
        
        Args:
            json_data (dict): Input JSON data containing medical information
            
        Returns:
            list: List of dictionaries containing processed data
        """
        if not isinstance(json_data, dict):
            raise ValueError("Input must be a dictionary")

        processed_results = []
        
        for result in json_data.get('raw_results', []):
            try:
                # Check if source exists and contains title
                if not isinstance(result.get('source'), dict):
                    continue
                    
                title = result.get('source', {}).get('title', '')
                if not title:  # Skip if title is empty
                    continue

                entry = {'title': title}
                content = result.get('content', [])

                # Process different types of content
                if isinstance(content, list):
                    content_parts = []
                    for content_item in content:
                        if isinstance(content_item, dict):
                            for key, value in content_item.items():
                                if value:  # Only add non-empty values
                                    content_parts.append(f"{key}: {value}")
                    entry['content'] = ';'.join(content_parts)
                    
                elif isinstance(content, dict):
                    content_parts = []
                    
                    def process_nested_dict(d):
                        if not isinstance(d, dict):
                            return
                        
                        for key, value in d.items():
                            if isinstance(value, dict):
                                if 'content' in value and value['content']:  # Ensure content is not empty
                                    title = key.split(':')[-1].strip()
                                    content = value['content'].strip()
                                    content_parts.append(f"{title}{content}")
                                else:
                                    process_nested_dict(value)
                    
                    process_nested_dict(content)
                    entry['content'] = ''.join(content_parts)
                
                # Only add entries with content
                if entry.get('content'):
                    processed_results.append(entry)
                    
            except Exception as e:
                print(f"Warning: Skipping entry due to error: {str(e)}")
                continue     

        str =  ""
        for i, item in enumerate(processed_results, 1):
            str += f"Entry #{i}\n"
            str += f"Title: {item['title']}\n"
            str += f"Content: {item['content']}\n"
            str += "-" * 50 + "\n"


        return str
