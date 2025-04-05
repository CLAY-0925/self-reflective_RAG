import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Spin, Alert } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';
import MessageItem from './MessageItem';
import AIStatusIndicator from './AIStatusIndicator';
import FollowUpQuestions from './FollowUpQuestions';

const ChatWindow: React.FC = () => {
  const {
    currentSession,
    messages,
    isLoading,
    isGenerating,
    error,
    sendMessage,
    aiStatus,
    followUpQuestions,
    scrollToMessageId
  } = useChat();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{[key: number]: HTMLDivElement | null}>({});
  
  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, followUpQuestions]);
  
  // 监听scrollToMessageId变化，滚动到指定消息
  useEffect(() => {
    if (scrollToMessageId && messageRefs.current[scrollToMessageId]) {
      messageRefs.current[scrollToMessageId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // 高亮显示一下该消息
      const element = messageRefs.current[scrollToMessageId];
      if (element) {
        element.classList.add('highlight-message');
        setTimeout(() => {
          element.classList.remove('highlight-message');
        }, 2000);
      }
    }
  }, [scrollToMessageId]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSend = () => {
    if (!input.trim()) return;
    
    sendMessage(input);
    setInput('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // 如果没有当前会话，显示提示
  if (!currentSession) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-primary-600 dark:text-primary-400">欢迎使用AI医学知识聊天机器人</h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            请在左侧创建或选择一个会话开始聊天
          </p>
          <div className="p-4 bg-primary-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              本AI医学知识聊天机器人可以帮助您解答医学相关问题，提供参考意见，但不能替代专业医生的诊断和建议。
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* 聊天窗口标题 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-medium text-lg">{currentSession.session_name}</h2>
        {isLoading && <Spin size="small" />}
      </div>
      
      {/* 错误信息提示 */}
      {error && (
        <Alert 
          message={error} 
          type="error" 
          showIcon 
          closable 
          className="m-2"
        />
      )}
      
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            发送第一条消息开始聊天
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                ref={el => {
                  // 如果消息有ID，保存到refs中
                  if (msg.id) {
                    messageRefs.current[msg.id] = el;
                  }
                }}
                className="message-item transition-all duration-300"
              >
                <MessageItem message={msg} />
              </div>
            ))}
            
            {/* 显示跟进问题，仅在最后一条消息是AI回复且不在生成状态时 */}
            {messages.length > 0 && 
             messages[messages.length - 1].role === 'assistant' && 
             !isGenerating && 
             followUpQuestions.length > 0 && (
              <FollowUpQuestions questions={followUpQuestions} />
            )}
          </>
        )}
        
        {/* AI正在输入的状态提示 - 仅在生成过程中显示 */}
        {isGenerating && (
          <div className="ml-12 animate-pulse">
            <AIStatusIndicator status={aiStatus} />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入框 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Input.TextArea
            placeholder="输入消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="flex-1 mr-2"
            disabled={isLoading || isGenerating}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isGenerating}
            className="flex items-center justify-center"
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 