// API配置管理
// 统一管理所有API相关的配置

/**
 * API配置类
 */
export class ApiConfig {
  // 默认API服务器地址
  private static readonly DEFAULT_API_URL = 'http://129.211.92.125:1009/api';
  
  // 环境配置映射
  private static readonly ENV_CONFIGS = {
    // 本地开发环境
    local: 'http://localhost:1009/api',
    
    // 远程开发服务器
    dev: 'http://129.211.92.125:1009/api',
    
    // 生产环境（HTTPS）
    prod: 'https://your-backend.onrender.com/api',
    
    // 测试环境
    test: 'http://test-server:1009/api'
  };

  /**
   * 获取API基础URL
   */
  static getApiBaseUrl(): string {
    // 1. 优先使用环境变量
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    // 2. 根据NODE_ENV自动选择
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
      return this.ENV_CONFIGS.prod;
    }

    // 3. 使用默认配置
    return this.DEFAULT_API_URL;
  }

  /**
   * 获取指定环境的API URL
   */
  static getApiUrlForEnv(env: keyof typeof ApiConfig.ENV_CONFIGS): string {
    return this.ENV_CONFIGS[env] || this.DEFAULT_API_URL;
  }

  /**
   * 强制使用HTTP协议（避免HTTPS混合内容问题）
   */
  static getHttpApiUrl(): string {
    const url = this.getApiBaseUrl();
    return url.replace('https://', 'http://');
  }

  /**
   * 获取WebSocket URL（如果需要）
   */
  static getWebSocketUrl(): string {
    const apiUrl = this.getApiBaseUrl();
    return apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  }

  /**
   * 检查是否为HTTPS环境
   */
  static isHttpsEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.protocol === 'https:';
  }

  /**
   * 获取适合当前环境的API URL
   */
  static getCompatibleApiUrl(): string {
    const baseUrl = this.getApiBaseUrl();
    
    // 如果当前是HTTPS环境但API是HTTP，可能需要特殊处理
    if (this.isHttpsEnvironment() && baseUrl.startsWith('http://')) {
      console.warn('HTTPS环境下使用HTTP API可能存在混合内容问题');
      // 可以在这里添加代理或其他解决方案
    }
    
    return baseUrl;
  }

  /**
   * 打印当前配置信息（调试用）
   */
  static printConfig(): void {
    console.group('🔧 API配置信息');
    console.log('当前API URL:', this.getApiBaseUrl());
    console.log('环境变量 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('是否HTTPS环境:', this.isHttpsEnvironment());
    console.log('可用环境配置:', Object.keys(this.ENV_CONFIGS));
    console.groupEnd();
  }
}

// 导出便捷方法
export const getApiBaseUrl = () => ApiConfig.getApiBaseUrl();
export const getHttpApiUrl = () => ApiConfig.getHttpApiUrl();
export const getCompatibleApiUrl = () => ApiConfig.getCompatibleApiUrl();

// 开发环境下打印配置信息
if (process.env.NODE_ENV === 'development') {
  ApiConfig.printConfig();
}
