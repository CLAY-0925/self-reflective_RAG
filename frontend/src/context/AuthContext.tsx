import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../api/auth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 检查是否已经登录
    const username = authService.getUsername();
    const userId = authService.getUserId();
    
    if (username && userId) {
      setUser({
        username,
        id: userId,
        created_at: '', // 无法从本地存储获取，设为空
        is_existing: true,
        message: null
      });
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authService.login(username);
      
      // 无论用户是否已存在，只要没有错误信息，都视为登录成功
      // 例如：新用户注册成功 或 老用户欢迎回来
      setUser(response);
    } catch (error) {
      setError('登录失败，请稍后重试');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 