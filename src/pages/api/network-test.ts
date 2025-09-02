import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tests = [];
  
  // 测试1: 访问公共API（应该成功）
  try {
    const publicResponse = await fetch('https://httpbin.org/get', { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    tests.push({
      name: '公共HTTPS API测试',
      url: 'https://httpbin.org/get',
      status: publicResponse.status,
      success: publicResponse.ok,
      time: new Date().toISOString()
    });
  } catch (error) {
    tests.push({
      name: '公共HTTPS API测试',
      url: 'https://httpbin.org/get',
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      time: new Date().toISOString()
    });
  }

  // 测试2: 访问您的后端HTTP（可能失败）
  try {
    const backendResponse = await fetch('http://129.211.92.125:1009/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    tests.push({
      name: '后端HTTP API测试',
      url: 'http://129.211.92.125:1009/api/health',
      status: backendResponse.status,
      success: backendResponse.ok,
      time: new Date().toISOString()
    });
  } catch (error) {
    tests.push({
      name: '后端HTTP API测试',
      url: 'http://129.211.92.125:1009/api/health',
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      time: new Date().toISOString()
    });
  }

  // 测试3: 尝试访问一个公共HTTP API
  try {
    const httpResponse = await fetch('http://httpbin.org/get', {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    tests.push({
      name: '公共HTTP API测试',
      url: 'http://httpbin.org/get',
      status: httpResponse.status,
      success: httpResponse.ok,
      time: new Date().toISOString()
    });
  } catch (error) {
    tests.push({
      name: '公共HTTP API测试',
      url: 'http://httpbin.org/get',
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      time: new Date().toISOString()
    });
  }

  // 环境信息
  const environment = {
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    region: process.env.VERCEL_REGION || 'unknown',
    timestamp: new Date().toISOString()
  };

  res.status(200).json({
    message: 'Vercel网络连接测试',
    environment,
    tests,
    summary: {
      total: tests.length,
      passed: tests.filter(t => t.success).length,
      failed: tests.filter(t => !t.success).length
    }
  });
}
