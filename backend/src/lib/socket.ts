import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { redis, RedisKeys } from './redis.js';
import { GameManager } from './game.js';
import { GameState } from '../types/index.js';


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
    const gameManager = new GameManager();
    const user = socket.data.user;

    // 用户加入游戏房间
    const roomId = process.env.DEFAULT_ROOM_ID!;
    socket.join(roomId);

    const isAdmin = await redis.sIsMember(RedisKeys.admin(), user.email);
    const isShow = await redis.sIsMember(RedisKeys.show(), user.email);
    const isInGame = await redis.sIsMember(RedisKeys.roomSurvivors(roomId), user.email);
    const isEliminated = await redis.sIsMember(RedisKeys.roomEliminated(roomId), user.email);
    const isWinner = await redis.get(RedisKeys.gameWinner(roomId)) === user.email;
    const tieSet = await redis.get(RedisKeys.gameTie(roomId))
    const isTie = tieSet?.includes(user.email);

    if (!isInGame && !isEliminated && !isAdmin) {
      // 新用户加入游戏
      await gameManager.addPlayer(user.email);
    }

    const roomState = await gameManager.getRoomState();

    if (isAdmin) {
      const gameState = { ...roomState, "userAnswer": null };
      socket.emit("game_state", gameState);
    } else if (isShow) {
      const gameState = { ...roomState, "userAnswer": null };
      socket.emit("game_state", gameState);
    } else {
      if (isWinner) {
        socket.emit('winner', { 
          userId: user.email,
          message: '恭喜您获得第一名！' 
        });
        socket.emit("game_state", { ...roomState, userAnswer: null });
      } else if (isTie) {
        socket.emit('tie', { 
          finalists: [user.email],
        });
        socket.emit("game_state", { ...roomState, userAnswer: null });
      } else if (isEliminated) {
        socket.emit('eliminated', { 
          userId: user.email,
        });
        socket.emit("game_state", { ...roomState, userAnswer: null });
      } else if (roomState.status === 'playing' && roomState.currentQuestion) {
        const questionId = roomState.currentQuestion.id;
        const userAnswer = await redis.get(RedisKeys.userAnswer(user.email, questionId));
        const game_state = {
          ...roomState,
          "userAnswer": userAnswer || null,
        }
        socket.emit("game_state", game_state);
      }
    }

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