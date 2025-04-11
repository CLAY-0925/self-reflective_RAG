"""
Shared Memory Cache Service
共享内存缓存服务，用于Agent之间共享数据
"""
import threading
from typing import Dict, List, Any, Optional
import json
import logging
import time
from sqlalchemy.orm import Session

from app.models.chat import MedicalRecord, ChatMessage, UserFocus

# Configure logging / 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SharedCache:
    """
    Shared Memory Cache Service Singleton
    共享内存缓存服务单例
    Used for sharing chat history and other data between Agents
    用于Agent之间共享聊天历史和其他数据
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SharedCache, cls).__new__(cls)
                # Initialize shared memory data structures / 初始化共享内存数据结构
                cls._instance.chat_histories = {}  # session_id -> messages list
                cls._instance.medical_records = {}  # session_id -> medical record
                cls._instance.agent_results = {}  # session_id -> {message_id -> {agent_results}}
                cls._instance.cache_timestamps = {}  # Cache timestamp records
                cls._instance.user_focus = {}  # session_id -> user focus dictionary
        return cls._instance
    
    def get_chat_history(self, session_id: int, db: Optional[Session] = None, limit: int = 10) -> List[Dict[str, str]]:
        """
        Get chat history for specified session / 获取指定会话的聊天历史
        
        Args:
            session_id: Session ID / 会话ID
            db: Database session, if provided queries database on cache miss / 数据库会话，如果提供则在缓存未命中时查询数据库
            limit: Limit number of recent messages to return / 限制返回的最近消息数量
            
        Returns:
            List of chat history messages / 聊天历史消息列表
        """
        try:
            # Check if cache has history for this session / 检查缓存是否存在该会话的历史
            if session_id not in self.chat_histories:
                # Cache miss, load from database if provided / 缓存未命中，如果提供数据库会话则从数据库加载
                if db:
                    logger.info(f"Chat history cache miss, loading from database: session_id={session_id}")
                    # Query history messages from database / 从数据库查询历史消息
                    messages = db.query(ChatMessage).filter(
                        ChatMessage.session_id == session_id
                    ).order_by(ChatMessage.created_at).all()
                    
                    # Format messages and load into cache / 格式化消息并加载到缓存
                    history = [{"role": msg.role, "content": msg.content} for msg in messages]
                    self.chat_histories[session_id] = history
                    
                    # Update cache timestamp / 更新缓存时间戳
                    self._update_cache_timestamp(f"chat_history:{session_id}")
                    
                    logger.info(f"Loaded chat history from database: session_id={session_id}, message count={len(history)}")
                else:
                    # No database session provided, return empty list / 没有提供数据库会话，返回空列表
                    return []
            
            # Return most recent limit messages / 返回最近的limit条消息
            return self.chat_histories[session_id][-limit:]
        except Exception as e:
            logger.error(f"Error getting chat history: {str(e)}")
            logger.exception(e)
            return []
    
    def add_message_to_history(self, session_id: int, role: str, content: str) -> None:
        """
        Add new message to chat history / 向聊天历史添加新消息
        
        Args:
            session_id: Session ID / 会话ID
            role: Role (user or assistant) / 角色（user或assistant）
            content: Message content / 消息内容
        """
        try:
            if session_id not in self.chat_histories:
                self.chat_histories[session_id] = []
            
            self.chat_histories[session_id].append({
                "role": role,
                "content": content
            })
            
            # Update cache timestamp / 更新缓存时间戳
            self._update_cache_timestamp(f"chat_history:{session_id}")
        except Exception as e:
            logger.error(f"Error adding message to history: {str(e)}")
    
    def get_medical_record(self, session_id: int, db: Optional[Session] = None) -> Any:
        """
        Get medical record for specified session, load from database if cache miss and database session provided / 获取指定会话的医疗记录，如果缓存未命中且提供了数据库会话，则从数据库加载
        
        Args:
            session_id: Session ID / 会话ID
            db: Database session, if provided queries database on cache miss / 数据库会话，如果提供则在缓存未命中时查询数据库
            
        Returns:
            Medical record content, format as dictionary or string / 医疗记录内容，格式为字典或字符串
        """
        try:
            # Check if cache has medical record for this session / 检查缓存是否存在该会话的医疗记录
            if session_id not in self.medical_records or not self.medical_records[session_id]:
                # Cache miss, load from database if provided / 缓存未命中，如果提供数据库会话则从数据库加载
                if db:
                    logger.info(f"Medical record cache miss, loading from database: session_id={session_id}")
                    # Query medical record from database / 从数据库查询医疗记录
                    medical_record = db.query(MedicalRecord).filter(
                        MedicalRecord.session_id == session_id
                    ).first()
                    
                    if medical_record:
                        # Load into cache / 加载到缓存
                        record_content = medical_record.record_content
                        self.medical_records[session_id] = record_content
                        
                        # Update cache timestamp / 更新缓存时间戳
                        self._update_cache_timestamp(f"medical_record:{session_id}")
                        
                        logger.info(f"Loaded medical record from database: session_id={session_id}")
                    else:
                        # No record in database, return empty record / 数据库中也没有记录，返回空记录
                        logger.info(f"No medical record in database: session_id={session_id}")
                        return {}
            
            # Return record from cache / 返回缓存中的记录
            record = self.medical_records.get(session_id, "")
            
            # If record is JSON string, try to parse as dictionary / 如果记录是JSON字符串，尝试解析为字典
            if isinstance(record, str) and record.strip():
                try:
                    parsed_record = json.loads(record)
                    return parsed_record
                except json.JSONDecodeError:
                    # Not valid JSON, return original string / 不是有效的JSON，直接返回原始字符串
                    return record
            
            return record if record else {}
        except Exception as e:
            logger.error(f"Error getting medical record: {str(e)}")
            logger.exception(e)
            return {}
    
    def update_medical_record(self, session_id: int, record_content: Any) -> None:
        """
        Update medical record / 更新医疗记录
        
        Args:
            session_id: Session ID / 会话ID
            record_content: Medical record content / 医疗记录内容
        """
        try:
            # If dictionary or list, convert to JSON string / 如果是字典或列表，转换为JSON字符串
            if isinstance(record_content, (dict, list)):
                record_content = json.dumps(record_content, ensure_ascii=False)
                
            self.medical_records[session_id] = record_content
            print(f"Updated medical record!!!!! session_id={session_id}, content type={type(record_content)}")
            
            # Update cache timestamp / 更新缓存时间戳
            self._update_cache_timestamp(f"medical_record:{session_id}")
        except Exception as e:
            logger.error(f"Error updating medical record: {str(e)}")
            logger.exception(e)
    
    def get_user_focus(self, session_id: int, db: Optional[Session] = None) -> Dict[str, List[List[int]]]:
        """
        Get user focus points for specified session, load from database if cache miss and database session provided / 获取指定会话的用户关注点，如果缓存未命中且提供了数据库会话，则从数据库加载
        
        Args:
            session_id: Session ID / 会话ID
            db: Database session, if provided queries database on cache miss / 数据库会话，如果提供则在缓存未命中时查询数据库
            
        Returns:
            User focus points dictionary / 用户关注点字典
        """
        try:
            # Check if cache has user focus for this session / 检查缓存是否存在该会话的用户关注点
            if session_id not in self.user_focus:
                # Cache miss, load from database if provided / 缓存未命中，如果提供数据库会话则从数据库加载
                if db:
                    logger.info(f"User focus cache miss, loading from database: session_id={session_id}")
                    # Query user focus from database / 从数据库查询用户关注点
                    user_focus = db.query(UserFocus).filter(
                        UserFocus.session_id == session_id
                    ).first()
                    
                    if user_focus:
                        # Load into cache / 加载到缓存
                        focus_content = user_focus.focus_content
                        
                        # Ensure data format is correct / 确保数据格式正确
                        if isinstance(focus_content, str):
                            try:
                                focus_content = json.loads(focus_content)
                            except json.JSONDecodeError:
                                logger.error(f"Cannot parse user focus JSON: {focus_content}")
                                focus_content = {}
                        
                        self.user_focus[session_id] = focus_content
                        
                        # Update cache timestamp / 更新缓存时间戳
                        self._update_cache_timestamp(f"user_focus:{session_id}")
                        
                        logger.info(f"Loaded user focus from database: session_id={session_id}")
                    else:
                        # No record in database, return empty dictionary / 数据库中也没有记录，返回空字典
                        logger.info(f"No user focus in database: session_id={session_id}")
                        return {}
            
            # Return record from cache / 返回缓存中的用户关注点
            return self.user_focus.get(session_id, {})
        except Exception as e:
            logger.error(f"Error getting user focus: {str(e)}")
            logger.exception(e)
            return {}
    
    def update_user_focus(self, session_id: int, focus_points: Dict[str, List[List[int]]]) -> None:
        """
        Update user focus points

        Args:
            session_id: Session ID
            focus_points: Dictionary of user focus points
        """

        try:
            # Ensure data is dictionary
            if not isinstance(focus_points, dict):
                if isinstance(focus_points, str):
                    try:
                        focus_points = json.loads(focus_points)
                    except json.JSONDecodeError:
                        logger.error(f"Cannot parse user focus JSON string: {focus_points}")
                        focus_points = {}
                else:
                    logger.error(f"User focus data type is not dictionary: {type(focus_points)}")
                    focus_points = {}
            
            self.user_focus[session_id] = focus_points
            logger.info(f"Updated user focus: session_id={session_id}")
            
            # Update cache timestamp
            self._update_cache_timestamp(f"user_focus:{session_id}")
        except Exception as e:
            logger.error(f"Error updating user focus: {str(e)}")
            logger.exception(e)
    
    def set_agent_result(self, session_id: int, message_id: int, agent_name: str, result: Any) -> None:
        """
        Store Agent processing results

        Args:
            session_id: Session ID
            message_id: Message ID
            agent_name: Agent name
            result: Processing result
        """
        try:
            if session_id not in self.agent_results:
                self.agent_results[session_id] = {}
            
            if message_id not in self.agent_results[session_id]:
                self.agent_results[session_id][message_id] = {}
            
            self.agent_results[session_id][message_id][agent_name] = result
            
            # Update cache timestamp
            self._update_cache_timestamp(f"agent_result:{session_id}:{message_id}:{agent_name}")
        except Exception as e:
            logger.error(f"Error setting agent result: {str(e)}")
    
    def get_agent_result(self, session_id: int, message_id: int, agent_name: str) -> Optional[Any]:
        """
        Get Agent processing result

        Args:
            session_id: Unique session identifier
            message_id: Unique message identifier
            agent_name: Name of the agent

        Returns:
            The processing result, or None if no result exists
        """
        try:
            return self.agent_results.get(session_id, {}).get(message_id, {}).get(agent_name)
        except Exception as e:
            logger.error(f"Error getting agent result: {str(e)}")
            return None
    
    def get_all_agent_results(self, session_id: int, message_id: int) -> Dict[str, Any]:
        """
        Get all Agent processing results for a specified message

        Args:
            session_id: Session ID 
            message_id: Message ID

        Returns:
            Dictionary containing all Agent processing results
        """
        try:
            return self.agent_results.get(session_id, {}).get(message_id, {})
        except Exception as e:
            logger.error(f"Error getting all agent results: {str(e)}")
            return {}
    
    def clear_session_data(self, session_id: int) -> None:
        """
        Clear all data associated with a session

        Args:
            session_id: ID of the session to clear
        """
        try:
            if session_id in self.chat_histories:
                del self.chat_histories[session_id]
                
            if session_id in self.medical_records:
                del self.medical_records[session_id]
                
            if session_id in self.agent_results:
                del self.agent_results[session_id]
                
            if session_id in self.user_focus:
                del self.user_focus[session_id]
                
            # Clear related cache timestamps
            keys_to_remove = [k for k in self.cache_timestamps if k.startswith(f"chat_history:{session_id}") or 
                              k.startswith(f"medical_record:{session_id}") or 
                              k.startswith(f"agent_result:{session_id}") or
                              k.startswith(f"user_focus:{session_id}")]
            for key in keys_to_remove:
                if key in self.cache_timestamps:
                    del self.cache_timestamps[key]
        except Exception as e:
            logger.error(f"Error clearing session data: {str(e)}")
    
    def _update_cache_timestamp(self, cache_key: str) -> None:
        """
        Remove all session data

        Args:
            session_id: Target session ID
        """
        self.cache_timestamps[cache_key] = time.time() 