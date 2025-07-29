import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/game';

export async function GET(request: NextRequest) {
  try {
    const gameManager = new GameManager();
    
    // 获取游戏统计信息
    const gameStats = await gameManager.getGameStats();
    
    // 获取当前轮次统计（如果有进行中的轮次）
    const roundStats = await gameManager.getRoundStats();
    
    return NextResponse.json({
      ...gameStats,
      roundStats,
    });
  } catch (error) {
    console.error('获取游戏统计错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 