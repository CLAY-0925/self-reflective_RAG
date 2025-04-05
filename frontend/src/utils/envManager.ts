import { Environment, ApiVersion, getEnvironment, getApiVersion } from './config';

// 本地存储键
const ENV_STORAGE_KEY = 'app_environment';
const API_VERSION_STORAGE_KEY = 'app_api_version';

/**
 * 环境管理器
 * 用于在开发过程中切换环境和API版本
 * 注意：仅在非生产环境中使用
 */
class EnvironmentManager {
  private currentEnv: Environment;
  private currentApiVersion: ApiVersion;
  private isProduction: boolean;

  constructor() {
    // 初始化当前环境和API版本
    this.currentEnv = this.getSavedEnvironment() || getEnvironment();
    this.currentApiVersion = this.getSavedApiVersion() || getApiVersion();
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // 在非生产环境下，打印当前环境信息
    if (!this.isProduction) {
      console.info(`[环境管理器] 当前环境: ${this.currentEnv}, API版本: ${this.currentApiVersion}`);
    }
  }

  /**
   * 获取保存的环境设置
   */
  private getSavedEnvironment(): Environment | null {
    try {
      const savedEnv = localStorage.getItem(ENV_STORAGE_KEY);
      if (savedEnv && (savedEnv === 'development' || savedEnv === 'test' || savedEnv === 'production')) {
        return savedEnv as Environment;
      }
      return null;
    } catch (error) {
      console.warn('无法访问localStorage获取环境设置');
      return null;
    }
  }

  /**
   * 获取保存的API版本设置
   */
  private getSavedApiVersion(): ApiVersion | null {
    try {
      const savedVersion = localStorage.getItem(API_VERSION_STORAGE_KEY);
      if (savedVersion && (savedVersion === 'v1' || savedVersion === 'v2')) {
        return savedVersion as ApiVersion;
      }
      return null;
    } catch (error) {
      console.warn('无法访问localStorage获取API版本设置');
      return null;
    }
  }

  /**
   * 设置当前环境
   * @param env 环境
   * @returns 是否设置成功
   */
  setEnvironment(env: Environment): boolean {
    if (this.isProduction) {
      console.warn('生产环境下不允许切换环境');
      return false;
    }

    try {
      localStorage.setItem(ENV_STORAGE_KEY, env);
      this.currentEnv = env;
      console.info(`[环境管理器] 环境已切换为: ${env}`);
      return true;
    } catch (error) {
      console.error('设置环境失败:', error);
      return false;
    }
  }

  /**
   * 设置当前API版本
   * @param version API版本
   * @returns 是否设置成功
   */
  setApiVersion(version: ApiVersion): boolean {
    if (this.isProduction) {
      console.warn('生产环境下不允许切换API版本');
      return false;
    }

    try {
      localStorage.setItem(API_VERSION_STORAGE_KEY, version);
      this.currentApiVersion = version;
      console.info(`[环境管理器] API版本已切换为: ${version}`);
      return true;
    } catch (error) {
      console.error('设置API版本失败:', error);
      return false;
    }
  }

  /**
   * 获取当前环境
   */
  getCurrentEnvironment(): Environment {
    return this.currentEnv;
  }

  /**
   * 获取当前API版本
   */
  getCurrentApiVersion(): ApiVersion {
    return this.currentApiVersion;
  }

  /**
   * 重置环境设置为默认值
   * @returns 是否重置成功
   */
  resetToDefault(): boolean {
    if (this.isProduction) {
      console.warn('生产环境下不允许重置环境设置');
      return false;
    }

    try {
      localStorage.removeItem(ENV_STORAGE_KEY);
      localStorage.removeItem(API_VERSION_STORAGE_KEY);
      this.currentEnv = getEnvironment();
      this.currentApiVersion = getApiVersion();
      console.info(`[环境管理器] 环境设置已重置为默认值: 环境=${this.currentEnv}, API版本=${this.currentApiVersion}`);
      return true;
    } catch (error) {
      console.error('重置环境设置失败:', error);
      return false;
    }
  }

  /**
   * 应用环境设置（重新加载页面）
   */
  applySettings(): void {
    if (this.isProduction) {
      console.warn('生产环境下不允许应用环境设置');
      return;
    }

    console.info('[环境管理器] 正在应用环境设置，页面将重新加载...');
    window.location.reload();
  }
}

// 导出环境管理器实例
export const envManager = new EnvironmentManager(); 