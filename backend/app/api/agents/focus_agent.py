"""
用户关注点管理Agent
负责追踪和管理用户在对话中的关注点
"""
import asyncio
import json
import logging
from typing import Dict, List, Tuple, Any, Optional
from app.utils.json_parser import JsonParser
from app.services.dashscope_service import DashscopeService

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化DashScope服务
dashscope_service = DashscopeService()

class FocusAgent:
    """
    用户关注点Agent
    用于分析和追踪用户在对话过程中的关注点
    """
    
    async def process(self, 
                     session_id: int, 
                     message_id: int, 
                     user_message: str, 
                     chat_history: List[Dict[str, str]], 
                     focus_points: Dict[str, List[List[int]]] = None) -> Dict[str, Any]:
        """
        处理用户消息并更新关注点
        
        Args:
            session_id: 会话ID
            message_id: 消息ID
            user_message: 用户消息内容
            chat_history: 聊天历史
            focus_points: 当前的关注点字典
            
        Returns:
            更新后的关注点字典
        """
        start_time = asyncio.get_event_loop().time()
        logger.info(f"开始处理用户关注点: session_id={session_id}, message_id={message_id}")
        
        try:
            # 初始化关注点字典
            if focus_points is None:
                focus_points = {}
                
            # 构建系统提示
            system_prompt = self._build_system_prompt(focus_points)
            
            # 构建用户消息
            messages = self._build_messages(user_message, chat_history)
            
            # 使用LLM分析用户关注点
            response = await dashscope_service.chat_with_prompt(messages=messages, system_prompt=system_prompt)
            
            if not response or "response" not in response:
                logger.error("LLM响应无效")
                return {"focus_points": focus_points, "current_focus": None}
                
            # 解析LLM响应
            try:
                llm_response = response["response"].strip()
                focus_result = JsonParser(llm_response, "json")
                
                # 获取当前关注点和是否是新关注点
                current_focus = focus_result.get("current_focus", "")
                is_new_focus = focus_result.get("is_new_focus", False)
                
                # 更新关注点字典
                if current_focus:
                    if current_focus not in focus_points:
                        focus_points[current_focus] = []
                        
                    # 检查是否需要添加新的区间
                    if not focus_points[current_focus] or focus_points[current_focus][-1][1] != message_id:
                        focus_points[current_focus].append([message_id, message_id])
                    else:
                        # 更新最后一个区间的结束ID
                        focus_points[current_focus][-1][1] = message_id
                
                end_time = asyncio.get_event_loop().time()
                logger.info(f"用户关注点处理完成: 耗时={end_time - start_time:.2f}秒")
                
                return {
                    "focus_points": focus_points,
                    "current_focus": current_focus,
                    "is_new_focus": is_new_focus
                }
                
            except json.JSONDecodeError as e:
                logger.error(f"解析LLM响应失败: {e}")
                return {"focus_points": focus_points, "current_focus": None, "error": str(e)}
                
        except Exception as e:
            logger.error(f"处理用户关注点时发生错误: {str(e)}")
            return {"focus_points": focus_points, "current_focus": None, "error": str(e)}
    
    def _build_system_prompt(self, focus_points: Dict[str, List[List[int]]]) -> str:
        """
        构建系统提示
        
        Args:
            focus_points: 当前的关注点字典
            
        Returns:
            系统提示
        """
        existing_focus = ", ".join(focus_points.keys()) if focus_points else "无"
        
        return f"""你是一个专门分析用户关注点的AI助手。
你的任务是判断用户当前消息的关注点是什么，可以是已有关注点中的一个，也可以是新的关注点。

当前已有的关注点：{existing_focus}

请分析用户的当前消息，并以JSON格式返回以下信息：
1. 用户当前消息的关注点是什么？
2. 这是一个新的关注点还是已有关注点的延续？

返回格式：
{{
  "current_focus": "关注点内容（简短描述，3-5个字）",
  "is_new_focus": true/false
}}

注意：
- 关注点应该是医疗相关的主题，如某种疾病、症状、治疗方法等
- 如果用户消息没有明确的关注点，请返回空字符串作为current_focus
- 不要解释你的分析过程，直接返回JSON格式的结果
"""
    
    def _build_messages(self, user_message: str, chat_history: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        构建消息列表
        
        Args:
            user_message: 用户消息内容
            chat_history: 聊天历史
            
        Returns:
            消息列表
        """
        # 获取最近的对话上下文（最多3轮）
        recent_context = chat_history
        
        # 如果当前消息已经在历史记录中，则不需要额外添加
        if not recent_context or recent_context[-1].get("role") != "user" or recent_context[-1].get("content") != user_message:
            recent_context.append({"role": "user", "content": user_message})
            
        return recent_context 