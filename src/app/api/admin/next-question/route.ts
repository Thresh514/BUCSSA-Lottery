import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/game';

export async function POST(request: NextRequest) {
  try {
    const gameManager = new GameManager();
    
    // 初始化游戏（如果需要）
    await gameManager.initializeGame();
    
    // 开始新一轮
    const question = await gameManager.startNewRound();
    
    if (!question) {
      return NextResponse.json(
        { error: '没有更多题目，游戏已结束' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        message: '新题目已发布',
        question: {
          id: question.id,
          question: question.question,
          options: question.options,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('发布新题目错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 