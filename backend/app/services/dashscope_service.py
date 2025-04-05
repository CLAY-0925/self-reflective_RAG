"""
通义API服务
"""
import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv
import dashscope
import asyncio

# 加载环境变量
load_dotenv()

# 获取API密钥
API_KEY = os.getenv('DASHSCOPE_API_KEY')
FAST_MODEL = os.getenv('FAST_MODEL')
LARGE_MODEL = os.getenv('LARGE_MODEL')

class DashscopeService:
    """
    通义千问API服务
    """
    
    def __init__(self, use_fast_model=False):
        """
        初始化服务
        
        Args:
            use_fast_model: 是否使用更快的模型
        """
        self.api_key = API_KEY
        print('初始化一次')
        self.model = FAST_MODEL if use_fast_model else LARGE_MODEL

        
    async def chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> Dict[str, Any]:
        """
        发送聊天请求到通义千问API
        
        Args:
            messages: 聊天消息列表，格式为[{"role": "user", "content": "你好"}, {"role": "assistant", "content": "你好！有什么我可以帮助你的吗？"}]
            temperature: 温度参数，控制生成文本的随机性
            
        Returns:
            API响应结果
        """
        try:
            # 使用线程池执行阻塞的 API 调用
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: dashscope.Generation.call(
                    api_key=self.api_key,
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    result_format='message'
                )
            )
            
            if response:
                return {
                    'success': True,
                    'response': response.output.choices[0].message.content,
                    'usage': response.usage,
                }
            else:
                return {
                    'success': False,
                    'error': f"API错误: {response.code}, {response.message}"
                }
        except Exception as e:
            return {
                'success': False,
                'error': f"调用通义API异常: {str(e)}"
            }
        

    
            
    async def chat_with_prompt(self, messages: List[Dict[str, str]], system_prompt: str, temperature: float = 0.7) -> Dict[str, Any]:
        """
        使用系统提示发送聊天请求
        
        Args:
            messages: 聊天消息列表
            system_prompt: 系统提示词
            temperature: 温度参数
            
        Returns:
            API响应结果
        """
        try:
        # 在messages开头添加系统提示
            full_messages = [{"role": "system", "content": system_prompt}] + messages

            
            return await self.chat_completion(full_messages, temperature) 
        
        except Exception as e:
            return {
                'success': False,
                'error': f"设置的prompt聊天请求发送失败: {system_prompt},{e}"
            }
