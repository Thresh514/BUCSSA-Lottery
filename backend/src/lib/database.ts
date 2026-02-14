import { PrismaClient } from '@prisma/client';
import { ROOM_ID } from './room.js';

// PrismaClient 单例（避免连接池耗尽）
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { prisma };

/** 从 PostgreSQL User.role 列按邮箱查 admin/display 角色 */
export async function getRolesForEmail(email: string): Promise<{ isAdmin: boolean; isDisplay: boolean }> {
  if (!email) {
    return { isAdmin: false, isDisplay: false };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  const role = user?.role ?? 'player';
  return {
    isAdmin: role === 'admin',
    isDisplay: role === 'display',
  };
}

// Round Snapshot（最新快照，用于 Redis 崩溃恢复）数据接口
export interface RoundSnapshotData {
  /** 上一轮结束后仍存活的邮箱列表（恢复核心） */
  survivorEmails: string[];
  /** 当前轮次号（用于恢复 Redis currentRound） */
  currentRound: number;
  /** 轮次边界恢复仅需 waiting */
  status: 'waiting';
  /** 对应 Redis gameStarted（用于连接时是否拦截新用户） */
  started: boolean;
}

// Game Result 数据接口
export interface GameResultData {
  winnerEmail: string | null;
  tierEmails: string[];
  finalRound: number;
  totalRounds: number;
}

/**
 * Upsert 最新快照（单条记录，roomId 唯一）。
 *
 * 说明：快照仅在 Redis 丢失时使用；正常运行时以 Redis 为准。
 */
export async function upsertLatestSnapshot(data: RoundSnapshotData): Promise<void> {
  try {
    await prisma.roundSnapshot.upsert({
      where: { roomId: ROOM_ID },
      update: {
        currentRound: data.currentRound,
        status: data.status,
        started: data.started,
        survivorEmails: data.survivorEmails,
      },
      create: {
        roomId: ROOM_ID,
        currentRound: data.currentRound,
        status: data.status,
        started: data.started,
        survivorEmails: data.survivorEmails,
      },
    });
  } catch (error) {
    console.error('Failed to upsert latest snapshot:', error);
    throw error;
  }
}

export type LatestSnapshot = {
  roomId: string;
  currentRound: number;
  status: string;
  started: boolean;
  survivorEmails: string[];
  updatedAt: Date;
  createdAt: Date;
};

/** 读取最新快照（单条记录）。找不到返回 null。 */
export async function getLatestSnapshot(): Promise<LatestSnapshot | null> {
  return prisma.roundSnapshot.findUnique({
    where: { roomId: ROOM_ID },
    select: {
      roomId: true,
      currentRound: true,
      status: true,
      started: true,
      survivorEmails: true,
      updatedAt: true,
      createdAt: true,
    },
  });
}

/**
 * 同步保存 Game Result（带 500ms 超时保护）
 * 关键数据，必须保障，但超时保护确保不卡死游戏
 */
export async function saveGameResult(data: GameResultData): Promise<void> {
  try {
    const TIMEOUT_MS = 3000;
    await Promise.race([
      prisma.gameResult.upsert({
        where: { roomId: ROOM_ID },
        update: {
          winnerEmail: data.winnerEmail,
          tierEmails: data.tierEmails,
          finalRound: data.finalRound,
          totalRounds: data.totalRounds,
          endedAt: new Date(),
        },
        create: {
          roomId: ROOM_ID,
          winnerEmail: data.winnerEmail,
          tierEmails: data.tierEmails,
          finalRound: data.finalRound,
          totalRounds: data.totalRounds,
          endedAt: new Date(),
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Database write timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
      ),
    ]);
  } catch (error) {
    console.error('Failed to save game result to database:', error);
    // 不重新抛出，因为 Redis 已保存，关键数据不丢失
    // 可以后续重试或告警
  }
}
