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
  
  // 构建目标URL
  const targetPath = Array.isArray(path) ? path.join('/') : path;
  const targetUrl = `${BACKEND_BASE_URL}/${targetPath}`;
  
  // 处理查询参数（排除 path 参数）
  const { path: _, ...queryParams } = req.query;
  const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
  
  console.log(`🔄 代理请求: ${req.method} ${fullUrl}`);
  console.log(`🔍 请求头:`, req.headers.authorization ? '包含 Authorization' : '无 Authorization');
  
  try {
    // 构建请求配置
    const requestConfig: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // 转发认证头
        ...(req.headers.authorization && { 
          'Authorization': req.headers.authorization 
        }),
      },
    };
    
    // 对于POST/PUT请求，转发请求体
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      requestConfig.body = JSON.stringify(req.body);
    }
    
    // 发起请求到后端
    const response = await fetch(fullUrl, requestConfig);
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
    console.error('代理请求失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '代理服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
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
