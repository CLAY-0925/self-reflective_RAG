import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useAuth } from '../../context/AuthContext';
import { ModelType } from '../../types';
import { FaBars, FaSun, FaMoon, FaUser, FaSignOutAlt } from 'react-icons/fa';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { settings, setModel } = useAppSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 点击用户图标时切换用户菜单的显示状态
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  // 处理登出
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 点击外部区域关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value as ModelType);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md py-3 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="mr-4 text-gray-700 dark:text-gray-300 hover:text-primary-main dark:hover:text-primary-light transition-colors"
          aria-label="Toggle Sidebar"
        >
          <span className="text-xl">
            <FaBars />
          </span>
        </button>
        <h1 className="text-xl font-bold text-primary-main dark:text-primary-light">
          AI医学知识助手
        </h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <select
            value={settings.model}
            onChange={handleModelChange}
            className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-4 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-main dark:focus:ring-primary-light"
          >
            <option value="deepseek">DeepSeek</option>
            <option value="chatgpt4">ChatGPT-4</option>
            <option value="glm4">GLM-4</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
        
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
        >
          {theme === 'light' ? (
            <span>
              <FaMoon />
            </span>
          ) : (
            <span>
              <FaSun />
            </span>
          )}
        </button>

        {/* 用户信息和登出 */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={toggleUserMenu}
            className="flex items-center space-x-2 p-2 rounded-full bg-primary-light/10 text-primary-main dark:text-primary-light hover:bg-primary-light/20 transition-colors"
          >
            <FaUser className="text-lg" />
            <span className="font-medium">{user?.username || '用户'}</span>
          </button>

          {/* 用户菜单 */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <div className="font-semibold">{user?.username || '用户'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">ID: {user?.id}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              >
                <FaSignOutAlt className="mr-2" />
                登出
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 