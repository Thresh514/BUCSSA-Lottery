import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';
import { sendVerificationCode } from '@/lib/email';
import { generateVerificationCode, isValidEmail } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // 验证邮箱格式
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 生成验证码
    const verificationCode = generateVerificationCode();

    // 将验证码存储到Redis，5分钟过期
    await redis.setex(
      RedisKeys.verificationCode(email),
      300, // 5分钟
      verificationCode
    );

    // 发送邮件
    const emailSent = await sendVerificationCode(email, verificationCode);

    if (!emailSent) {
      return NextResponse.json(
        { error: '邮件发送失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: '验证码已发送到您的邮箱' },
      { status: 200 }
    );
  } catch (error) {
    console.error('发送验证码错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 