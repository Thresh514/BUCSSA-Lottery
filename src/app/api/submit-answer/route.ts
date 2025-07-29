import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/game';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { answer } = body;

    // 验证答案格式
    if (!answer || !['A', 'B'].includes(answer)) {
      return NextResponse.json(
        { error: '请选择A或B选项' },
        { status: 400 }
      );
    }

    const gameManager = new GameManager();
    
    // 提交答案
    await gameManager.submitAnswer(session.user.email, answer);

    return NextResponse.json(
      { 
        message: '答案已提交',
        answer
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('提交答案错误:', error);
    
    if (error.message === '没有进行中的游戏') {
      return NextResponse.json(
        { error: '当前没有进行中的游戏' },
        { status: 400 }
      );
    }
    
    if (error.message === '您已被淘汰') {
      return NextResponse.json(
        { error: '您已被淘汰，无法继续答题' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 