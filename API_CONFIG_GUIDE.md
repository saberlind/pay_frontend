# 🔧 API配置管理指南

## 概述

为了方便在不同环境之间切换API服务器地址，我们创建了统一的API配置管理系统。

## 配置方式

### 1. 环境变量配置（推荐）

在项目根目录创建 `.env.local` 文件：

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://129.211.92.125:1009/api
```

### 2. 代码配置

在 `src/config/api.ts` 中修改默认配置：

```typescript
private static readonly DEFAULT_API_URL = 'http://your-server:1009/api';
```

## 环境切换

### 本地开发
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:1009/api
```

### 远程开发服务器
```bash
# .env.local  
NEXT_PUBLIC_API_URL=http://129.211.92.125:1009/api
```

### 生产环境（HTTPS）
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

### GitHub Pages部署
```bash
# 在GitHub Actions中设置环境变量
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

## 使用方法

### 在组件中使用
```typescript
import { getCompatibleApiUrl } from '@/config/api';

// 获取API地址
const apiUrl = getCompatibleApiUrl();
const response = await fetch(`${apiUrl}/auth/login`, {
  // ...
});
```

### 在API工具中使用
```typescript
// src/lib/api.ts 已经集成了配置管理
import { authApi } from '@/lib/api';

// 直接使用，会自动使用正确的API地址
const result = await authApi.login(credentials);
```

## 配置优先级

1. **环境变量** `NEXT_PUBLIC_API_URL`（最高优先级）
2. **NODE_ENV自动选择**（production环境自动使用生产配置）
3. **默认配置**（代码中的DEFAULT_API_URL）

## 调试配置

开发环境下会自动打印配置信息到控制台：

```
🔧 API配置信息
当前API URL: http://129.211.92.125:1009/api
环境变量 NEXT_PUBLIC_API_URL: http://129.211.92.125:1009/api
NODE_ENV: development
是否HTTPS环境: false
可用环境配置: ["local", "dev", "prod", "test"]
```

## 特殊处理

### HTTPS混合内容问题
当前端部署在HTTPS环境（如Vercel、GitHub Pages）而后端是HTTP时，系统会：
1. 自动检测环境
2. 在控制台显示警告
3. 提供兼容性处理

### 解决方案
1. **推荐**：将后端部署到支持HTTPS的平台（如Render、Railway）
2. **临时**：使用CORS代理服务

## 快速切换环境

### 方法1：修改环境变量
```bash
# 切换到本地
echo "NEXT_PUBLIC_API_URL=http://localhost:1009/api" > .env.local

# 切换到远程
echo "NEXT_PUBLIC_API_URL=http://129.211.92.125:1009/api" > .env.local

# 切换到生产
echo "NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api" > .env.local
```

### 方法2：使用代码配置
```typescript
// 在 src/config/api.ts 中临时修改
static getApiBaseUrl(): string {
  // 临时强制使用特定环境
  return 'http://localhost:1009/api';
}
```

## 注意事项

1. **重启开发服务器**：修改环境变量后需要重启 `npm run dev`
2. **构建时配置**：部署时确保环境变量正确设置
3. **安全性**：不要在代码中硬编码敏感信息
4. **版本控制**：`.env.local` 文件不应提交到Git

## 故障排除

### 问题1：API请求失败
- 检查控制台的配置信息
- 确认API服务器是否可访问
- 验证环境变量是否正确设置

### 问题2：HTTPS混合内容错误
- 将后端部署到HTTPS环境
- 或使用代理服务解决

### 问题3：环境变量不生效
- 重启开发服务器
- 检查文件名是否为 `.env.local`
- 确认变量名以 `NEXT_PUBLIC_` 开头

## 最佳实践

1. **开发环境**：使用 `.env.local` 配置
2. **生产环境**：使用平台环境变量设置
3. **团队协作**：提供 `.env.example` 示例文件
4. **文档更新**：配置变更时及时更新文档

现在您只需要修改一个地方就能切换所有API地址了！🎉
