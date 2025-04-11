"""
数据库配置模块
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 数据库连接信息
DB_USER = 'root'
DB_PASSWORD = 'openspg'
DB_HOST = '127.0.0.1' 
DB_PORT = '3306'
DB_NAME = 'medical_bot'

# 创建数据库连接URL - 使用unix_socket连接方式
try:
    # 尝试使用本地套接字连接（对Unix/Linux/WSL环境）
    # Windows环境下不支持unix_socket
    import platform
    if platform.system() == 'Windows':
        # Windows环境使用TCP连接
        DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        # 在Linux/WSL环境中尝试使用套接字连接
        DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@/{DB_NAME}?charset=utf8mb4"
except Exception:
    # 如果出错，回退到TCP连接
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # 可选：自动检测连接是否有效
    pool_recycle=3600    # 可选：避免连接超时
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建声明式基类
Base = declarative_base()

# 获取数据库会话的依赖函数
def get_db():
    """
    Get database session dependency function
    :return: Database session object
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 