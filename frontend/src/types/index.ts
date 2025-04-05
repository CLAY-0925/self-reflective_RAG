// 聊天消息类型
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  messageType?: 'USER' | 'BOT';
  medicalInfo?: any;
  relatedQuestions?: string[];
  medicalRecord?: {
    confirmed_info: {
      基本信息: string;
      主诉: string;
      症状描述: string;
      现病史: string;
      既往史: string;
      用药情况: string;
      家族史: string;
    };
    pending_clues: {
      待确认症状: string;
      需澄清细节: string;
    };
    stage: {
      信息收集: number;
      鉴别诊断: number;
    };
  };
  // 处理状态
  status?: 'processing' | 'complete';
  // 处理进度
  progress?: {
    intent: string;
    medical_info: string;
    medical_record: string;
    intent_result?: IntentResult;
    medical_record_result?: MedicalRecordResult;
  };
  // 医疗信息结果
  medicalInfoItems?: MedicalInfoItem[];
  // 关键词
  keywords?: string[];
  // 处理状态信息
  processingStatus?: {
    intent?: string;
    medical_info?: string;
    medical_record?: string;
  };
  // 消息是否正在流式传输
  isStreaming?: boolean;
  // WebSocket消息类型，用于内部通信
  type?: 'status' | 'progress' | 'final' | 'message';
  // 会话ID，用于内部通信
  session_id?: string;
}

// 聊天会话类型
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  status: 'ACTIVE' | 'CLOSED';
  createTime: string;
  updateTime: string;
  messages?: Message[];
}

// 知识库类型
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documents: Document[];
}

// 文档类型
export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'pdf' | 'image';
  url?: string;
}

// 大模型类型
export type ModelType = 'deepseek' | 'chatgpt4' | 'glm4';

// 应用设置类型
export interface AppSettings {
  theme: 'light' | 'dark';
  model: ModelType;
  enableMedicalAgent: boolean;
  enableIntentPrediction: boolean;
  enableCaseSummary: boolean;
  enableWebSearch: boolean;
}

// 搜索结果类型
export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
}

// 病例类型
export interface MedicalCase {
  id: string;
  patientInfo: {
    name?: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
  };
  symptoms: string[];
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

// 用户类型
export interface User {
  id: number;
  username: string;
  email?: string;
  token?: string;
}

// 登录请求类型
export interface LoginRequest {
  username: string;
}

// 注册请求类型
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// 通用API响应类型
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// 登录响应类型
export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  username?: string;
}

// 创建会话响应类型 - 修改为匹配后端返回的完整会话对象
export interface CreateSessionResponse {
  id: number;
  user_id: number;
  session_name: string;
  created_at: string;
  updated_at: string;
}

// 获取会话列表响应类型
export interface GetSessionsResponse {
  success: boolean;
  sessions?: ChatSession[];
}

// 聊天消息API类型
export interface ApiMessage {
  id: string;
  userId: string;
  sessionId: string;
  messageType: 'USER' | 'BOT';
  content: string;
  medicalInfo: any | null;
  relatedQuestions: string[] | null;
  createTime: string;
}

// 用户登录/创建的 API 响应类型
export interface UserCreationResponse {
  id: number;
  username: string;
  created_at: string;
  is_existing?: boolean;
  message?: string | null;
}

// WebSocket消息类型
export type WebSocketMessageType = 'status' | 'progress' | 'final';

// WebSocket状态消息
export interface WebSocketStatusMessage {
  type: 'status';
  message: string;
  progress: {
    intent: string;
    medical_info: string;
    medical_record: string;
  };
}

// 意图处理结果
export interface IntentResult {
  intent: string;
  follow_up_questions: string[];
}

// 医疗记录处理结果
export interface MedicalRecordResult {
  updated_record: {
    confirmed_info: {
      主诉?: string;
      症状描述?: string;
      [key: string]: string | undefined;
    };
    [key: string]: any;
  };
}

// WebSocket进度消息
export interface WebSocketProgressMessage {
  type: 'progress';
  progress: {
    intent: string;
    medical_info: string;
    medical_record: string;
    intent_result?: IntentResult;
    medical_record_result?: MedicalRecordResult;
  };
}

// 医疗信息源
export interface MedicalInfoSource {
  tittle: string;
  content: string;
  link: string;
}

// 医疗信息条目
export interface MedicalInfoItem {
  content: Array<Record<string, string>>;
  source: MedicalInfoSource;
  title: string;
}

// WebSocket最终消息
export interface WebSocketFinalMessage {
  type: 'final';
  message: string;
  follow_up_questions: string[];
  medical_record: string;
  medical_info?: MedicalInfoItem[];
  keywords?: string[];
}

// 统一WebSocket消息类型
export type WebSocketMessage = WebSocketStatusMessage | WebSocketProgressMessage | WebSocketFinalMessage;