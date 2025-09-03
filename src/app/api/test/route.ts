// 测试App Router API路由
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'App Router API正常工作',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
}

export async function POST() {
  return NextResponse.json({ 
    message: 'App Router POST正常工作',
    timestamp: new Date().toISOString()
  });
}
