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

export class GameManager {
  private roomId: string;
  private io: any; // Socket.IO instance

  constructor(roomId: string = process.env.DEFAULT_ROOM_ID!) {
    this.roomId = roomId;
    this.io = getSocketIO();
  }

  // 初始化游戏
  async initializeGame(): Promise<void> {
    await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'waiting');
    await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');
    await redis.set(RedisKeys.currentRound(this.roomId), '0');
    
    // 清空存活和淘汰列表
    await redis.del(RedisKeys.roomSurvivors(this.roomId));
    await redis.del(RedisKeys.roomEliminated(this.roomId));

    if (this.io) {
      this.io.to(this.roomId).emit('game_start', await this.getGameState());
    }
  }

  // 添加用户到游戏
  async addPlayer(userEmail: string): Promise<void> {
    await redis.sAdd(RedisKeys.roomSurvivors(this.roomId), userEmail);
    await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'true');
    await redis.hSet(RedisKeys.userSession(userEmail), 'joinedAt', new Date().toISOString());
  }

  // 获取游戏状态
  async getGameState() {
    const roomId = process.env.DEFAULT_ROOM_ID!;
    
    const [
      gameState,
      currentQuestion,
      survivorsCount,
      eliminatedCount,
      currentRound,
      onlineUsers
    ] = await Promise.all([
      redis.hGetAll(RedisKeys.gameState(roomId)),
      redis.hGetAll(RedisKeys.currentQuestion(roomId)),
      redis.sCard(RedisKeys.roomSurvivors(roomId)),
      redis.sCard(RedisKeys.roomEliminated(roomId)),
      redis.get(RedisKeys.currentRound(roomId)),
      redis.keys(RedisKeys.userOnline('*')),
    ]);

    return {
      status: gameState.status || 'waiting',
      currentQuestion: currentQuestion || null,
      round: parseInt(currentRound || '0'),
      timeLeft: parseInt(gameState.timeLeft || '0'),
      totalPlayers: survivorsCount + eliminatedCount,
      survivorsCount,
      eliminatedCount,
      onlineCount: onlineUsers.length,
    };
  }

  // 开始新一轮 - 管理员发布新题目
  async startNewRound(question: MinorityQuestion): Promise<void> {
    const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
    const newRound = parseInt(currentRound || '0') + 1;

    // 更新当前轮次
    await redis.set(RedisKeys.currentRound(this.roomId), newRound.toString());

    const allUserKeys = await redis.keys(RedisKeys.userAnswer('*', '*'));
    if (allUserKeys.length > 0) {
      await Promise.all(allUserKeys.map(key => redis.del(key)));
    }

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
      const survivorsCount = await redis.sCard(RedisKeys.roomSurvivors(this.roomId));
      console.log(`🎯 Broadcasting new_question to room ${this.roomId}, round ${newRound}, survivors: ${survivorsCount}`);
      console.log(`📡 Question data:`, {
        id: question.id,
        question: question.question,
        optionA: question.optionA,
        optionB: question.optionB,
      });
      
      this.io.to(this.roomId).emit('new_question', {
        question: {
          id: question.id,
          question: question.question,
          optionA: question.optionA,
          optionB: question.optionB,
        },
        round: newRound,
        timeLeft: 30,
        survivorsCount,
      });
      
      console.log(`✅ new_question event emitted to room ${this.roomId}`);
    } else {
      console.log(`❌ Socket.IO instance is null, cannot emit new_question`);
    }

    // 启动倒计时
    this.startCountdown();
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
  }

  // 结束当前轮次并处理少数派晋级
  async endRound(): Promise<void> {
    const currentQuestion = await redis.hGetAll(RedisKeys.currentQuestion(this.roomId)) as any;
    if (!currentQuestion || !currentQuestion.id) return;

    const survivors = await redis.sMembers(RedisKeys.roomSurvivors(this.roomId)) as string[];
    if (!survivors) return;

    /*if (survivors.length === 2) {
      // 进入决赛圈 - 直接宣布赢家
      const answers: { [key: string]: string[] } = { A: [], B: [] };
      for (const userEmail of survivors) {
        const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
        if (answer === 'A' || answer === 'B') {
          answers[answer].push(userEmail);
        }
      }

      if (answers.A.length === 1 && answers.B.length === 1) {
        // Different choices - randomly pick winner or use specific rule
        const winner = Math.random() < 0.5 ? answers.A[0] : answers.B[0];
        const loser = winner === answers.A[0] ? answers.B[0] : answers.A[0];

        await redis.sRem(RedisKeys.roomSurvivors(this.roomId), loser);
        await redis.sAdd(RedisKeys.roomEliminated(this.roomId), loser);
        await redis.hSet(RedisKeys.userSession(loser), 'isAlive', 'false');
        await redis.hSet(RedisKeys.userSession(loser), 'eliminatedAt', new Date().toISOString());

        await this.endGame(winner);
        return;
      } else {
        // Same choice or one didn't answer - continue game
        await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'waiting');
      }
    }*/

    const answers: { [key: string]: number } = { A: 0, B: 0 };

    // 统计答案
    for (const userEmail of survivors) {
      const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
      if (answer && (answer === 'A' || answer === 'B')) {
        answers[answer]++;
      } else {
        // 未答题视为弃权，淘汰
        await redis.sRem(RedisKeys.roomSurvivors(this.roomId), userEmail);
        await redis.sAdd(RedisKeys.roomEliminated(this.roomId), userEmail);
        await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'false');
        await redis.hSet(RedisKeys.userSession(userEmail), 'eliminatedAt', new Date().toISOString());
      }
    }

    // 找出少数派
    let majorityAnswer: string | null;
    let minorityAnswer: string | null;
    if (answers.A === answers.B || answers.A === 0 || answers.B === 0) { // 无人淘汰情况
      majorityAnswer = null;
      minorityAnswer = null;
    } else {
      minorityAnswer = answers.A <= answers.B ? 'A' : 'B';
      majorityAnswer = answers.A <= answers.B ? 'B' : 'A';
    }

    // 淘汰多数派，保留少数派
    for (const userEmail of survivors) {
      const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
      if (majorityAnswer && answer === majorityAnswer) {
        // 淘汰用户
        await redis.sRem(RedisKeys.roomSurvivors(this.roomId), userEmail);
        await redis.sAdd(RedisKeys.roomEliminated(this.roomId), userEmail);
        await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'false');
        await redis.hSet(RedisKeys.userSession(userEmail), 'eliminatedAt', new Date().toISOString());
      }
    }

    // 检查游戏是否结束
    const remainingSurvivors = await redis.sMembers(RedisKeys.roomSurvivors(this.roomId)) as string[];
    if (!remainingSurvivors) return;

    console.log('剩余存活用户:', remainingSurvivors);
    if(remainingSurvivors.length === 2) {
      await this.endGameWithTie(remainingSurvivors);
      return;
    }
    else if (remainingSurvivors.length <= 1) {
      // 游戏结束
      const winner = remainingSurvivors.length === 1 ? remainingSurvivors[0] : null;
      await this.endGame(winner);
      return;
    } else {
      // 继续下一轮
      await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'waiting');
      await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');
    }

    // 广播结果
    if (this.io) {
      this.io.to(this.roomId).emit('round_result', {
        minorityAnswer,
        majorityAnswer,
        answers,
        survivorsCount: remainingSurvivors.length,
        eliminatedCount: await redis.sCard(RedisKeys.roomEliminated(this.roomId)),
      });
    }
  }

  // 结束游戏
  async endGame(winner: string | null): Promise<void> {
    await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'ended');
    await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');
    
    if (winner) {
      await redis.set(RedisKeys.gameWinner(this.roomId), winner);
    }

    // 广播游戏结束
    if (this.io) {
      this.io.to(this.roomId).emit('game_end', { winnerEmail: winner });
    }
  }

  // 平局情况 - 两个人都保留，继续游戏
  async endGameWithTie(survivors: string[]): Promise<void> {
    await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'ended');
    await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');
    
    if (survivors.length === 2) {
      await redis.set(RedisKeys.gameTie(this.roomId), survivors.join(','));
    }
    // 广播平局结果
    if (this.io) {
      this.io.to(this.roomId).emit('game_tie', {finalists: survivors});
    }
  }

  // 倒计时处理
  private startCountdown(): void {
    let timeLeft = 30;
    
    const countdown = setInterval(async () => {
      timeLeft--;
      
      // if (this.io) {
      //   this.io.to(this.roomId).emit('time_update', { timeLeft });
      // }

      // better way to do the countdown?
      
      if (timeLeft <= 0) {
        clearInterval(countdown);
        await this.endRound();
      }
    }, 1000);
  }

  // 获取游戏统计
  async getGameStats() {
    const survivorsCount = await redis.sCard(RedisKeys.roomSurvivors(this.roomId)) as number;
    const eliminatedCount = await redis.sCard(RedisKeys.roomEliminated(this.roomId)) as number;
    const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
    const gameState = await redis.hGetAll(RedisKeys.gameState(this.roomId)) as any;
    
    return {
      totalPlayers: (survivorsCount || 0) + (eliminatedCount || 0),
      survivorsCount: survivorsCount || 0,
      eliminatedCount: eliminatedCount || 0,
      currentRound: parseInt(currentRound || '0'),
      status: gameState?.status || 'waiting',
      timeLeft: parseInt(gameState?.timeLeft || '0'),
    };
  }

  // 获取当前轮次统计
  async getRoundStats() {
    const currentQuestion = await redis.hGetAll(RedisKeys.currentQuestion(this.roomId)) as any;
    if (!currentQuestion || !currentQuestion.id) return null;

    const survivors = await redis.sMembers(RedisKeys.roomSurvivors(this.roomId)) as string[];
    if (!survivors) return null;
    
    const answers: { [key: string]: number } = { A: 0, B: 0 };

    for (const userEmail of survivors) {
      const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
      if (answer && (answer === 'A' || answer === 'B')) {
        answers[answer]++;
      }
    }

    return {
      question: currentQuestion,
      answers,
      totalAnswers: answers.A + answers.B,
      survivorsCount: survivors.length,
    };
  }

  // 重置游戏
  async resetGame(): Promise<void> {
    const keys = [
      RedisKeys.gameState(this.roomId),
      RedisKeys.currentQuestion(this.roomId),
      RedisKeys.currentRound(this.roomId),
      RedisKeys.roomSurvivors(this.roomId),
      RedisKeys.roomEliminated(this.roomId),
      RedisKeys.gameWinner(this.roomId),
    ];
    
    for (const key of keys) {
      await redis.del(key);
    }

    const answerKeys = await redis.keys(RedisKeys.userAnswer('*', '*'));
    if (answerKeys.length > 0) {
      for (const key of answerKeys) {
        await redis.del(key);
      }
    }

    // 重新初始化游戏
    await this.initializeGame();
  }
} 