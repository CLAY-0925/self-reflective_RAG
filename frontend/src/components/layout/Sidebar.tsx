import React, { useState } from 'react';
import { Button, Input, Modal, Checkbox, Spin, message, Tooltip } from 'antd';
import { 
  PlusOutlined, 
  MessageOutlined, 
  LeftOutlined, 
  RightOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  AimOutlined,
  FileTextOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';
import { ChatSession, AIOptions } from '../../types';
import UserFocusPoints from '../chat/UserFocusPoints';

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, toggleSidebar }) => {
  const { 
    sessions, 
    currentSession, 
    setCurrentSession, 
    createSession, 
    isLoading,
    aiOptions,
    setAiOptions
  } = useChat();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  
  const handleCreateSession = async () => {
    if (!newSessionTitle.trim()) {
      message.error('Please enter a session title');
      return;
    }
    
    try {
      await createSession(newSessionTitle);
      setIsModalOpen(false);
      setNewSessionTitle('');
      message.success('Session created successfully');
    } catch (error) {
      message.error('Failed to create session');
    }
  };
  
  const handleSessionClick = (session: ChatSession) => {
    setCurrentSession(session);
  };
  
  const toggleOption = (option: keyof AIOptions) => {
    setAiOptions({
      ...aiOptions,
      [option]: !aiOptions[option]
    });
  };
  
  // 如果侧边栏收起，只显示图标菜单
  if (collapsed) {
    return (
      <div className="h-full w-12 bg-gray-100 dark:bg-gray-800 flex flex-col items-center py-4 border-r border-gray-200 dark:border-gray-700">
        <Button
          type="text"
          icon={<RightOutlined />}
          onClick={toggleSidebar}
          className="mb-6"
        />
        <Button
          type="text"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
          className="mb-2"
        />
        <div className="border-t border-gray-300 dark:border-gray-600 w-8 my-4" />
        {sessions.map(session => (
          <Tooltip key={session.id} title={session.session_name} placement="right">
            <Button 
              type="text"
              icon={<MessageOutlined />}
              className={`mb-2 ${currentSession?.id === session.id ? 'text-primary-500' : ''}`}
              onClick={() => handleSessionClick(session)}
            />
          </Tooltip>
        ))}
      </div>
    );
  }
  
  return (
    <div className="h-full w-64 bg-gray-100 dark:bg-gray-800 flex flex-col border-r border-gray-200 dark:border-gray-700">
      {/* 顶部操作区 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <span className="font-medium">Chat Sessions</span>
        <div className="flex items-center">
          <Button 
            type="text" 
            icon={<PlusOutlined />} 
            onClick={() => setIsModalOpen(true)}
            title="New Session"
          />
          <Button 
            type="text" 
            icon={<LeftOutlined />} 
            onClick={toggleSidebar}
            title="Collapse Sidebar"
          />
        </div>
      </div>
      
      {/* AI选项 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium mb-3 text-gray-700 dark:text-gray-300">AI Options</h3>
        <div className="space-y-2">
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => toggleOption('enableMedicalAgent')}
          >
            <Checkbox checked={aiOptions.enableMedicalAgent} />
            <div className="ml-2 flex items-center text-sm">
              <RobotOutlined className="mr-1" />
              <span>Enable Medical Chat Agent</span>
            </div>
          </div>
          
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => toggleOption('enableIntentPrediction')}
          >
            <Checkbox checked={aiOptions.enableIntentPrediction} />
            <div className="ml-2 flex items-center text-sm">
              <AimOutlined className="mr-1" />
              <span>Enable Intent Prediction</span>
            </div>
          </div>
          
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => toggleOption('enableMedicalSummary')}
          >
            <Checkbox checked={aiOptions.enableMedicalSummary} />
            <div className="ml-2 flex items-center text-sm">
              <FileTextOutlined className="mr-1" />
              <span>Enable Medical Summary</span>
            </div>
          </div>
          
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => toggleOption('enableWebSearch')}
          >
            <Checkbox checked={aiOptions.enableWebSearch} />
            <div className="ml-2 flex items-center text-sm">
              <SearchOutlined className="mr-1" />
              <span>Enable Web Search</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <Spin />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            No sessions, click the plus button to create one
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`p-2 rounded-md cursor-pointer flex items-center text-sm ${
                  currentSession?.id === session.id
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleSessionClick(session)}
              >
                <MessageOutlined className="mr-2" />
                <div className="truncate flex-1">{session.session_name}</div>
                {currentSession?.id === session.id && (
                  <CheckCircleOutlined className="text-primary-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 用户关注问题 - 只有当有当前会话时才显示 */}
      {currentSession && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-2 py-3 mt-auto bg-gray-50 dark:bg-gray-800 bg-opacity-80">
          <UserFocusPoints />
        </div>
      )}
      
      {/* 新建会话弹窗 */}
      <Modal
        title="新建会话"
        open={isModalOpen}
        onOk={handleCreateSession}
        onCancel={() => setIsModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">会话标题</label>
          <Input
            placeholder="请输入会话标题"
            value={newSessionTitle}
            onChange={(e) => setNewSessionTitle(e.target.value)}
            maxLength={50}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
};

export default Sidebar; 