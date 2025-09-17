import { redis, RedisKeys } from './redis.js';
import { getSocketIO } from './socket.js';

// 新的题目结构 - 只有A/B两个选项
export interface MinorityQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  startTime: string;
}

let gameManagerInstance: GameManager | null = null;

export function getGameManager(roomId?: string): GameManager {
  if (!gameManagerInstance) {
    gameManagerInstance = new GameManager(roomId || process.env.DEFAULT_ROOM_ID!);
  }
  return gameManagerInstance;
}

export class GameManager {
  private roomId: string;
  private io: any; // Socket.IO instance
  private countdownInterval: NodeJS.Timeout | null = null;
  private currentTimeLeft: number = 0;

  constructor(roomId: string = process.env.DEFAULT_ROOM_ID!) {
    this.roomId = roomId;
    this.io = getSocketIO();
    this.countdownInterval = null;
    this.currentTimeLeft = 0;
  }

  async setGameStartState(started: boolean): Promise<void> {
    await redis.set(RedisKeys.gameStarted(this.roomId), started ? '1' : '0');
  }

  // 获取当前倒计时值
  getCurrentTimeLeft(): number {
    return this.currentTimeLeft;
  }

  // setCurrentTimeLeft(timeLeft: number): void {
  //   this.currentTimeLeft = timeLeft;
  // }

  // 获取游戏状态
  async getRoomState() {
    const roomId = process.env.DEFAULT_ROOM_ID!;

    const [
      gameState,
      currentRound,
      currentQuestion,
      answers,
      survivorsCount,
      eliminatedCount,
    ] = await Promise.all([
      redis.hGetAll(RedisKeys.gameState(roomId)),
      redis.get(RedisKeys.currentRound(roomId)),
      redis.hGetAll(RedisKeys.currentQuestion(roomId)),
      redis.hGetAll(RedisKeys.gameAnswers(roomId)),
      redis.sCard(RedisKeys.roomSurvivors(roomId)),
      redis.sCard(RedisKeys.roomEliminated(roomId)),
    ]);

    return {
      status: gameState.status || 'waiting',
      currentQuestion: currentQuestion || null,
      round: parseInt(currentRound || '0'),
      answers: answers && (answers.A || answers.B) ? { A: parseInt(answers.A || '0'), B: parseInt(answers.B || '0') } : null,
      timeLeft: this.getCurrentTimeLeft(),
      survivorsCount,
      eliminatedCount,
    };
  }

  async emitPlayerCountUpdate(): Promise<void> {
    if (this.io) {
      const roomState = await this.getRoomState();
      const gameState = { ...roomState, "userAnswer": null, "roundResult": null };
      this.io.to(this.roomId).emit('player_count_update', gameState);
    }
  }

  // 添加用户到游戏
  async addPlayer(userEmail: string): Promise<void> {
    await redis.sAdd(RedisKeys.roomSurvivors(this.roomId), userEmail);
    await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'true');
    await redis.hSet(RedisKeys.userSession(userEmail), 'joinedAt', new Date().toISOString());
  }

  // 开始新一轮 - 管理员发布新题目
  async startNewRound(question: MinorityQuestion): Promise<void> {
    const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
    const newRound = parseInt(currentRound || '0') + 1;

    // 更新当前轮次
    await redis.set(RedisKeys.currentRound(this.roomId), newRound.toString());
    await redis.hSet(RedisKeys.gameAnswers(this.roomId), 'A', '0');
    await redis.hSet(RedisKeys.gameAnswers(this.roomId), 'B', '0');

    // 保存当前题目
    await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'id', question.id);
    await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'question', question.question);
    await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'optionA', question.optionA);
    await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'optionB', question.optionB);
    await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'startTime', question.startTime);

    // 设置游戏状态
    await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'playing');
    await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '30'); // 30秒答题时间

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

      const gameState = { ...roomState, "userAnswer": null, "roundResult": null, "timeLeft": this.getCurrentTimeLeft() };

      this.io.to(this.roomId).emit('new_question', gameState);
      // 启动倒计时

    } else {
      console.log(`❌ Socket.IO instance is null, cannot emit new_question`);
    }
  }

  // 倒计时处理 - 根据存活人数自适应时间
  private async startCountdown(): Promise<void> {
    const survivorsCount = await redis.sCard(RedisKeys.roomSurvivors(this.roomId));

    let timeLeft: number;
    if (survivorsCount <= 40) {
      timeLeft = 15;
    } else if (survivorsCount <= 75) {
      timeLeft = 20;
    } else if (survivorsCount <= 150) {
      timeLeft = 30;
    } else {
      timeLeft = 40;
    }

    this.currentTimeLeft = timeLeft;

    // 更新Redis中的时间
    // await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', timeLeft.toString());

    // Clear any existing countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(async () => {
      timeLeft--;
      this.currentTimeLeft = timeLeft;

      // 实时更新Redis中的时间
      // await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', timeLeft.toString());

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
    const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
    const currentQuestion = await redis.hGet(RedisKeys.currentQuestion(this.roomId), 'id');

    if (!currentRound || !currentQuestion) {
      throw new Error('没有进行中的游戏');
    }

    // 检查用户是否还在游戏中
    const isAlive = await redis.sIsMember(RedisKeys.roomSurvivors(this.roomId), userEmail);
    if (!isAlive) {
      throw new Error('您已被淘汰'); // catch these types of errors
    }

    // 记录用户答案
    await redis.set(RedisKeys.userAnswer(userEmail, currentQuestion.toString()), answer);
    await redis.hIncrBy(RedisKeys.gameAnswers(this.roomId), answer, 1);
  }

  // 结束当前轮次并处理少数派晋级
  async endRound(): Promise<void> {
    const currentQuestion = await redis.hGetAll(RedisKeys.currentQuestion(this.roomId));
    if (!currentQuestion || !currentQuestion.id) return;

    const survivors = await redis.sMembers(RedisKeys.roomSurvivors(this.roomId));
    if (!survivors) return;

    const answersFromRedis = await redis.hGetAll(RedisKeys.gameAnswers(this.roomId)) as { [key: string]: string };
    const answersCount = {
      A: parseInt(answersFromRedis.A || '0'),
      B: parseInt(answersFromRedis.B || '0')
    };

    let eliminatedUsers: string[] = [];

    // 检查未答题用户并淘汰
    for (const userEmail of survivors) {
      const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
      if (!answer || (answer !== 'A' && answer !== 'B')) {
        // 未答题视为弃权，淘汰
        eliminatedUsers.push(userEmail);
        await redis.sRem(RedisKeys.roomSurvivors(this.roomId), userEmail);
        await redis.sAdd(RedisKeys.roomEliminated(this.roomId), userEmail);
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

    // 淘汰多数派，保留少数派
    for (const userEmail of survivors) {
      const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
      if (majorityAnswer && answer === majorityAnswer) {
        // 淘汰用户
        eliminatedUsers.push(userEmail);
        await redis.sRem(RedisKeys.roomSurvivors(this.roomId), userEmail);
        await redis.sAdd(RedisKeys.roomEliminated(this.roomId), userEmail);
        await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'false');
        await redis.hSet(RedisKeys.userSession(userEmail), 'eliminatedAt', new Date().toISOString());
      }
    }

    if (this.io) {
      this.io.to(this.roomId).emit('eliminated', { "eliminated": eliminatedUsers });
    }

    // 检查游戏是否结束
    const remainingSurvivors = await redis.sMembers(RedisKeys.roomSurvivors(this.roomId)) as string[];
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
      await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'waiting');
      await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');
    }

    const roomState = await this.getRoomState();
    const gameState = { ...roomState, "userAnswer": null };

    // 广播结果
    if (this.io) {
      this.io.to(this.roomId).emit('round_result',
        gameState
      );
    }
  }

  // 结束游戏
  async endGame(winner: string | null, tier: string[] | null): Promise<void> {
    await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'ended');
    await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');

    if (winner) {
      await redis.set(RedisKeys.gameWinner(this.roomId), winner);
    }
    if (tier) {
      for (const finalist of tier) {
        await redis.sAdd(RedisKeys.gameTie(this.roomId), finalist);
      }
    }

    const redisEliminatedUsers = await redis.sMembers(RedisKeys.roomEliminated(this.roomId)) as string[];
    console.log(`Eliminated users (endGame): ${redisEliminatedUsers}`);

    // 广播游戏结束
    const roomState = await this.getRoomState();
    if (this.io) {
      if (winner) {
        console.log(`Winner is ${winner}`);
        this.io.to(this.roomId).emit('winner', { winnerEmail: winner });
        this.io.to(this.roomId).emit("game_state", { ...roomState, userAnswer: null, roundResult: null });
      }
      if (tier) {
        console.log(`Game ended in a tie between: ${tier.join(', ')}`);
        this.io.to(this.roomId).emit('tie', { finalists: tier });
        this.io.to(this.roomId).emit("game_state", { ...roomState, userAnswer: null, roundResult: null });
      }
    }
  }

  // 重置游戏
  async resetGame(): Promise<void> {
    console.log(`Resetting game in room ${this.roomId}`);
    // Clear any running countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.currentTimeLeft = 0;

    await redis.del(RedisKeys.currentQuestion(this.roomId));
    await redis.del(RedisKeys.roomSurvivors(this.roomId));
    await redis.del(RedisKeys.roomEliminated(this.roomId));
    await redis.del(RedisKeys.gameWinner(this.roomId));
    await redis.del(RedisKeys.gameTie(this.roomId));
    await redis.del(RedisKeys.gameAnswers(this.roomId));

    const answerKeys = await redis.keys(RedisKeys.userAnswer('*', '*'));
    if (answerKeys.length > 0) {
      for (const key of answerKeys) {
        await redis.del(key);
      }
    }

    const userAccounts = await redis.keys(RedisKeys.userSession('*'));
    console.log(`User accounts to reset: ${userAccounts.length}`);
    if (userAccounts.length > 0) {
      for (const key of userAccounts) {
        await redis.del(key);
      }
    }

    await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'waiting');
    await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');
    await redis.set(RedisKeys.currentRound(this.roomId), '0');

    // 重新初始化游戏
    await this.initializeGame();
  }

  // 初始化游戏
  async initializeGame(): Promise<void> {
    const roomState = await this.getRoomState();
    const gameState = { ...roomState, "userAnswer": null, "roundResult": null };

    if (this.io) {
      this.io.to(this.roomId).emit('game_start', gameState);
    }
  }

  // 获取游戏统计
  // async getGameStats() {
  //   const survivorsCount = await redis.sCard(RedisKeys.roomSurvivors(this.roomId)) as number;
  //   const eliminatedCount = await redis.sCard(RedisKeys.roomEliminated(this.roomId)) as number;
  //   const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
  //   const gameState = await redis.hGetAll(RedisKeys.gameState(this.roomId)) as any;

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
  //   const currentQuestion = await redis.hGetAll(RedisKeys.currentQuestion(this.roomId)) as any;
  //   if (!currentQuestion || !currentQuestion.id) return null;

  //   const survivors = await redis.sMembers(RedisKeys.roomSurvivors(this.roomId)) as string[];
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