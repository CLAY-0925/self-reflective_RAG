"""
聊天相关的数据库模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import datetime
from app.utils.database import Base

class User(Base):
    """
    用户表模型
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # 关联会话
    sessions = relationship("ChatSession", back_populates="user")

class ChatSession(Base):
    """
    聊天会话表模型
    """
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_name = Column(String(100))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关联
    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session")
    medical_records = relationship("MedicalRecord", back_populates="session")
    user_focus = relationship("UserFocus", back_populates="session", uselist=False)

class ChatMessage(Base):
    """
    聊天消息表模型
    """
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String(20))  # user 或 assistant
    content = Column(Text)
    intent = Column(String(100), nullable=True)  # 用户意图
    keywords = Column(String(255), nullable=True)  # 关键词，以逗号分隔
    medical_info = Column(Text, nullable=True)  # 医疗信息
    follow_up_questions = Column(Text, nullable=True)  # 推荐的跟进问题
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # 关联
    session = relationship("ChatSession", back_populates="messages")

class MedicalRecord(Base):
    """
    医疗记录表模型
    """
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    record_content = Column(Text)  # 存储患者病例信息
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关联
    session = relationship("ChatSession", back_populates="medical_records")

class UserFocus(Base):
    """
    用户关注点表模型
    """
    __tablename__ = "user_focus"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), unique=True)
    focus_content = Column(JSON)  # 存储用户关注点的JSON数据
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关联
    session = relationship("ChatSession", back_populates="user_focus") 