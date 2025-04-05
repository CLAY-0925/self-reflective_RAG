// 环境类型定义
export type Environment = 'development' | 'test' | 'production';

// API版本类型
export type ApiVersion = 'v1' | 'v2';

// 本地存储键
const ENV_STORAGE_KEY = 'app_environment';
const API_VERSION_STORAGE_KEY = 'app_api_version';

// 获取当前环境
export const getEnvironment = (): Environment => {
  // 首先尝试从localStorage获取
  try {
    const savedEnv = localStorage.getItem(ENV_STORAGE_KEY);
    if (savedEnv && (savedEnv === 'development' || savedEnv === 'test' || savedEnv === 'production')) {
      return savedEnv as Environment;
    }
  } catch (error) {
    console.warn('无法从localStorage获取环境设置，使用环境变量');
  }
  
  // 从环境变量中获取，如果没有设置，默认为开发环境
  const env = process.env.REACT_APP_ENV || 'development';
  
  if (env === 'production' || env === 'test' || env === 'development') {
    return env as Environment;
  }
  
  console.warn(`未知环境: ${env}，使用开发环境作为默认值`);
  return 'development';
};

// 获取当前API版本
export const getApiVersion = (): ApiVersion => {
  // 首先尝试从localStorage获取
  try {
    const savedVersion = localStorage.getItem(API_VERSION_STORAGE_KEY);
    if (savedVersion && (savedVersion === 'v1' || savedVersion === 'v2')) {
      return savedVersion as ApiVersion;
    }
  } catch (error) {
    console.warn('无法从localStorage获取API版本设置，使用环境变量');
  }
  
  const version = process.env.REACT_APP_API_VERSION || 'v1';
  
  if (version === 'v1' || version === 'v2') {
    return version as ApiVersion;
  }
  
  console.warn(`未知API版本: ${version}，使用v1作为默认值`);
  return 'v1';
};

// 环境配置接口
interface EnvironmentConfig {
  // 基础URL配置
  baseUrl: string;
  apiPrefix: string;
  wsPrefix: string;
  
  // API路径配置
  apiPaths: {
    auth: {
      login: string;
      register: string;
      logout: string;
    };
    chat: {
      sessions: string;
      session: string;
      messages: string;
      message: string;
      sendMessage: string;
    };
  };
  
  // 其他配置
  apiTimeout: number;
  enableDebugLogging: boolean;
}

// 各环境配置
const configs: Record<Environment, EnvironmentConfig> = {
  development: {
    baseUrl: 'http://localhost:8000',
    apiPrefix: '/api',
    wsPrefix: '/ws',
    apiPaths: {
      auth: {
        login: '/users',
        register: '/users/register',
        logout: '/users/logout',
      },
      chat: {
        sessions: '/sessions',
        session: '/sessions/:sessionId',
        messages: '/sessions/:sessionId/messages',
        message: '/sessions/:sessionId/messages/:messageId',
        sendMessage: '/chat',
      },
    },
    apiTimeout: 30000,
    enableDebugLogging: true
  },
  test: {
    baseUrl: 'https://test-api.example.com',
    apiPrefix: '/api',
    wsPrefix: '/ws',
    apiPaths: {
      auth: {
        login: '/users',
        register: '/users/register',
        logout: '/users/logout',
      },
      chat: {
        sessions: '/sessions',
        session: '/sessions/:sessionId',
        messages: '/sessions/:sessionId/messages',
        message: '/sessions/:sessionId/messages/:messageId',
        sendMessage: '/chat',
      },
    },
    apiTimeout: 30000,
    enableDebugLogging: true
  },
  production: {
    baseUrl: 'https://iazlkzlrgsdv.sealoshzh.site',
    apiPrefix: '/api',
    wsPrefix: '/ws',
    apiPaths: {
      auth: {
        login: '/users',
        register: '/users/register',
        logout: '/users/logout',
      },
      chat: {
        sessions: '/sessions',
        session: '/sessions/:sessionId',
        messages: '/sessions/:sessionId/messages',
        message: '/sessions/:sessionId/messages/:messageId',
        sendMessage: '/chat',
      },
    },
    apiTimeout: 60000,
    enableDebugLogging: true
  }
};

// 获取当前环境的配置
export const getConfig = (): EnvironmentConfig => {
  const env = getEnvironment();
  const config = configs[env];
  
  // 在非生产环境下，打印当前配置信息
  if (env !== 'production') {
    console.info(`[配置] 当前环境: ${env}, API版本: ${getApiVersion()}`);
    console.info(`[配置] API基础URL: ${config.baseUrl}${config.apiPrefix}`);
  }
  
  return config;
};

// 导出当前环境的配置，方便直接使用
export const config = getConfig();

// 获取完整的API URL
export const getApiUrl = (path: string, params?: Record<string, string>): string => {
  // 使用当前环境的配置
  const { baseUrl, apiPrefix } = config;
  const baseUrlWithPrefix = `${baseUrl}${apiPrefix}`;
  let fullPath = `${baseUrlWithPrefix}${path}`;

  // 替换路径参数，例如 :sessionId
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      fullPath = fullPath.replace(`:${key}`, value);
    });
  }

  log(`API URL: ${fullPath}`);
  return fullPath;
};

// 获取WebSocket URL
export const getWsUrl = (path: string = ''): string => {
  // 在生产环境中，强制使用iazlkzlrgsdv.sealoshzh.site域名
  if (isProduction()) {
    const wsBaseUrl = 'wss://iazlkzlrgsdv.sealoshzh.site';
    const fullPath = `${wsBaseUrl}${config.apiPrefix}${path}`;
    log(`生产环境WebSocket URL: ${fullPath}`);
    return fullPath;
  }
  
  // 在非生产环境中，使用配置的baseUrl
  const { baseUrl, apiPrefix } = config;
  const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
  const fullPath = `${wsBaseUrl}${apiPrefix}${path}`;
  log(`非生产环境WebSocket URL: ${fullPath}`);
  return fullPath;
};

// 检查是否为生产环境
export const isProduction = (): boolean => getEnvironment() === 'production';

// 检查是否为测试环境
export const isTest = (): boolean => getEnvironment() === 'test';

// 检查是否为开发环境
export const isDevelopment = (): boolean => getEnvironment() === 'development';

// 日志函数，只在非生产环境或强制启用日志时输出
export const log = (message: string, ...args: any[]): void => {
  if (config.enableDebugLogging) {
    console.log(`[${getEnvironment()}] ${message}`, ...args);
  }
};

// 错误日志函数，始终输出
export const logError = (message: string, ...args: any[]): void => {
  console.error(`[${getEnvironment()}] ${message}`, ...args);
}; 