import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { chatService } from '../api/chat';
import { useAuth } from './AuthContext';
import { 
  ChatSession, 
  ChatMessage, 
  AIStatus, 
  MedicalRecord, 
  SearchResult,
  AIOptions,
  WebSocketResponse,
  FocusPoints,
  FocusResult
} from '../types';

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  aiStatus: AIStatus;
  medicalRecord: MedicalRecord | null;
  searchResults: SearchResult[];
  aiOptions: AIOptions;
  followUpQuestions: string[];
  focusPoints: FocusPoints;
  scrollToMessageId: number | null;
  setAiOptions: (options: AIOptions) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  createSession: (title: string) => Promise<void>;
  sendMessage: (content: string) => void;
  updateMedicalRecord: (record: MedicalRecord) => Promise<void>;
  clearMessages: (sessionId: number) => Promise<void>;
  handleFocusPointClick: (focusKey: string) => void;
}

// 扩展服务响应类型
interface SessionResponse {
  success: boolean;
  message: string;
  sessionId: string;
  title: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const initialAIOptions: AIOptions = {
  enableMedicalAgent: true,
  enableIntentPrediction: true,
  enableMedicalSummary: true,
  enableWebSearch: true
};

const initialAIStatus: AIStatus = {
  intent: '分析中...',
  medical_info: '分析中...',
  medical_record: '分析中...'
};

// 默认的空医疗记录结构
const defaultMedicalRecord: MedicalRecord = {
  confirmed_info: {
    基本信息: '',
    主诉: '',
    症状描述: '',
    现病史: '',
    既往史: '',
    用药情况: '',
    家族史: ''
  },
  pending_clues: {
    待确认症状: '',
    需澄清细节: ''
  },
  stage: {
    信息收集: 0,
    鉴别诊断: 0
  }
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>(initialAIStatus);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [aiOptions, setAiOptions] = useState<AIOptions>(initialAIOptions);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [focusPoints, setFocusPoints] = useState<FocusPoints>({});
  const [focusPointIndices, setFocusPointIndices] = useState<{[key: string]: number}>({});
  const [scrollToMessageId, setScrollToMessageId] = useState<number | null>(null);

  // 会话切换处理函数
  const handleSessionChange = (session: ChatSession | null) => {
    // 更新当前会话（不再直接清空跟进问题，由loadSessionMessages处理）
    setCurrentSession(session);
    
    // 重置状态
    if (!session) {
      setFollowUpQuestions([]);
      setFocusPoints({});
      setFocusPointIndices({});
    } else {
      // 加载用户关注问题
      loadUserFocusPoints(session.id);
    }
  };

  useEffect(() => {
    if (user) {
      loadSessions();
    } else {
      // 用户登出，断开连接
      chatService.disconnectSocket();
      setSessions([]);
      handleSessionChange(null);
      setMessages([]);
      setIsConnected(false);
    }

    return () => {
      chatService.disconnectSocket();
    };
  }, [user]);

  // 当前会话改变时，加载聊天记录并初始化WebSocket
  useEffect(() => {
    if (currentSession) {
      loadSessionMessages(currentSession.id);
      loadMedicalRecord(currentSession.id);
      loadUserFocusPoints(currentSession.id);
      initSocket(currentSession.id);
    }
  }, [currentSession]);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await chatService.getSessions();
      setSessions(data);
    } catch (error) {
      setError('加载会话失败');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionMessages = async (sessionId: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await chatService.getSessionMessages(sessionId);
      setMessages(data);
      
      // 加载消息后，检查最后一条消息是否是AI回复，如果是则尝试提取跟进问题
      if (data.length > 0) {
        const lastMessage = data[data.length - 1];
        if (lastMessage.role === 'assistant') {
          // 初始化一个空的问题数组
          let questions: string[] = [];
          
          // 尝试从lastMessage.follow_up_questions中提取跟进问题
          if (lastMessage.follow_up_questions) {
            try {
              // 处理字符串类型的follow_up_questions（逗号分隔）
              if (typeof lastMessage.follow_up_questions === 'string') {
                questions = lastMessage.follow_up_questions.split(',').map(q => q.trim());
              } 
              // 处理数组类型的follow_up_questions
              else if (Array.isArray(lastMessage.follow_up_questions)) {
                questions = lastMessage.follow_up_questions;
              }
            } catch (error) {
              console.error('解析消息中的follow_up_questions失败:', error);
            }
          }
          
          // 尝试从消息内容中解析JSON内容，查找follow_up_questions字段
          if (questions.length === 0 && lastMessage.content) {
            try {
              // 尝试从消息内容中提取JSON
              const contentMatches = lastMessage.content.match(/```json\n([\s\S]*?)\n```/);
              if (contentMatches && contentMatches[1]) {
                const jsonContent = JSON.parse(contentMatches[1]);
                if (jsonContent.follow_up_questions && Array.isArray(jsonContent.follow_up_questions)) {
                  questions = jsonContent.follow_up_questions;
                }
              }
            } catch (error) {
              console.error('从消息内容中解析follow_up_questions失败:', error);
            }
          }
          
          // 过滤出有效问题并更新状态
          const validQuestions = questions.filter(q => q && q.trim().length > 0);
          if (validQuestions.length > 0) {
            setFollowUpQuestions(validQuestions);
          } else {
            // 如果没有找到有效的跟进问题，则清空
            setFollowUpQuestions([]);
          }
        } else {
          // 如果最后一条消息不是AI回复，则清空跟进问题
          setFollowUpQuestions([]);
        }
      } else {
        // 如果没有消息，则清空跟进问题
        setFollowUpQuestions([]);
      }
    } catch (error) {
      setError('加载聊天记录失败');
      console.error(error);
      setFollowUpQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMedicalRecord = async (sessionId: number) => {
    try {
      const response = await chatService.getMedicalRecord(sessionId);
      
      // 检查response.record_content是否为空JSON字符串
      if (response.record_content === "{}" || response.record_content === "") {
        console.log('医疗记录为空，使用默认记录');
        setMedicalRecord(defaultMedicalRecord);
        return;
      }
      
      try {
        const record = JSON.parse(response.record_content) as MedicalRecord;
        
        // 验证解析后的记录是否具有完整的结构
        const isValidRecord = record && 
          record.confirmed_info && 
          record.pending_clues && 
          record.stage && 
          (typeof record.stage.信息收集 === 'number' || typeof record.stage.信息收集 === 'string') &&
          (typeof record.stage.鉴别诊断 === 'number' || typeof record.stage.鉴别诊断 === 'string');
        
        // 只有当记录有效时才更新
        if (isValidRecord) {
          setMedicalRecord(record);
        } else {
          console.error('加载的医疗记录数据结构不完整，使用默认记录');
          setMedicalRecord(defaultMedicalRecord);
        }
      } catch (e) {
        console.error('解析医疗记录失败，使用默认记录:', e);
        setMedicalRecord(defaultMedicalRecord);
      }
    } catch (error: any) {
      // 处理API错误，如果是"医疗记录不存在"，则使用默认记录
      if (error.response && error.response.data && error.response.data.detail === "医疗记录不存在") {
        console.log('医疗记录不存在，使用默认记录');
        setMedicalRecord(defaultMedicalRecord);
      } else {
        console.error('获取医疗记录失败:', error);
      }
    }
  };

  const loadUserFocusPoints = async (sessionId: number) => {
    try {
      const data = await chatService.getUserFocusPoints(sessionId);
      setFocusPoints(data.focus_points);
      
      // 初始化每个关注点的当前索引为0
      const initialIndices: {[key: string]: number} = {};
      Object.keys(data.focus_points).forEach(key => {
        initialIndices[key] = 0;
      });
      setFocusPointIndices(initialIndices);
    } catch (error) {
      console.error('加载用户关注问题失败:', error);
    }
  };

  const initSocket = (sessionId: number) => {
    chatService.initSocket(
      handleMessage,
      () => setIsConnected(true),
      () => setIsConnected(false),
      sessionId
    );
  };

  const handleMessage = (data: WebSocketResponse) => {
    if (data.type === 'error') {
      setError(data.message || '未知错误');
      setIsGenerating(false);
      return;
    }

    if (data.type === 'status' || data.type === 'progress') {
      setIsGenerating(true);
      
      // 更新AI状态
      if (data.progress) {
        setAiStatus(data.progress);
        
        // 如果有医疗记录结果，立即更新医疗记录
        if (data.progress.medical_record_result && data.progress.medical_record_result.updated_record) {
          try {
            const record = JSON.parse(data.progress.medical_record_result.updated_record) as MedicalRecord;
            
            // 验证解析后的记录是否具有完整的结构
            const isValidRecord = record && 
              record.confirmed_info && 
              record.pending_clues && 
              record.stage && 
              (typeof record.stage.信息收集 === 'number' || typeof record.stage.信息收集 === 'string') &&
              (typeof record.stage.鉴别诊断 === 'number' || typeof record.stage.鉴别诊断 === 'string');
            
            // 只有当记录有效时才更新，否则保留当前记录
            if (isValidRecord) {
              setMedicalRecord(record);
            } else {
              console.error('进度中的医疗记录数据结构不完整，保留当前记录');
            }
          } catch (e) {
            console.error('解析进度中的医疗记录失败，保留当前记录:', e);
          }
        }
        
        // 如果有意图结果，更新跟进问题
        if (data.progress.intent_result && data.progress.intent_result.follow_up_questions) {
          setFollowUpQuestions(data.progress.intent_result.follow_up_questions);
        }

        // 处理用户关注点更新
        if (data.progress.focus_result) {
          const focusResult = data.progress.focus_result as FocusResult;
          setFocusPoints(focusResult.focus_points);
          
          // 如果有新的关注点，初始化它的索引
          if (focusResult.is_new_focus && focusResult.current_focus) {
            setFocusPointIndices(prev => ({
              ...prev,
              [focusResult.current_focus]: 0
            }));
          }
        }
      }
    }

    if (data.type === 'final') {
      // 处理最终回复
      const newMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || '',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMessage]);

      // 更新医疗记录
      if (data.medical_record) {
        try {
          const record = JSON.parse(data.medical_record) as MedicalRecord;
          
          // 验证解析后的记录是否具有完整的结构
          const isValidRecord = record && 
            record.confirmed_info && 
            record.pending_clues && 
            record.stage && 
            (typeof record.stage.信息收集 === 'number' || typeof record.stage.信息收集 === 'string') &&
            (typeof record.stage.鉴别诊断 === 'number' || typeof record.stage.鉴别诊断 === 'string');
          
          // 只有当记录有效时才更新，否则保留当前记录
          if (isValidRecord) {
            setMedicalRecord(record);
          } else {
            console.error('医疗记录数据结构不完整，保留当前记录');
          }
        } catch (e) {
          console.error('解析医疗记录失败，保留当前记录:', e);
        }
      }

      // 更新搜索结果（安全处理）
      if (data.medical_info) {
        try {
          // 尝试将字符串解析为JSON对象（如果是字符串的话）
          let parsedMedicalInfo = data.medical_info;
          
          if (typeof data.medical_info === 'string') {
            try {
              parsedMedicalInfo = JSON.parse(data.medical_info);
            } catch (parseError) {
              console.error('解析medical_info字符串失败:', parseError);
            }
          }
          
          // 确保medical_info是数组
          const safeResults = Array.isArray(parsedMedicalInfo) 
            ? parsedMedicalInfo.filter(item => item && typeof item === 'object')
            : [];
          
          // 在设置状态前进行安全检查
          if (safeResults.length > 0) {
            setSearchResults(safeResults);
          }
        } catch (error) {
          console.error('处理搜索结果失败:', error);
        }
      }

      // 更新跟进问题
      if (data.follow_up_questions) {
        setFollowUpQuestions(data.follow_up_questions);
      }

      // 重置AI状态
      setAiStatus(initialAIStatus);
      
      // 结束生成状态
      setIsGenerating(false);
    }
  };

  const createSession = async (title: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newSession = await chatService.createSession(title);
      setSessions(prev => [newSession, ...prev]);
      handleSessionChange(newSession);
      setMessages([]);
      setMedicalRecord(null);
      setSearchResults([]);
    } catch (error) {
      setError('创建会话失败');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = (content: string) => {
    if (!currentSession) {
      setError('请先创建或选择一个会话');
      return;
    }

    // 添加用户消息到列表
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 设置为生成状态
    setIsGenerating(true);
    
    // 通过WebSocket发送消息
    try {
      chatService.sendMessage(content, aiOptions);
    } catch (error) {
      setError('发送消息失败，请检查连接');
      console.error(error);
      setIsGenerating(false);
    }
  };

  const updateMedicalRecord = async (record: MedicalRecord) => {
    if (!currentSession) {
      setError('没有活动的会话');
      return;
    }

    setMedicalRecord(record);
    
    try {
      await chatService.updateMedicalRecord(currentSession.id, record);
    } catch (error) {
      setError('更新医疗记录失败');
      console.error(error);
    }
  };

  const clearMessages = async (sessionId: number) => {
    try {
      await chatService.clearSessionMessages(sessionId);
      if (currentSession && currentSession.id === sessionId) {
        setMessages([]);
      }
    } catch (error) {
      setError('清空消息失败');
      console.error(error);
    }
  };

  // 处理关注点点击
  const handleFocusPointClick = (focusKey: string) => {
    if (!focusPoints[focusKey] || focusPoints[focusKey].length === 0) {
      return;
    }

    // 获取当前索引，如果不存在则设为0
    const currentIndex = focusPointIndices[focusKey] || 0;
    
    // 计算下一个索引（循环）
    const nextIndex = (currentIndex + 1) % focusPoints[focusKey].length;
    
    console.log(`关注点 ${focusKey}: 当前索引=${currentIndex}, 下一个索引=${nextIndex}, 总长度=${focusPoints[focusKey].length}`);
    
    // 更新索引状态
    setFocusPointIndices({
      ...focusPointIndices,
      [focusKey]: nextIndex
    });
    
    // 获取要滚动到的消息ID
    const messageIdPair = focusPoints[focusKey][nextIndex];
    if (messageIdPair && messageIdPair.length >= 2) {
      console.log(`滚动到消息ID: ${messageIdPair[0]}`);
      
      // 先设置为null，强制触发state更新
      setScrollToMessageId(null);
      
      // 使用setTimeout确保在下一个事件循环中设置新的ID
      setTimeout(() => {
        setScrollToMessageId(messageIdPair[0]);
      }, 0);
    }
  };

  return (
    <ChatContext.Provider 
      value={{
        sessions,
        currentSession,
        messages,
        isConnected,
        isLoading,
        isGenerating,
        error,
        aiStatus,
        medicalRecord,
        searchResults,
        aiOptions,
        followUpQuestions,
        focusPoints,
        scrollToMessageId,
        setAiOptions,
        setCurrentSession: handleSessionChange,
        createSession,
        sendMessage,
        updateMedicalRecord,
        clearMessages,
        handleFocusPointClick
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 