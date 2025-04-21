import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    console.log('[Direct Login] 请求开始处理');
    
    // 解析请求体
    const { email, password } = await req.json();
    
    // 基本验证
    if (!email || !password) {
      console.log('[Direct Login] 缺少邮箱或密码');
      return NextResponse.json(
        { success: false, message: '请提供邮箱和密码' },
        { status: 400 }
      );
    }
    
    // 连接数据库
    console.log('[Direct Login] 尝试连接数据库');
    await connectDB();
    console.log('[Direct Login] 数据库连接成功');
    
    // 查找用户
    console.log('[Direct Login] 正在查找用户:', email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('[Direct Login] 用户不存在:', email);
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 401 }
      );
    }
    
    // 验证密码
    console.log('[Direct Login] 正在验证密码');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      console.log('[Direct Login] 密码验证失败');
      return NextResponse.json(
        { success: false, message: '密码不正确' },
        { status: 401 }
      );
    }
    
    // 登录成功
    console.log('[Direct Login] 认证成功:', email);
    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user._id.toString(),
        email: user.email
      }
    });
    
  } catch (error) {
    // 捕获所有错误
    console.error('[Direct Login] 错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误', error: String(error) },
      { status: 500 }
    );
  }
} 