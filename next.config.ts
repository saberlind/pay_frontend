import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Next.js 15+ 已移除开发者指示器配置

  // 生产环境配置 - 移除upgrade-insecure-requests避免SSL错误

  // 静态导出配置
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // GitHub Pages配置
  ...(process.env.NODE_ENV === 'production' && process.env.GITHUB_ACTIONS && {
    basePath: '/pay_frontend',
    assetPrefix: '/pay_frontend/',
  }),
};

export default nextConfig;
