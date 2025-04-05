import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const [userError, setUserError] = useState<string | null>(null);
  
  const handleLogin = async (values: { username: string }) => {
    if (!values.username.trim()) {
      setUserError('请输入用户名');
      return;
    }
    
    setUserError(null);
    await login(values.username);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            AI医学知识聊天机器人
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            智能医疗问诊，专业知识助手
          </p>
        </div>
        
        <Card 
          className="w-full shadow-md dark:bg-gray-800 dark:border-gray-700" 
          bordered={false}
        >
          <div className="text-xl font-medium text-center mb-6">用户登录</div>
          
          <Form
            name="login"
            layout="vertical"
            onFinish={handleLogin}
            autoComplete="off"
          >
            <Form.Item
              name="username"
              validateStatus={userError ? 'error' : ''}
              help={userError}
              rules={[{ required: true, message: '请输入您的用户名' }]}
            >
              <Input 
                prefix={<UserOutlined className="text-gray-400" />} 
                placeholder="用户名" 
                size="large" 
              />
            </Form.Item>
            
            <Form.Item>
              <div className="text-sm text-gray-500 mb-4">
                请输入用户名登录，无需密码，新用户将自动注册
              </div>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="w-full"
                size="large"
                loading={isLoading}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
          
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              className="mt-4"
            />
          )}
          
          {isLoading && (
            <div className="flex justify-center mt-4">
              <Spin tip="处理中..." />
            </div>
          )}
        </Card>
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© 2023 AI医学知识聊天机器人. 保留所有权利.</p>
          <p className="mt-2">本系统仅供参考，不构成医疗建议</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 