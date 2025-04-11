import axios from 'axios';
import { USER_API } from '../config/apiConfig';
import { User } from '../types';

export const authService = {
  register: async (username: string) => {
    try {
      const response = await axios.post(USER_API.LOGIN, { username });
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },
  
  login: async (username: string): Promise<User> => {
    try {
      const response = await axios.post(USER_API.LOGIN, { username });
      // 简化逻辑：只要返回了用户ID（无论是新用户还是已存在的用户），就保存到localStorage
      if (response.data && response.data.id) {
        localStorage.setItem('userId', response.data.id.toString());
        localStorage.setItem('username', response.data.username);
      }
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('userId');
  },
  
  getUserId: () => {
    return parseInt(localStorage.getItem('userId') || '0', 10);
  },
  
  getUsername: () => {
    return localStorage.getItem('username');
  }
}; 