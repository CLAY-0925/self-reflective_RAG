"""
User Management API Routes
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

# Configure logging
# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Create global shared cache
# 创建全局共享缓存
shared_cache = SharedCache()

@router.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user
    创建新用户
    
    Args:
        user: User information / 用户信息
        db: Database session / 数据库会话
    
    Returns:
        Created user / 创建的用户
    """
    try:
        # Check if username already exists
        # 检查用户名是否已存在
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            # Return existing user information, including created_at field
            # 返回已存在用户的信息，包括created_at字段
            logger.info(f"User {user.username} already exists, returning existing user ID")
            logger.info(f"用户 {user.username} 已存在，返回已有用户ID")
            return {
                "id": db_user.id,
                "username": db_user.username,
                "created_at": db_user.created_at,
                "is_existing": True,
                "message": "User already registered"

            }
        # Create new user
        # 创建新用户
        new_user = User(
            username=user.username
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"New user created: {new_user.username}")

        
        return {
            "id": new_user.id,
            "username": new_user.username,
            "created_at": new_user.created_at,
            "is_existing": False,
            "message": "User created successfully"

        }
        
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")

        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get user by ID
    通过ID获取用户
    
    Args:
        user_id: User ID / 用户ID
        db: Database session / 数据库会话
    
    Returns:
        User information / 用户信息
    """
    try:
        # Get user from database
        # 从数据库获取用户
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {str(e)}")

        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users", response_model=List[UserResponse])
def get_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """
    Get list of users with pagination
    获取用户列表（分页）
    
    Args:
        skip: Number of records to skip / 跳过的记录数
        limit: Maximum number of records to return / 返回的最大记录数
        db: Database session / 数据库会话
    
    Returns:
        List of users / 用户列表
    """
    try:
        # Get users from database with pagination
        # 从数据库获取用户列表（分页）
        users = db.query(User).offset(skip).limit(limit).all()
        
        return [
            {
                "id": user.id,
                "username": user.username,
                "created_at": user.created_at
            }
            for user in users
        ]
        
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")

        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(session: ChatSessionCreate, db: Session = Depends(get_db)):
    """
    Create a new chat session
    创建新的聊天会话
    
    Args:
        session: Session information / 会话信息
        db: Database session / 数据库会话
    
    Returns:
        Created session / 创建的会话
    """
    try:
        # Create new session
        # 创建新会话
        new_session = ChatSession(
            user_id=session.user_id,
            session_name=session.session_name
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        logger.info(f"New session created: {new_session.session_name}")
        logger.info(f"新会话创建成功: {new_session.session_name}")
        
        return {
            "id": new_session.id,
            "user_id": new_session.user_id,
            "session_name": new_session.session_name,
            "created_at": new_session.created_at
        }
        
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")

        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}/sessions", response_model=List[ChatSessionResponse])
def get_user_sessions(user_id: int, db: Session = Depends(get_db)):
    """
    Get all sessions for a user
    获取用户的所有会话
    
    Args:
        user_id: User ID / 用户ID
        db: Database session / 数据库会话
    
    Returns:
        List of sessions / 会话列表
    """
    try:
        # Get sessions from database
        # 从数据库获取会话
        sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).all()
        
        return [
            {
                "id": session.id,
                "user_id": session.user_id,
                "session_name": session.session_name,
                "created_at": session.created_at
            }
            for session in sessions
        ]
        
    except Exception as e:
        logger.error(f"Error getting user sessions: {str(e)}")

        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    """
    Get session by ID
    通过ID获取会话
    
    Args:
        session_id: Session ID / 会话ID
        db: Database session / 数据库会话
    
    Returns:
        Session information / 会话信息
    """
    try:
        # Get session from database
        # 从数据库获取会话
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

            
        return {
            "id": session.id,
            "user_id": session.user_id,
            "session_name": session.session_name,
            "created_at": session.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session: {str(e)}")

        raise HTTPException(status_code=500, detail=str(e)) 