import { NextApiRequest, NextApiResponse } from 'next';

// 使用公共CORS代理服务作为备用方案
const CORS_PROXY_SERVICES = [
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.status(200).end();
    return;
  }

  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: '缺少目标URL参数' 
    });
  }

  // 构建完整的后端URL
  const backendUrl = `http://129.211.92.125:1009${url}`;
  
  console.log('🌐 使用CORS代理访问:', backendUrl);

  for (const proxyService of CORS_PROXY_SERVICES) {
    try {
      const proxyUrl = `${proxyService}${encodeURIComponent(backendUrl)}`;
      console.log('🔄 尝试代理服务:', proxyService);
      
      const response = await fetch(proxyUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization && { 
            'Authorization': req.headers.authorization 
          }),
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' && req.body 
          ? JSON.stringify(req.body) 
          : undefined,
        signal: AbortSignal.timeout(30000)
      });

      const data = await response.text();
      
      console.log('✅ 代理请求成功:', response.status);
      
      // 设置响应头
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      
      res.status(response.status);
      
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch {
        res.send(data);
      }
      
      return; // 成功就退出
      
    } catch (error) {
      console.log('❌ 代理服务失败:', proxyService, error);
      continue; // 尝试下一个代理服务
    }
  }

  // 所有代理服务都失败了
  res.status(502).json({
    success: false,
    message: '所有代理服务都无法访问后端',
    targetUrl: backendUrl,
    timestamp: new Date().toISOString()
  });
}
