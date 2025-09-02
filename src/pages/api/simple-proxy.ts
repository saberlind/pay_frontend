import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join('/') : (path || '');
  
  // 直接使用AllOrigins公共代理服务
  const backendUrl = `http://129.211.92.125:1009/api/${targetPath}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(backendUrl)}`;
  
  console.log('🌐 简单代理请求:', {
    originalPath: targetPath,
    backendUrl,
    proxyUrl,
    method: req.method
  });

  try {
    const requestInit: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // 对于POST/PUT请求，添加请求体
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      requestInit.body = JSON.stringify(req.body);
    }

    const response = await fetch(proxyUrl, requestInit);
    const data = await response.text();

    console.log('✅ 代理响应:', response.status);

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 返回响应
    res.status(response.status);
    
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      res.send(data);
    }

  } catch (error) {
    console.error('❌ 简单代理失败:', error);
    
    res.status(500).json({
      success: false,
      message: '代理服务失败',
      error: error instanceof Error ? error.message : '未知错误',
      targetUrl: backendUrl
    });
  }
}
