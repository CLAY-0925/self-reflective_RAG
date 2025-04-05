import React, { useState, useEffect } from 'react';
import { useAppSettings } from '../../context/AppSettingsContext';
import { FaTimes, FaSearch, FaFileAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../../context/ChatContext';
import { Box, Typography, Paper, LinearProgress, Grid, Divider } from '@mui/material';

// 添加医疗记录类型定义
interface MedicalRecordType {
  confirmed_info?: {
    基本信息?: string;
    主诉?: string;
    症状描述?: string;
    现病史?: string;
    既往史?: string;
    用药情况?: string;
    家族史?: string;
    [key: string]: string | undefined;
  };
  pending_clues?: {
    待确认症状?: string;
    需澄清细节?: string;
    [key: string]: string | undefined;
  };
  stage?: {
    信息收集: number;
    鉴别诊断: number;
    [key: string]: number;
  };
}

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ isOpen, onClose }) => {
  const { settings } = useAppSettings();
  const { currentSession } = useChat();
  const [activeTab, setActiveTab] = useState<'case' | 'search'>('case');

  // 查找最新的带有医疗记录的消息
  const latestAssistantMessageWithRecord = currentSession?.messages
    ?.slice()
    .reverse()
    .find(msg => msg.role === 'assistant' && msg.medicalRecord);
    
  const medicalRecord = latestAssistantMessageWithRecord?.medicalRecord;
  
  // 获取最新的医疗信息
  const latestMedicalInfo = currentSession?.messages
    ?.slice()
    .reverse()
    .find(msg => msg.role === 'assistant' && msg.medicalInfoItems && msg.medicalInfoItems.length > 0)
    ?.medicalInfoItems || [];

  // 当有病例信息或医疗信息时自动切换标签页
  useEffect(() => {
    if (medicalRecord && activeTab !== 'case') {
      setActiveTab('case');
    } else if (latestMedicalInfo.length > 0 && !medicalRecord && activeTab !== 'search') {
      setActiveTab('search');
    }
  }, [medicalRecord, latestMedicalInfo, activeTab]);

  // 解析医疗记录对象（处理可能的字符串格式）
  const getParsedMedicalRecord = (): MedicalRecordType | null => {
    if (!medicalRecord) return null;
    
    try {
      // 如果是字符串，尝试解析
      if (typeof medicalRecord === 'string') {
        return JSON.parse(medicalRecord) as MedicalRecordType;
      }
      // 否则直接返回对象，添加类型断言
      return medicalRecord as MedicalRecordType;
    } catch (e) {
      console.error('解析医疗记录失败:', e);
      return null;
    }
  };
  
  const parsedRecord = getParsedMedicalRecord();

  // 渲染确认信息列表的辅助函数
  const renderConfirmedInfo = () => {
    if (!parsedRecord || !parsedRecord.confirmed_info) return null;
    
    return Object.entries(parsedRecord.confirmed_info).map(([key, value]) => {
      if (!value) return null;
      return (
        <Grid item xs={12} key={key}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.2 }}>
            {key}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.primary' }}>
            {String(value)}
          </Typography>
        </Grid>
      );
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-80 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('case')}
                className={`flex items-center text-sm font-medium ${
                  activeTab === 'case'
                    ? 'text-primary-main dark:text-primary-light'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FaFileAlt className="mr-2" />
                病例信息
                {medicalRecord && (
                  <span className="ml-1 w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`flex items-center text-sm font-medium ${
                  activeTab === 'search'
                    ? 'text-primary-main dark:text-primary-light'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FaSearch className="mr-2" />
                搜索结果
                {latestMedicalInfo.length > 0 && (
                  <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              aria-label="关闭面板"
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'case' && (
              settings.enableCaseSummary ? (
                parsedRecord ? (
                  <Paper elevation={0} sx={{ bgcolor: 'transparent' }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                        诊疗进度
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            信息收集进度
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={parsedRecord.stage?.信息收集 || 0} 
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4,
                                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: '#4CAF50'
                                  }
                                }}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 35 }}>
                              {parsedRecord.stage?.信息收集 || 0}%
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            鉴别诊断进度
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={parsedRecord.stage?.鉴别诊断 || 0} 
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4,
                                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: '#2196F3'
                                  }
                                }}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 35 }}>
                              {parsedRecord.stage?.鉴别诊断 || 0}%
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
              
                    <Divider sx={{ my: 2 }} />
              
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                        患者信息
                      </Typography>
                      <Grid container spacing={1}>
                        {renderConfirmedInfo()}
                      </Grid>
                    </Box>
              
                    <Divider sx={{ my: 2 }} />
              
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                        待确认信息
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.2 }}>
                            待确认症状
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'warning.main' }}>
                            {parsedRecord.pending_clues?.待确认症状 || '无'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.2 }}>
                            需澄清细节
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'warning.main' }}>
                            {parsedRecord.pending_clues?.需澄清细节 || '无'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                    <FaFileAlt className="text-4xl mb-4" />
                    <p>当前会话暂无病例信息</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                  <FaFileAlt className="text-4xl mb-4" />
                  <p>请在侧边栏启用病例总结功能</p>
                </div>
              )
            )}
            
            {activeTab === 'search' && (
              settings.enableWebSearch ? (
                <div className="space-y-4">
                  {latestMedicalInfo.length > 0 ? (
                    <>
                      {latestMedicalInfo.map((item, index) => (
                        <Paper key={index} elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'background.default', '&:hover': { boxShadow: 3 } }}>
                          <Typography variant="h6" component="h3" sx={{ mb: 1, color: 'primary.main', fontSize: '0.95rem' }}>
                            <a href={item.source.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {item.title || item.source.tittle}
                            </a>
                          </Typography>
                          
                          {item.content && item.content.length > 0 ? (
                            <div className="space-y-2 mb-2">
                              {item.content.map((content, i) => (
                                <div key={i} className="text-sm">
                                  {Object.entries(content).map(([key, value]) => (
                                    <div key={key} className="mb-1">
                                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.8rem' }}>
                                        {key}:
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.8rem' }}>
                                        {String(value)}
                                      </Typography>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8rem' }}>
                              {item.source.content}
                            </Typography>
                          )}
                          
                          <Typography variant="caption" color="text.disabled" sx={{ wordBreak: 'break-all', fontSize: '0.7rem' }}>
                            <a href={item.source.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {item.source.link}
                            </a>
                          </Typography>
                        </Paper>
                      ))}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                      <FaSearch className="text-4xl mb-4" />
                      <p>暂无相关医疗信息</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                  <FaSearch className="text-4xl mb-4" />
                  <p>请在侧边栏启用联网搜索功能</p>
                </div>
              )
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RightPanel; 