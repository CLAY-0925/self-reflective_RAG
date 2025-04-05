import React from 'react';
import { Card, Tag, Empty } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';

const UserFocusPoints: React.FC = () => {
  const { focusPoints, handleFocusPointClick } = useChat();
  
  const focusPointKeys = Object.keys(focusPoints);
  
  if (focusPointKeys.length === 0) {
    return (
      <Card 
        title={
          <div className="flex items-center">
            <BulbOutlined className="mr-3 text-amber-400" style={{ fontSize: '18px' }} />
            <span className="text-gray-700 dark:text-gray-300 font-medium">关注点</span>
          </div>
        }
        className="mb-4 shadow-sm"
        size="small"
        bordered={false}
        style={{ borderRadius: '12px', background: 'rgba(250, 250, 252, 0.95)' }}
        bodyStyle={{ padding: '16px' }}
      >
        <Empty 
          description={
            <span className="text-gray-500 text-sm">暂无关注点</span>
          } 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="my-3" 
          imageStyle={{ height: 40 }}
        />
      </Card>
    );
  }
  
  return (
    <Card 
      title={
        <div className="flex items-center">
          <BulbOutlined className="mr-3 text-amber-400" style={{ fontSize: '18px' }} />
          <span className="text-gray-700 dark:text-gray-300 font-medium">关注点</span>
        </div>
      }
      className="mb-4 shadow-sm"
      size="small"
      bordered={false}
      style={{ borderRadius: '12px', background: 'rgba(250, 250, 252, 0.95)' }}
      bodyStyle={{ padding: '16px' }}
    >
      <div className="flex flex-wrap gap-2">
        {focusPointKeys.map((key) => (
          <Tag
            key={key}
            style={{
              backgroundColor: 'rgba(240, 240, 240, 0.9)',
              borderRadius: '16px',
              border: 'none',
              color: '#555',
              fontSize: '13px',
              padding: '6px 14px',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            className="cursor-pointer hover:bg-gray-200 hover:shadow-md mb-2"
            onClick={() => handleFocusPointClick(key)}
          >
            {key} <span className="text-xs text-gray-500 ml-1">({focusPoints[key].length})</span>
          </Tag>
        ))}
      </div>
    </Card>
  );
};

export default UserFocusPoints; 