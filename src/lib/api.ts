// API 配置和请求工具函数
import { getCompatibleApiUrl } from '@/config/api';

// 获取API基础URL
const getApiUrl = () => {
  return getCompatibleApiUrl();
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
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
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

// Token 管理 - 分离用户和管理员token
export const tokenUtils = {
  // 用户token管理
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      console.log("保存用户token到localStorage:", token.substring(0, 20) + "...");
      localStorage.setItem('user_token', token);
      console.log("用户token保存完成，验证:", localStorage.getItem('user_token') ? "成功" : "失败");
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('user_token');
      console.log("从localStorage获取用户token:", token ? token.substring(0, 20) + "..." : "无");
      return token;
    }
    return null;
  },

  removeToken: () => {
    if (typeof window !== 'undefined') {
      console.log("从localStorage移除用户token");
      localStorage.removeItem('user_token');
    }
  },

  isAuthenticated: (): boolean => {
    const hasToken = !!tokenUtils.getToken();
    console.log("检查用户认证状态:", hasToken);
    return hasToken;
  },

  // 管理员token管理
  setAdminToken: (token: string) => {
    if (typeof window !== 'undefined') {
      console.log("保存管理员token到localStorage:", token.substring(0, 20) + "...");
      localStorage.setItem('admin_token', token);
      console.log("管理员token保存完成，验证:", localStorage.getItem('admin_token') ? "成功" : "失败");
    }
  },

  getAdminToken: (): string | null => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      console.log("从localStorage获取管理员token:", token ? token.substring(0, 20) + "..." : "无");
      return token;
    }
    return null;
  },

  removeAdminToken: () => {
    if (typeof window !== 'undefined') {
      console.log("从localStorage移除管理员token");
      localStorage.removeItem('admin_token');
    }
  },

  // 检查是否是管理员token
  isAdminAuthenticated: (): boolean => {
    const token = tokenUtils.getAdminToken();
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

// 聊天相关接口
export interface ChatMessage {
  id: number;
  apiKey: string;
  sender: string;
  receiver: string;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRequest {
  apiKey: string;
  receiver: string;
  content: string;
}

// 聊天相关API
export const chatApi = {
  // 发送消息
  sendMessage: async (messageData: ChatMessageRequest, token: string): Promise<ApiResponse<ChatMessage>> => {
    return request('/chat/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(messageData)
    });
  },

  // 获取聊天记录
  getChatHistory: async (apiKey: string, token: string): Promise<ApiResponse<ChatMessage[]>> => {
    return request(`/chat/history?apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 获取新消息
  getNewMessages: async (apiKey: string, after: string, token: string): Promise<ApiResponse<ChatMessage[]>> => {
    return request(`/chat/new-messages?apiKey=${encodeURIComponent(apiKey)}&after=${encodeURIComponent(after)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 标记消息为已读
  markMessagesAsRead: async (apiKey: string, token: string): Promise<ApiResponse<void>> => {
    return request(`/chat/mark-read?apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 获取未读消息数量
  getUnreadMessageCount: async (apiKey: string, token: string): Promise<ApiResponse<number>> => {
    return request(`/chat/unread-count?apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 创建或获取会话
  createOrGetSession: async (apiKey: string, token: string): Promise<ApiResponse<any>> => {
    return request(`/chat/session?apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
};