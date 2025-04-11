"""
User Focus Management Agent
用户关注点管理Agent
Responsible for tracking and managing user focus points in conversations
负责追踪和管理用户在对话中的关注点
"""
import asyncio
import json
import logging
from typing import Dict, List, Tuple, Any, Optional
from app.utils.json_parser import JsonParser
from app.services.dashscope_service import DashscopeService

# Configure logging / 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DashScope service / 初始化DashScope服务
dashscope_service = DashscopeService()

class FocusAgent:
    """
    User Focus Agent
    用户关注点Agent
    Used for analyzing and tracking user focus points during conversations
    用于分析和追踪用户在对话过程中的关注点
    """
    
    async def process(self, 
                     session_id: int, 
                     message_id: int, 
                     user_message: str, 
                     chat_history: List[Dict[str, str]], 
                     focus_points: Dict[str, List[List[int]]] = None) -> Dict[str, Any]:
        """
        Process user message and update focus points
        处理用户消息并更新关注点
        
        Args:
            session_id: Session ID / 会话ID
            message_id: Message ID / 消息ID
            user_message: User message content / 用户消息内容
            chat_history: Chat history / 聊天历史
            focus_points: Current focus points dictionary / 当前的关注点字典
            
        Returns:
            Updated focus points dictionary / 更新后的关注点字典
        """
        start_time = asyncio.get_event_loop().time()
        logger.info(f"Start processing user focus points: session_id={session_id}, message_id={message_id}")
        
        try:
            # Initialize focus points dictionary / 初始化关注点字典
            if focus_points is None:
                focus_points = {}
                
            # Build system prompt / 构建系统提示
            system_prompt = self._build_system_prompt(focus_points)
            
            # Build messages list / 构建消息列表
            messages = self._build_messages(user_message, chat_history)
            
            # Use LLM to analyze user focus points / 使用LLM分析用户关注点
            response = await dashscope_service.chat_with_prompt(messages=messages, system_prompt=system_prompt)
            
            if not response or "response" not in response:
                logger.error("LLM response is invalid")
                return {"focus_points": focus_points, "current_focus": None}
                
            # Parse LLM response / 解析LLM响应
            try:
                llm_response = response["response"].strip()
                focus_result = JsonParser(llm_response, "json")
                
                # Get current focus and whether it's a new focus / 获取当前关注点和是否是新关注点
                current_focus = focus_result.get("current_focus", "")
                is_new_focus = focus_result.get("is_new_focus", False)
                
                # Update focus points dictionary / 更新关注点字典
                if current_focus:
                    if current_focus not in focus_points:
                        focus_points[current_focus] = []
                        
                    # Check if a new interval needs to be added / 检查是否需要添加新的区间
                    if not focus_points[current_focus] or focus_points[current_focus][-1][1] != message_id:
                        focus_points[current_focus].append([message_id, message_id])
                    else:
                        # Update the end ID of the last interval / 更新最后一个区间的结束ID
                        focus_points[current_focus][-1][1] = message_id
                
                end_time = asyncio.get_event_loop().time()
                logger.info(f"User focus points processing completed: time={end_time - start_time:.2f} seconds")
                
                return {
                    "focus_points": focus_points,
                    "current_focus": current_focus,
                    "is_new_focus": is_new_focus
                }
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM response: {e}")
                return {"focus_points": focus_points, "current_focus": None, "error": str(e)}
                
        except Exception as e:
            logger.error(f"Error occurred while processing user focus points: {str(e)}")
            return {"focus_points": focus_points, "current_focus": None, "error": str(e)}
    
    def _build_system_prompt(self, focus_points: Dict[str, List[List[int]]]) -> str:
        """
        Build system prompt / 构建系统提示
        
        Args:
            focus_points: Current focus points dictionary / 当前的关注点字典
            
        Returns:
            System prompt / 系统提示
        """
        existing_focus = ", ".join(focus_points.keys()) if focus_points else "None"
        
        return f"""You are a specialized AI assistant for analyzing user focus points.
Your task is to determine what the user's current message focus point is, which can be one of the existing focus points or a new focus point.

Current existing focus points: {existing_focus}

Please analyze the user's current message and return the following information in JSON format:
1. What is the user's current message focus point?
2. Is this a new focus point or a continuation of an existing focus point?

Return format:
{{
  "current_focus": "Focus point content (brief description, 3-5 characters)",
  "is_new_focus": true/false
}}

Note:
- Focus points should be medical-related themes, such as a certain disease, symptom, treatment method, etc.
- If the user's message does not have a clear focus point, please return an empty string as current_focus
- Do not explain your analysis process, just return the result in JSON format
"""
    
    def _build_messages(self, user_message: str, chat_history: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Build messages list / 构建消息列表
        
        Args:
            user_message: User message content / 用户消息内容
            chat_history: Chat history / 聊天历史
            
        Returns:
            Messages list / 消息列表
        """
        # Get recent conversation context (up to 3 rounds) / 获取最近的对话上下文（最多3轮）
        recent_context = chat_history
        
        # If the current message is already in the history, no need to add extra / 如果当前消息已经在历史记录中，则不需要额外添加
        if not recent_context or recent_context[-1].get("role") != "user" or recent_context[-1].get("content") != user_message:
            recent_context.append({"role": "user", "content": user_message})
            
        return recent_context 