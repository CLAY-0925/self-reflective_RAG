"""
FastAPI Main Application File
FastAPI主应用文件
"""
import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.api import api_router
from app.utils.database import engine, Base
from app.models import chat

# Configure logging
# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create database tables
# 创建数据库表
def create_tables():
    """
    Create database tables
    创建数据库表
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")

    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

        raise

# Initialize FastAPI application
# 初始化FastAPI应用
app = FastAPI(
    title="Medical Knowledge Chatbot API",
    description="Multi-Agent based Medical Knowledge Chatbot API with WebSocket real-time chat support",
    version="1.0.0",
)

# Allow cross-origin requests
# 允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins / 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods / 允许所有方法
    allow_headers=["*"],  # Allow all headers / 允许所有头部
)

# Include API routes
# 包含API路由
app.include_router(api_router, prefix="/api")

# Create a simple root route
# 创建一个简单的根路由
@app.get("/")
def read_root():
    """
    Root route, returns a simple welcome message
    根路由，返回简单的欢迎信息
    """
    return {
        "message": "Welcome to Medical Knowledge Chatbot API",
        "docs": "/docs",
        "redoc": "/redoc"
    }

# Run when server starts
# 启动服务器时运行
@app.on_event("startup")
def startup_event():
    """
    Event handler executed when application starts
    应用启动时执行的事件处理器
    """
    logger.info("Application starting up...")

    # Create database tables
    # 创建数据库表
    create_tables()
    logger.info("Application startup completed")


# Run when server shuts down
# 关闭服务器时运行
@app.on_event("shutdown")
def shutdown_event():
    """
    Event handler executed when application shuts down
    应用关闭时执行的事件处理器
    """
    logger.info("Application is shutting down...")

    # Add cleanup work here, such as closing connections
    # 这里可以添加清理工作，如关闭连接等
    logger.info("Application has been shut down")


# Start server when running this file directly
# 直接运行此文件时启动服务器
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, ws_max_size=16777216) 