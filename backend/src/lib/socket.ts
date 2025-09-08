import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { redis, RedisKeys } from './redis.js';
import { GameManager } from './game.js';


// 全局Socket.IO服务器实例
let io: SocketIOServer | null = null;

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL!,
      methods: ['GET', 'POST'],
      credentials: true,
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
      await redis.set(RedisKeys.userOnline(email), '1', { EX: 300 }); // 5分钟过期

      next();
    } catch (error) {
      next(new Error('认证失败'));
    }
  });

  // 连接事件处理
  io.on('connection', async (socket) => {
    const user = socket.data.user;

    // 用户加入游戏房间
    const roomId = process.env.DEFAULT_ROOM_ID!;
    socket.join(roomId);

    // 检查用户是否已在游戏中，如果不在则添加到存活列表
    const gameManager = new GameManager();
    const isInGame = await redis.sIsMember(RedisKeys.roomSurvivors(roomId), user.email);
    const isEliminated = await redis.sIsMember(RedisKeys.roomEliminated(roomId), user.email);
    const isWinner = await redis.get(RedisKeys.gameWinner(roomId)) === user.email;
    const isAdmin = await redis.sIsMember(RedisKeys.admin(), user.email);
    const isTie = await redis.get(RedisKeys.gameTie(roomId)) === 'true';
    if (!isInGame && !isEliminated && !isAdmin) {
      // 新用户加入游戏
      await gameManager.addPlayer(user.email);
    }

    // 发送当前游戏状态
    const gameState = await gameManager.getGameState();
    socket.emit('game_state', gameState);

    if (gameState.status === 'playing' && gameState.currentQuestion) {

      try {
        const questionId = gameState.currentQuestion.id;
        const userAnswer = await redis.get(RedisKeys.userAnswer(user.email, questionId));

        if (userAnswer) {
          socket.emit('user_answer', {
            questionId,
            answer: userAnswer,
          });
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    }

    // 如果用户已被淘汰，立即通知
    if (isEliminated) {
      socket.emit('eliminated', { 
        userId: user.email,
        message: '您已被淘汰' 
      });
    }

    if (isWinner) {
      socket.emit('winner', { 
        userId: user.email,
        message: '恭喜您获得第一名！' 
      });
    }

    if(isTie) {
      socket.emit('tie', { 
        userId: user.email,
        message: '平局' 
      });
    }

    // 处理答题提交
    // not used
    socket.on('submit_answer', async (data) => {
      const { answer } = data;

      if (!answer || !['A', 'B'].includes(answer)) {
        socket.emit('error', { message: '请选择A或B选项' });
        return;
      }

      // 检查用户是否还在存活列表中
      const roomId = process.env.DEFAULT_ROOM_ID!;
      const isAlive = await redis.sismember(RedisKeys.roomSurvivors(roomId), user.email);
      if (!isAlive) {
        socket.emit('error', { message: '您已被淘汰，无法答题' });
        return;
      }

      try {
        // 使用GameManager提交答案
        await gameManager.submitAnswer(user.email, answer);
        
        // 更新用户在线状态
        await redis.set(RedisKeys.userOnline(user.email), '1', { EX: 300 });

      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // 断开连接处理
    socket.on('disconnect', () => {
      const user = socket.data.user;
      if (user) {
        redis.del(RedisKeys.userOnline(user.email));
      }
    });
  });

  return io;
}

// 获取Socket.IO实例
export function getSocketIO(): SocketIOServer | null {
  return io;
} 