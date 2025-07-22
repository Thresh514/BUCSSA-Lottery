import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/game';

export async function POST(request: NextRequest) {
  try {
    const gameManager = new GameManager();
    await gameManager.resetGame();

    return NextResponse.json(
      { message: '游戏已重置' },
      { status: 200 }
    );
  } catch (error) {
    console.error('重置游戏错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 