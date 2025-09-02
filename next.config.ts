import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Next.js 15+ 已移除开发者指示器配置

  // 生产环境配置 - 移除upgrade-insecure-requests避免SSL错误

  // 静态导出配置（仅限 GitHub Pages）
  // 在 Vercel 部署时应该注释掉以支持 API Routes
  output: process.env.DEPLOYMENT_TARGET === 'github' ? 'export' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // GitHub Pages配置
  ...(process.env.GITHUB_ACTIONS === 'true' && {
    basePath: '/pay_frontend',
    assetPrefix: '/pay_frontend/',
  }),
  
  // 添加CORS和API代理支持的headers配置
  async headers() {
    return [
      {
        // 为所有API路径添加CORS头
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
          {
            key: 'Access-Control-Expose-Headers',
            value: 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range',
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
