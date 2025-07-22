import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyJWT } from '@/lib/jwt';
import { redis, RedisKeys } from '@/lib/redis';
import { env } from '@/lib/env';

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

  // 中间件：JWT认证
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('未提供认证令牌'));
      }

      const payload = verifyJWT(token);
      if (!payload) {
        return next(new Error('无效的认证令牌'));
      }

      // 验证用户是否还在存活列表中
      const isAlive = await redis.sismember(
        RedisKeys.roomSurvivors(env.DEFAULT_ROOM_ID),
        payload.userId
      );

      socket.data.user = {
        id: payload.userId,
        email: payload.email,
        isAlive: isAlive === 1,
      };

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

    // 发送当前游戏状态
    const gameState = await getGameState();
    socket.emit('game_state', gameState);

    // 如果用户已被淘汰，立即通知
    if (!user.isAlive) {
      socket.emit('eliminated', { message: '您已被淘汰' });
    }

    // 处理答题提交
    socket.on('submit_answer', async (data) => {
      const { questionId, selectedOption } = data;

      if (!user.isAlive) {
        socket.emit('error', { message: '您已被淘汰，无法答题' });
        return;
      }

      // 检查是否为当前题目
      const currentQuestion = await redis.hgetall(
        RedisKeys.currentQuestion(env.DEFAULT_ROOM_ID)
      );

      if (!currentQuestion.id || currentQuestion.id !== questionId) {
        socket.emit('error', { message: '题目已过期' });
        return;
      }

      // 保存用户答题记录
      await redis.set(
        RedisKeys.userAnswer(user.id, questionId),
        JSON.stringify({
          userId: user.id,
          questionId,
          selectedOption,
          submittedAt: new Date().toISOString(),
        })
      );

      console.log(`用户 ${user.email} 提交答案: ${selectedOption}`);
    });

    // 断开连接处理
    socket.on('disconnect', () => {
      console.log(`用户 ${user.email} 已断开连接`);
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
    currentRound
  ] = await Promise.all([
    redis.hgetall(RedisKeys.gameState(roomId)),
    redis.hgetall(RedisKeys.currentQuestion(roomId)),
    redis.scard(RedisKeys.roomSurvivors(roomId)),
    redis.scard(RedisKeys.roomEliminated(roomId)),
    redis.get(RedisKeys.currentRound(roomId)),
  ]);

  return {
    status: gameState.status || 'waiting',
    currentQuestionId: currentQuestion.id || null,
    round: parseInt(currentRound || '0'),
    timeLeft: parseInt(gameState.timeLeft || '0'),
    totalPlayers: survivorsCount + eliminatedCount,
    survivorsCount,
    eliminatedCount,
  };
}

// 获取Socket.IO实例
export function getSocketIO(): SocketIOServer | null {
  return io;
} 