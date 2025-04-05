import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import InfoPanel from './InfoPanel';
import ChatWindow from '../chat/ChatWindow';
import { useAuth } from '../../context/AuthContext';
import Login from '../auth/Login';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  const toggleInfoPanel = () => {
    setInfoPanelCollapsed(!infoPanelCollapsed);
  };
  
  // 如果未登录，显示登录界面
  if (!user) {
    return <Login />;
  }
  
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          toggleSidebar={toggleSidebar} 
        />
        
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            <ChatWindow />
          </div>
          
          <InfoPanel 
            collapsed={infoPanelCollapsed} 
            togglePanel={toggleInfoPanel} 
          />
        </div>
      </div>
    </div>
  );
};

export default MainLayout; 