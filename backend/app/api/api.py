"""
API入口文件，整合所有路由器
"""
from fastapi import APIRouter

from app.api.routes import chat, user, message

# 创建主路由器
api_router = APIRouter()

# 添加各个子路由器
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(user.router, tags=["users"])
api_router.include_router(message.router, tags=["messages"]) 