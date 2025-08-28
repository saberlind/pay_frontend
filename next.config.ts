import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // 禁用开发者工具浮窗
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  
  // 也可以通过实验性配置完全禁用 overlay
  experimental: {
    // 注意：这可能会影响错误显示，谨慎使用
    devOverlay: false
  },

  // GitHub Pages部署配置
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
