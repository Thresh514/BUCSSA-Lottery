import { redis, RedisKeys } from './redis';
import { env } from './env';
import { Question } from '@/types';
import { getSocketIO } from './socket';
import questionsData from '@/data/questions.json';

const questions: Question[] = questionsData;

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
  }

  // 开始新一轮
  async startNewRound(): Promise<Question | null> {
    const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
    const newRound = parseInt(currentRound || '0') + 1;

    // 检查是否还有题目
    if (newRound > questions.length) {
      await this.endGame();
      return null;
    }

    const question = questions[newRound - 1];

    // 更新当前轮次
    await redis.set(RedisKeys.currentRound(this.roomId), newRound.toString());

    // 保存当前题目
    await redis.hset(RedisKeys.currentQuestion(this.roomId), {
      id: question.id,
      question: question.question,
      options: JSON.stringify(question.options),
      correct_option: question.correct_option,
      startTime: new Date().toISOString(),
    });

    // 设置游戏状态
    await redis.hset(RedisKeys.gameState(this.roomId), {
      status: 'playing',
      timeLeft: '30', // 30秒答题时间
    });

    // 广播新题目给所有用户
    if (this.io) {
      const survivorsCount = await redis.scard(RedisKeys.roomSurvivors(this.roomId));
      this.io.to(this.roomId).emit('new_question', {
        question: {
          id: question.id,
          options: question.options, // 用户端不显示题干，只有选项
        },
        round: newRound,
        timeLeft: 30,
        survivorsCount,
      });
    }

    // 启动倒计时
    this.startCountdown();

    return question;
  }

  // 结束当前轮次并处理淘汰
  async endRound(): Promise<void> {
    const currentQuestion = await redis.hgetall(RedisKeys.currentQuestion(this.roomId));
    if (!currentQuestion.id) return;

    const correctAnswer = currentQuestion.correct_option;
    const survivors = await redis.smembers(RedisKeys.roomSurvivors(this.roomId));

    const eliminatedUsers: string[] = [];
    const stillAliveUsers: string[] = [];

    // 检查每个存活用户的答案
    for (const userId of survivors) {
      const answerData = await redis.get(RedisKeys.userAnswer(userId, currentQuestion.id));
      
      if (!answerData) {
        // 未答题，直接淘汰
        eliminatedUsers.push(userId);
      } else {
        const answer = JSON.parse(answerData);
        if (answer.selectedOption !== correctAnswer) {
          // 答错，淘汰
          eliminatedUsers.push(userId);
        } else {
          // 答对，继续存活
          stillAliveUsers.push(userId);
        }
      }
    }

    // 更新存活和淘汰列表
    if (eliminatedUsers.length > 0) {
      await redis.srem(RedisKeys.roomSurvivors(this.roomId), ...eliminatedUsers);
      await redis.sadd(RedisKeys.roomEliminated(this.roomId), ...eliminatedUsers);

      // 更新用户会话状态
      for (const userId of eliminatedUsers) {
        await redis.hset(RedisKeys.userSession(userId), 'isAlive', 'false');
      }
    }

    // 广播轮次结果
    if (this.io) {
      const survivorsCount = stillAliveUsers.length;
      
      this.io.to(this.roomId).emit('round_result', {
        correctAnswer,
        eliminatedCount: eliminatedUsers.length,
        survivorsCount,
        eliminatedUsers,
      });

      // 通知被淘汰的用户
      for (const userId of eliminatedUsers) {
        const userEmail = await redis.get(`userid:${userId}:email`);
        this.io.to(this.roomId).emit('eliminated', {
          userId,
          message: `${userEmail} 已被淘汰`,
        });
      }
    }

    // 检查游戏是否结束
    if (stillAliveUsers.length <= 1) {
      await this.endGame();
    } else {
      // 准备下一轮
      await redis.hset(RedisKeys.gameState(this.roomId), {
        status: 'waiting',
        timeLeft: '0',
      });
    }
  }

  // 结束游戏
  async endGame(): Promise<void> {
    await redis.hset(RedisKeys.gameState(this.roomId), {
      status: 'ended',
      timeLeft: '0',
    });

    // 获取最终获胜者
    const survivors = await redis.smembers(RedisKeys.roomSurvivors(this.roomId));
    
    if (this.io) {
      this.io.to(this.roomId).emit('game_ended', {
        winner: survivors[0] || null,
        message: survivors.length > 0 ? '恭喜获胜者！' : '游戏结束',
      });
    }

    console.log('游戏结束，获胜者:', survivors[0] || '无');
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

  // 重置游戏
  async resetGame(): Promise<void> {
    const keys = [
      RedisKeys.roomSurvivors(this.roomId),
      RedisKeys.roomEliminated(this.roomId),
      RedisKeys.currentQuestion(this.roomId),
      RedisKeys.gameState(this.roomId),
      RedisKeys.currentRound(this.roomId),
    ];

    await redis.del(...keys);
    await this.initializeGame();

    if (this.io) {
      this.io.to(this.roomId).emit('game_reset', { message: '游戏已重置' });
    }
  }
} 