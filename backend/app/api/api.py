"""
API Entry Point
API入口
"""
from fastapi import APIRouter

from app.api.routes import chat, user, message

# Create main router
# 创建主路由器
api_router = APIRouter()

# Add sub-routers
# 添加各个子路由器
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(user.router, tags=["users"])
api_router.include_router(message.router, tags=["messages"]) 