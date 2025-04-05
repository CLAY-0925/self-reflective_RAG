import React, { useState } from 'react';
import Header from './Header';
import Sidebar from '../sidebar/Sidebar';
import RightPanel from '../rightPanel/RightPanel';
import ChatArea from '../chat/ChatArea';
import { useAppSettings } from '../../context/AppSettingsContext';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const { settings } = useAppSettings();

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const toggleRightPanel = () => {
    setIsRightPanelOpen(prev => !prev);
  };

  // 根据设置决定是否显示右侧面板
  const shouldShowRightPanel = settings.enableCaseSummary || settings.enableWebSearch;

  return (
    <div className="flex flex-col h-screen">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} />
        
        <main className="flex-1 flex flex-col relative">
          <div className="absolute top-4 right-4 z-10">
            {shouldShowRightPanel && (
              <button
                onClick={toggleRightPanel}
                className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={isRightPanelOpen ? '隐藏右侧面板' : '显示右侧面板'}
              >
                {isRightPanelOpen ? '›' : '‹'}
              </button>
            )}
          </div>
          
          <ChatArea />
        </main>
        
        {shouldShowRightPanel && (
          <RightPanel isOpen={isRightPanelOpen} onClose={() => setIsRightPanelOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default Layout; 