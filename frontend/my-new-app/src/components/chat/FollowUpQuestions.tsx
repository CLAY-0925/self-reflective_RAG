import React from 'react';
import { Tag } from 'antd';
import { useChat } from '../../context/ChatContext';

interface FollowUpQuestionsProps {
  questions: string[];
}

const FollowUpQuestions: React.FC<FollowUpQuestionsProps> = ({ questions }) => {
  const { sendMessage } = useChat();

  if (!questions || questions.length === 0) {
    return null;
  }

  const handleQuestionClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="ml-12 mt-2">
      <div className="text-xs text-gray-500 mb-2">推荐问题：</div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Tag
            key={index}
            className="cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900 px-2 py-1"
            onClick={() => handleQuestionClick(question)}
          >
            {question}
          </Tag>
        ))}
      </div>
    </div>
  );
};

export default FollowUpQuestions; 