"""
Base Agent Abstract Class
基础Agent抽象类
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
import logging

# Configure logging / 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """
    Base Agent abstract class, all agents should inherit from this class
    基础Agent抽象类，所有Agent都应继承此类
    """
    
    def __init__(self, name: str):
        """
        Initialize agent
        初始化Agent
        
        Args:
            name: Agent name / Agent名称
        """
        self.name = name
        
    @abstractmethod
    async def process(self, session_id: int, message_id: int, user_message: str, chat_history: List[Dict[str, str]], medical_record: str = "", **kwargs) -> Dict[str, Any]:
        """
        Abstract method for processing user messages, all subclasses must implement this method
        处理用户消息的抽象方法，所有子类必须实现此方法
        
        Args:
            session_id: Session ID / 会话ID
            message_id: Message ID / 消息ID
            user_message: User message content / 用户消息内容
            chat_history: Chat history / 聊天历史
            medical_record: Medical record / 医疗记录
            **kwargs: Other parameters / 其他参数
            
        Returns:
            Processing result / 处理结果
        """
        pass 