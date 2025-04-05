"""
基础Agent抽象类
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """
    基础Agent抽象类，所有Agent都应继承此类
    """
    
    def __init__(self, name: str):
        """
        初始化Agent
        
        Args:
            name: Agent名称
        """
        self.name = name
        
    @abstractmethod
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], medical_record: str = "", **kwargs) -> Dict[str, Any]:
        """
        处理用户消息的抽象方法，所有子类必须实现此方法
        
        Args:
            session_id: 会话ID
            message_id: 消息ID
            user_message: 用户消息内容
            chat_history: 聊天历史
            medical_record: 医疗记录
            **kwargs: 其他参数
            
        Returns:
            处理结果
        """
        pass 