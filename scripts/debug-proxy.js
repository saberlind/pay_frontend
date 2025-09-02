#!/usr/bin/env node

/**
 * 本地代理调试工具
 * 用于在本地环境下测试代理逻辑
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/config/api.ts');

// 读取当前配置
let content = fs.readFileSync(configPath, 'utf8');

// 检查当前模式
const isProxyMode = content.includes('local: \'/api/proxy\'');

if (isProxyMode) {
  // 切换到直连模式
  content = content.replace(
    'local: \'/api/proxy\',',
    'local: \'http://localhost:1009/api\','
  );
  console.log('✅ 已切换到直连模式 (http://localhost:1009/api)');
  console.log('📝 本地开发现在直接连接后端，不经过代理');
} else {
  // 切换到代理模式
  content = content.replace(
    'local: \'http://localhost:1009/api\',',
    'local: \'/api/proxy\','
  );
  console.log('✅ 已切换到代理模式 (/api/proxy)');
  console.log('📝 本地开发现在通过代理连接后端，便于调试代理逻辑');
}

// 写回文件
fs.writeFileSync(configPath, content);

console.log('');
console.log('🔄 请重启开发服务器使配置生效：');
console.log('   npm run dev');
console.log('');
console.log('🧪 测试端点：');
console.log('   http://localhost:3000/api/debug-env    - 环境变量检查');
console.log('   http://localhost:3000/api/proxy/health - 代理健康检查');
console.log('   http://localhost:3000/login           - 登录页面测试');
