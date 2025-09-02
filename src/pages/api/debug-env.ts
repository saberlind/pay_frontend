import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 调试环境变量
  const envInfo = {
    BACKEND_API_URL: process.env.BACKEND_API_URL,
    DEPLOYMENT_TARGET: process.env.DEPLOYMENT_TARGET,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    // 添加所有相关的环境变量
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('API') || key.includes('BACKEND') || key.includes('VERCEL')
    )
  };

  res.status(200).json({
    message: '环境变量调试信息',
    env: envInfo,
    timestamp: new Date().toISOString()
  });
}
