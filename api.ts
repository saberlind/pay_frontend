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
  // 使用正确的tokenUtils获取用户token
  const token = tokenUtils.getToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  // 调试token发送
  if (token) {
    console.log("🔐 即将发送的token:", token.substring(0, 30) + "...");
    
    // 验证token格式和内容
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log("🔍 Token payload详情:", {
        subject: payload.sub,
        issued_at: new Date(payload.iat * 1000).toLocaleString(),
        expires_at: new Date(payload.exp * 1000).toLocaleString(),
        current_time: new Date().toLocaleString(),
        is_expired_clientside: new Date() >= new Date(payload.exp * 1000)
      });
    } catch (e) {
      console.error("❌ Token格式解析失败:", e);
    }
  } else {
    console.log("⚠️ 没有token被发送");
  }

  const fullUrl = `${getApiUrl()}${endpoint}`;
  
  console.log("发起API请求:", fullUrl, "配置:", config);

  const response = await fetch(fullUrl, config);
  console.log("API响应状态:", response.status, response.statusText);
  
  const data = await response.json();
  console.log("API响应数据:", data);
  
  if (!response.ok) {
    console.error("API请求失败:", response.status, response.statusText);
    // 如果响应包含错误信息，返回包含错误信息的响应对象
    if (data && data.message) {
      return {
        success: false,
        message: data.message,
        data: null
      } as ApiResponse<T>;
    }
    // 如果没有具体错误信息，返回通用错误
    return {
      success: false,
      message: `请求失败 (${response.status})`,
      data: null
    } as ApiResponse<T>;
  }

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
    // 使用管理员token的特殊请求函数
    const adminToken = tokenUtils.getAdminToken();
    
    if (!adminToken) {
      throw new Error('管理员未登录，请先登录管理员账号');
    }
    
    const config: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(data),
    };

    const fullUrl = `${getApiUrl()}/admin/add-points`;
    
    console.log("发起管理员增加点数API请求:", fullUrl, "配置:", config);

    const response = await fetch(fullUrl, config);
    console.log("管理员增加点数API响应状态:", response.status, response.statusText);
    
    const result = await response.json();
    console.log("管理员增加点数API响应数据:", result);
    
    if (!response.ok) {
      console.error("管理员增加点数API请求失败:", response.status, response.statusText);
      if (result && result.message) {
        return {
          success: false,
          message: result.message,
          data: undefined
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return result;
  },

  // 根据手机号查询用户
  getUserByPhone: async (phone: string): Promise<ApiResponse<User>> => {
    // 使用管理员token的特殊请求函数
    const adminToken = tokenUtils.getAdminToken();
    
    if (!adminToken) {
      throw new Error('管理员未登录，请先登录管理员账号');
    }
    
    const config: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    const fullUrl = `${getApiUrl()}/admin/user/${phone}`;
    
    console.log("发起管理员查询用户API请求:", fullUrl, "配置:", config);

    const response = await fetch(fullUrl, config);
    console.log("管理员查询用户API响应状态:", response.status, response.statusText);
    
    const result = await response.json();
    console.log("管理员查询用户API响应数据:", result);
    
    if (!response.ok) {
      console.error("管理员查询用户API请求失败:", response.status, response.statusText);
      if (result && result.message) {
        return {
          success: false,
          message: result.message,
          data: undefined
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return result;
  },
};

// 积分监控相关接口
export interface UsageDataPoint {
  date: string;
  amount: number;
  timestamp: number;
}

export interface UsageMonitorData {
  dataPoints: UsageDataPoint[];
  totalUsage: number;
  apiKey: string;
  startTime?: string;
  endTime?: string;
  deductionType?: number;
  deductionSubtype?: number;
}

export interface UsageMonitorRequest {
  apiKey: string;
  deductionType?: number | null;
  deductionSubtype?: number | null;
  startTime?: string | null;
  endTime?: string | null;
}

// 积分监控 API
export const pointsApi = {
  // 管理员查询用户积分使用监控
  getUsageMonitor: async (data: UsageMonitorRequest): Promise<ApiResponse<UsageMonitorData>> => {
    // 使用管理员token的特殊请求函数
    const adminToken = tokenUtils.getAdminToken();
    
    if (!adminToken) {
      throw new Error('管理员未登录，请先登录管理员账号');
    }
    
    const config: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(data),
    };

    const fullUrl = `${getApiUrl()}/points/usage/monitor`;
    
    console.log("发起积分监控API请求:", fullUrl, "配置:", config);

    const response = await fetch(fullUrl, config);
    console.log("积分监控API响应状态:", response.status, response.statusText);
    
    const result = await response.json();
    console.log("积分监控API响应数据:", result);
    
    if (!response.ok) {
      console.error("积分监控API请求失败:", response.status, response.statusText);
      if (result && result.message) {
        return {
          success: false,
          message: result.message,
          data: undefined
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return result;
  },

  // 用户查询自己的积分使用监控
  getMyUsageMonitor: async (params: {
    apiKey: string;
    deductionType?: string;
    deductionSubtype?: string;
    startTime?: string;
    endTime?: string;
  }): Promise<ApiResponse<UsageMonitorData>> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });
    
    return request(`/points/usage/my-monitor?${queryParams.toString()}`);
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
      
      // 检查token是否过期
      if (token && tokenUtils.isTokenExpired(token)) {
        console.log("用户token已过期，自动清理");
        localStorage.removeItem('user_token');
        return null;
      }
      
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
      
      // 检查token是否过期
      if (token && tokenUtils.isTokenExpired(token)) {
        console.log("管理员token已过期，自动清理");
        localStorage.removeItem('admin_token');
        return null;
      }
      
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

  // 检查token是否过期
  isTokenExpired: (token: string): boolean => {
    try {
      // 解析JWT token的payload部分
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
      const expirationTime = payload.exp; // token过期时间戳（秒）
      
      console.log("Token过期检查:", {
        current: new Date(currentTime * 1000).toLocaleString(),
        expiry: new Date(expirationTime * 1000).toLocaleString(),
        expired: currentTime >= expirationTime
      });
      
      return currentTime >= expirationTime;
    } catch (error) {
      console.log("解析token失败，视为过期:", error);
      return true; // 解析失败就认为过期
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
    let connectionTimeout: NodeJS.Timeout;
    let hasConnected = false;
    
    // 设置连接超时检测
    connectionTimeout = setTimeout(() => {
      if (!hasConnected) {
        console.warn('SSE连接超时，关闭连接');
        eventSource.close();
        if (onError) {
          onError(new Event('timeout') as any);
        }
      }
    }, 10000); // 10秒超时
    
    // 连接成功事件
    eventSource.onopen = (event) => {
      console.log('SSE连接已建立', event);
      hasConnected = true;
      clearTimeout(connectionTimeout);
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
    
    // 监听聊天消息事件
    eventSource.addEventListener('chat_message', (event) => {
      console.log('🔔 收到SSE聊天消息事件:', event.data);
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
  
  // 轮询聊天消息
  startChatPolling: (onMessage: (data: any) => void, interval: number = 5000): NodeJS.Timeout => {
    console.log('启动聊天消息轮询，间隔:', interval + 'ms');
    
    const pollForChatMessages = async () => {
      try {
        const token = tokenUtils.getToken();
        if (!token) {
          console.warn('聊天轮询中断：未找到认证token');
          return;
        }
        
        // 调用聊天消息轮询接口
        const response = await request<any>('/chat/poll/messages', {
          method: 'GET',
        });
        
        if (response.success && (response as any).hasNewMessages) {
          console.log('发现新的聊天消息:', (response as any).unreadCount);
          // 模拟SSE事件格式
          const mockEvent = {
            data: JSON.stringify({
              type: 'chat_message',
              hasNewMessages: (response as any).hasNewMessages,
              unreadCount: (response as any).unreadCount,
              userType: (response as any).userType
            }),
            type: 'chat_message'
          };
          onMessage(mockEvent);
        }
      } catch (error) {
        console.warn('聊天轮询请求失败:', error);
      }
    };
    
    // 立即执行一次，然后开始定时轮询
    pollForChatMessages();
    return setInterval(pollForChatMessages, interval);
  },
  
  // 轮询用户点数
  startPointsPolling: (onMessage: (data: any) => void, interval: number = 5000): NodeJS.Timeout => {
    console.log('启动点数轮询，间隔:', interval + 'ms');
    let lastPoints: number | null = null;
    
    const pollForPointsUpdate = async () => {
      try {
        const token = tokenUtils.getToken();
        if (!token) {
          console.warn('点数轮询中断：未找到认证token');
          return;
        }
        
        // 调用点数轮询接口
        const response = await request<{points: number, timestamp: number, username: string}>('/auth/poll/points', {
          method: 'GET',
        });
        
        if (response.success && response.data) {
          const currentPoints = response.data.points;
          
          // 如果点数发生变化，触发通知
          if (lastPoints !== null && lastPoints !== currentPoints) {
            console.log('点数发生变化:', lastPoints, '->', currentPoints);
            const addedPoints = currentPoints - lastPoints;
            // 模拟SSE事件格式，保持与真实SSE事件数据结构一致
            const mockEvent = {
              data: JSON.stringify({
                newPoints: currentPoints,
                addedPoints: addedPoints,
                message: `您的账户点数已更新，当前余额: ${currentPoints} 点${addedPoints > 0 ? `（新增 ${addedPoints} 点）` : addedPoints < 0 ? `（消耗 ${Math.abs(addedPoints)} 点）` : ''}`
              }),
              type: 'points_update'
            };
            onMessage(mockEvent);
          }
          
          lastPoints = currentPoints;
        }
      } catch (error) {
        console.warn('点数轮询请求失败:', error);
      }
    };
    
    // 立即执行一次，然后开始定时轮询
    pollForPointsUpdate();
    return setInterval(pollForPointsUpdate, interval);
  },
  
  // 停止轮询
  stopPolling: (intervalId: NodeJS.Timeout) => {
    if (intervalId) {
      clearInterval(intervalId);
      console.log('轮询已停止');
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
  },

  // 获取所有会话列表（管理员专用）
  getAllSessions: async (token: string): Promise<ApiResponse<any[]>> => {
    return request('/chat/sessions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
};