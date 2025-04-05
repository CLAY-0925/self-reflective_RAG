"""
初始化数据库脚本
运行此脚本来创建数据库和表结构
"""
import pymysql
import logging
import time
from app.utils.database import DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, Base, engine

# 配置日志
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def check_database_connection():
    """
    检查数据库连接是否可用
    """
    max_attempts = 3
    attempt = 0
    while attempt < max_attempts:
        try:
            conn = pymysql.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASSWORD,
                port=int(DB_PORT),
                charset='utf8mb4'
            )
            conn.close()
            logger.info("数据库连接成功")
            return True
        except Exception as e:
            attempt += 1
            if attempt < max_attempts:
                logger.warning(f"数据库连接失败，将在3秒后重试（尝试 {attempt}/{max_attempts}）: {str(e)}")
                time.sleep(3)
            else:
                logger.error(f"数据库连接失败，达到最大尝试次数: {str(e)}")
                return False

def create_database():
    """
    创建数据库，
    """
    try:
        # 连接到MySQL服务器（显式指定认证插件）
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=int(DB_PORT),
            charset='utf8mb4'
        )
        
        with conn.cursor() as cursor:
            # 检查数据库是否存在
            cursor.execute(f"SHOW DATABASES LIKE '{DB_NAME}'")
            result = cursor.fetchone()
            
            if not result:
                # 创建数据库（推荐指定字符集）
                cursor.execute(f"""
                    CREATE DATABASE {DB_NAME} 
                    CHARACTER SET utf8mb4 
                    COLLATE utf8mb4_unicode_ci
                """)
                logger.info(f"数据库 {DB_NAME} 创建成功")
            else:
                logger.info(f"数据库 {DB_NAME} 已存在")
                
        conn.close()
        
    except Exception as e:
        logger.error(f"创建数据库时出错: {str(e)}")
        raise

def create_tables():
    """
    创建表结构
    """
    try:
        # 导入模型，确保表被正确注册
        from app.models import chat
        
        # 创建所有表
        Base.metadata.create_all(bind=engine)
        logger.info("数据库表创建成功")
        
        # 确认所有表已创建
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"已创建的表: {', '.join(tables)}")
        
        # 检查关键表是否已创建
        expected_tables = ['users', 'chat_sessions', 'chat_messages', 'medical_records', 'user_focus']
        missing_tables = [table for table in expected_tables if table not in tables]
        
        if missing_tables:
            logger.warning(f"以下表未创建: {', '.join(missing_tables)}")
        else:
            logger.info("所有需要的表都已创建")
            
    except Exception as e:
        logger.error(f"创建表时出错: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        logger.info("开始初始化数据库...")
        
        # 首先检查数据库连接
        if not check_database_connection():
            logger.error("无法连接到数据库，初始化终止")
            exit(1)
            
        create_database()
        create_tables()
        logger.info("数据库初始化完成")
    except Exception as e:
        logger.error(f"数据库初始化失败: {str(e)}")
        exit(1) 