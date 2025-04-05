import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ChatSession, 
  Message, 
  CreateSessionResponse, 
  GetSessionsResponse, 
  User, 
  ApiResponse, 
  WebSocketStatusMessage,
  WebSocketProgressMessage,
  WebSocketFinalMessage,
  MedicalInfoItem
} from '../types';
import { chatApi, convertApiMessageToMessage } from '../services/api';
import { webSocketService, ConnectionStatus } from '../services/websocket';
import { log } from '../utils/config';
import { useAuth } from './AuthContext';

// WebSocket消息数据类型
interface WebSocketMessageData {
  type: 'message' | 'status' | 'progress' | 'final';
  message?: Message;
  session_id?: string;
  status?: string;
  progress?: {
    intent: string;
    medical_info: string;
    medical_record: string;
    intent_result?: any;
    medical_record_result?: any;
  };
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  error: string | null;
  wsStatus: ConnectionStatus;
  createSession: () => void;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>('disconnected');

  // 计算当前会话
  const currentSession = currentSessionId
    ? sessions.find(session => session.id === currentSessionId) || null
    : null;

  // 添加setCurrentSession函数以更新当前会话
  const setCurrentSession = (updater: (prev: ChatSession | null) => ChatSession | null) => {
    const updatedSession = updater(currentSession);
    if (updatedSession && currentSessionId) {
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === currentSessionId ? updatedSession : session
        )
      );
    }
  };

  // 定义一个处理WebSocket消息的函数，然后将它包装为MessageHandler
  const processWebSocketMessage = useCallback((data: any) => {
    log(`处理WebSocket消息: ${JSON.stringify(data).substring(0, 100)}...`);
    
    if (!currentSession) {
      log('收到WebSocket消息，但当前没有激活的会话');
      return;
    }
    
    // 兼容两种消息格式：直接Message对象和带有type字段的对象
    const type = data.type;
    const message = type === 'message' ? data : data.message;
    const session_id = data.session_id;
    const status = data.status;
    const progress = data.progress;
    
    if (session_id && session_id !== currentSession.id.toString()) {
      log(`收到消息的会话ID(${session_id})与当前会话ID(${currentSession.id})不匹配，忽略`);
      return;
    }

    // 如果是直接的消息对象
    if (!type || type === 'message') {
      // 处理消息类型的WebSocket数据
      // 检查消息是否已经存在
      const messages = currentSession.messages || [];
      const messageObj = message || data;  // 如果没有message字段，则使用data本身
      const existingMessageIndex = messages.findIndex(m => m.id === messageObj.id);
      
      if (existingMessageIndex >= 0) {
        // 更新现有消息
        log(`更新现有消息，ID: ${messageObj.id}`);
        const updatedMessages = [...messages];
        
        // 确保保留医疗信息字段
        const existingMessage = updatedMessages[existingMessageIndex];
        const updatedMessage = {
          ...messageObj,
          medicalInfoItems: messageObj.medicalInfoItems || existingMessage.medicalInfoItems,
          // 保留处理状态相关字段
          status: messageObj.status || existingMessage.status,
          progress: messageObj.progress || existingMessage.progress
        };
        
        updatedMessages[existingMessageIndex] = updatedMessage;
        
        setCurrentSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: updatedMessages
          };
        });
      } else if (messageObj) {
        // 添加新消息
        log(`添加新消息，ID: ${messageObj.id}`);
        setCurrentSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...(prev.messages || []), messageObj]
          };
        });
      }
    } else if (type === 'status') {
      // 处理状态消息
      log(`收到状态更新: ${status}, 消息内容: ${data.message}`);
      
      // 更新状态显示 - 查找最后一条助手消息
      setCurrentSession(prev => {
        if (!prev) return null;
        
        const messages = prev.messages || [];
        if (messages.length === 0) return prev;
        
        // 找到最后一条助手消息
        const lastAssistantMessageIndex = [...messages].reverse().findIndex(m => m.role === 'assistant');
        
        if (lastAssistantMessageIndex === -1) {
          // 如果没有助手消息，创建一个新的
          const newAssistantMessage: Message = {
            id: data.id || uuidv4(),
            content: data.message || '正在处理您的请求...',
            role: 'assistant',
            timestamp: new Date(),
            status: 'processing',
            progress: progress || {
              intent: '分析中...',
              medical_info: '分析中...',
              medical_record: '分析中...'
            }
          };
          
          return {
            ...prev,
            messages: [...messages, newAssistantMessage]
          };
        }
        
        // 更新最后一条助手消息
        const reverseIndex = lastAssistantMessageIndex;
        const actualIndex = messages.length - 1 - reverseIndex;
        
        const updatedMessages = [...messages];
        updatedMessages[actualIndex] = {
          ...updatedMessages[actualIndex],
          content: data.message || updatedMessages[actualIndex].content,
          status: 'processing',
          progress: progress || updatedMessages[actualIndex].progress
        };
        
        return {
          ...prev,
          messages: updatedMessages
        };
      });
    } else if (type === 'progress') {
      // 处理进度更新类型的WebSocket数据
      log(`收到进度更新: ${JSON.stringify(progress)}`);
      
      // 更新状态显示
      setCurrentSession(prev => {
        if (!prev) return null;
        
        const messages = prev.messages || [];
        if (messages.length === 0) return prev;
        
        // 查找最后一条助手消息
        const lastAssistantMessageIndex = [...messages].reverse().findIndex(m => m.role === 'assistant');
        if (lastAssistantMessageIndex === -1) {
          return prev;
        }
        
        const reverseIndex = lastAssistantMessageIndex;
        const actualIndex = messages.length - 1 - reverseIndex;
        
        // 更新医疗记录，如果存在
        let medicalRecord = messages[actualIndex].medicalRecord;
        
        if (progress?.medical_record_result) {
          try {
            // 尝试解析JSON格式的医疗记录（如果是字符串）
            let updatedRecord;
            
            if (typeof progress.medical_record_result.updated_record === 'string') {
              try {
                updatedRecord = JSON.parse(progress.medical_record_result.updated_record);
              } catch (e) {
                log('无法解析医疗记录JSON字符串:', e);
                updatedRecord = progress.medical_record_result.updated_record;
              }
            } else {
              updatedRecord = progress.medical_record_result.updated_record;
            }
            
            // 更新医疗记录
            medicalRecord = updatedRecord;
            
            log('更新医疗记录:', medicalRecord);
          } catch (e) {
            log('处理医疗记录时出错:', e);
          }
        }
        
        const updatedMessages = [...messages];
        updatedMessages[actualIndex] = {
          ...updatedMessages[actualIndex],
          content: data.message || updatedMessages[actualIndex].content,
          status: 'processing',
          progress: progress,
          medicalRecord: medicalRecord || updatedMessages[actualIndex].medicalRecord
        } as Message;
        
        return {
          ...prev,
          messages: updatedMessages
        };
      });
    } else if (type === 'final') {
      // 处理最终消息
      log(`收到最终消息: ${JSON.stringify(data).substring(0, 100)}...`);
      
      if (!currentSession || !currentSession.messages || currentSession.messages.length === 0) {
        log('当前没有会话或消息列表为空，无法处理最终消息');
        return;
      }
      
      // 查找最后一条助手消息
      const messages = [...currentSession.messages]; // 创建副本以避免直接修改
      
      // 从后往前查找第一条助手消息
      let assistantIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          assistantIndex = i;
          break;
        }
      }
      
      if (assistantIndex === -1) {
        log('没有找到助手消息，无法更新');
        return;
      }
      
      log(`找到助手消息，索引: ${assistantIndex}`);
      
      // 处理医疗记录
      let medicalRecord = null;
      if (data.medical_record) {
        try {
          // 尝试解析JSON格式的医疗记录（如果是字符串）
          if (typeof data.medical_record === 'string') {
            try {
              medicalRecord = JSON.parse(data.medical_record);
            } catch (e) {
              log('无法解析最终医疗记录JSON字符串:', e);
              medicalRecord = data.medical_record;
            }
          } else {
            medicalRecord = data.medical_record;
          }
        } catch (e) {
          log('处理最终医疗记录时出错:', e);
        }
      }
      
      // 格式化相关问题
      let relatedQuestions = data.follow_up_questions;
      if (typeof relatedQuestions === 'string') {
        relatedQuestions = relatedQuestions.split(',').map(q => q.trim());
      }
      
      // 更新助手消息
      const assistantMessage = messages[assistantIndex];
      messages[assistantIndex] = {
        ...assistantMessage,
        content: data.message || assistantMessage.content,
        status: 'complete',
        medicalInfoItems: data.medical_info || assistantMessage.medicalInfoItems,
        medicalRecord: medicalRecord,
        relatedQuestions: relatedQuestions || assistantMessage.relatedQuestions,
        keywords: data.keywords || assistantMessage.keywords,
        // 移除progress字段
        progress: undefined
      };
      
      log('更新后的消息列表长度:', messages.length);
      messages.forEach((msg, idx) => {
        log(`更新后消息 ${idx + 1} - 角色: ${msg.role}, ID: ${msg.id}`);
      });
      
      // 更新当前会话
      const updatedSession = {
        ...currentSession,
        messages: messages
      };
      
      // 更新sessions状态
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === currentSession.id ? updatedSession : session
        )
      );
    }
  }, [currentSession]);

  // 将处理函数转换为MessageHandler类型
  const handleWebSocketMessage = useCallback((message: Message) => {
    // 处理所有消息，无论是否有type字段
    processWebSocketMessage(message);
  }, [processWebSocketMessage]);

  // 监听WebSocket状态
  useEffect(() => {
    const checkWsStatus = setInterval(() => {
      setWsStatus(webSocketService.getStatus());
    }, 1000);
    
    return () => {
      clearInterval(checkWsStatus);
    };
  }, []);

  // 不再在会话变更时自动连接WebSocket，只在用户发送消息时连接
  useEffect(() => {
    // 仅添加消息处理器，不自动连接WebSocket
    webSocketService.addMessageHandler(handleWebSocketMessage);
    
    return () => {
      webSocketService.removeMessageHandler(handleWebSocketMessage);
      // 确保组件卸载时断开WebSocket连接
      webSocketService.disconnect();
    };
  }, [handleWebSocketMessage]);

  // 使用 useCallback 包装 loadSessions
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await chatApi.getSessions();
      if (response.success && response.data && response.data.sessions) {
        const sessionsWithMessages = response.data.sessions.map(session => ({
          ...session,
          messages: session.messages || [],
        }));
        
        setSessions(sessionsWithMessages);
        
        if (sessionsWithMessages.length > 0 && !currentSessionId) {
          setCurrentSessionId(sessionsWithMessages[0].id);
        }
      } else {
        setError(response.message || '加载会话失败');
      }
    } catch (err) {
      console.error('加载会话失败:', err);
      setError('加载会话时发生错误');
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId]);

  // 加载会话消息
  const loadSessionMessages = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await chatApi.getMessages(sessionId);
      if (response.success && response.data) {
        // 将API消息转换为应用消息
        const messages = response.data.map(convertApiMessageToMessage);
        
        // 更新会话的消息
        setSessions(prevSessions =>
          prevSessions.map(session => {
            if (session.id === sessionId) {
              return {
                ...session,
                messages,
              };
            }
            return session;
          })
        );
      } else {
        setError(response.message || '加载消息失败');
      }
    } catch (err) {
      console.error('加载消息失败:', err);
      setError('加载消息时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化加载会话
  useEffect(() => {
    if (user) {
      log('用户已登录，开始加载会话');
      loadSessions();
    } else {
      log('用户未登录，不加载会话');
    }
  }, [loadSessions, user]);

  // 当选择会话时，加载该会话的消息
  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId]);

  const createSession = async () => {
    if (!user) {
      setError('用户未登录，无法创建会话');
      log('用户未登录，无法创建会话');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const title = `新会话 ${sessions.length + 1}`;
      const response = await chatApi.createSession(title, user.id);
      
      log('创建会话响应:', response);
      
      if (response.success && response.data) {
        const responseData = response.data;
        const newSessionId = responseData.id;
        if (!newSessionId) {
          setError('创建会话失败：响应中缺少会话ID');
          log('创建会话失败：响应中缺少会话ID', responseData);
          setIsLoading(false);
          return;
        }

        const newSession: ChatSession = {
          id: String(newSessionId),
          userId: String(user.id),
          title: responseData.session_name || title,
          status: 'ACTIVE',
          createTime: responseData.created_at || new Date().toISOString(),
          updateTime: responseData.updated_at || new Date().toISOString(),
          messages: [],
        };
        
        log('创建新会话:', newSession);
        
        setSessions(prevSessions => [...prevSessions, newSession]);
        setCurrentSessionId(newSession.id);
        
        // 不再在此处连接WebSocket
        log(`新会话已创建，ID=${newSession.id}`);
      } else {
        setError(response.message || '创建会话失败');
      }
    } catch (err) {
      console.error('创建会话失败:', err);
      setError('创建会话时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const deleteSession = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await chatApi.deleteSession(sessionId);
      
      if (response.success) {
        setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
        
        // 如果删除的是当前会话，则选择第一个会话或者设为null
        if (currentSessionId === sessionId) {
          const remainingSessions = sessions.filter(session => session.id !== sessionId);
          setCurrentSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
        }
      } else {
        setError(response.message || '删除会话失败');
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('删除会话时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 检查是否有活动会话，如果没有则创建一个新会话
      if (!currentSession) {
        log('没有活动会话，自动创建新会话');
        await createSession();
        
        // 等待会话创建完成
        if (!currentSession) {
          const checkInterval = setInterval(() => {
            if (currentSession) {
              clearInterval(checkInterval);
              // 会话创建后递归调用自己继续发送消息
              sendMessage(content).catch(err => {
                log('创建会话后发送消息失败:', err);
              });
            }
          }, 500);
          
          // 设置超时以防止无限等待
          setTimeout(() => {
            clearInterval(checkInterval);
            log('等待会话创建超时');
          }, 10000);
          
          setIsLoading(false);
          return;
        }
      }
      
      log('开始发送消息流程，当前会话:', currentSession);
      
      // 创建用户消息
      const userMessage: Message = {
        id: uuidv4(),
        content,
        role: 'user',
        timestamp: new Date(),
      };
      
      log('创建用户消息:', userMessage);
      
      // 创建助手消息占位
      const assistantMessage: Message = {
        id: uuidv4(),
        content: '正在处理您的请求...',
        role: 'assistant',
        timestamp: new Date(),
        status: 'processing',
        progress: {
          intent: '分析中...',
          medical_info: '分析中...',
          medical_record: '分析中...'
        }
      };
      
      log('创建助手消息占位:', assistantMessage);
      
      // 直接更新会话对象中的消息
      const updatedSession = {
        ...currentSession,
        messages: [...(currentSession.messages || []), userMessage, assistantMessage]
      };
      
      // 更新state
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === currentSession.id ? updatedSession : session
        )
      );
      
      // 确保当前会话ID存在
      if (!currentSession || !currentSession.id) {
        throw new Error('当前会话ID不存在，无法发送消息');
      }

      // 现在连接WebSocket，而不是在创建会话时连接
      if (webSocketService.getStatus() !== 'connected') {
        log('WebSocket未连接，正在连接...');
        webSocketService.connect(currentSession.id);
        
        // 等待WebSocket连接成功
        await new Promise<void>((resolve, reject) => {
          const maxWaitTime = 5000; // 最长等待5秒
          const startTime = Date.now();
          
          const checkConnection = () => {
            if (webSocketService.getStatus() === 'connected') {
              log('WebSocket连接成功');
              resolve();
            } else if (Date.now() - startTime > maxWaitTime) {
              log('WebSocket连接超时');
              reject(new Error('WebSocket连接超时'));
            } else {
              setTimeout(checkConnection, 200);
            }
          };
          checkConnection();
        }).catch(err => {
          log('WebSocket连接失败:', err);
          // 连接失败时也继续执行，可能会使用HTTP API
        });
      }
      
      // 使用WebSocket发送消息
      webSocketService.sendMessage(content);
      
      // 保存用户消息到数据库
      try {
        const response = await chatApi.sendMessage(currentSession.id, content);
        
        if (!response.success) {
          log('保存用户消息失败:', response.message);
        }
      } catch (error) {
        log('保存用户消息时发生错误:', error);
        // 这里不抛出异常，因为消息已经显示在界面上了
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setError('发送消息时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    if (currentSessionId) {
      setSessions(prevSessions =>
        prevSessions.map(session => {
          if (session.id === currentSessionId) {
            return {
              ...session,
              messages: [],
              updateTime: new Date().toISOString(),
            };
          }
          return session;
        })
      );
    }
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        currentSession,
        isLoading,
        error,
        wsStatus,
        createSession,
        selectSession,
        deleteSession,
        sendMessage,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 