import React, { useState, useEffect } from 'react';
import { Box, Tooltip, LinearProgress, Typography, Paper, Grid } from '@mui/material';
import { FaUser, FaRobot, FaCopy, FaCheck } from 'react-icons/fa';
import { Message } from '../../types';
import { log } from '../../utils/config';

interface ChatMessageProps {
  message: Message;
  onSuggestedQuestionClick?: (question: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSuggestedQuestionClick }) => {
  const [copied, setCopied] = useState(false);
  
  // 渲染消息时记录日志
  useEffect(() => {
    log('渲染消息:', {
      id: message.id,
      role: message.role,
      content: message.content?.substring(0, 50),
      timestamp: message.timestamp
    });
  }, [message]);
  
  // 简单的Markdown渲染函数
  const renderMarkdown = (text: string) => {
    if (!text) return '';
    
    // 处理粗体 **text**
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 处理斜体 *text*
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 处理有序列表
    formattedText = formattedText.replace(/^\d+\.\s(.*?)$/gm, '<li>$1</li>');
    formattedText = formattedText.replace(/<li>(.*?)<\/li>/g, function(match) {
      return '<ol>' + match + '</ol>';
    });
    
    // 处理换行
    formattedText = formattedText.replace(/\n/g, '<br />');
    
    return formattedText;
  };

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    setCopied(true);
  };

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const hasProcessingStatus = message.status === 'processing' && message.progress;
  const hasRelatedQuestions = message.relatedQuestions && message.relatedQuestions.length > 0;

  // 渲染处理状态和进度信息
  const renderProcessingStatus = () => {
    if (!hasProcessingStatus) return null;
    
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 2 }}>
        <Typography variant="subtitle2" color="primary.main" sx={{ mb: 1, fontSize: '0.9rem' }}>
          AI处理中...
        </Typography>
        
        <Grid container spacing={2}>
          {/* 意图分析进度 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>
                意图分析:
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={message.progress?.intent === '已完成' ? 100 : 60} 
                    color={message.progress?.intent === '已完成' ? 'success' : 'primary'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {message.progress?.intent}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* 医疗信息提取进度 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>
                医疗信息:
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={message.progress?.medical_info === '已完成' ? 100 : 60} 
                    color={message.progress?.medical_info === '已完成' ? 'success' : 'primary'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {message.progress?.medical_info}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* 病例记录更新进度 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>
                病例记录:
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={message.progress?.medical_record === '已完成' ? 100 : 60} 
                    color={message.progress?.medical_record === '已完成' ? 'success' : 'primary'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {message.progress?.medical_record}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        {/* 意图分析结果 */}
        {message.progress?.intent_result && (
          <Box sx={{ mt: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>
                意图分析结果:
              </Typography>
              <Box>
                <Typography variant="body2" color="text.primary">
                  {message.progress.intent_result.intent}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
        
        {/* 医疗记录结果 */}
        {message.progress?.medical_record_result && (
          <Box sx={{ mt: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>
                病例更新:
              </Typography>
              <Box>
                {Object.entries(message.progress.medical_record_result.updated_record.confirmed_info || {}).map(([key, value]) => (
                  value && (
                    <Box key={key} sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" component="span">
                        {key}: 
                      </Typography>{' '}
                      <Typography variant="caption" color="text.primary" component="span">
                        {value}
                      </Typography>
                    </Box>
                  )
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 3,
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          maxWidth: '80%',
        }}
      >
        <Box
          sx={{
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isUser ? 'primary.dark' : 'secondary.main',
            color: 'white',
            flexShrink: 0,
            mx: 1.5,
          }}
        >
          {isUser ? <FaUser /> : <FaRobot />}
        </Box>

        <Box sx={{ maxWidth: 'calc(100% - 60px)' }}>
          {/* 消息内容 */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: isUser ? 'primary.main' : 'background.paper',
              color: isUser ? 'white' : 'text.primary',
              position: 'relative',
              ...(isUser ? {
                borderTopRightRadius: 0,
              } : {
                borderTopLeftRadius: 0,
              }),
            }}
          >
            {isAssistant && (
              <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <Tooltip title={copied ? '已复制' : '复制'}>
                  <Box
                    component="button"
                    onClick={handleCopy}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      border: 'none',
                      bgcolor: 'rgba(0, 0, 0, 0.05)',
                      color: 'text.secondary',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.1)',
                      },
                    }}
                  >
                    {copied ? <FaCheck /> : <FaCopy />}
                  </Box>
                </Tooltip>
              </Box>
            )}

            {isAssistant && message.isStreaming && (
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress color="secondary" />
              </Box>
            )}

            {message.content && (
              <Typography 
                variant="body1" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  pr: isAssistant ? 4 : 0,
                  '& a': { color: isUser ? 'inherit' : 'primary.main' },
                  '& strong': { fontWeight: 'bold' },
                  '& em': { fontStyle: 'italic' },
                  '& ol, & ul': { pl: 2, mb: 1 },
                  '& li': { mb: 0.5 },
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
              />
            )}

            <Typography variant="caption" sx={{ 
              display: 'block', 
              mt: 1, 
              color: isUser ? 'rgba(255,255,255,0.7)' : 'text.secondary',
              textAlign: 'right'
            }}>
              {message.timestamp instanceof Date 
                ? message.timestamp.toLocaleTimeString() 
                : new Date(message.timestamp).toLocaleTimeString()}
            </Typography>
          </Paper>

          {/* 处理状态和进度信息 */}
          {isAssistant && renderProcessingStatus()}

          {/* 相关问题 */}
          {isAssistant && hasRelatedQuestions && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '0.9rem' }}>
                相关问题:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                {message.relatedQuestions?.map((question, index) => (
                  <Box
                    key={index}
                    component="button"
                    onClick={() => onSuggestedQuestionClick && onSuggestedQuestionClick(question)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 4,
                      py: 0.5,
                      px: 1.5,
                      fontSize: '0.875rem',
                      bgcolor: 'background.default',
                      color: 'text.primary',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    {question}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ChatMessage;