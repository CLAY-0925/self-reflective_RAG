"""
FastAPI主应用文件
"""
import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.api import api_router
from app.utils.database import engine, Base
from app.models import chat

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# 创建数据库表
def create_tables():
    """
    创建数据库表
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("数据库表创建成功")
    except Exception as e:
        logger.error(f"创建数据库表时发生错误: {str(e)}")
        raise

# 初始化FastAPI应用
app = FastAPI(
    title="医学知识聊天机器人 API",
    description="基于多Agent的医学知识聊天机器人API，支持WebSocket实时聊天",
    version="1.0.0",
)

# 允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头部
)

# 包含API路由
app.include_router(api_router, prefix="/api")

# 创建一个简单的根路由
@app.get("/")
def read_root():
    """
    根路由，返回简单的欢迎信息
    """
    return {
        "message": "欢迎使用医学知识聊天机器人API",
        "docs": "/docs",
        "redoc": "/redoc"
    }

# 启动服务器时运行
@app.on_event("startup")
def startup_event():
    """
    应用启动时执行的事件处理器
    """
    logger.info("应用启动中...")
    # 创建数据库表
    create_tables()
    logger.info("应用启动完成")

# 关闭服务器时运行
@app.on_event("shutdown")
def shutdown_event():
    """
    应用关闭时执行的事件处理器
    """
    logger.info("应用正在关闭...")
    # 这里可以添加清理工作，如关闭连接等
    logger.info("应用已关闭")

# 直接运行此文件时启动服务器
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, ws_max_size=16777216) 