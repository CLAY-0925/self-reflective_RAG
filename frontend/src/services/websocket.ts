import { Message, WebSocketMessage, WebSocketStatusMessage, WebSocketProgressMessage, WebSocketFinalMessage, MedicalInfoItem } from '../types';
import { log, logError, getWsUrl } from '../utils/config';
import { getUserStorage } from './api';
import { v4 as uuidv4 } from 'uuid';

// WebSocket连接状态
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// WebSocket消息处理器
type MessageHandler = (message: Message) => void;

// 处理状态更新处理器
type StatusUpdateHandler = (type: 'status' | 'progress', data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private messageHandlers: MessageHandler[] = [];
  private statusUpdateHandlers: StatusUpdateHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;
  private tempBotMessageId: string | null = null;

  // 获取连接状态
  getStatus(): ConnectionStatus {
    return this.status;
  }

  // 连接WebSocket
  connect(sessionId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      log('WebSocket已连接');
      return;
    }

    this.sessionId = sessionId;
    this.status = 'connecting';
    
    try {
      // 获取用户信息
      const user = getUserStorage();
      const userId = user?.id || 1;
      
      // 构建WebSocket URL，添加userId参数
      const url = getWsUrl(`/ws/chat?sessionId=${sessionId}&userId=${userId}`);
      log(`正在连接WebSocket: ${url}`);
      
      this.socket = new WebSocket(url);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      logError('WebSocket连接错误:', error);
      this.status = 'error';
      this.attemptReconnect();
    }
  }

  // 断开WebSocket连接
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.status = 'disconnected';
    this.sessionId = null;
    this.tempBotMessageId = null;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.reconnectAttempts = 0;
  }

  // 发送消息
  sendMessage(content: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logError('WebSocket未连接，无法发送消息');
      return;
    }
    
    // 为发送消息后的回复准备一个ID
    this.tempBotMessageId = uuidv4();
    
    const message = {
      message: content
    };
    
    log('发送WebSocket消息:', message);
    this.socket.send(JSON.stringify(message));
  }

  // 添加消息处理器
  addMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  // 移除消息处理器
  removeMessageHandler(handler: MessageHandler): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  // 添加状态更新处理器
  addStatusUpdateHandler(handler: StatusUpdateHandler): void {
    this.statusUpdateHandlers.push(handler);
  }

  // 移除状态更新处理器
  removeStatusUpdateHandler(handler: StatusUpdateHandler): void {
    this.statusUpdateHandlers = this.statusUpdateHandlers.filter(h => h !== handler);
  }

  // 处理WebSocket打开事件
  private handleOpen(): void {
    log('WebSocket连接成功');
    this.status = 'connected';
    this.reconnectAttempts = 0;
  }

  // 处理WebSocket消息事件
  private handleMessage(event: MessageEvent): void {
    try {
      // 首先记录原始消息
      const rawData = String(event.data).substring(0, 1000);
      log('收到WebSocket原始消息:', rawData);
      
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        logError('解析JSON消息失败:', parseError);
        return;
      }
      
      log('解析后的WebSocket消息:', data);
      
      // 增加类型检查以防止错误
      if (!data || typeof data !== 'object') {
        log('无效的WebSocket消息格式，忽略');
        return;
      }
      
      // 确保session_id字段存在
      if (!data.session_id && this.sessionId) {
        data.session_id = this.sessionId;
      }
      
      // 根据消息类型处理
      if (data.type === 'status') {
        this.handleStatusMessage(data);
      } else if (data.type === 'progress') {
        this.handleProgressMessage(data);
      } else if (data.type === 'final') {
        this.handleFinalMessage(data);
      } else {
        // 尝试推断消息类型
        if (data.progress) {
          // 如果有progress对象，可能是状态或进度消息
          if (data.progress.intent || data.progress.medical_info || data.progress.medical_record) {
            log('推断为进度消息');
            // 添加缺失的type字段
            data.type = 'progress';
            this.handleProgressMessage(data);
          } else {
            log('推断为状态消息');
            // 添加缺失的type字段
            data.type = 'status';
            this.handleStatusMessage(data);
          }
        } else if (data.message && typeof data.message === 'string') {
          // 如果有message字段但没有其他标识，判断为最终消息
          log('推断为最终消息');
          // 添加缺失的type字段
          data.type = 'final';
          this.handleFinalMessage(data);
        } else {
          log('未知WebSocket消息类型:', data);
        }
      }
    } catch (error) {
      logError('处理WebSocket消息错误:', error);
      // 记录原始消息内容以便调试
      try {
        const rawData = String(event.data).substring(0, 500);
        logError('原始消息内容:', rawData);
      } catch (e) {
        logError('无法记录原始消息内容');
      }
    }
  }

  // 处理状态消息
  private handleStatusMessage(data: WebSocketStatusMessage | any): void {
    try {
      log('处理状态消息:', data);
      
      // 确保progress字段的所有必要属性都存在
      const progress = {
        intent: data.progress?.intent || '未知',
        medical_info: data.progress?.medical_info || '未知',
        medical_record: data.progress?.medical_record || '未知'
      };
      
      // 创建初始状态消息
      const statusMessage: Message = {
        id: this.tempBotMessageId || uuidv4(),
        content: data.message || '正在处理您的请求...',
        role: 'assistant',
        timestamp: new Date(),
        messageType: 'BOT',
        status: 'processing',
        progress: progress
      };
      
      log('创建状态消息:', statusMessage);
      
      // 通知所有消息处理器
      this.messageHandlers.forEach(handler => {
        try {
          // 使用自定义status和progress字段
          handler({
            ...statusMessage,
            type: 'status',
            session_id: data.session_id || this.sessionId
          });
        } catch (error) {
          logError('通知消息处理器时发生错误:', error);
        }
      });
      
      // 通知所有状态更新处理器
      this.statusUpdateHandlers.forEach(handler => {
        try {
          handler('status', {
            message: data.message,
            progress: progress
          });
        } catch (error) {
          logError('通知状态更新处理器时发生错误:', error);
        }
      });
    } catch (error) {
      logError('处理状态消息时发生错误:', error);
    }
  }

  // 处理进度消息
  private handleProgressMessage(data: WebSocketProgressMessage | any): void {
    try {
      log('处理进度消息:', data);
      
      // 确保progress字段的所有必要属性都存在
      const progress = {
        intent: data.progress?.intent || '未知',
        medical_info: data.progress?.medical_info || '未知',
        medical_record: data.progress?.medical_record || '未知',
        intent_result: data.progress?.intent_result,
        medical_record_result: data.progress?.medical_record_result
      };
      
      // 处理medical_info以确保正确格式
      if (progress.medical_record_result && 
          progress.medical_record_result.medical_info && 
          Array.isArray(progress.medical_record_result.medical_info)) {
        // 确保medical_info是正确的格式
        progress.medical_record_result.medical_info = 
          JSON.stringify(progress.medical_record_result.medical_info);
      }
      
      // 创建进度消息
      const progressMessage: Message = {
        id: this.tempBotMessageId || uuidv4(),
        content: data.message || '正在处理您的请求...',
        role: 'assistant',
        timestamp: new Date(),
        messageType: 'BOT',
        status: 'processing',
        progress: progress
      };
      
      log('创建进度消息:', progressMessage);
      
      // 通知所有消息处理器
      this.messageHandlers.forEach(handler => {
        try {
          // 使用自定义type和session_id字段
          handler({
            ...progressMessage,
            type: 'progress',
            session_id: data.session_id || this.sessionId
          });
        } catch (error) {
          logError('通知消息处理器时发生错误:', error);
        }
      });
      
      // 通知所有状态更新处理器
      this.statusUpdateHandlers.forEach(handler => {
        try {
          handler('progress', {
            message: data.message,
            progress: progress
          });
        } catch (error) {
          logError('通知状态更新处理器时发生错误:', error);
        }
      });
    } catch (error) {
      logError('处理进度消息时发生错误:', error);
    }
  }

  // 处理最终消息
  private handleFinalMessage(data: WebSocketFinalMessage): void {
    try {
      log('处理最终消息:', data);
      
      if (!this.tempBotMessageId) {
        log('没有临时消息ID，创建新的ID');
        this.tempBotMessageId = uuidv4();
        log('已创建新的临时消息ID:', this.tempBotMessageId);
      } else {
        log('使用现有的临时消息ID:', this.tempBotMessageId);
      }
      
      // 解析医疗记录
      let medicalRecord = null;
      if (data.medical_record) {
        try {
          if (typeof data.medical_record === 'string') {
            medicalRecord = JSON.parse(data.medical_record);
            log('成功将医疗记录解析为对象');
          } else if (typeof data.medical_record === 'object') {
            medicalRecord = data.medical_record;
            log('医疗记录已是对象格式');
          }
        } catch (e) {
          logError('解析医疗记录JSON失败:', e);
          // 如果解析失败，保留原始字符串
          log('保留原始医疗记录字符串');
          medicalRecord = { rawText: data.medical_record };
        }
      }
      
      // 格式化医疗信息，确保为MedicalInfoItem数组
      let medicalInfoItems: MedicalInfoItem[] = [];
      if (data.medical_info) {
        // 确保medical_info是数组
        if (Array.isArray(data.medical_info)) {
          medicalInfoItems = data.medical_info;
        } else if (typeof data.medical_info === 'string') {
          try {
            // 尝试解析为JSON
            const parsedInfo = JSON.parse(data.medical_info);
            if (Array.isArray(parsedInfo)) {
              medicalInfoItems = parsedInfo;
            } else {
              // 如果不是数组，创建一个单项的数组
              medicalInfoItems = [{ 
                title: '医疗信息', 
                content: [{ text: String(data.medical_info) }],
                source: { tittle: '来源', content: '', link: '' } 
              }];
            }
          } catch (e) {
            // 解析失败时，创建简单对象
            medicalInfoItems = [{ 
              title: '医疗信息', 
              content: [{ text: String(data.medical_info) }],
              source: { tittle: '来源', content: '', link: '' } 
            }];
          }
        } else if (typeof data.medical_info === 'object') {
          // 如果是对象但不是数组，转换为数组
          medicalInfoItems = [data.medical_info as MedicalInfoItem];
        }
      }
      
      // 创建最终消息
      const finalMessage: Message = {
        id: this.tempBotMessageId,
        content: data.message || '处理完成',
        role: 'assistant',
        timestamp: new Date(),
        messageType: 'BOT',
        relatedQuestions: data.follow_up_questions || [],
        medicalRecord: medicalRecord,
        status: 'complete',
        medicalInfoItems: medicalInfoItems,
        keywords: data.keywords || []
      };
      
      log('发送最终消息到处理器:', finalMessage);
      
      // 通知所有处理器
      this.messageHandlers.forEach(handler => {
        try {
          handler(finalMessage);
        } catch (handlerError) {
          logError('调用消息处理器出错:', handlerError);
        }
      });
      
      log('最终消息处理完成，清除临时ID');
      
      // 清除临时ID
      this.tempBotMessageId = null;
      
      // 最终消息处理完后，断开WebSocket连接
      log('聊天完成，断开WebSocket连接');
      this.disconnect();
    } catch (error) {
      logError('处理最终消息错误:', error);
    }
  }

  // 处理WebSocket关闭事件
  private handleClose(event: CloseEvent): void {
    log(`WebSocket连接关闭: ${event.code} ${event.reason}`);
    this.status = 'disconnected';
    this.socket = null;
    
    // 尝试重新连接
    if (event.code !== 1000) { // 1000表示正常关闭
      this.attemptReconnect();
    }
  }

  // 处理WebSocket错误事件
  private handleError(event: Event): void {
    logError('WebSocket错误:', event);
    this.status = 'error';
  }

  // 尝试重新连接
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.sessionId) {
      log('达到最大重连次数或没有会话ID，停止重连');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    log(`将在${delay}ms后尝试重新连接 (尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId);
      }
    }, delay);
  }
}

// 导出WebSocket服务实例
export const webSocketService = new WebSocketService(); 