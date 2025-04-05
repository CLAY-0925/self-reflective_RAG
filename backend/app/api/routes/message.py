"""
消息管理API路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from typing import List

from app.utils.database import get_db
from app.schemas.chat import ChatMessageResponse
from app.models.chat import ChatMessage, ChatSession
from app.services.cache_service import SharedCache

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# 创建全局共享缓存
shared_cache = SharedCache()

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(session_id: int, skip: int = 0, limit: int = 80, db: Session = Depends(get_db)):
    """
    获取会话的消息历史
    
    Args:
        session_id: 会话ID
        skip: 跳过的记录数
        limit: 返回的最大记录数
        db: 数据库会话
    
    Returns:
        消息列表
    """
    try:
        # 检查会话是否存在
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="聊天会话不存在")
        
        # 获取消息列表，按时间顺序排列
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(
            ChatMessage.created_at
        ).offset(skip).limit(limit).all()
        
        return messages
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session messages error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取会话消息时发生错误: {str(e)}")

@router.get("/messages/{message_id}", response_model=ChatMessageResponse)
def get_message(message_id: int, db: Session = Depends(get_db)):
    """
    获取单条消息详情
    
    Args:
        message_id: 消息ID
        db: 数据库会话
    
    Returns:
        消息详情
    """
    try:
        # 查找消息
        message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
        
        if not message:
            raise HTTPException(status_code=404, detail="消息不存在")
        
        return message
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get message error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取消息详情时发生错误: {str(e)}")

@router.delete("/sessions/{session_id}/messages")
def clear_session_messages(session_id: int, db: Session = Depends(get_db)):
    """
    清空会话的所有消息
    
    Args:
        session_id: 会话ID
        db: 数据库会话
    
    Returns:
        操作结果
    """
    try:
        # 检查会话是否存在
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="聊天会话不存在")
        
        # 删除会话的所有消息
        db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
        db.commit()
        
        # 清除缓存中的会话数据
        shared_cache.clear_session_data(session_id)
        
        return {"message": "会话消息已清空"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear session messages error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"清空会话消息时发生错误: {str(e)}")

@router.get("/statistics/messages/{session_id}")
def get_message_statistics(session_id: int, db: Session = Depends(get_db)):
    """
    获取会话消息统计信息
    
    Args:
        session_id: 会话ID
        db: 数据库会话
    
    Returns:
        统计信息
    """
    try:
        # 检查会话是否存在
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="聊天会话不存在")
        
        # 获取用户消息数量
        user_count = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id,
            ChatMessage.role == "user"
        ).count()
        
        # 获取助手消息数量
        assistant_count = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id,
            ChatMessage.role == "assistant"
        ).count()
        
        # 获取消息总数
        total_count = user_count + assistant_count
        
        return {
            "session_id": session_id,
            "total_messages": total_count,
            "user_messages": user_count,
            "assistant_messages": assistant_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get message statistics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取消息统计信息时发生错误: {str(e)}") 