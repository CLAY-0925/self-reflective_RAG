import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  UserOutlined, 
  LogoutOutlined, 
  MoonOutlined, 
  SunOutlined 
} from '@ant-design/icons';
import { Dropdown, Button, Space, Avatar, message } from 'antd';
import type { MenuProps } from 'antd';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const handleLogout = () => {
    logout();
    message.success('Logged out successfully');
  };
  
  const items: MenuProps['items'] = [
    {
      key: 'username',
      label: <span className="font-semibold">{user?.username || 'Not logged in'}</span>,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: (
        <Space>
          <LogoutOutlined />
          <span>Logout</span>
        </Space>
      ),
      onClick: handleLogout,
    },
  ];

  return (
    <div className="w-full h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center">
        <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
          AI Medical Knowledge Chatbot
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <Button
          type="text"
          icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
          className="flex items-center justify-center"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        />
        
        {user ? (
          <Dropdown menu={{ items }} placement="bottomRight">
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 py-1 px-2 rounded-md">
              <Avatar
                icon={<UserOutlined />}
                className="bg-primary-500"
              />
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {user.username}
              </span>
            </div>
          </Dropdown>
        ) : (
          <span className="text-gray-500">Not logged in</span>
        )}
      </div>
    </div>
  );
};

export default Header; 