// API代理中间件 - 用于Vercel部署
// 解决HTTPS前端调用HTTP后端的跨域问题

import { NextApiRequest, NextApiResponse } from 'next';

// 后端API基础地址
const BACKEND_BASE_URL = process.env.BACKEND_API_URL || 'http://129.211.92.125:1009/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.status(200).end();
    return;
  }

  const { path } = req.query;
  
  console.log(`📥 代理接收请求:`, {
    method: req.method,
    url: req.url,
    path: path,
    pathType: Array.isArray(path) ? 'array' : typeof path,
    backendBaseUrl: BACKEND_BASE_URL
  });
  
  // 构建目标URL - 确保没有双斜杠
  const targetPath = Array.isArray(path) ? path.join('/') : (path || '');
  const cleanBackendUrl = BACKEND_BASE_URL.replace(/\/+$/, ''); // 移除末尾斜杠
  const cleanTargetPath = targetPath.replace(/^\/+/, ''); // 移除开头斜杠
  const targetUrl = `${cleanBackendUrl}/${cleanTargetPath}`;
  
  // 处理查询参数（排除 path 参数）
  const { path: _, ...queryParams } = req.query;
  const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
  
  console.log(`🔄 代理请求: ${req.method} ${fullUrl}`);
  console.log(`🔍 请求头:`, req.headers.authorization ? '包含 Authorization' : '无 Authorization');
  
  try {
    // 在Vercel环境中，使用公共CORS代理作为中转
    const isVercelEnv = process.env.VERCEL || process.env.VERCEL_ENV;
    let actualUrl = fullUrl;
    
    if (isVercelEnv) {
      // 在Vercel中使用公共代理
      actualUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`;
      console.log(`🌐 Vercel环境，使用CORS代理: ${actualUrl}`);
    }
    
    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ 请求超时，终止连接');
      controller.abort();
    }, 25000); // 25秒超时，留5秒给Vercel处理
    
    // 构建请求配置
    const requestConfig: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Proxy/1.0',
        // 转发认证头
        ...(req.headers.authorization && { 
          'Authorization': req.headers.authorization 
        }),
      },
      signal: controller.signal,
    };
    
    // 对于POST/PUT请求，转发请求体
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      requestConfig.body = JSON.stringify(req.body);
    }
    
    // 发起请求到后端
    console.log(`🚀 发起请求到: ${actualUrl}`);
    console.log(`📋 原始目标: ${fullUrl}`);
    const response = await fetch(actualUrl, requestConfig);
    clearTimeout(timeoutId); // 清除超时计时器
    
    console.log(`📨 后端响应状态: ${response.status}`);
    const data = await response.text();
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    
    // 转发响应状态和数据
    res.status(response.status);
    
    // 尝试解析JSON，如果失败则返回原始文本
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      res.send(data);
    }
    
  } catch (error) {
    console.error('❌ 代理请求失败:', error);
    
    let errorMessage = '未知错误';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = '请求超时 - 无法连接到后端服务器';
        statusCode = 504; // Gateway Timeout
      } else if (error.message.includes('fetch')) {
        errorMessage = '网络连接失败 - 后端服务器不可达';
        statusCode = 502; // Bad Gateway
      }
    }
    
    res.status(statusCode).json({ 
      success: false, 
      message: '代理服务器错误',
      error: errorMessage,
      targetUrl: fullUrl,
      timestamp: new Date().toISOString()
    });
  }
}

// 处理OPTIONS预检请求
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
