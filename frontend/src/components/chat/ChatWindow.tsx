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
  
  // Listen for message changes and auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, followUpQuestions]);
  
  // Listen for scrollToMessageId changes and scroll to specified message
  useEffect(() => {
    if (scrollToMessageId && messageRefs.current[scrollToMessageId]) {
      messageRefs.current[scrollToMessageId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Highlight the message
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
  
  // If no current session, show welcome message
  if (!currentSession) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-primary-600 dark:text-primary-400">Welcome to AI Medical Knowledge Chatbot</h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Please create or select a session on the left to start chatting
          </p>
          <div className="p-4 bg-primary-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This AI Medical Knowledge Chatbot can help you answer medical-related questions and provide reference advice, but it cannot replace professional medical diagnosis and advice.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat window title */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-medium text-lg">{currentSession.session_name}</h2>
        {isLoading && <Spin size="small" />}
      </div>
      
      {/* Error message alert */}
      {error && (
        <Alert 
          message={error} 
          type="error" 
          showIcon 
          closable 
          className="m-2"
        />
      )}
      
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            Send your first message to start chatting
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                ref={el => {
                  // Save to refs if message has ID
                  if (msg.id) {
                    messageRefs.current[msg.id] = el;
                  }
                }}
                className="message-item transition-all duration-300"
              >
                <MessageItem message={msg} />
              </div>
            ))}
            
            {/* Show follow-up questions, only when last message is AI response and not generating */}
            {messages.length > 0 && 
             messages[messages.length - 1].role === 'assistant' && 
             !isGenerating && 
             followUpQuestions.length > 0 && (
              <FollowUpQuestions questions={followUpQuestions} />
            )}
          </>
        )}
        
        {/* AI typing status indicator - only shown during generation */}
        {isGenerating && (
          <div className="ml-12 animate-pulse">
            <AIStatusIndicator status={aiStatus} />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input box */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Input.TextArea
            placeholder="Type a message..."
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
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 