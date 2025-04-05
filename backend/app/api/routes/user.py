"""
用户管理API路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from typing import List

from app.utils.database import get_db
from app.schemas.chat import UserCreate, UserResponse, ChatSessionCreate, ChatSessionResponse
from app.models.chat import User, ChatSession
from app.services.cache_service import SharedCache

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# 创建全局共享缓存
shared_cache = SharedCache()

@router.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    创建新用户
    
    Args:
        user: 用户信息
        db: 数据库会话
    
    Returns:
        创建的用户
    """
    try:
        # 检查用户名是否已存在
        db_user = db.query(User).filter(User.username == user.username).first()
       # print(db_user)
        if db_user:
            # 返回已存在用户的信息，包括created_at字段
            logger.info(f"用户 {user.username} 已存在，返回已有用户ID")
            return {
                "id": db_user.id,
                "username": db_user.username,
                "created_at": db_user.created_at,
                "is_existing": True,
                "message": "用户已注册"
            }
        # 创建新用户
        new_user = User(
            username=user.username
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return new_user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create user error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建用户时发生错误: {str(e)}")

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    获取用户信息
    
    Args:
        user_id: 用户ID
        db: 数据库会话
    
    Returns:
        用户信息
    """
    try:
        # 查找用户
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取用户信息时发生错误: {str(e)}")

@router.get("/users", response_model=List[UserResponse])
def get_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """
    获取用户列表
    
    Args:
        skip: 跳过的记录数
        limit: 返回的最大记录数
        db: 数据库会话
    
    Returns:
        用户列表
    """
    try:
        users = db.query(User).offset(skip).limit(limit).all()
        return users
    
    except Exception as e:
        logger.error(f"Get users error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取用户列表时发生错误: {str(e)}")

@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(session: ChatSessionCreate, db: Session = Depends(get_db)):
    """
    创建新的聊天会话
    
    Args:
        session: 会话信息
        db: 数据库会话
    
    Returns:
        创建的会话
    """
    try:
        # 检查用户是否存在
        user = db.query(User).filter(User.id == session.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 创建新会话
        new_session = ChatSession(
            user_id=session.user_id,
            session_name=session.session_name
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        print(new_session)
        return new_session
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create session error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建聊天会话时发生错误: {str(e)}")

@router.get("/users/{user_id}/sessions", response_model=List[ChatSessionResponse])
def get_user_sessions(user_id: int, db: Session = Depends(get_db)):
    """
    获取用户的聊天会话列表
    
    Args:
        user_id: 用户ID
        db: 数据库会话
    
    Returns:
        会话列表
    """
    try:
        # 检查用户是否存在
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 获取会话列表
        sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).all()
        
        return sessions
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user sessions error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取用户会话列表时发生错误: {str(e)}")

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    """
    获取聊天会话信息
    
    Args:
        session_id: 会话ID
        db: 数据库会话
    
    Returns:
        会话信息
    """
    try:
        # 查找会话
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="聊天会话不存在")
        
        return session
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取聊天会话信息时发生错误: {str(e)}") 