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
  // 检查状态是否为"已完成"的函数
  const isComplete = (statusText: string) => {
    return statusText === 'complete' || statusText === '已完成';
  };

  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
      <Space>
        <Badge 
          status={isComplete(status.intent) ? 'success' : 'processing'} 
          text={
            <div className="flex items-center text-xs">
              <AimOutlined className="mr-1" />
              <span>意图预测：{isComplete(status.intent) ? '已完成' : status.intent || '分析中...'}</span>
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
              <span>医学信息：{isComplete(status.medical_info) ? '已完成' : status.medical_info || '分析中...'}</span>
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
              <span>病例记录：{isComplete(status.medical_record) ? '已完成' : status.medical_record || '分析中...'}</span>
            </div>
          }
        />
      </Space>
    </div>
  );
};

export default AIStatusIndicator; 