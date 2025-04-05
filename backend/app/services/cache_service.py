"""
共享内存缓存服务，用于Agent之间共享数据
"""
import threading
from typing import Dict, List, Any, Optional
import json
import logging
import time
from sqlalchemy.orm import Session

from app.models.chat import MedicalRecord, ChatMessage, UserFocus

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SharedCache:
    """
    共享内存缓存服务单例
    用于Agent之间共享聊天历史和其他数据
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SharedCache, cls).__new__(cls)
                # 初始化共享内存数据结构
                cls._instance.chat_histories = {}  # session_id -> messages列表
                cls._instance.medical_records = {}  # session_id -> 病例信息
                cls._instance.agent_results = {}  # session_id -> {message_id -> {agent_results}}
                cls._instance.cache_timestamps = {}  # 缓存时间戳记录
                cls._instance.user_focus = {}  # session_id -> 用户关注点字典
        return cls._instance
    
    def get_chat_history(self, session_id: int, db: Optional[Session] = None, limit: int = 10) -> List[Dict[str, str]]:
        """
        获取指定会话的聊天历史
        
        Args:
            session_id: 会话ID
            db: 数据库会话，如果提供则在缓存未命中时查询数据库
            limit: 限制返回的最近消息数量
            
        Returns:
            聊天历史消息列表
        """
        try:
            # 检查缓存是否存在该会话的历史
            if session_id not in self.chat_histories:
                # 缓存未命中，如果提供数据库会话则从数据库加载
                if db:
                    logger.info(f"聊天历史缓存未命中，从数据库加载: session_id={session_id}")
                    # 从数据库查询历史消息
                    messages = db.query(ChatMessage).filter(
                        ChatMessage.session_id == session_id
                    ).order_by(ChatMessage.created_at).all()
                    
                    # 格式化消息并加载到缓存
                    history = [{"role": msg.role, "content": msg.content} for msg in messages]
                    self.chat_histories[session_id] = history
                    
                    # 更新缓存时间戳
                    self._update_cache_timestamp(f"chat_history:{session_id}")
                    
                    logger.info(f"已从数据库加载聊天历史: session_id={session_id}, 消息数量={len(history)}")
                else:
                    # 没有提供数据库会话，返回空列表
                    return []
            
            # 返回最近的limit条消息
            return self.chat_histories[session_id][-limit:]
        except Exception as e:
            logger.error(f"获取聊天历史异常: {str(e)}")
            logger.exception(e)
            return []
    
    def add_message_to_history(self, session_id: int, role: str, content: str) -> None:
        """
        向聊天历史添加新消息
        
        Args:
            session_id: 会话ID
            role: 角色（user或assistant）
            content: 消息内容
        """
        try:
            if session_id not in self.chat_histories:
                self.chat_histories[session_id] = []
            
            self.chat_histories[session_id].append({
                "role": role,
                "content": content
            })
            
            # 更新缓存时间戳
            self._update_cache_timestamp(f"chat_history:{session_id}")
        except Exception as e:
            logger.error(f"添加消息到历史异常: {str(e)}")
    
    def get_medical_record(self, session_id: int, db: Optional[Session] = None) -> Any:
        """
        获取指定会话的医疗记录，如果缓存未命中且提供了数据库会话，则从数据库加载
        
        Args:
            session_id: 会话ID
            db: 数据库会话，如果提供则在缓存未命中时查询数据库
            
        Returns:
            医疗记录内容，格式为字典或字符串
        """
        try:
            # 检查缓存是否存在该会话的医疗记录
            if session_id not in self.medical_records or not self.medical_records[session_id]:
                # 缓存未命中，如果提供数据库会话则从数据库加载
                if db:
                    logger.info(f"医疗记录缓存未命中，从数据库加载: session_id={session_id}")
                    # 从数据库查询医疗记录
                    medical_record = db.query(MedicalRecord).filter(
                        MedicalRecord.session_id == session_id
                    ).first()
                    
                    if medical_record:
                        # 加载到缓存
                        record_content = medical_record.record_content
                        self.medical_records[session_id] = record_content
                        
                        # 更新缓存时间戳
                        self._update_cache_timestamp(f"medical_record:{session_id}")
                        
                        logger.info(f"已从数据库加载医疗记录: session_id={session_id}")
                    else:
                        # 数据库中也没有记录，返回空记录
                        logger.info(f"数据库中不存在医疗记录: session_id={session_id}")
                        return {}
            
            # 返回缓存中的记录
            record = self.medical_records.get(session_id, "")
            
            # 如果记录是JSON字符串，尝试解析为字典
            if isinstance(record, str) and record.strip():
                try:
                    parsed_record = json.loads(record)
                    return parsed_record
                except json.JSONDecodeError:
                    # 不是有效的JSON，直接返回原始字符串
                    return record
            
            return record if record else {}
        except Exception as e:
            logger.error(f"获取医疗记录异常: {str(e)}")
            logger.exception(e)
            return {}
    
    def update_medical_record(self, session_id: int, record_content: Any) -> None:
        """
        更新医疗记录
        
        Args:
            session_id: 会话ID
            record_content: 医疗记录内容
        """
        try:
            # 如果是字典或列表，转换为JSON字符串
            if isinstance(record_content, (dict, list)):
                record_content = json.dumps(record_content, ensure_ascii=False)
                
            self.medical_records[session_id] = record_content
            print(f"更新医疗记录！！！！！session_id={session_id}, 内容类型={type(record_content)}")
            
            # 更新缓存时间戳
            self._update_cache_timestamp(f"medical_record:{session_id}")
        except Exception as e:
            logger.error(f"更新医疗记录异常: {str(e)}")
            logger.exception(e)
    
    def get_user_focus(self, session_id: int, db: Optional[Session] = None) -> Dict[str, List[List[int]]]:
        """
        获取指定会话的用户关注点，如果缓存未命中且提供了数据库会话，则从数据库加载
        
        Args:
            session_id: 会话ID
            db: 数据库会话，如果提供则在缓存未命中时查询数据库
            
        Returns:
            用户关注点字典
        """
        try:
            # 检查缓存是否存在该会话的用户关注点
            if session_id not in self.user_focus:
                # 缓存未命中，如果提供数据库会话则从数据库加载
                if db:
                    logger.info(f"用户关注点缓存未命中，从数据库加载: session_id={session_id}")
                    # 从数据库查询用户关注点
                    user_focus = db.query(UserFocus).filter(
                        UserFocus.session_id == session_id
                    ).first()
                    
                    if user_focus:
                        # 加载到缓存
                        focus_content = user_focus.focus_content
                        
                        # 确保数据格式正确
                        if isinstance(focus_content, str):
                            try:
                                focus_content = json.loads(focus_content)
                            except json.JSONDecodeError:
                                logger.error(f"无法解析用户关注点JSON: {focus_content}")
                                focus_content = {}
                        
                        self.user_focus[session_id] = focus_content
                        
                        # 更新缓存时间戳
                        self._update_cache_timestamp(f"user_focus:{session_id}")
                        
                        logger.info(f"已从数据库加载用户关注点: session_id={session_id}")
                    else:
                        # 数据库中也没有记录，返回空字典
                        logger.info(f"数据库中不存在用户关注点: session_id={session_id}")
                        return {}
            
            # 返回缓存中的用户关注点
            return self.user_focus.get(session_id, {})
        except Exception as e:
            logger.error(f"获取用户关注点异常: {str(e)}")
            logger.exception(e)
            return {}
    
    def update_user_focus(self, session_id: int, focus_points: Dict[str, List[List[int]]]) -> None:
        """
        更新用户关注点
        
        Args:
            session_id: 会话ID
            focus_points: 用户关注点字典
        """
        try:
            # 确保数据是字典
            if not isinstance(focus_points, dict):
                if isinstance(focus_points, str):
                    try:
                        focus_points = json.loads(focus_points)
                    except json.JSONDecodeError:
                        logger.error(f"无法解析用户关注点JSON字符串: {focus_points}")
                        focus_points = {}
                else:
                    logger.error(f"用户关注点数据类型不是字典: {type(focus_points)}")
                    focus_points = {}
            
            self.user_focus[session_id] = focus_points
            logger.info(f"更新用户关注点: session_id={session_id}")
            
            # 更新缓存时间戳
            self._update_cache_timestamp(f"user_focus:{session_id}")
        except Exception as e:
            logger.error(f"更新用户关注点异常: {str(e)}")
            logger.exception(e)
    
    def set_agent_result(self, session_id: int, message_id: int, agent_name: str, result: Any) -> None:
        """
        存储Agent处理结果
        
        Args:
            session_id: 会话ID
            message_id: 消息ID
            agent_name: Agent名称
            result: 处理结果
        """
        try:
            if session_id not in self.agent_results:
                self.agent_results[session_id] = {}
            
            if message_id not in self.agent_results[session_id]:
                self.agent_results[session_id][message_id] = {}
            
            self.agent_results[session_id][message_id][agent_name] = result
            
            # 更新缓存时间戳
            self._update_cache_timestamp(f"agent_result:{session_id}:{message_id}:{agent_name}")
        except Exception as e:
            logger.error(f"设置Agent结果异常: {str(e)}")
    
    def get_agent_result(self, session_id: int, message_id: int, agent_name: str) -> Optional[Any]:
        """
        获取Agent处理结果
        
        Args:
            session_id: 会话ID
            message_id: 消息ID
            agent_name: Agent名称
            
        Returns:
            处理结果，若不存在则返回None
        """
        try:
            return self.agent_results.get(session_id, {}).get(message_id, {}).get(agent_name)
        except Exception as e:
            logger.error(f"获取Agent结果异常: {str(e)}")
            return None
    
    def get_all_agent_results(self, session_id: int, message_id: int) -> Dict[str, Any]:
        """
        获取指定消息的所有Agent处理结果
        
        Args:
            session_id: 会话ID
            message_id: 消息ID
            
        Returns:
            所有Agent处理结果的字典
        """
        try:
            return self.agent_results.get(session_id, {}).get(message_id, {})
        except Exception as e:
            logger.error(f"获取所有Agent结果异常: {str(e)}")
            return {}
    
    def clear_session_data(self, session_id: int) -> None:
        """
        清除指定会话的所有数据
        
        Args:
            session_id: 会话ID
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
                
            # 清除相关缓存时间戳
            keys_to_remove = [k for k in self.cache_timestamps if k.startswith(f"chat_history:{session_id}") or 
                              k.startswith(f"medical_record:{session_id}") or 
                              k.startswith(f"agent_result:{session_id}") or
                              k.startswith(f"user_focus:{session_id}")]
            for key in keys_to_remove:
                if key in self.cache_timestamps:
                    del self.cache_timestamps[key]
        except Exception as e:
            logger.error(f"清除会话数据异常: {str(e)}")
    
    def _update_cache_timestamp(self, cache_key: str) -> None:
        """
        更新缓存时间戳
        
        Args:
            cache_key: 缓存键
        """
        self.cache_timestamps[cache_key] = time.time() 