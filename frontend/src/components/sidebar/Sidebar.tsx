import React from 'react';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useChat } from '../../context/ChatContext';
import { FaPlus, FaTrash, FaRobot, FaLightbulb, FaFileAlt, FaGlobe } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { 
    settings, 
    toggleMedicalAgent, 
    toggleIntentPrediction, 
    toggleCaseSummary, 
    toggleWebSearch 
  } = useAppSettings();
  
  const { 
    sessions, 
    currentSession, 
    createSession, 
    selectSession, 
    deleteSession 
  } = useChat();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">功能设置</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <button
                    onClick={toggleMedicalAgent}
                    className={`flex items-center justify-center w-5 h-5 rounded mr-2 ${
                      settings.enableMedicalAgent
                        ? 'bg-primary-main text-white'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {settings.enableMedicalAgent && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <FaRobot className="mr-2" />
                    启用医学聊天agent
                  </div>
                </div>
                
                <div className="flex items-center">
                  <button
                    onClick={toggleIntentPrediction}
                    className={`flex items-center justify-center w-5 h-5 rounded mr-2 ${
                      settings.enableIntentPrediction
                        ? 'bg-primary-main text-white'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {settings.enableIntentPrediction && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <FaLightbulb className="mr-2" />
                    启用意图预测
                  </div>
                </div>
                
                <div className="flex items-center">
                  <button
                    onClick={toggleCaseSummary}
                    className={`flex items-center justify-center w-5 h-5 rounded mr-2 ${
                      settings.enableCaseSummary
                        ? 'bg-primary-main text-white'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {settings.enableCaseSummary && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <FaFileAlt className="mr-2" />
                    启用病例总结
                  </div>
                </div>
                
                <div className="flex items-center">
                  <button
                    onClick={toggleWebSearch}
                    className={`flex items-center justify-center w-5 h-5 rounded mr-2 ${
                      settings.enableWebSearch
                        ? 'bg-primary-main text-white'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {settings.enableWebSearch && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <FaGlobe className="mr-2" />
                    启用联网搜索
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">聊天历史</h3>
              <button
                onClick={createSession}
                className="p-1 rounded-full bg-primary-main text-white hover:bg-primary-dark transition-colors"
                aria-label="新建会话"
              >
                <FaPlus className="text-xs" />
              </button>
            </div>
            
            <div className="space-y-2">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                    currentSession?.id === session.id
                      ? 'bg-primary-light/20 dark:bg-primary-dark/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => selectSession(session.id)}
                >
                  <div className="truncate text-sm text-gray-700 dark:text-gray-300">
                    {session.title}
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                    aria-label="删除会话"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                  没有聊天历史
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default Sidebar; 