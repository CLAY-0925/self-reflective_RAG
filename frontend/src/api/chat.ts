import axios from 'axios';
import { SESSION_API, WEBSOCKET_API, MEDICAL_RECORD_API, USER_FOCUS_API } from '../config/apiConfig';
import { ChatSession, ChatMessage, AIOptions, MedicalRecord, MedicalRecordResponse, UserFocusResponse } from '../types';
import { authService } from './auth';

// WebSocket连接
let websocket: WebSocket | null = null;

export const chatService = {
  // 初始化WebSocket连接
  initSocket: (
    onMessage: (data: any) => void,
    onConnect: () => void,
    onDisconnect: () => void,
    sessionId: number
  ) => {
    if (websocket) {
      websocket.close();
    }

    const userId = authService.getUserId();
    if (!userId || !sessionId) {
      throw new Error('User ID or session ID does not exist');
    }

    const wsUrl = WEBSOCKET_API.CHAT(sessionId, userId);
    websocket = new WebSocket(wsUrl);

    websocket.onopen = onConnect;
    websocket.onclose = onDisconnect;
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    return websocket;
  },

  // 断开WebSocket连接
  disconnectSocket: () => {
    if (websocket) {
      websocket.close();
      websocket = null;
    }
  },

  // 创建新的聊天会话
  createSession: async (sessionName: string): Promise<ChatSession> => {
    try {
      const userId = authService.getUserId();
      const response = await axios.post(SESSION_API.CREATE, {
        user_id: userId,
        session_name: sessionName
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  },

  // 获取所有聊天会话
  getSessions: async (): Promise<ChatSession[]> => {
    try {
      const userId = authService.getUserId();
      const response = await axios.get(SESSION_API.GET_USER_SESSIONS(userId));
      return response.data;
    } catch (error) {
      console.error('Failed to get sessions:', error);
      throw error;
    }
  },

  // 获取会话消息历史
  getSessionMessages: async (sessionId: number): Promise<ChatMessage[]> => {
    try {
      const response = await axios.get(SESSION_API.GET_MESSAGES(sessionId));
      return response.data;
    } catch (error) {
      console.error('Failed to get message history:', error);
      throw error;
    }
  },

  // 清空会话消息
  clearSessionMessages: async (sessionId: number): Promise<{message: string}> => {
    try {
      const response = await axios.delete(SESSION_API.CLEAR_MESSAGES(sessionId));
      return response.data;
    } catch (error) {
      console.error('Failed to clear session messages:', error);
      throw error;
    }
  },

  // 发送消息 - 直接通过WebSocket发送
  sendMessage: (message: string, options: AIOptions) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const messageData = { message };
    websocket.send(JSON.stringify(messageData));
  },

  // 获取病例记录
  getMedicalRecord: async (sessionId: number): Promise<MedicalRecordResponse> => {
    try {
      const response = await axios.get(MEDICAL_RECORD_API.GET(sessionId));
      return response.data;
    } catch (error) {
      console.error('Failed to get medical record:', error);
      throw error;
    }
  },

  // 更新医疗记录
  updateMedicalRecord: async (sessionId: number, record: MedicalRecord): Promise<MedicalRecordResponse> => {
    try {
      const response = await axios.post(MEDICAL_RECORD_API.UPDATE, {
        session_id: sessionId,
        record_content: JSON.stringify(record)
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update medical record:', error);
      throw error;
    }
  },

  // 获取用户关注问题
  getUserFocusPoints: async (sessionId: number): Promise<UserFocusResponse> => {
    try {
      const response = await axios.get(USER_FOCUS_API.GET(sessionId));
      return response.data;
    } catch (error) {
      console.error('Failed to get user focus points:', error);
      throw error;
    }
  }
}; 