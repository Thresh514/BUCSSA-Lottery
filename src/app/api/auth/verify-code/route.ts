import { NextRequest, NextResponse } from 'next/server';
import { redis, RedisKeys } from '@/lib/redis';
import { generateJWT } from '@/lib/jwt';
import { generateUserId, isValidEmail } from '@/lib/utils';
import { env } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    // 验证邮箱格式
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 验证验证码格式
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: '验证码格式不正确' },
        { status: 400 }
      );
    }

    // 从Redis获取验证码
    const storedCode = await redis.get(RedisKeys.verificationCode(email));

    if (!storedCode) {
      return NextResponse.json(
        { error: '验证码已过期或不存在' },
        { status: 400 }
      );
    }

    if (storedCode !== code) {
      return NextResponse.json(
        { error: '验证码错误' },
        { status: 400 }
      );
    }

    // 验证成功，删除验证码
    await redis.del(RedisKeys.verificationCode(email));

    // 生成或获取用户ID
    let userId = await redis.get(`email:${email}:userid`);
    if (!userId) {
      userId = generateUserId();
      await redis.set(`email:${email}:userid`, userId);
      await redis.set(`userid:${userId}:email`, email);
    }

    // 生成JWT
    const token = generateJWT(userId, email);

    // 将用户添加到游戏房间的存活用户列表
    await redis.sadd(RedisKeys.roomSurvivors(env.DEFAULT_ROOM_ID), userId);

    // 存储用户会话信息
    await redis.hset(RedisKeys.userSession(userId), {
      email,
      isAlive: 'true',
      joinedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { 
        message: '登录成功',
        token,
        user: {
          id: userId,
          email,
          isAlive: true,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('验证验证码错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 