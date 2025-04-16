import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    // 基本输入验证
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }
    
    // 验证邮箱格式
    const emailRegex = /.+\@.+\..+/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '无效的邮箱格式' }, { status: 400 });
    }
    
    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度至少需要6位' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 }); // 409 Conflict
    }

    // 哈希密码
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 创建新用户
    const newUser = new User({
      email,
      passwordHash,
    });

    await newUser.save();

    console.log('新用户注册成功:', email);
    return NextResponse.json({ message: '用户注册成功' }, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error('注册失败:', error);
    // 处理可能的数据库错误，例如唯一性约束失败（虽然我们已经检查过）
    if (error.code === 11000) { 
        return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
    }
    return NextResponse.json({ error: '服务器内部错误', details: error.message }, { status: 500 });
  }
} 