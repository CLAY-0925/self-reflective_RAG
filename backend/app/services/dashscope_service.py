"""
DashScope API Service
通义API服务
"""
import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv
import dashscope
import asyncio

# Load environment variables / 加载环境变量
load_dotenv()

# Get API keys / 获取API密钥
API_KEY = os.getenv('DASHSCOPE_API_KEY')
FAST_MODEL = os.getenv('FAST_MODEL')
LARGE_MODEL = os.getenv('LARGE_MODEL')

class DashscopeService:
    """
    DashScope API Service
    通义千问API服务
    """
    
    def __init__(self, use_fast_model=False):
        """
        Initialize service / 初始化服务
        
        Args:
            use_fast_model: Whether to use faster model / 是否使用更快的模型
        """
        self.api_key = API_KEY
        print('Initializing service')
        self.model = FAST_MODEL if use_fast_model else LARGE_MODEL

        
    async def chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> Dict[str, Any]:
        """
        Send chat request to DashScope API / 发送聊天请求到通义千问API
        
        Args:
            messages: Chat message list, format: [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hello! How can I help you?"}] / 聊天消息列表
            temperature: Temperature parameter, controls text generation randomness / 温度参数，控制生成文本的随机性
            
        Returns:
            API response result / API响应结果
        """
        try:
            # Use thread pool to execute blocking API calls / 使用线程池执行阻塞的 API 调用
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
                    'error': f"API error: {response.code}, {response.message}"
                }
        except Exception as e:
            return {
                'success': False,
                'error': f"DashScope API call exception: {str(e)}"
            }
        
    
    async def chat_with_prompt(self, messages: List[Dict[str, str]], system_prompt: str, temperature: float = 0.7) -> Dict[str, Any]:
        """
        Send chat request with system prompt / 使用系统提示发送聊天请求
        
        Args:
            messages: Chat message list / 聊天消息列表
            system_prompt: System prompt / 系统提示词
            temperature: Temperature parameter / 温度参数
            
        Returns:
            API response result / API响应结果
        """
        try:
            # Add system prompt at the beginning of messages / 在messages开头添加系统提示
            full_messages = [{"role": "system", "content": system_prompt}] + messages
            
            return await self.chat_completion(full_messages, temperature) 
        
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to send chat request with prompt: {system_prompt},{e}"
            }
