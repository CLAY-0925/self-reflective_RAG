import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginRequest, UserCreationResponse } from '../types';
import { authApi, setUserStorage, clearUserStorage, getUserStorage } from '../services/api';
import { config, log, isProduction } from '../utils/config';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userExisting: boolean | null;
  login: (data: LoginRequest) => Promise<boolean>;
  logout: () => void;
  clearUserExistingStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userExisting, setUserExisting] = useState<boolean | null>(null);

  const clearUserExistingStatus = () => {
    setUserExisting(null);
  };

  useEffect(() => {
    setIsLoading(true); 
    try {
      const storedUser = getUserStorage(); 
      if (storedUser) {
        log('从存储恢复用户:', storedUser);
        setUser(storedUser);
      } else {
        log('存储中无用户数据');
        setUser(null); 
      }
    } catch (err) {
      console.error('检查用户状态时出错:', err);
      setUser(null); 
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setUserExisting(null);
    
    try {
      if (process.env.NODE_ENV === 'development' && config.enableDebugLogging && !isProduction() && false) {
        const mockUser: User = {
          id: 1,
          username: data.username,
        };
        setUserStorage(mockUser);
        setUser(mockUser);
        setIsLoading(false);
        log('使用模拟用户登录:', mockUser);
        return true;
      }

      const response = await authApi.login(data.username);
      log('登录响应:', response);

      if (!response.success) {
        setError(response.message || '登录失败，未获取到用户信息');
        setIsLoading(false);
        return false;
      }

      if (response.data) {
        const responseData: UserCreationResponse = response.data;
        
        setUserExisting(!!responseData.is_existing);
        
        const userData: User = {
          id: responseData.id,
          username: responseData.username,
        };

        log('登录成功，用户信息:', userData, '用户是否已存在:', responseData.is_existing);

        setUserStorage(userData);
        setUser(userData);
        setIsLoading(false);
        
        return true;
      } 
      else {
        setError('登录成功但无法获取用户信息');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error('登录错误:', err);
      const message = (err instanceof Error) ? err.message : '登录过程中发生未知错误';
      setError(message);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    clearUserStorage();
    setUser(null);
    setUserExisting(null);
    log('用户已登出');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        userExisting,
        login,
        logout,
        clearUserExistingStatus,
      }}
    >
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