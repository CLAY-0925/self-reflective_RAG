// 用户相关类型
export interface User {
  username: string;
  id: number;
  created_at: string;
  is_existing: boolean;
  message: string | null;
}

// 聊天会话相关类型
export interface ChatSession {
  id: number;
  user_id: number;
  session_name: string;
  created_at: string;
  updated_at: string;
}

// 聊天消息相关类型
export interface ChatMessage {
  id?: number;
  session_id?: number;
  role: 'user' | 'assistant';
  content: string;
  intent?: string | null;
  keywords?: string | null;
  medical_info?: string | null;
  follow_up_questions?: string | null;
  created_at?: string;
}

// AI回复状态
export interface AIStatus {
  intent: string;
  medical_info: string;
  medical_record: string;
  intent_result?: {
    intent: string;
    follow_up_questions: string[];
  };
  medical_record_result?: {
    previous_record: string;
    updated_record: string;
  };
  focus_result?: FocusResult;
}

// WebSocket回复类型
export interface WebSocketResponse {
  type: 'status' | 'progress' | 'final' | 'error';
  message?: string;
  progress?: AIStatus;
  follow_up_questions?: string[];
  medical_record?: string;
  medical_info?: SearchResult[];
  keywords?: string[];
}

// 医疗记录相关
export interface MedicalRecordConfirmedInfo {
  Basic_Info: string;
  Chief_Complaint: string;
  Symptom_Description: string;
  History_of_Present_Illness: string;
  Past_Medical_History: string;
  Medications: string;
  Family_History: string;
}

export interface MedicalRecordPendingClues {
  Symptoms_to_Confirm: string;
  Details_Needing_Clarification: string;
}

export interface MedicalRecordStage {
  "Medical record progress": number | string;
  "Diagnosis and treatment progress": number | string;
}

export interface MedicalRecord {
  confirmed_info: MedicalRecordConfirmedInfo;
  pending_clues: MedicalRecordPendingClues;
  stage: MedicalRecordStage;
}

export interface MedicalRecordResponse {
  record_content: string;
  id: number;
  session_id: number;
  created_at: string;
  updated_at: string;
  state?: boolean;
}

// 联网搜索结果
export interface SearchSource {
  title: string;
  content: string;
  link: string;
}

export interface SearchResult {
  content: any[];
  source: SearchSource;
  title: string;
}

// 用户关注问题
export interface FocusPoints {
  [key: string]: [number, number][];
}

export interface UserFocusResponse {
  session_id: number;
  focus_points: FocusPoints;
}

export interface FocusResult {
  focus_points: FocusPoints;
  current_focus: string;
  is_new_focus: boolean;
}

// AI配置选项
export interface AIOptions {
  enableMedicalAgent: boolean;
  enableIntentPrediction: boolean;
  enableMedicalSummary: boolean;
  enableWebSearch: boolean;
} 