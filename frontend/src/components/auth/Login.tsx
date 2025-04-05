import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaSignInAlt } from 'react-icons/fa';
import IconWrapper from '../common/IconWrapper';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [formError, setFormError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const { login, error, isLoading, userExisting, user, clearUserExistingStatus } = useAuth();
  const navigate = useNavigate();

  // 监听登录状态变化，根据 userExisting 显示不同消息
  useEffect(() => {
    if (user) {
      // 用户登录成功
      if (userExisting) {
        // 用户已存在，显示欢迎回来的消息
        setStatusMessage(`欢迎回来，${user.username}!`);
      } else {
        // 新用户，显示创建成功的消息
        setStatusMessage(`用户 ${user.username} 创建成功!`);
      }

      // 设置短暂延迟后导航到聊天页面，让用户有时间看到消息
      const timer = setTimeout(() => {
        navigate('/chat');
        // 清除状态，确保下次登录时正确显示
        clearUserExistingStatus();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [user, userExisting, navigate, clearUserExistingStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setStatusMessage('');

    if (!username.trim()) {
      setFormError('请输入用户名');
      return;
    }

    await login({ username });
    // 不再需要在这里导航，useEffect 会处理
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            登录到AI医学助手
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            输入您的用户名即可使用
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">
                用户名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconWrapper icon={FaUser} className="text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-primary-main focus:border-primary-main focus:z-10 sm:text-sm"
                  placeholder="用户名"
                />
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {(formError || error) && (
            <div className="text-red-500 text-sm text-center">
              {formError || error}
            </div>
          )}
          
          {/* 状态消息 - 登录/注册成功 */}
          {statusMessage && (
            <div className="text-green-500 text-sm text-center font-medium">
              {statusMessage}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-main hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-main disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <IconWrapper icon={FaSignInAlt} className="text-primary-light group-hover:text-white" />
              </span>
              {isLoading ? '处理中...' : '登录 / 创建用户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 