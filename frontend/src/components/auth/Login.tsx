import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const [userError, setUserError] = useState<string | null>(null);
  
  const handleLogin = async (values: { username: string }) => {
    if (!values.username.trim()) {
      setUserError('Please enter a username');
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
            AI Medical Knowledge Chatbot
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Intelligent medical consultation, professional knowledge assistant
          </p>
        </div>
        
        <Card 
          className="w-full shadow-md dark:bg-gray-800 dark:border-gray-700" 
          bordered={false}
        >
          <div className="text-xl font-medium text-center mb-6">User Login</div>
          
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
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input 
                prefix={<UserOutlined className="text-gray-400" />} 
                placeholder="Username" 
                size="large" 
              />
            </Form.Item>
            
            <Form.Item>
              <div className="text-sm text-gray-500 mb-4">
                Please enter your username to login, no password required, new users will be automatically registered
              </div>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="w-full"
                size="large"
                loading={isLoading}
              >
                Login
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
              <Spin tip="Processing..." />
            </div>
          )}
        </Card>
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© 2023 AI Medical Knowledge Chatbot. All rights reserved.</p>
          <p className="mt-2">This system is for reference only and does not constitute medical advice</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 