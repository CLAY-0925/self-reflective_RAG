import React, { useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { FaRobot } from 'react-icons/fa';
import IconWrapper from '../common/IconWrapper';
import { log } from '../../utils/config';

const ChatArea: React.FC = () => {
  const { currentSession, sendMessage, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // 记录当前会话的消息，用于调试
  useEffect(() => {
    if (currentSession?.messages) {
      log('当前会话消息数量:', currentSession.messages.length);
      currentSession.messages.forEach((msg, index) => {
        log(`消息 ${index + 1} - 角色: ${msg.role}, ID: ${msg.id}, 内容: ${msg.content?.substring(0, 50)}...`);
      });
    }
  }, [currentSession?.messages]);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;
    sendMessage(content);
  };

  const handleSuggestedQuestionClick = (question: string) => {
    sendMessage(question);
  };

  // 确保messages数组存在并且正确排序
  const messages = currentSession?.messages || [];
  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {currentSession && hasMessages ? (
          <div className="space-y-4">
            {messages.map(message => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                onSuggestedQuestionClick={handleSuggestedQuestionClick}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-primary-light/20 dark:bg-primary-dark/30 p-6 rounded-full mb-4">
              <IconWrapper icon={FaRobot} className="text-5xl text-primary-main dark:text-primary-light" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              AI医学知识助手
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              您可以向我询问任何医学相关问题，我将尽力为您提供专业、准确的回答。
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              {[
                '什么是高血压？如何预防？',
                '糖尿病的早期症状有哪些？',
                '感冒和流感有什么区别？',
                '如何保持健康的生活方式？'
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(suggestion)}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="text-gray-800 dark:text-white font-medium">{suggestion}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatArea; 