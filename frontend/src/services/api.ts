import { 
  ApiResponse, 
  ChatSession, 
  ApiMessage, 
  Message, 
  CreateSessionResponse,
  GetSessionsResponse,
  User,
  UserCreationResponse
} from '../types';
import { config, log, logError, getApiUrl } from '../utils/config';

// 获取存储的用户信息
export const getUserStorage = (): User | null => {
  try {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      log('localStorage中未找到user数据');
      return null;
    }
    const userData: User = JSON.parse(storedUser);
    // 移除 token 相关的日志和检查
    log('从localStorage获取到用户信息:', userData);
    return userData;
  } catch (error) {
    // 如果 localStorage 不可用，则无法获取用户信息
    logError('无法访问localStorage，无法获取用户信息:', error);
    return null;
  }
};

// 设置用户存储
export const setUserStorage = (user: User): void => {
  try {
    // 移除 token 检查
    log('设置用户信息:', user);
    const userDataString = JSON.stringify(user);
    localStorage.setItem('user', userDataString);
    // 验证保存的信息
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      log('验证保存的用户信息:', parsedUser);
    } else {
      logError('用户信息未能成功保存到localStorage');
    }
  } catch (error) {
    // 如果 localStorage 不可用，则无法保存用户信息
    logError('无法访问localStorage，无法保存用户信息:', error);
  }
};

// 清除用户存储
export const clearUserStorage = (): void => {
  try {
    localStorage.removeItem('user');
    log('已从localStorage移除user数据');
  } catch (error) {
    logError('无法访问localStorage，无法移除user数据:', error);
  }
};

// 创建请求头 (不再包含认证)
const createHeaders = (): HeadersInit => {
  // 移除 token 获取和 Authorization 头
  log('创建通用请求头 (无认证)');
  return {
    'Content-Type': 'application/json'
  };
};

// API请求包装器
const apiRequest = async <T>(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  params?: Record<string, string>
): Promise<ApiResponse<T>> => {
  try {
    const headers = createHeaders();
    const url = getApiUrl(endpoint, params);
    log(`发送API请求: ${method} ${url}`);
    
    const options: RequestInit = {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
      mode: 'cors',
    };

    log('请求方法:', method);
    log('请求URL:', url);
    log('请求头:', JSON.stringify(headers));
    if (body) log('请求体:', JSON.stringify(body));

    const startTime = Date.now();
    
    try {
      const response = await fetch(url, options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      log(`收到响应: ${response.status} ${response.statusText}，耗时: ${duration}ms`);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logError('响应不是JSON格式:', contentType);
        logError('响应URL:', response.url);
        const text = await response.text().catch(() => '无法读取响应文本');
        logError('响应文本:', text.substring(0, 500));
        return {
          success: false,
          message: `服务器返回了非JSON响应: ${contentType}，状态码: ${response.status}，URL: ${response.url}`,
        };
      }

      const rawData = await response.json();
      log('原始响应数据:', rawData);

      // 特殊处理登录请求的错误情况 - 用户名已存在
      if (endpoint === config.apiPaths.auth.login && !response.ok) {
        // 处理特定的错误格式 { "detail": "用户名已存在" }
        if (rawData && typeof rawData === 'object' && 'detail' in rawData) {
          return {
            success: false,
            message: rawData.detail,
          };
        }
      }

      // 登录成功时的处理
      if (endpoint === config.apiPaths.auth.login && response.ok) {
        // 根据新的API返回格式调整，将整个响应作为 data
        return {
          success: true,
          data: rawData as T,
          // 如果响应中包含 message 字段，也添加到返回中
          message: rawData.message || undefined
        };
      }

      if (typeof rawData === 'object' && rawData !== null && 'success' in rawData) {
        return rawData as ApiResponse<T>;
      } else if (response.ok) {
        return {
          success: true,
          data: rawData as T
        };
      } else {
        return {
          success: false,
          message: rawData.message || rawData.detail || `请求失败: ${response.status} ${response.statusText}`,
          data: rawData.data
        };
      }
    } catch (fetchError) {
      logError('Fetch错误:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    logError('API请求错误:', error);
    let errorMessage = '请求过程中发生错误';
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      errorMessage = '无法连接到服务器，请检查网络连接或服务器状态';
    } else if (error instanceof Error) {
      errorMessage = `请求错误: ${error.message}`;
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
};

// 认证API
export const authApi = {
  // 用户登录/创建
  login: async (username: string): Promise<ApiResponse<UserCreationResponse>> => {
    const response = await apiRequest<UserCreationResponse>(
      config.apiPaths.auth.login,
      'POST',
      { username }
    );
    
    log('处理后的登录API响应:', response);
    
    // 特殊处理 - 当用户已存在时，仍然视为成功
    if (response.data && response.data.is_existing) {
      // 用户存在情况下，确保 response.success 为 true
      return {
        ...response,
        success: true,
        message: response.data.message || '用户已注册'
      };
    }
    
    return response;
  },
  
  // 用户注册
  register: (username: string, email: string, password: string) =>
    apiRequest<any>(
      config.apiPaths.auth.register,
      'POST',
      { username, email, password }
    ),
  
  // 用户登出
  logout: () => apiRequest<void>(config.apiPaths.auth.logout, 'POST'),
};

// 聊天会话API
export const chatApi = {
  // 获取用户的所有聊天会话
  getSessions: () =>
    apiRequest<GetSessionsResponse>(
      config.apiPaths.chat.sessions,
      'GET'
    ),
  
  // 获取特定会话的详情
  getSession: (sessionId: string) =>
    apiRequest<ChatSession>(
      config.apiPaths.chat.session,
      'GET',
      undefined,
      { sessionId }
    ),
  
  // 创建新的聊天会话
  createSession: (title: string, userId: number) =>
    apiRequest<CreateSessionResponse>(
      config.apiPaths.chat.sessions,
      'POST',
      { session_name: title, user_id: userId }
    ),
  
  // 关闭聊天会话
  closeSession: (sessionId: string) =>
    apiRequest<void>(
      config.apiPaths.chat.session,
      'PUT',
      { status: 'CLOSED' },
      { sessionId }
    ),
  
  // 删除聊天会话
  deleteSession: (sessionId: string) =>
    apiRequest<void>(
      config.apiPaths.chat.session,
      'DELETE',
      undefined,
      { sessionId }
    ),
  
  // 发送消息
  sendMessage: async (sessionId: string, content: string) => {
    const user = getUserStorage();
    const userId = user?.id || 1; // 如果没有用户ID，默认使用1
    
    log(`发送聊天消息: sessionId=${sessionId}, userId=${userId}, content=${content}`);
    
    const response = await apiRequest<any>(
      config.apiPaths.chat.sendMessage,
      'POST',
      {
        session_id: parseInt(sessionId),
        user_id: userId,
        message: content
      }
    );
    
    log('发送消息API响应:', response);
    
    return response;
  },
  
  // 获取会话的所有消息
  getMessages: (sessionId: string) =>
    apiRequest<ApiMessage[]>(
      config.apiPaths.chat.messages,
      'GET',
      undefined,
      { sessionId }
    ),
};

// 将API消息转换为应用消息
export const convertApiMessageToMessage = (apiMessage: ApiMessage): Message => {
  return {
    id: apiMessage.id,
    content: apiMessage.content,
    role: apiMessage.messageType === 'USER' ? 'user' : 'assistant',
    timestamp: new Date(apiMessage.createTime),
    messageType: apiMessage.messageType,
    medicalInfo: apiMessage.medicalInfo,
    relatedQuestions: apiMessage.relatedQuestions || [],
  };
}; 