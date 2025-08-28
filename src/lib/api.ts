// API 配置和请求工具函数
// 强制使用HTTP避免SSL错误
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://129.211.92.125:1009/api';

// 在生产环境确保使用HTTP
const getApiUrl = () => {
  const url = API_BASE_URL;
  // 确保在Vercel部署时使用正确的协议
  return url.replace('https://', 'http://');
};

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthResponse {
  token: string;
  phone: string;
  username: string;
  apiKey: string;
  points: number;
}

export interface AdminLoginResponse {
  token: string;
  username: string;
  role: string;
}

export interface User {
  id: number;
  username: string;
  phone: string;
  points: number;
  createdAt: string;
  updatedAt: string;
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const fullUrl = `${getApiUrl()}${endpoint}`;
  console.log("发起API请求:", fullUrl, "配置:", config);

  const response = await fetch(fullUrl, config);
  console.log("API响应状态:", response.status, response.statusText);
  
  if (!response.ok) {
    console.error("API请求失败:", response.status, response.statusText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log("API响应数据:", data);
  return data;
}

// 认证 API
export const authApi = {
  // 用户注册
  register: async (data: {
    username: string;
    phone: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 用户登录
  login: async (data: {
    phone: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<ApiResponse<AuthResponse>> => {
    return request('/auth/me');
  },

  // 管理员登录
  adminLogin: async (data: {
    username: string;
    password: string;
  }): Promise<ApiResponse<AdminLoginResponse>> => {
    return request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// 管理员 API
export const adminApi = {
  // 为用户增加点数
  addPoints: async (data: {
    phone: string;
    points: number;
  }): Promise<ApiResponse<User>> => {
    return request('/admin/add-points', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 根据手机号查询用户
  getUserByPhone: async (phone: string): Promise<ApiResponse<User>> => {
    return request(`/admin/user/${phone}`);
  },
};

// Token 管理
export const tokenUtils = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      console.log("保存token到localStorage:", token.substring(0, 20) + "...");
      localStorage.setItem('token', token);
      console.log("token保存完成，验证:", localStorage.getItem('token') ? "成功" : "失败");
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      console.log("从localStorage获取token:", token ? token.substring(0, 20) + "..." : "无");
      return token;
    }
    return null;
  },

  removeToken: () => {
    if (typeof window !== 'undefined') {
      console.log("从localStorage移除token");
      localStorage.removeItem('token');
    }
  },

  isAuthenticated: (): boolean => {
    const hasToken = !!tokenUtils.getToken();
    console.log("检查认证状态:", hasToken);
    return hasToken;
  },

  // 检查是否是管理员token
  isAdminAuthenticated: (): boolean => {
    const token = tokenUtils.getToken();
    if (!token) return false;
    
    try {
      // 解析JWT token的payload部分
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isAdmin = payload.role === 'admin' || payload.sub === 'admin';
      console.log("检查管理员认证状态:", isAdmin, "payload:", payload);
      return isAdmin;
    } catch (error) {
      console.log("解析token失败:", error);
      return false;
    }
  },
};

// SSE 通知 API
export const notificationApi = {
  // 建立SSE连接
  connectSSE: (phone: string, onMessage: (event: MessageEvent) => void, onError?: (error: Event) => void): EventSource | null => {
    if (typeof window === 'undefined') return null;
    
    const token = tokenUtils.getToken();
    if (!token) {
      console.error('建立SSE连接失败: 未找到认证token');
      return null;
    }

    // 创建SSE连接，由于EventSource不支持自定义headers，我们通过URL参数传递token
    const sseUrl = `${getApiUrl()}/notifications/connect/${phone}?token=${encodeURIComponent(token)}`;
    console.log('建立SSE连接:', sseUrl);
    
    const eventSource = new EventSource(sseUrl);
    
    // 连接成功事件
    eventSource.onopen = (event) => {
      console.log('SSE连接已建立', event);
    };
    
    // 接收消息
    eventSource.onmessage = onMessage;
    
    // 监听特定事件
    eventSource.addEventListener('connection', (event) => {
      console.log('收到连接确认消息:', event.data);
    });
    
    eventSource.addEventListener('notification', (event) => {
      console.log('收到通知消息:', event.data);
      onMessage(event);
    });
    
    eventSource.addEventListener('points_update', (event) => {
      console.log('收到点数更新消息:', event.data);
      onMessage(event);
    });
    
    // 错误处理
    eventSource.onerror = (error) => {
      console.error('SSE连接发生错误:', error);
      if (onError) {
        onError(error);
      }
    };
    
    return eventSource;
  },
  
  // 关闭SSE连接
  closeSSE: (eventSource: EventSource | null) => {
    if (eventSource) {
      eventSource.close();
      console.log('SSE连接已关闭');
    }
  },
};