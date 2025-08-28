import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Next.js 15+ 已移除开发者指示器配置

  // 生产环境配置
  ...(process.env.NODE_ENV === 'production' && {
    // 允许混合内容（HTTPS调用HTTP API）
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: "upgrade-insecure-requests",
            },
          ],
        },
      ];
    },
  }),

  // 静态导出配置
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // 如果部署到子路径，需要设置basePath和assetPrefix
  // basePath: '/your-repository-name',
  // assetPrefix: '/your-repository-name/',
};

export default nextConfig;
