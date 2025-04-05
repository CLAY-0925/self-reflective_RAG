import React, { useState } from 'react';
import { Button, Tabs } from 'antd';
import { LeftOutlined, RightOutlined, FileTextOutlined, GlobalOutlined } from '@ant-design/icons';
import MedicalRecord from '../medical/MedicalRecord';
import SearchResults from '../medical/SearchResults';
import ErrorBoundary from '../common/ErrorBoundary';
import { useChat } from '../../context/ChatContext';

interface InfoPanelProps {
  collapsed: boolean;
  togglePanel: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ collapsed, togglePanel }) => {
  const { searchResults } = useChat();
  const [activeKey, setActiveKey] = useState('1');
  
  // 计算联网搜索结果的标签，如果有结果则显示数量
  const searchTabLabel = (
    <span>
      <GlobalOutlined /> 联网搜索
      {searchResults && searchResults.length > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
          {searchResults.length}
        </span>
      )}
    </span>
  );
  
  // 如果有新的搜索结果，自动切换到联网搜索标签
  React.useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      setActiveKey('2');
    }
  }, [searchResults]);
  
  if (collapsed) {
    return (
      <div className="h-full w-12 bg-gray-100 dark:bg-gray-800 flex flex-col items-center py-4 border-l border-gray-200 dark:border-gray-700">
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={togglePanel}
          className="mb-6"
          title="展开信息面板"
        />
      </div>
    );
  }
  
  return (
    <div className="h-full w-96 bg-gray-100 dark:bg-gray-800 flex flex-col border-l border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <span className="font-medium">参考信息</span>
        <Button 
          type="text" 
          icon={<RightOutlined />} 
          onClick={togglePanel}
          title="收起信息面板"
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={[
            {
              key: '1',
              label: <span><FileTextOutlined /> 医疗记录</span>,
              children: (
                <div className="p-4 overflow-y-auto h-full">
                  <ErrorBoundary>
                    <MedicalRecord />
                  </ErrorBoundary>
                </div>
              ),
            },
            {
              key: '2',
              label: searchTabLabel,
              children: (
                <div className="p-4 overflow-y-auto h-full">
                  <ErrorBoundary>
                    <SearchResults />
                  </ErrorBoundary>
                </div>
              ),
            },
          ]}
          className="info-panel-tabs"
          size="large"
        />
      </div>
    </div>
  );
};

export default InfoPanel; 