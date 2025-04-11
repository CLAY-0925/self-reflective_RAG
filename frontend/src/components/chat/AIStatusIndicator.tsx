import React from 'react';
import { Badge, Space } from 'antd';
import { 
  AimOutlined, 
  SearchOutlined, 
  FileTextOutlined 
} from '@ant-design/icons';
import { AIStatus } from '../../types';

interface AIStatusIndicatorProps {
  status: AIStatus;
}

const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({ status }) => {
  // Function to check if status is "complete"
  const isComplete = (statusText: string) => {
    return statusText === 'complete' || statusText === 'completed';
  };

  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
      <Space>
        <Badge 
          status={isComplete(status.intent) ? 'success' : 'processing'} 
          text={
            <div className="flex items-center text-xs">
              <AimOutlined className="mr-1" />
              <span>Intent Analysis: {isComplete(status.intent) ? 'Completed' : status.intent || 'Analyzing...'}</span>
            </div>
          } 
        />
      </Space>
      
      <Space>
        <Badge 
          status={isComplete(status.medical_info) ? 'success' : 'processing'}
          text={
            <div className="flex items-center text-xs">
              <SearchOutlined className="mr-1" />
              <span>Medical Info: {isComplete(status.medical_info) ? 'Completed' : status.medical_info || 'Analyzing...'}</span>
            </div>
          }
        />
      </Space>
      
      <Space>
        <Badge 
          status={isComplete(status.medical_record) ? 'success' : 'processing'}
          text={
            <div className="flex items-center text-xs">
              <FileTextOutlined className="mr-1" />
              <span>Medical Record: {isComplete(status.medical_record) ? 'Completed' : status.medical_record || 'Analyzing...'}</span>
            </div>
          }
        />
      </Space>
    </div>
  );
};

export default AIStatusIndicator; 