// API配置管理
// 统一管理所有API相关的配置

/**
 * API配置类
 */
export class ApiConfig {
  // 默认API服务器地址（HTTP后端服务）
  private static readonly DEFAULT_HTTP_API_URL = 'http://129.211.92.125:1009/api';
  
  // 环境配置映射
  private static readonly ENV_CONFIGS = {
    // 本地开发环境 - 直接访问 HTTP 后端
    local: 'http://localhost:1009/api',
    
    // 远程开发服务器 - 直接访问 HTTP 后端
    dev: 'http://129.211.92.125:1009/api',
    
    // 测试环境 - 直接访问 HTTP 后端
    test: 'http://129.211.92.125:1009/api',
    
    // 生产环境 - 使用反向代理
    prod: '/api',
    
    // Vercel/Netlify 部署 - 直接使用公共CORS代理
    vercel: 'https://api.allorigins.win/raw?url=',
    
    // GitHub Pages 部署 - 需要外部代理服务
    github: 'https://your-cors-proxy.herokuapp.com/http://129.211.92.125:1009/api'
  };

  /**
   * 获取API基础URL
   * 支持动态环境检测和代理模式
   */
  static getApiBaseUrl(): string {
    // 1. 优先使用环境变量
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    // 2. 运行时环境检测（仅在浏览器中）
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // 检查是否为本地开发环境
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return this.ENV_CONFIGS.local;
      }
      
      // 检查部署平台
      if (hostname.includes('vercel.app') || hostname.includes('netlify.app')) {
        // Vercel/Netlify 部署，使用 API Routes 代理
        return this.ENV_CONFIGS.vercel;
      }
      
      if (hostname.includes('github.io')) {
        // GitHub Pages 部署，使用外部代理
        console.warn('GitHub Pages 部署检测到，建议使用 Vercel 以获得更好的代理支持');
        return this.ENV_CONFIGS.github;
      }
      
      // 其他生产环境（自有服务器），使用反向代理
      return this.ENV_CONFIGS.prod;
    } else {
      // 在服务器端构建时或 NODE_ENV 环境检测
      const nodeEnv = process.env.NODE_ENV;
      if (nodeEnv === 'production') {
        // 在构建时优先使用 Vercel 代理
        return this.ENV_CONFIGS.vercel;
      }
      // 默认使用生产环境配置
      return this.DEFAULT_HTTP_API_URL;
    }
  }

  /**
   * 获取指定环境的API URL
   */
  static getApiUrlForEnv(env: keyof typeof ApiConfig.ENV_CONFIGS): string {
    return this.ENV_CONFIGS[env] || this.DEFAULT_HTTP_API_URL;
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
   * 处理 HTTPS 到 HTTP 的问题
   */
  static getCompatibleApiUrl(): string {
    const baseUrl = this.getApiBaseUrl();
    
    // 如果当前是HTTPS环境但API是HTTP，使用代理方案
    if (this.isHttpsEnvironment() && baseUrl.startsWith('http://')) {
      console.warn('HTTPS环境下使用HTTP API，将通过反向代理访问');
      // 在HTTPS环境下，使用相对路径通过反向代理访问
      return '/api';
    }
    
    return baseUrl;
  }

  /**
   * 打印当前配置信息（调试用）
   */
  static printConfig(): void {
    console.group('🔧 API配置信息');
    console.log('当前API URL:', this.getApiBaseUrl());
    console.log('应用API URL:', this.getCompatibleApiUrl());
    console.log('环境变量 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('是否HTTPS环境:', this.isHttpsEnvironment());
    if (typeof window !== 'undefined') {
      console.log('当前域名:', window.location.hostname);
      console.log('当前协议:', window.location.protocol);
    }
    console.log('可用环境配置:', Object.keys(this.ENV_CONFIGS));
    console.log('🔁 代理模式说明:');
    console.log('  • 本地开发: 直接访问 HTTP 后端');
    console.log('  • Vercel/Netlify: 使用 API Routes 代理');
    console.log('  • GitHub Pages: 使用外部 CORS 代理服务');
    console.log('  • 自有服务器: 使用 Nginx/Apache 反向代理');
    console.groupEnd();
  }
}

// 导出便捷方法
export const getApiBaseUrl = () => ApiConfig.getApiBaseUrl();
export const getHttpApiUrl = () => ApiConfig.getHttpApiUrl();
export const getCompatibleApiUrl = () => ApiConfig.getCompatibleApiUrl();

// 开发环境下打印配置信息
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // 在浏览器中延迟打印，确保 window 对象可用
  setTimeout(() => {
    ApiConfig.printConfig();
  }, 100);
}
