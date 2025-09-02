import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 测试通过公共CORS代理访问后端
    const backendUrl = 'http://129.211.92.125:1009/api/health';
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(backendUrl)}`;
    
    console.log('🧪 测试CORS代理:', {
      backendUrl,
      proxyUrl
    });

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000)
    });

    const data = await response.text();

    console.log('✅ CORS代理响应:', {
      status: response.status,
      ok: response.ok,
      data: data.substring(0, 200) // 只显示前200字符
    });

    res.status(200).json({
      success: true,
      message: 'CORS代理测试成功',
      proxyResponse: {
        status: response.status,
        ok: response.ok,
        data: data
      },
      urls: {
        backend: backendUrl,
        proxy: proxyUrl
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ CORS代理测试失败:', error);

    res.status(500).json({
      success: false,
      message: 'CORS代理测试失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
}
