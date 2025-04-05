import os
import json

from dotenv import load_dotenv


# 加载环境变量
load_dotenv()
API_KEY = os.getenv('DASHSCOPE_API_KEY')
print(API_KEY)
COOKIE = os.getenv('COOKIE')
# 获取API密钥
print(COOKIE)