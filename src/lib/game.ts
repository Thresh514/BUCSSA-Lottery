import { redis, RedisKeys } from './redis';
import { env } from './env';
import { getSocketIO } from './socket';

// 新的题目结构 - 只有A/B两个选项
export interface MinorityQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
}

export class GameManager {
  private roomId: string;
  private io: any; // Socket.IO instance

  constructor(roomId: string = env.DEFAULT_ROOM_ID) {
    this.roomId = roomId;
    this.io = getSocketIO();
  }

  // 初始化游戏
  async initializeGame(): Promise<void> {
    await redis.hset(RedisKeys.gameState(this.roomId), {
      status: 'waiting',
      timeLeft: '0',
    });
    await redis.set(RedisKeys.currentRound(this.roomId), '0');
    
    // 清空存活和淘汰列表
    await redis.del(RedisKeys.roomSurvivors(this.roomId));
    await redis.del(RedisKeys.roomEliminated(this.roomId));
  }

  // 添加用户到游戏
  async addPlayer(userEmail: string): Promise<void> {
    await redis.sadd(RedisKeys.roomSurvivors(this.roomId), userEmail);
    await redis.hset(RedisKeys.userSession(userEmail), {
      isAlive: 'true',
      joinedAt: new Date().toISOString(),
    });
  }

  // 开始新一轮 - 管理员发布新题目
  async startNewRound(question: MinorityQuestion): Promise<void> {
    const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
    const newRound = parseInt(currentRound || '0') + 1;

    // 更新当前轮次
    await redis.set(RedisKeys.currentRound(this.roomId), newRound.toString());

    // 保存当前题目
    await redis.hset(RedisKeys.currentQuestion(this.roomId), {
      id: question.id,
      question: question.question,
      optionA: question.optionA,
      optionB: question.optionB,
      startTime: new Date().toISOString(),
    });

    // 设置游戏状态
    await redis.hset(RedisKeys.gameState(this.roomId), {
      status: 'playing',
      timeLeft: '30', // 30秒答题时间
    });

    // 广播新题目给所有存活用户
    if (this.io) {
      const survivorsCount = await redis.scard(RedisKeys.roomSurvivors(this.roomId));
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
    }

    // 启动倒计时
    this.startCountdown();
  }

  // 用户提交答案
  async submitAnswer(userEmail: string, answer: 'A' | 'B'): Promise<void> {
    const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
    const currentQuestion = await redis.hget(RedisKeys.currentQuestion(this.roomId), 'id');
    
    if (!currentRound || !currentQuestion) {
      throw new Error('没有进行中的游戏');
    }

    // 检查用户是否还在游戏中
    const isAlive = await redis.sismember(RedisKeys.roomSurvivors(this.roomId), userEmail);
    if (!isAlive) {
      throw new Error('您已被淘汰');
    }

    // 记录用户答案
    await redis.set(RedisKeys.userAnswer(userEmail, currentQuestion), answer);
  }

  // 结束当前轮次并处理少数派晋级
  async endRound(): Promise<void> {
    const currentQuestion = await redis.hgetall(RedisKeys.currentQuestion(this.roomId));
    if (!currentQuestion.id) return;

    const survivors = await redis.smembers(RedisKeys.roomSurvivors(this.roomId));
    
    // 统计A和B的选择人数
    const A_users: string[] = [];
    const B_users: string[] = [];

    for (const userEmail of survivors) {
      const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id));
      if (answer === 'A') {
        A_users.push(userEmail);
      } else if (answer === 'B') {
        B_users.push(userEmail);
      }
      // 未答题的用户将被淘汰
    }

    // 少数派胜出逻辑
    const minority = A_users.length <= B_users.length ? A_users : B_users;
    const majority = A_users.length > B_users.length ? A_users : B_users;
    const minorityOption = A_users.length <= B_users.length ? 'A' : 'B';

    // 更新存活和淘汰列表
    if (minority.length > 0) {
      // 清空存活列表，重新添加少数派
      await redis.del(RedisKeys.roomSurvivors(this.roomId));
      if (minority.length > 0) {
        await redis.sadd(RedisKeys.roomSurvivors(this.roomId), ...minority);
      }
    }

    // 将多数派和未答题用户加入淘汰列表
    const eliminatedUsers = [...majority];
    for (const userEmail of survivors) {
      const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id));
      if (!answer) {
        eliminatedUsers.push(userEmail);
      }
    }

    if (eliminatedUsers.length > 0) {
      await redis.sadd(RedisKeys.roomEliminated(this.roomId), ...eliminatedUsers);

      // 更新用户会话状态
      for (const userEmail of eliminatedUsers) {
        await redis.hset(RedisKeys.userSession(userEmail), 'isAlive', 'false');
      }
    }

    // 广播轮次结果
    if (this.io) {
      const survivorsCount = minority.length;
      
      this.io.to(this.roomId).emit('round_result', {
        minorityOption,
        minorityCount: minority.length,
        majorityCount: majority.length,
        eliminatedCount: eliminatedUsers.length,
        survivorsCount,
        eliminatedUsers,
      });

      // 通知被淘汰的用户
      for (const userEmail of eliminatedUsers) {
        this.io.to(this.roomId).emit('eliminated', {
          userId: userEmail,
          message: `${userEmail} 已被淘汰`,
        });
      }
    }

    // 检查游戏是否结束
    if (minority.length <= 1) {
      await this.endGame(minority[0] || null);
    } else {
      // 准备下一轮
      await redis.hset(RedisKeys.gameState(this.roomId), {
        status: 'waiting',
        timeLeft: '0',
      });
    }
  }

  // 结束游戏
  async endGame(winner: string | null): Promise<void> {
    await redis.hset(RedisKeys.gameState(this.roomId), {
      status: 'ended',
      timeLeft: '0',
    });

    if (winner) {
      await redis.set(RedisKeys.gameWinner(this.roomId), winner);
    }
    
    if (this.io) {
      this.io.to(this.roomId).emit('game_ended', {
        winner,
        winnerEmail: winner,
        message: winner ? `恭喜 ${winner} 获胜！` : '游戏结束',
      });
    }

    console.log('游戏结束，获胜者:', winner || '无');
  }

  // 启动倒计时
  private startCountdown(): void {
    let timeLeft = 30;
    
    const countdown = setInterval(async () => {
      timeLeft--;
      
      await redis.hset(RedisKeys.gameState(this.roomId), 'timeLeft', timeLeft.toString());
      
      if (this.io) {
        this.io.to(this.roomId).emit('countdown', { timeLeft });
      }

      if (timeLeft <= 0) {
        clearInterval(countdown);
        await this.endRound();
      }
    }, 1000);
  }

  // 获取游戏统计信息
  async getGameStats() {
    const [survivorsCount, eliminatedCount, currentRound, gameState] = await Promise.all([
      redis.scard(RedisKeys.roomSurvivors(this.roomId)),
      redis.scard(RedisKeys.roomEliminated(this.roomId)),
      redis.get(RedisKeys.currentRound(this.roomId)),
      redis.hgetall(RedisKeys.gameState(this.roomId)),
    ]);

    return {
      totalPlayers: survivorsCount + eliminatedCount,
      survivorsCount,
      eliminatedCount,
      currentRound: parseInt(currentRound || '0'),
      status: gameState.status || 'waiting',
      timeLeft: parseInt(gameState.timeLeft || '0'),
    };
  }

  // 获取当前轮次答题统计
  async getRoundStats() {
    const currentQuestion = await redis.hgetall(RedisKeys.currentQuestion(this.roomId));
    if (!currentQuestion.id) return null;

    const survivors = await redis.smembers(RedisKeys.roomSurvivors(this.roomId));
    
    let A_count = 0;
    let B_count = 0;
    let noAnswer_count = 0;

    for (const userEmail of survivors) {
      const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id));
      if (answer === 'A') {
        A_count++;
      } else if (answer === 'B') {
        B_count++;
      } else {
        noAnswer_count++;
      }
    }

    return {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      optionA: currentQuestion.optionA,
      optionB: currentQuestion.optionB,
      A_count,
      B_count,
      noAnswer_count,
      totalPlayers: survivors.length,
    };
  }

  // 重置游戏
  async resetGame(): Promise<void> {
    const keys = [
      RedisKeys.roomSurvivors(this.roomId),
      RedisKeys.roomEliminated(this.roomId),
      RedisKeys.currentQuestion(this.roomId),
      RedisKeys.gameState(this.roomId),
      RedisKeys.currentRound(this.roomId),
      RedisKeys.gameWinner(this.roomId),
    ];

    await redis.del(...keys);
    await this.initializeGame();

    if (this.io) {
      this.io.to(this.roomId).emit('game_reset', { message: '游戏已重置' });
    }
  }
} 