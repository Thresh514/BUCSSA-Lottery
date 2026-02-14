import { Server as SocketIOServer } from 'socket.io';
import { redis, RedisKeys } from './redis.js';
import { getSocketIO } from './socket.js';
import type { MinorityQuestion, RoomState, PlayerGameState } from '../types/index.js';
import { upsertLatestSnapshot, saveGameResult, getRolesForEmail, type RoundSnapshotData, type GameResultData } from './database.js';
import { ROOM_ID } from './room.js';

export type { MinorityQuestion };

let gameManagerInstance: GameManager | null = null;

export function getGameManager(): GameManager {
  if (!gameManagerInstance) {
    gameManagerInstance = new GameManager();
  }
  return gameManagerInstance;
}

export class GameManager {
  private io: SocketIOServer | null;
  private countdownInterval: NodeJS.Timeout | null = null;
  private currentTimeLeft: number = 0;

  constructor() {
    this.io = getSocketIO();
    this.countdownInterval = null;
    this.currentTimeLeft = 0;
  }

  async setGameStartState(started: boolean): Promise<void> {
    await redis.set(RedisKeys.gameStarted(), started ? '1' : '0');
  }

  // 获取当前倒计时值
  getCurrentTimeLeft(): number {
    return this.currentTimeLeft;
  }

  // setCurrentTimeLeft(timeLeft: number): void {
  //   this.currentTimeLeft = timeLeft;
  // }

  // 获取游戏状态
  /** 根据房间状态和用户邮箱生成玩家端状态（单一 status） */
  async getPlayerGameState(roomState: RoomState, userEmail: string): Promise<PlayerGameState> {
    const isWinner = await redis.get(RedisKeys.gameWinner()) === userEmail;
    
    if (isWinner) 
      return { status: 'winner', round: roomState.round, userAnswer: null, timeLeft: roomState.timeLeft };
    
    const tieSet = await redis.sMembers(RedisKeys.gameTie());
    const isTie = tieSet?.includes(userEmail) ?? false;
    
    if (isTie) 
      return { status: 'tie', round: roomState.round, userAnswer: null, timeLeft: roomState.timeLeft };
    
    const isEliminated = await redis.sIsMember(RedisKeys.roomEliminated(), userEmail);
    
    if (isEliminated) 
      return { status: 'eliminated', round: roomState.round, userAnswer: null, timeLeft: roomState.timeLeft };
    
    const questionId = roomState.currentQuestion?.id;
    const userAnswer = questionId ? await redis.get(RedisKeys.userAnswer(userEmail, questionId)) as 'A' | 'B' | null : null;
    const status = roomState.status === 'ended' ? 'waiting' : roomState.status;
    
    return { status, round: roomState.round, userAnswer: userAnswer || null, timeLeft: roomState.timeLeft };
  }

  async getRoomState(): Promise<RoomState> {
    const [
      gameState,
      currentRound,
      currentQuestion,
      answers,
      survivorsCount,
      eliminatedCount,
    ] = await Promise.all([
      redis.hGetAll(RedisKeys.gameState()),
      redis.get(RedisKeys.currentRound()),
      redis.hGetAll(RedisKeys.currentQuestion()),
      redis.hGetAll(RedisKeys.gameAnswers()),
      redis.sCard(RedisKeys.roomSurvivors()),
      redis.sCard(RedisKeys.roomEliminated()),
    ]);

    const normalizedQuestion: MinorityQuestion | null =
      currentQuestion && currentQuestion.id
        ? {
            id: currentQuestion.id,
            question: currentQuestion.question ?? '',
            optionA: currentQuestion.optionA ?? '',
            optionB: currentQuestion.optionB ?? '',
            startTime: currentQuestion.startTime ?? '',
          }
        : null;

    return {
      status: (gameState?.status === 'playing' || gameState?.status === 'ended' ? gameState.status : 'waiting') as RoomState['status'],
      currentQuestion: normalizedQuestion,
      round: parseInt(currentRound ?? '0', 10),
      answers:
        answers && (answers.A || answers.B)
          ? { A: parseInt(answers.A ?? '0', 10), B: parseInt(answers.B ?? '0', 10) }
          : null,
      timeLeft: this.getCurrentTimeLeft(),
      survivorsCount: survivorsCount ?? 0,
      eliminatedCount: eliminatedCount ?? 0,
    };
  }

  async emitPlayerCountUpdate(): Promise<void> {
    if (this.io) {
      const roomState = await this.getRoomState();
      const gameState = { ...roomState, "userAnswer": null, "roundResult": null };
      this.io.to(ROOM_ID).emit('player_count_update', gameState);
    }
  }

  // 添加用户到游戏
  async addPlayer(userEmail: string): Promise<void> {
    await redis.sAdd(RedisKeys.roomSurvivors(), userEmail);
    await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'true');
    await redis.hSet(RedisKeys.userSession(userEmail), 'joinedAt', new Date().toISOString());
  }

  // 开始新一轮 - 管理员发布新题目
  async startNewRound(question: MinorityQuestion): Promise<void> {
    const currentRound = await redis.get(RedisKeys.currentRound());
    const newRound = parseInt(currentRound || '0') + 1;

    // 更新当前轮次
    await redis.set(RedisKeys.currentRound(), newRound.toString());
    await redis.hSet(RedisKeys.gameAnswers(), 'A', '0');
    await redis.hSet(RedisKeys.gameAnswers(), 'B', '0');

    // 保存当前题目
    await redis.hSet(RedisKeys.currentQuestion(), 'id', question.id);
    await redis.hSet(RedisKeys.currentQuestion(), 'question', question.question);
    await redis.hSet(RedisKeys.currentQuestion(), 'optionA', question.optionA);
    await redis.hSet(RedisKeys.currentQuestion(), 'optionB', question.optionB);
    await redis.hSet(RedisKeys.currentQuestion(), 'startTime', question.startTime);

    // 设置游戏状态
    await redis.hSet(RedisKeys.gameState(), 'status', 'playing');
    await redis.hSet(RedisKeys.gameState(), 'timeLeft', '30'); // 30秒答题时间

    // 广播新题目给所有存活用户
    if (this.io) {
      let roomState = await this.getRoomState();
      const questionData = {
        id: question.id,
        question: question.question,
        optionA: question.optionA,
        optionB: question.optionB,
        startTime: question.startTime,
      };
      roomState = { ...roomState, "currentQuestion": questionData };

      await this.startCountdown();

      await this.emitToRoom('new_question', roomState, (r) => ({
        ...r,
        userAnswer: null,
        roundResult: null,
        timeLeft: this.getCurrentTimeLeft(),
      }));
    } else {
      console.log(`❌ Socket.IO instance is null, cannot emit new_question`);
    }
  }

  // 倒计时处理 - 根据存活人数自适应时间
  private async startCountdown(): Promise<void> {
    const survivorsCount = await redis.sCard(RedisKeys.roomSurvivors());

    let timeLeft: number;
    if (survivorsCount <= 30) {
      timeLeft = 15;
    } else if (survivorsCount <= 50) {
      timeLeft = 20;
    } else if (survivorsCount <= 120) {
      timeLeft = 30;
    } else {
      timeLeft = 40;
    }

    this.currentTimeLeft = timeLeft;

    // 更新Redis中的时间
    await redis.hSet(RedisKeys.gameState(), 'timeLeft', timeLeft.toString());

    // Clear any existing countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(async () => {
      timeLeft--;
      this.currentTimeLeft = timeLeft;

      // 实时更新Redis中的时间
      // await redis.hSet(RedisKeys.gameState(), 'timeLeft', timeLeft.toString());

      if (timeLeft <= 0) {
        clearInterval(this.countdownInterval!);
        this.countdownInterval = null;
        this.currentTimeLeft = 0;
        await this.endRound();
      }
    }, 1000);
  }

  // 用户提交答案
  async submitAnswer(userEmail: string, answer: 'A' | 'B'): Promise<void> {
    const currentRound = await redis.get(RedisKeys.currentRound());
    const currentQuestion = await redis.hGet(RedisKeys.currentQuestion(), 'id');

    if (!currentRound || !currentQuestion) {
      throw new Error('没有进行中的游戏');
    }

    // 检查用户是否还在游戏中
    const isAlive = await redis.sIsMember(RedisKeys.roomSurvivors(), userEmail);
    if (!isAlive) {
      throw new Error('您已被淘汰'); // catch these types of errors
    }

    // 幂等提交：仅首次写入成功时才计入统计（SET NX 防重复）
    const answerKey = RedisKeys.userAnswer(userEmail, currentQuestion.toString());
    const setOk = await redis.set(answerKey, answer, { NX: true });
    if (setOk !== 'OK') {
      // 已提交过，直接返回（幂等，不重复 HINCRBY）
      return;
    }
    await redis.hIncrBy(RedisKeys.gameAnswers(), answer, 1);
  }

  // 结束当前轮次并处理少数派晋级
  async endRound(): Promise<void> {
    const currentQuestion = await redis.hGetAll(RedisKeys.currentQuestion());
    if (!currentQuestion || !currentQuestion.id) return;

    const survivors = await redis.sMembers(RedisKeys.roomSurvivors());
    if (!survivors) return;

    const answersFromRedis = await redis.hGetAll(RedisKeys.gameAnswers()) as { [key: string]: string };
    const answersCount = {
      A: parseInt(answersFromRedis.A || '0'),
      B: parseInt(answersFromRedis.B || '0')
    };

    // 批量查答案：一次 mGet 替代 2*N 次 GET
    const answerKeys = survivors.map((u) => RedisKeys.userAnswer(u, currentQuestion.id.toString()));
    const answerValues = await redis.mGet(answerKeys);

    let eliminatedUsers: { userEmail: string, eliminatedReason: 'no_answer' | 'majority_choice' }[] = [];

    // 检查未答题用户并淘汰
    for (let i = 0; i < survivors.length; i++) {
      const answer = answerValues[i] ?? null;
      if (!answer || (answer !== 'A' && answer !== 'B')) {
        const userEmail = survivors[i];
        eliminatedUsers.push({ userEmail, eliminatedReason: 'no_answer' });
        await redis.sRem(RedisKeys.roomSurvivors(), userEmail);
        await redis.sAdd(RedisKeys.roomEliminated(), userEmail);
        await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'false');
        await redis.hSet(RedisKeys.userSession(userEmail), 'eliminatedAt', new Date().toISOString());
      }
    }

    // 找出少数派
    let majorityAnswer: string | null;
    let minorityAnswer: string | null;
    if (answersCount.A === answersCount.B || answersCount.A === 0 || answersCount.B === 0) { // 无人淘汰情况
      majorityAnswer = null;
      minorityAnswer = null;
    } else {
      minorityAnswer = answersCount.A <= answersCount.B ? 'A' : 'B';
      majorityAnswer = answersCount.A <= answersCount.B ? 'B' : 'A';
    }

    // 淘汰多数派，保留少数派（复用上面批量查到的 answerValues）
    for (let i = 0; i < survivors.length; i++) {
      const answer = answerValues[i] ?? null;
      if (majorityAnswer && answer === majorityAnswer) {
        const userEmail = survivors[i];
        eliminatedUsers.push({ userEmail, eliminatedReason: 'majority_choice' });
        await redis.sRem(RedisKeys.roomSurvivors(), userEmail);
        await redis.sAdd(RedisKeys.roomEliminated(), userEmail);
        await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'false');
        await redis.hSet(RedisKeys.userSession(userEmail), 'eliminatedAt', new Date().toISOString());
      }
    }

    if (this.io) {
      this.io.to(ROOM_ID).emit('eliminated', { "eliminated": eliminatedUsers });
    }

    // 检查游戏是否结束
    const remainingSurvivors = await redis.sMembers(RedisKeys.roomSurvivors()) as string[];
    if (!remainingSurvivors) return;

    if (remainingSurvivors.length === 2) {
      const tier = remainingSurvivors;
      await this.endGame(null, tier);
      return;
    }
    else if (remainingSurvivors.length <= 1) {
      // 游戏结束
      const winner = remainingSurvivors.length === 1 ? remainingSurvivors[0] : null;
      await this.endGame(winner, null);
      return;
    } else {
      // 继续下一轮
      await redis.hSet(RedisKeys.gameState(), 'status', 'waiting');
      await redis.hSet(RedisKeys.gameState(), 'timeLeft', '0');
    }

    const roomState = await this.getRoomState();
    if (this.io) {
      await this.emitToRoom('round_result', roomState, (r) => ({ ...r, userAnswer: null }));
    }

    // Upsert 最新快照（用于 Redis 崩溃恢复；只在轮次边界使用）
    const snapshotData: RoundSnapshotData = {
      survivorEmails: remainingSurvivors,
      currentRound: parseInt((await redis.get(RedisKeys.currentRound())) || '0', 10),
      status: 'waiting',
      started: true,
    };

    // Fire-and-forget：失败不影响游戏流程（Redis 仍是主状态）
    upsertLatestSnapshot(snapshotData).catch((err) => {
      console.error('Failed to upsert latest snapshot (non-blocking):', err);
    });
  }

  // 结束游戏
  async endGame(winner: string | null, tier: string[] | null): Promise<void> {
    await redis.hSet(RedisKeys.gameState(), 'status', 'ended');
    await redis.hSet(RedisKeys.gameState(), 'timeLeft', '0');

    if (winner) {
      await redis.set(RedisKeys.gameWinner(), winner);
    }
    if (tier) {
      for (const finalist of tier) {
        await redis.sAdd(RedisKeys.gameTie(), finalist);
      }
    }

    // 游戏结束后不需要恢复到下一轮：标记快照为 inactive（best-effort）
    upsertLatestSnapshot({
      survivorEmails: [],
      currentRound: parseInt((await redis.get(RedisKeys.currentRound())) || '0', 10),
      status: 'waiting',
      started: false,
    }).catch(() => {});

    const redisEliminatedUsers = await redis.sMembers(RedisKeys.roomEliminated()) as string[];
    console.log(`Eliminated users (endGame): ${redisEliminatedUsers}`);

    const roomState = await this.getRoomState();
    if (this.io) {
      if (winner) {
        console.log(`Winner is ${winner}`);
        this.io.to(ROOM_ID).emit('winner', { winnerEmail: winner });
        await this.emitToRoom('game_state', roomState, (r) => ({ ...r, userAnswer: null, roundResult: null }));
      }
      if (tier) {
        console.log(`Game ended in a tie between: ${tier.join(', ')}`);
        this.io.to(ROOM_ID).emit('tie', { finalists: tier });
        await this.emitToRoom('game_state', roomState, (r) => ({ ...r, userAnswer: null, roundResult: null }));
      }
    }

    // 同步保存 Game Result（关键数据，带 500ms 超时保护）
    const currentRound = parseInt(await redis.get(RedisKeys.currentRound()) || '0');
    
    // 计算总轮数：从 RoundSnapshot 统计，如果没有则使用当前轮次
    // 注意：这里简化处理，使用当前轮次作为总轮数
    // 如果需要精确的总轮数，可以从 RoundSnapshot 表查询
    const totalRounds = currentRound;

    const gameResultData: GameResultData = {
      winnerEmail: winner,
      tierEmails: tier || [],
      finalRound: currentRound,
      totalRounds,
    };

    // 同步写入，带 500ms 超时保护
    // 如果超时或失败：记录日志，但不阻塞游戏（Redis 已保存，关键数据不丢失）
    await saveGameResult(gameResultData);
  }

  // 重置游戏
  async resetGame(): Promise<void> {
    console.log(`Resetting game in room ${ROOM_ID}`);
    // Clear any running countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.currentTimeLeft = 0;

    // Admin reset is a normal operation: disable PG-based auto-recovery briefly
    // to avoid treating this reset as a Redis crash.
    await redis.set(RedisKeys.recoveryDisabled(), '1', { EX: 30 });

    await redis.del(RedisKeys.currentQuestion());
    await redis.del(RedisKeys.roomSurvivors());
    await redis.del(RedisKeys.roomEliminated());
    await redis.del(RedisKeys.gameWinner());
    await redis.del(RedisKeys.gameTie());
    await redis.del(RedisKeys.gameAnswers());

    // Reset 后不应自动从旧快照恢复：清空/停用快照（best-effort）
    upsertLatestSnapshot({
      survivorEmails: [],
      currentRound: 0,
      status: 'waiting',
      started: false,
    }).catch(() => {});

    // 使用 SCAN 替代 KEYS，避免阻塞 Redis（高并发下 KEYS 会拖慢整个实例）
    const answerPattern = 'user:*:answer:*';
    let answerCount = 0;
    const answerBatch: string[] = [];
    const BATCH_SIZE = 100;
    for await (const keys of redis.scanIterator({ MATCH: answerPattern, COUNT: 100 })) {
      const batch = Array.isArray(keys) ? keys : [keys];
      for (const k of batch) {
        answerBatch.push(k);
        if (answerBatch.length >= BATCH_SIZE) {
          for (const x of answerBatch) await redis.del(x);
          answerCount += answerBatch.length;
          answerBatch.length = 0;
        }
      }
    }
    if (answerBatch.length > 0) {
      for (const x of answerBatch) await redis.del(x);
      answerCount += answerBatch.length;
    }

    const sessionPattern = 'user:*:session';
    let sessionCount = 0;
    const sessionBatch: string[] = [];
    for await (const keys of redis.scanIterator({ MATCH: sessionPattern, COUNT: 100 })) {
      const batch = Array.isArray(keys) ? keys : [keys];
      for (const k of batch) {
        sessionBatch.push(k);
        if (sessionBatch.length >= BATCH_SIZE) {
          for (const x of sessionBatch) await redis.del(x);
          sessionCount += sessionBatch.length;
          sessionBatch.length = 0;
        }
      }
    }
    if (sessionBatch.length > 0) {
      for (const x of sessionBatch) await redis.del(x);
      sessionCount += sessionBatch.length;
    }
    console.log(`User accounts to reset: ${sessionCount} (answers cleared: ${answerCount})`);

    await redis.hSet(RedisKeys.gameState(), 'status', 'waiting');
    await redis.hSet(RedisKeys.gameState(), 'timeLeft', '0');
    await redis.set(RedisKeys.currentRound(), '0');

    // 重新初始化游戏
    await this.initializeGame();
  }

  // 初始化游戏
  async initializeGame(): Promise<void> {
    const roomState = await this.getRoomState();
    if (this.io) {
      await this.emitToRoom('game_start', roomState, (r) => ({ ...r, userAnswer: null, roundResult: null }));
    }
  }

  /** 按角色分发：admin/display 收完整 roomState，player 收 PlayerGameState */
  private async emitToRoom(event: string, roomState: RoomState, adminPayload: (r: RoomState) => object): Promise<void> {
    if (!this.io) return;
    const sockets = await this.io.in(ROOM_ID).fetchSockets();
    for (const s of sockets) {
      const email = (s.data as { user?: { email: string } }).user?.email;
      if (!email) continue;
      const { isAdmin, isDisplay } = await getRolesForEmail(email);
      const payload = isAdmin || isDisplay ? adminPayload(roomState) : await this.getPlayerGameState(roomState, email);
      s.emit(event, payload);
    }
  }

  // 获取游戏统计
  // async getGameStats() {
  //   const survivorsCount = await redis.sCard(RedisKeys.roomSurvivors()) as number;
  //   const eliminatedCount = await redis.sCard(RedisKeys.roomEliminated()) as number;
  //   const currentRound = await redis.get(RedisKeys.currentRound());
  //   const gameState = await redis.hGetAll(RedisKeys.gameState()) as any;

  //   return {
  //     totalPlayers: (survivorsCount || 0) + (eliminatedCount || 0),
  //     survivorsCount: survivorsCount || 0,
  //     eliminatedCount: eliminatedCount || 0,
  //     currentRound: parseInt(currentRound || '0'),
  //     status: gameState?.status || 'waiting',
  //     timeLeft: this.getCurrentTimeLeft(),
  //   };
  // }

  // 获取当前轮次统计
  // async getRoundStats() {
  //   const currentQuestion = await redis.hGetAll(RedisKeys.currentQuestion()) as any;
  //   if (!currentQuestion || !currentQuestion.id) return null;

  //   const survivors = await redis.sMembers(RedisKeys.roomSurvivors()) as string[];
  //   if (!survivors) return null;

  //   const answers: { [key: string]: number } = { A: 0, B: 0 };

  //   for (const userEmail of survivors) {
  //     const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
  //     if (answer && (answer === 'A' || answer === 'B')) {
  //       answers[answer]++;
  //     }
  //   }

  //   return {
  //     question: currentQuestion,
  //     answers,
  //     totalAnswers: answers.A + answers.B,
  //     survivorsCount: survivors.length,
  //   };
  // }

}