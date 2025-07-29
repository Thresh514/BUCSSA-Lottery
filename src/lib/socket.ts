import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { redis, RedisKeys } from '@/lib/redis';
import { env } from '@/lib/env';
import { GameManager } from './game';

// 全局Socket.IO服务器实例
let io: SocketIOServer | null = null;

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.SITE_URL,
      methods: ['GET', 'POST'],
    },
  });

  // 中间件：验证用户邮箱
  io.use(async (socket, next) => {
    try {
      const email = socket.handshake.auth.email;
      if (!email) {
        return next(new Error('未提供邮箱'));
      }

      // 验证邮箱域名
      if (!email.endsWith('@bu.edu') && !email.endsWith('@gmail.com')) {
        return next(new Error('不支持的邮箱域名'));
      }

      socket.data.user = {
        email,
      };

      // 更新用户在线状态
      await redis.set(RedisKeys.userOnline(email), '1', 'EX', 300); // 5分钟过期

      next();
    } catch (error) {
      next(new Error('认证失败'));
    }
  });

  // 连接事件处理
  io.on('connection', async (socket) => {
    const user = socket.data.user;
    console.log(`用户 ${user.email} 已连接`);

    // 用户加入游戏房间
    socket.join(env.DEFAULT_ROOM_ID);

    // 检查用户是否已在游戏中，如果不在则添加到存活列表
    const gameManager = new GameManager();
    const isInGame = await redis.sismember(RedisKeys.roomSurvivors(env.DEFAULT_ROOM_ID), user.email);
    const isEliminated = await redis.sismember(RedisKeys.roomEliminated(env.DEFAULT_ROOM_ID), user.email);
    
    if (!isInGame && !isEliminated) {
      // 新用户加入游戏
      await gameManager.addPlayer(user.email);
      console.log(`新用户 ${user.email} 加入游戏`);
    }

    // 发送当前游戏状态
    const gameState = await getGameState();
    socket.emit('game_state', gameState);

    // 如果用户已被淘汰，立即通知
    if (isEliminated) {
      socket.emit('eliminated', { 
        userId: user.email,
        message: '您已被淘汰' 
      });
    }

    // 处理答题提交
    socket.on('submit_answer', async (data) => {
      const { answer } = data;

      if (!answer || !['A', 'B'].includes(answer)) {
        socket.emit('error', { message: '请选择A或B选项' });
        return;
      }

      // 检查用户是否还在存活列表中
      const isAlive = await redis.sismember(RedisKeys.roomSurvivors(env.DEFAULT_ROOM_ID), user.email);
      if (!isAlive) {
        socket.emit('error', { message: '您已被淘汰，无法答题' });
        return;
      }

      try {
        // 使用GameManager提交答案
        await gameManager.submitAnswer(user.email, answer);
        
        // 更新用户在线状态
        await redis.set(RedisKeys.userOnline(user.email), '1', 'EX', 300);

        console.log(`用户 ${user.email} 提交答案: ${answer}`);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // 断开连接处理
    socket.on('disconnect', async () => {
      console.log(`用户 ${user.email} 已断开连接`);
      // 清除用户在线状态
      await redis.del(RedisKeys.userOnline(user.email));
    });
  });

  console.log('Socket.IO 服务器已启动');
  return io;
}

// 获取游戏状态
async function getGameState() {
  const roomId = env.DEFAULT_ROOM_ID;
  
  const [
    gameState,
    currentQuestion,
    survivorsCount,
    eliminatedCount,
    currentRound,
    onlineUsers
  ] = await Promise.all([
    redis.hgetall(RedisKeys.gameState(roomId)),
    redis.hgetall(RedisKeys.currentQuestion(roomId)),
    redis.scard(RedisKeys.roomSurvivors(roomId)),
    redis.scard(RedisKeys.roomEliminated(roomId)),
    redis.get(RedisKeys.currentRound(roomId)),
    redis.keys(RedisKeys.userOnline('*')),
  ]);

  return {
    status: gameState.status || 'waiting',
    currentQuestionId: currentQuestion.id || null,
    round: parseInt(currentRound || '0'),
    timeLeft: parseInt(gameState.timeLeft || '0'),
    totalPlayers: survivorsCount + eliminatedCount,
    survivorsCount,
    eliminatedCount,
    onlineCount: onlineUsers.length,
  };
}

// 获取Socket.IO实例
export function getSocketIO(): SocketIOServer | null {
  return io;
} 