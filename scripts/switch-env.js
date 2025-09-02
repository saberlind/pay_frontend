#!/usr/bin/env node

/**
 * 快速切换API环境脚本
 * 使用方法：
 * node scripts/switch-env.js local    # 切换到本地环境
 * node scripts/switch-env.js dev      # 切换到开发服务器
 * node scripts/switch-env.js prod     # 切换到生产环境
 */

const fs = require('fs');
const path = require('path');

// 环境配置
const environments = {
  local: 'http://localhost:1009/api',
  dev: 'http://129.211.92.125:1009/api',
  prod: 'http://129.211.92.125:1009/api',
  test: 'http://129.211.92.125:1009/api'
};

// 获取命令行参数
const targetEnv = process.argv[2];

if (!targetEnv) {
  console.log('🔧 API环境切换工具');
  console.log('');
  console.log('使用方法：');
  console.log('  node scripts/switch-env.js <环境名>');
  console.log('');
  console.log('可用环境：');
  Object.keys(environments).forEach(env => {
    console.log(`  ${env.padEnd(8)} - ${environments[env]}`);
  });
  console.log('');
  console.log('示例：');
  console.log('  node scripts/switch-env.js dev   # 切换到开发服务器');
  console.log('  node scripts/switch-env.js local # 切换到本地环境');
  process.exit(1);
}

if (!environments[targetEnv]) {
  console.error(`❌ 未知环境: ${targetEnv}`);
  console.log('可用环境:', Object.keys(environments).join(', '));
  process.exit(1);
}

// 创建.env.local文件
const envFilePath = path.join(__dirname, '..', '.env.local');
const envContent = `# 自动生成的环境配置文件
# 生成时间: ${new Date().toLocaleString()}
# 当前环境: ${targetEnv}

NEXT_PUBLIC_API_URL=${environments[targetEnv]}
`;

try {
  fs.writeFileSync(envFilePath, envContent);
  console.log(`✅ 成功切换到 ${targetEnv} 环境`);
  console.log(`📍 API地址: ${environments[targetEnv]}`);
  console.log('');
  console.log('⚠️  请重启开发服务器以使配置生效：');
  console.log('   npm run dev');
} catch (error) {
  console.error('❌ 切换环境失败:', error.message);
  process.exit(1);
}
