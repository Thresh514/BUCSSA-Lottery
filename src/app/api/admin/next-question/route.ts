import { NextRequest, NextResponse } from 'next/server';
import { GameManager, MinorityQuestion } from '@/lib/game';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, optionA, optionB } = body;

    // 验证必要字段
    if (!question || !optionA || !optionB) {
      return NextResponse.json(
        { error: '请提供题目内容和两个选项' },
        { status: 400 }
      );
    }

    const gameManager = new GameManager();
    
    // 创建少数派题目
    const minorityQuestion: MinorityQuestion = {
      id: `q_${Date.now()}`,
      question,
      optionA,
      optionB,
    };
    
    // 开始新一轮
    await gameManager.startNewRound(minorityQuestion);

    return NextResponse.json(
      { 
        message: '新题目已发布',
        question: minorityQuestion
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