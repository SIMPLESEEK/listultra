import { NextResponse } from 'next/server';

// 简单的测试端点
export async function GET(request: Request) {
  console.log('Test API endpoint reached', new Date().toISOString());
  
  // 返回成功响应
  return NextResponse.json({ 
    message: 'API is working', 
    timestamp: new Date().toISOString() 
  });
} 