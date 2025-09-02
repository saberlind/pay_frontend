# Vercel 部署完整指南

## 📋 目标
将 HTTPS 前端项目部署到 Vercel，通过 API Routes 代理实现对 `http://IP:PORT` 格式后台接口的安全访问。

## 🎯 解决方案架构

```
用户浏览器 (HTTPS)
    ↓ 请求 https://your-app.vercel.app/api/proxy/auth/login
Vercel Edge Network (HTTPS)
    ↓ 转发到 Vercel Function
API Routes 代理 (/api/proxy/[...path].ts)
    ↓ 代理请求到
后台服务器 (http://129.211.92.125:1009/auth/login)
    ↓ 返回响应
用户浏览器接收 HTTPS 响应
```

## 🔧 项目配置检查

### 1. 确认配置文件

首先确保以下文件配置正确：

**📁 next.config.ts**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 注意：Vercel 部署时不要使用 output: 'export'
  // output: 'export',  // ❌ 注释掉这行
  
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // GitHub Pages 配置（Vercel 不需要）
  ...(process.env.GITHUB_ACTIONS === 'true' && {
    basePath: '/pay_frontend',
    assetPrefix: '/pay_frontend/',
  }),
  
  // CORS 配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Range',
          },
        ],
      },
    ];
  },
  
  // 环境变量配置
  env: {
    DEPLOYMENT_TARGET: process.env.DEPLOYMENT_TARGET || 'vercel',
    BACKEND_API_URL: process.env.BACKEND_API_URL || 'http://129.211.92.125:1009',
  },
};

export default nextConfig;
```

**📁 src/config/api.ts**
```typescript
export class ApiConfig {
  private static readonly ENV_CONFIGS = {
    local: 'http://localhost:1009/api',
    vercel: '/api/proxy',  // ✅ Vercel 使用代理路径
    // ... 其他配置
  };

  static getApiBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return this.ENV_CONFIGS.local;
      }
      
      if (hostname.includes('vercel.app')) {
        return this.ENV_CONFIGS.vercel;  // ✅ 返回代理路径
      }
    }
    
    return this.ENV_CONFIGS.vercel;  // 默认使用 Vercel 代理
  }
}
```

### 2. 验证代理文件

确保 `src/pages/api/proxy/[...path].ts` 文件存在且配置正确：

```typescript
import { NextApiRequest, NextApiResponse } from 'next';

// 后端 API 基础地址
const BACKEND_BASE_URL = process.env.BACKEND_API_URL || 'http://129.211.92.125:1009';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  // 构建目标 URL
  const targetPath = Array.isArray(path) ? path.join('/') : path;
  const targetUrl = `${BACKEND_BASE_URL}/${targetPath}`;
  
  // 处理查询参数
  const { path: _, ...queryParams } = req.query;
  const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
  
  console.log(`🔄 代理请求: ${req.method} ${fullUrl}`);
  
  try {
    // 构建请求配置
    const requestConfig: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { 
          'Authorization': req.headers.authorization 
        }),
      },
    };
    
    // 转发请求体（POST/PUT 请求）
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      requestConfig.body = JSON.stringify(req.body);
    }
    
    // 发送请求到后端
    const response = await fetch(fullUrl, requestConfig);
    const responseText = await response.text();
    
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // 返回响应
    res.status(response.status);
    
    try {
      const jsonData = JSON.parse(responseText);
      res.json(jsonData);
    } catch {
      res.send(responseText);
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
```

## 🚀 部署步骤

### 步骤 1: 准备工作

1. **确保项目已推送到 GitHub**
   ```bash
   git add .
   git commit -m "配置 Vercel 部署和 API 代理"
   git push origin main
   ```

2. **修改 next.config.ts**
   
   确保注释掉静态导出配置：
   ```typescript
   // output: 'export',  // ❌ Vercel 不需要静态导出
   ```

### 步骤 2: 在 Vercel 上部署

#### 方法 A: 通过 Vercel 网站（推荐）

1. **访问 Vercel**
   - 打开 [vercel.com](https://vercel.com)
   - 点击 "Start Deploying"

2. **连接 GitHub**
   - 选择 "Continue with GitHub"
   - 授权 Vercel 访问您的 GitHub 账户

3. **导入项目**
   - 在项目列表中找到 `pay` 仓库
   - 点击 "Import"

4. **配置项目**
   ```
   Project Name: pay-frontend
   Framework Preset: Next.js
   Root Directory: frontend  # ⚠️ 重要：设置为 frontend 目录
   Build and Output Settings: (使用默认值)
   ```

5. **设置环境变量**
   
   在 "Environment Variables" 部分添加：
   ```
   Name: DEPLOYMENT_TARGET
   Value: vercel
   
   Name: BACKEND_API_URL  
   Value: http://129.211.92.125:1009
   
   Name: NEXT_PUBLIC_API_URL
   Value: /api/proxy
   ```

6. **点击 Deploy**
   - Vercel 会自动构建和部署项目
   - 等待部署完成（通常 2-5 分钟）

#### 方法 B: 通过 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **在项目根目录运行**
   ```bash
   cd frontend
   vercel
   ```

4. **按提示设置**
   ```
   ? Set up and deploy "~/pay/frontend"? [Y/n] y
   ? Which scope do you want to deploy to? [Your Account]
   ? Link to existing project? [y/N] n
   ? What's your project's name? pay-frontend
   ? In which directory is your code located? ./
   ```

5. **设置环境变量**
   ```bash
   vercel env add DEPLOYMENT_TARGET
   # 输入: vercel
   
   vercel env add BACKEND_API_URL
   # 输入: http://129.211.92.125:1009
   
   vercel env add NEXT_PUBLIC_API_URL  
   # 输入: /api/proxy
   ```

6. **生产环境部署**
   ```bash
   vercel --prod
   ```

### 步骤 3: 创建 vercel.json 配置文件

在 `frontend` 目录创建 `vercel.json`：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/proxy/(.*)",
      "dest": "/api/proxy/$1"
    }
  ],
  "env": {
    "DEPLOYMENT_TARGET": "vercel",
    "BACKEND_API_URL": "http://129.211.92.125:1009"
  },
  "functions": {
    "src/pages/api/proxy/[...path].ts": {
      "maxDuration": 30
    }
  }
}
```

## 🧪 测试部署

### 1. 基础测试

部署完成后，您会得到类似这样的 URL：`https://pay-frontend.vercel.app`

1. **测试前端访问**
   ```bash
   curl https://pay-frontend.vercel.app
   ```

2. **测试 API 代理**
   ```bash
   # 测试健康检查（如果有的话）
   curl https://pay-frontend.vercel.app/api/proxy/health
   
   # 测试登录接口
   curl -X POST https://pay-frontend.vercel.app/api/proxy/auth/login \
     -H "Content-Type: application/json" \
     -d '{"phone":"1234567890","password":"test123"}'
   ```

### 2. 浏览器测试

1. **打开网站**
   - 访问您的 Vercel 域名
   - 确保页面正常加载

2. **测试登录功能**
   - 打开浏览器开发者工具 → Network 面板
   - 尝试登录
   - 观察请求：
     ```
     Request URL: https://pay-frontend.vercel.app/api/proxy/auth/login
     Method: POST
     Status: 200 OK
     ```

3. **检查控制台**
   - 确保没有 CORS 错误
   - 确保没有 Mixed Content 警告

### 3. API 调用验证

在浏览器控制台运行：

```javascript
// 测试 API 配置
console.log('API Base URL:', window.location.origin + '/api/proxy');

// 测试实际请求
fetch('/api/proxy/auth/me', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(response => response.json())
.then(data => console.log('API 响应:', data))
.catch(error => console.error('API 错误:', error));
```

## 🔍 故障排除

### 常见问题 1: 构建失败

**错误信息**：
```
Error: Cannot resolve module 'pages/api/proxy/[...path]'
```

**解决方案**：
1. 确保文件路径正确：`src/pages/api/proxy/[...path].ts`
2. 检查 TypeScript 配置
3. 重新部署

### 常见问题 2: API 代理不工作

**错误信息**：
```
404 - This page could not be found
```

**解决方案**：
1. 检查 `vercel.json` 配置
2. 确保代理文件存在
3. 查看 Vercel 函数日志

### 常见问题 3: CORS 错误

**错误信息**：
```
Access to fetch has been blocked by CORS policy
```

**解决方案**：
1. 检查代理文件中的 CORS 头设置
2. 确保 `next.config.ts` 中的 headers 配置正确
3. 重新部署

### 常见问题 4: 环境变量不生效

**检查步骤**：
1. 在 Vercel 仪表板确认环境变量已设置
2. 重新部署项目
3. 检查变量名称是否正确

### 常见问题 5: 后端连接失败

**错误信息**：
```
fetch failed
```

**解决方案**：
1. 确认后端服务运行正常：
   ```bash
   curl http://129.211.92.125:1009/health
   ```
2. 检查防火墙设置
3. 验证后端 CORS 配置

## 📊 监控和日志

### 1. Vercel 仪表板

访问 [vercel.com/dashboard](https://vercel.com/dashboard)：
- **Functions** 标签：查看 API 代理调用日志
- **Analytics** 标签：查看流量统计
- **Deployments** 标签：查看部署历史

### 2. 实时日志

```bash
vercel logs --follow
```

### 3. 函数日志

在代理文件中添加更多日志：

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== API 代理请求开始 ===');
  console.log('请求方法:', req.method);
  console.log('请求路径:', req.url);
  console.log('请求头:', req.headers);
  console.log('目标 URL:', fullUrl);
  
  // ... 代理逻辑
  
  console.log('响应状态:', response.status);
  console.log('=== API 代理请求结束 ===');
}
```

## 🚀 性能优化

### 1. 函数配置

在 `vercel.json` 中优化函数设置：

```json
{
  "functions": {
    "src/pages/api/proxy/[...path].ts": {
      "maxDuration": 30,
      "memory": 1024,
      "runtime": "nodejs18.x"
    }
  }
}
```

### 2. 缓存策略

在代理文件中添加缓存：

```typescript
// 设置缓存头
res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
```

### 3. 错误重试

```typescript
const MAX_RETRIES = 3;
let retries = 0;

while (retries < MAX_RETRIES) {
  try {
    const response = await fetch(fullUrl, requestConfig);
    // 成功则跳出循环
    break;
  } catch (error) {
    retries++;
    if (retries === MAX_RETRIES) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
  }
}
```

## 🔒 安全配置

### 1. 环境变量安全

- ✅ 使用 `BACKEND_API_URL` 环境变量
- ✅ 不要在代码中硬编码敏感信息
- ✅ 定期轮换 API 密钥

### 2. 请求验证

在代理中添加请求验证：

```typescript
// 验证请求来源
const allowedOrigins = ['https://pay-frontend.vercel.app', 'http://localhost:3000'];
const origin = req.headers.origin;

if (origin && !allowedOrigins.includes(origin)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 3. 速率限制

```typescript
// 简单的速率限制（生产环境建议使用 Redis）
const requestCounts = new Map();
const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
const currentCount = requestCounts.get(clientIp) || 0;

if (currentCount > 100) {  // 每分钟最多 100 请求
  return res.status(429).json({ error: 'Too Many Requests' });
}

requestCounts.set(clientIp, currentCount + 1);
```

## 📋 部署检查清单

部署完成后，请检查以下项目：

- [ ] 前端页面可以正常访问 ✅
- [ ] 登录功能正常工作 ✅
- [ ] API 调用返回正确响应 ✅
- [ ] 浏览器控制台无错误 ✅
- [ ] Network 面板显示正确的请求 URL ✅
- [ ] 没有 CORS 错误 ✅
- [ ] 没有 Mixed Content 警告 ✅
- [ ] 所有功能测试通过 ✅
- [ ] 环境变量配置正确 ✅
- [ ] Vercel 函数日志正常 ✅

## 🎯 总结

通过以上配置，您的 HTTPS 前端现在可以：

1. ✅ **安全访问 HTTP 后端**：通过 Vercel API Routes 代理
2. ✅ **自动 HTTPS**：Vercel 提供免费 SSL 证书
3. ✅ **全球 CDN**：快速响应和高可用性
4. ✅ **易于维护**：通过环境变量管理后端地址
5. ✅ **生产就绪**：具备监控、日志和错误处理

您的应用现在已经成功部署到 Vercel，可以安全地访问 `http://129.211.92.125:1009` 后端服务！

---

## 🆘 需要帮助？

如果遇到问题：
1. 检查 Vercel 仪表板的函数日志
2. 使用浏览器开发者工具检查网络请求
3. 确认后端服务正常运行
4. 检查环境变量配置

祝您部署成功！🎉
