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

// Round Snapshot 数据接口
export interface RoundSnapshotData {
  roundNumber: number;
  questionId: string;
  questionText: string | null;
  optionA: string | null;
  optionB: string | null;
  answerCountA: number;
  answerCountB: number;
  minorityAnswer: string | null; // 'A' | 'B' | null
  majorityAnswer: string | null; // 'A' | 'B' | null
  survivorsBefore: number;
  survivorsAfter: number;
  startedAt: Date;
  endedAt: Date;
  eliminatedUsers: Array<{
    userEmail: string;
    eliminatedReason: 'no_answer' | 'majority_choice';
  }>;
}

// Game Result 数据接口
export interface GameResultData {
  winnerEmail: string | null;
  tierEmails: string[];
  finalRound: number;
  totalRounds: number;
}

/**
 * 异步保存 Round Snapshot（Fire-and-forget）
 * 备份数据，写入失败不影响游戏流程
 */
export async function saveRoundSnapshot(data: RoundSnapshotData): Promise<void> {
  try {
    // 创建 RoundSnapshot
    const snapshot = await prisma.roundSnapshot.create({
      data: {
        roomId: ROOM_ID,
        roundNumber: data.roundNumber,
        questionId: data.questionId,
        questionText: data.questionText,
        optionA: data.optionA,
        optionB: data.optionB,
        answerCountA: data.answerCountA,
        answerCountB: data.answerCountB,
        minorityAnswer: data.minorityAnswer,
        majorityAnswer: data.majorityAnswer,
        survivorsBefore: data.survivorsBefore,
        survivorsAfter: data.survivorsAfter,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
      },
    });

    // 批量插入淘汰名单
    if (data.eliminatedUsers.length > 0) {
      await prisma.roundElimination.createMany({
        data: data.eliminatedUsers.map((u) => ({
          roundSnapshotId: snapshot.id,
          userEmail: u.userEmail,
          eliminatedReason: u.eliminatedReason,
          eliminatedAt: data.endedAt,
        })),
      });
    }
  } catch (error) {
    console.error('Failed to save round snapshot:', error);
    throw error; // 重新抛出，让调用者处理
  }
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
