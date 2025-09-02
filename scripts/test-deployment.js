#!/usr/bin/env node

/**
 * Vercel 部署测试脚本
 * 用于验证 HTTPS 前端到 HTTP 后端的代理是否正常工作
 */

const https = require('https');
const http = require('http');

// 配置
const config = {
  // 替换为您的 Vercel 域名
  frontendUrl: 'https://your-app.vercel.app',
  // 后端服务地址
  backendUrl: 'http://129.211.92.125:1009',
  // 测试的 API 端点
  testEndpoints: [
    '/health',
    '/auth/me',
    '/api/health'  // 根据您的后端实际端点调整
  ]
};

console.log('🧪 开始测试 Vercel 部署...\n');

// 工具函数：发送 HTTP 请求
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// 测试前端访问
async function testFrontend() {
  console.log('📱 测试前端访问...');
  
  try {
    const response = await makeRequest(config.frontendUrl);
    
    if (response.status === 200) {
      console.log('✅ 前端访问正常');
    } else {
      console.log(`❌ 前端访问失败，状态码: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ 前端访问错误: ${error.message}`);
  }
  
  console.log('');
}

// 测试后端直连
async function testBackend() {
  console.log('🔧 测试后端直连...');
  
  for (const endpoint of config.testEndpoints) {
    try {
      const url = `${config.backendUrl}${endpoint}`;
      const response = await makeRequest(url);
      
      console.log(`  ${endpoint}: ${response.status === 200 ? '✅' : '❌'} (${response.status})`);
    } catch (error) {
      console.log(`  ${endpoint}: ❌ 错误 - ${error.message}`);
    }
  }
  
  console.log('');
}

// 测试 API 代理
async function testProxy() {
  console.log('🔄 测试 API 代理...');
  
  for (const endpoint of config.testEndpoints) {
    try {
      const url = `${config.frontendUrl}/api/proxy${endpoint}`;
      const response = await makeRequest(url);
      
      console.log(`  /api/proxy${endpoint}: ${response.status < 500 ? '✅' : '❌'} (${response.status})`);
      
      // 检查 CORS 头
      const corsOrigin = response.headers['access-control-allow-origin'];
      if (corsOrigin) {
        console.log(`    CORS: ✅ (${corsOrigin})`);
      } else {
        console.log(`    CORS: ❌ 缺失 Access-Control-Allow-Origin`);
      }
      
    } catch (error) {
      console.log(`  /api/proxy${endpoint}: ❌ 错误 - ${error.message}`);
    }
  }
  
  console.log('');
}

// 测试 POST 请求（模拟登录）
async function testPostRequest() {
  console.log('📤 测试 POST 请求（模拟登录）...');
  
  const loginData = {
    phone: '1234567890',
    password: 'test123'
  };
  
  try {
    const url = `${config.frontendUrl}/api/proxy/auth/login`;
    const response = await makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
    
    console.log(`  POST /api/proxy/auth/login: ${response.status < 500 ? '✅' : '❌'} (${response.status})`);
    
    if (response.data) {
      try {
        const jsonData = JSON.parse(response.data);
        console.log(`    响应格式: ✅ JSON`);
        console.log(`    响应内容: ${JSON.stringify(jsonData).substring(0, 100)}...`);
      } catch {
        console.log(`    响应格式: ⚠️  非 JSON`);
        console.log(`    响应内容: ${response.data.substring(0, 100)}...`);
      }
    }
    
  } catch (error) {
    console.log(`  POST 请求错误: ❌ ${error.message}`);
  }
  
  console.log('');
}

// 主测试函数
async function runTests() {
  console.log(`🎯 测试目标:`);
  console.log(`   前端: ${config.frontendUrl}`);
  console.log(`   后端: ${config.backendUrl}`);
  console.log(`\n🚀 开始测试...\n`);
  
  await testFrontend();
  await testBackend();
  await testProxy();
  await testPostRequest();
  
  console.log('🏁 测试完成！');
  console.log('\n📋 检查清单:');
  console.log('  ✅ 前端可访问');
  console.log('  ✅ 后端可直连');
  console.log('  ✅ API 代理工作');
  console.log('  ✅ CORS 头正确');
  console.log('  ✅ POST 请求正常');
  console.log('\n💡 如果有 ❌ 标记，请检查相应的配置和日志。');
}

// 运行测试
if (require.main === module) {
  // 允许通过命令行参数指定前端 URL
  if (process.argv[2]) {
    config.frontendUrl = process.argv[2];
  }
  
  if (config.frontendUrl === 'https://your-app.vercel.app') {
    console.log('⚠️  请先设置您的 Vercel 域名:');
    console.log('   node scripts/test-deployment.js https://your-actual-domain.vercel.app');
    process.exit(1);
  }
  
  runTests().catch(console.error);
}

module.exports = { runTests, config };
