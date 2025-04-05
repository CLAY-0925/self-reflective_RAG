import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { ChatMessage } from '../../types';
import ReactMarkdown from 'react-markdown';

interface MessageItemProps {
  message: ChatMessage;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <Avatar
          icon={<RobotOutlined />}
          className="mr-2 mt-1 bg-primary-600"
        />
      )}
      
      <div
        className={`max-w-[80%] break-words rounded-lg p-3 ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-none'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
        }`}
      >
        {isUser ? (
          <div>{message.content}</div>
        ) : (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      
      {isUser && (
        <Avatar
          icon={<UserOutlined />}
          className="ml-2 mt-1 bg-secondary-600"
        />
      )}
    </div>
  );
};

export default MessageItem; 