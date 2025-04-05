"""
聊天相关的请求和响应模式
"""
from pydantic import BaseModel
from typing import List, Optional, Dict
import datetime
from pydantic import Json
# 用户模式
class UserBase(BaseModel):
    """
    用户基础模式
    """
    username: str

class UserCreate(UserBase):
    """
    创建用户模式
    """
    pass

class UserResponse(UserBase):
    """
    用户响应模式
    """
    id: int
    created_at: datetime.datetime
    is_existing: Optional[bool] = False
    message: Optional[str] = None

    class Config:
        orm_mode = True

# 聊天会话模式
class ChatSessionBase(BaseModel):
    """
    聊天会话基础模式
    """
    session_name: str

class ChatSessionCreate(ChatSessionBase):
    """
    创建聊天会话模式
    """
    user_id: int

class ChatSessionResponse(ChatSessionBase):
    """
    聊天会话响应模式
    """
    id: int
    user_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        orm_mode = True

# 聊天消息模式
class ChatMessageBase(BaseModel):
    """
    聊天消息基础模式
    """
    role: str
    content: str

class ChatMessageCreate(ChatMessageBase):
    """
    创建聊天消息模式
    """
    session_id: int

class ChatMessageResponse(ChatMessageBase):
    """
    聊天消息响应模式
    """
    id: int
    session_id: int
    intent: Optional[str] = None
    keywords: Optional[str] = None
    medical_info: Optional[str] = None
    follow_up_questions: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        orm_mode = True

# 医疗记录模式
class MedicalRecordBase(BaseModel):
    """
    医疗记录基础模式
    """
    record_content: str

class MedicalRecordCreate(MedicalRecordBase):
    """
    创建医疗记录模式
    """
    session_id: int

class MedicalRecordUpdate(MedicalRecordBase):
    """
    更新医疗记录模式
    """
    pass

class MedicalRecordResponse(MedicalRecordBase):
    """
    医疗记录响应模式
    """
    id: int
    session_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        orm_mode = True

# 聊天请求模式
class ChatRequest(BaseModel):
    """
    聊天请求模式
    """
    session_id: int
    user_id: int
    message: str

# 聊天响应模式
class ChatResponse(BaseModel):
    """
    聊天响应模式
    """
    message: str
    follow_up_questions: List[str] = [] 
    medical_record: Optional[Json] = None
    medical_info: Optional[str] = None
    keywords: Optional[List[str]] = None
    focus_points: Optional[Dict[str, List[List[int]]]] = None
    current_focus: Optional[str] = None