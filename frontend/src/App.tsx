import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DebugPage from './components/debug/DebugPage';

function App() {
  const [isStorageAvailable, setIsStorageAvailable] = useState<boolean | null>(null);

  // 检查localStorage是否可用
  useEffect(() => {
    try {
      localStorage.setItem('storage_test', 'test');
      localStorage.removeItem('storage_test');
      setIsStorageAvailable(true);
    } catch (e) {
      console.warn('localStorage is not available:', e);
      setIsStorageAvailable(false);
    }
  }, []);

  // 如果还在检查localStorage可用性，显示加载中
  if (isStorageAvailable === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>正在初始化应用...</p>
        </div>
      </div>
    );
  }

  // 如果localStorage不可用，显示警告和调试选项
  if (isStorageAvailable === false) {
    return (
      <Router>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-xl font-bold text-red-600 mb-4">浏览器存储不可用</h1>
            <p className="mb-4">
              此应用需要访问浏览器的localStorage功能，但当前环境不支持或已被禁用。
            </p>
            <p className="mb-4">
              可能的原因：
              <ul className="list-disc text-left pl-5 mt-2">
                <li>您正在使用隐私模式浏览</li>
                <li>浏览器设置中禁用了存储功能</li>
                <li>您的浏览器不支持localStorage</li>
                <li>您正在使用不支持的环境访问此应用</li>
              </ul>
            </p>
            <div className="mt-6">
              <Link 
                to="/debug" 
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                进入调试模式
              </Link>
            </div>
          </div>
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppSettingsProvider>
            <ChatProvider>
              <Routes>
                {/* 根路径自动重定向到登录或受保护的主页 */}
                <Route path="/" element={<Navigate to="/chat" replace />} />
                {/* 登录路由 */}
                <Route path="/login" element={<Login />} />
                {/* 调试页面 */}
                <Route path="/debug" element={<DebugPage />} />
                {/* 受保护的路由 - 需要登录才能访问 */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/chat" element={<Layout />} />
                </Route>
                {/* 捕获所有未匹配的路由，重定向到根路径 */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ChatProvider>
          </AppSettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
