// App Router API代理中间件 - 用于Vercel部署
// 解决HTTPS前端调用HTTP后端的跨域问题

import { NextRequest, NextResponse } from 'next/server';

// 后端API基础地址
const BACKEND_BASE_URL = process.env.BACKEND_API_URL || 'http://129.211.92.125:1009/api';

// 处理所有HTTP方法
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'DELETE');
}

export async function OPTIONS(request: NextRequest) {
  // 处理 CORS 预检请求
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
    },
  });
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  const { path } = params;
  
  console.log(`📥 App Router代理接收请求:`, {
    method: method,
    url: request.url,
    path: path,
    pathType: Array.isArray(path) ? 'array' : typeof path,
    backendBaseUrl: BACKEND_BASE_URL
  });
  
  // 构建目标URL
  const targetPath = Array.isArray(path) ? path.join('/') : (path || '');
  const cleanBackendUrl = BACKEND_BASE_URL.replace(/\/+$/, '');
  const cleanTargetPath = targetPath.replace(/^\/+/, '');
  const targetUrl = `${cleanBackendUrl}/${cleanTargetPath}`;
  
  // 处理查询参数
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
  
  console.log(`🔄 App Router代理请求: ${method} ${fullUrl}`);
  console.log(`🔍 请求头:`, request.headers.get('authorization') ? '包含 Authorization' : '无 Authorization');
  
  try {
    // 直接连接后端
    const isVercelEnv = process.env.VERCEL || process.env.VERCEL_ENV;
    const isLocalEnv = process.env.NODE_ENV === 'development';
    
    if (isVercelEnv) {
      console.log(`🌐 Vercel环境，直接连接后端: ${fullUrl}`);
    } else if (isLocalEnv) {
      console.log(`🏠 本地环境，直接连接后端: ${fullUrl}`);
    } else {
      console.log(`🌍 其他环境，直接连接后端: ${fullUrl}`);
    }
    
    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ 请求超时，终止连接');
      controller.abort();
    }, 25000); // 25秒超时
    
    // 构建请求配置
    const requestConfig: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Proxy/2.0-AppRouter',
        // 转发认证头
        ...(request.headers.get('authorization') && { 
          'Authorization': request.headers.get('authorization')!
        }),
      },
      signal: controller.signal,
    };
    
    // 对于POST/PUT请求，转发请求体
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await request.text();
        if (body) {
          requestConfig.body = body;
        }
      } catch (error) {
        console.log('无法读取请求体:', error);
      }
    }
    
    // 发起请求到后端
    console.log(`🚀 发起请求到: ${fullUrl}`);
    const response = await fetch(fullUrl, requestConfig);
    clearTimeout(timeoutId);
    
    console.log(`📨 后端响应状态: ${response.status}`);
    const data = await response.text();
    
    // 创建响应头
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
    });
    
    // 尝试解析JSON，如果失败则返回原始文本
    let responseData;
    try {
      responseData = JSON.parse(data);
      headers.set('Content-Type', 'application/json');
    } catch {
      responseData = data;
      headers.set('Content-Type', 'text/plain');
    }
    
    return new NextResponse(JSON.stringify(responseData), {
      status: response.status,
      headers: headers,
    });
    
  } catch (error) {
    console.error('❌ App Router代理请求失败:', error);
    
    let errorMessage = '未知错误';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = '请求超时 - 无法连接到后端服务器';
        statusCode = 504;
      } else if (error.message.includes('fetch')) {
        errorMessage = '网络连接失败 - 后端服务器不可达';
        statusCode = 502;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'App Router代理服务器错误',
        error: errorMessage,
        targetUrl: fullUrl,
        timestamp: new Date().toISOString()
      },
      { 
        status: statusCode,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
        }
      }
    );
  }
}
