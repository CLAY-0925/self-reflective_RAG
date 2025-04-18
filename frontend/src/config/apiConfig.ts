/**
 * API Configuration File
 * Unified management of all API URLs
 */

// Base URL
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
// User related APIs
export const USER_API = {
  LOGIN: `${BASE_URL}/users`,
};

// Session related APIs
export const SESSION_API = {
  CREATE: `${BASE_URL}/sessions`,
  GET_USER_SESSIONS: (userId: number) => `${BASE_URL}/users/${userId}/sessions`,
  GET_SESSION: (sessionId: number) => `${BASE_URL}/sessions/${sessionId}`,
  GET_MESSAGES: (sessionId: number) => `${BASE_URL}/sessions/${sessionId}/messages`,
  CLEAR_MESSAGES: (sessionId: number) => `${BASE_URL}/sessions/${sessionId}/messages`,
};

// WebSocket API
export const WEBSOCKET_API = {
  CHAT: (sessionId: number, userId: number) => `ws://localhost:8000/api/ws/chat?sessionId=${sessionId}&userId=${userId}`,
};

// Medical record related APIs
export const MEDICAL_RECORD_API = {
  GET: (sessionId: number) => `${BASE_URL}/medical-record/${sessionId}`,
  UPDATE: `${BASE_URL}/medical-record`
};

export const USER_FOCUS_API = {
  GET: (sessionId: number) => `${BASE_URL}/user-focus/${sessionId}`
};

// Configuration object
export const API_CONFIG = {
  BASE_URL,
  USER_API,
  SESSION_API,
  WEBSOCKET_API,
  MEDICAL_RECORD_API,
  USER_FOCUS_API
}; 