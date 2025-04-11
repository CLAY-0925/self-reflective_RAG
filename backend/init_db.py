"""
Database Initialization Script / 初始化数据库脚本
Run this script to create database and table structure / 运行此脚本来创建数据库和表结构
"""
import pymysql
import logging
import time
from app.utils.database import DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, Base, engine

# Configure logging / 配置日志
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def check_database_connection():
    """
    Check if database connection is available / 检查数据库连接是否可用
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
            logger.info("Database connection successful")
            return True
        except Exception as e:
            attempt += 1
            if attempt < max_attempts:
                logger.warning(f"Database connection failed, retrying in 3 seconds (attempt {attempt}/{max_attempts}): {str(e)}")
                time.sleep(3)
            else:
                logger.error(f"Database connection failed, maximum attempts reached: {str(e)}")
                return False

def create_database():
    """
    Create database / 创建数据库
    """
    try:
        # Connect to MySQL server (explicitly specify authentication plugin) / 连接到MySQL服务器（显式指定认证插件）
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=int(DB_PORT),
            charset='utf8mb4'
        )
        
        with conn.cursor() as cursor:
            # Check if database exists / 检查数据库是否存在
            cursor.execute(f"SHOW DATABASES LIKE '{DB_NAME}'")
            result = cursor.fetchone()
            
            if not result:
                # Create database (recommended to specify character set) / 创建数据库（推荐指定字符集）
                cursor.execute(f"""
                    CREATE DATABASE {DB_NAME} 
                    CHARACTER SET utf8mb4 
                    COLLATE utf8mb4_unicode_ci
                """)
                logger.info(f"Database {DB_NAME} created successfully")
            else:
                logger.info(f"Database {DB_NAME} already exists")
                
        conn.close()
        
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        raise

def create_tables():
    """
    Create table structure / 创建表结构
    """
    try:
        # Import models to ensure tables are properly registered / 导入模型，确保表被正确注册
        from app.models import chat
        
        # Create all tables / 创建所有表
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Verify all tables are created / 确认所有表已创建
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"Created tables: {', '.join(tables)}")
        
        # Check if key tables are created / 检查关键表是否已创建
        expected_tables = ['users', 'chat_sessions', 'chat_messages', 'medical_records', 'user_focus']
        missing_tables = [table for table in expected_tables if table not in tables]
        
        if missing_tables:
            logger.warning(f"Following tables not created: {', '.join(missing_tables)}")
        else:
            logger.info("All required tables created")
            
    except Exception as e:
        logger.error(f"Error creating tables: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        logger.info("Starting database initialization...")
        
        # First check database connection / 首先检查数据库连接
        if not check_database_connection():
            logger.error("Cannot connect to database, initialization terminated")
            exit(1)
            
        create_database()
        create_tables()
        logger.info("Database initialization completed")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        exit(1) 