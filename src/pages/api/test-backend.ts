import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const BACKEND_BASE_URL = process.env.BACKEND_API_URL || 'http://129.211.92.125:1009/api';
  
  try {
    console.log('🧪 测试后端连接:', BACKEND_BASE_URL);
    
    // 测试简单的GET请求到健康检查接口
    const testUrl = `${BACKEND_BASE_URL.replace('/api', '')}/api/health`;
    console.log('📡 测试URL:', testUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.text();
    
    console.log('✅ 后端响应状态:', response.status);
    console.log('📄 后端响应数据:', data);
    
    res.status(200).json({
      success: true,
      message: '后端连接测试成功',
      backendUrl: testUrl,
      backendStatus: response.status,
      backendResponse: data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 后端连接测试失败:', error);
    
    let errorMessage = '未知错误';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = '请求超时';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(500).json({
      success: false,
      message: '后端连接测试失败',
      error: errorMessage,
      backendUrl: BACKEND_BASE_URL,
      timestamp: new Date().toISOString()
    });
  }
}
