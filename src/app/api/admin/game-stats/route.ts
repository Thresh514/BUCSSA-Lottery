import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/game';

export async function GET(request: NextRequest) {
  try {
    const gameManager = new GameManager();
    const stats = await gameManager.getGameStats();

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error('获取游戏统计错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 