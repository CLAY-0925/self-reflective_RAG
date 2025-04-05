import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaRegSmile, FaImage, FaMicrophone } from 'react-icons/fa';
import IconWrapper from '../common/IconWrapper';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading = false }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整文本区域高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="relative rounded-lg border border-gray-300 dark:border-gray-600 focus-within:border-primary-main dark:focus-within:border-primary-light focus-within:ring-1 focus-within:ring-primary-main dark:focus-within:ring-primary-light">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入您的医学问题..."
          className="w-full py-3 px-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none resize-none max-h-[200px] min-h-[56px]"
          rows={1}
          disabled={isLoading}
        />
        
        <div className="absolute bottom-2 right-2 flex items-center space-x-2">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="添加表情"
          >
            <IconWrapper icon={FaRegSmile} />
          </button>
          
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="上传图片"
          >
            <IconWrapper icon={FaImage} />
          </button>
          
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="语音输入"
          >
            <IconWrapper icon={FaMicrophone} />
          </button>
          
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className={`p-2 rounded-full ${
              message.trim() && !isLoading
                ? 'bg-primary-main text-white hover:bg-primary-dark'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            aria-label="发送消息"
          >
            <IconWrapper icon={FaPaperPlane} />
          </button>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
        AI医学助手仅提供参考信息，不构成医疗建议，请咨询专业医生进行诊断和治疗
      </div>
    </form>
  );
};

export default ChatInput; 