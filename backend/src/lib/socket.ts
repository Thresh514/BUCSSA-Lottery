import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { redis, RedisKeys } from './redis.js';
import { getGameManager } from './game.js';
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

      next();
    } catch (error) {
      next(new Error('认证失败'));
    }
  });

  // 连接事件处理
  io.on('connection', async (socket) => {
    const gameManager = getGameManager();
    const user = socket.data.user;

    // 用户加入游戏房间
    const roomId = process.env.DEFAULT_ROOM_ID!;
    socket.join(roomId);

    const gameStarted = await redis.get(RedisKeys.gameStarted(roomId)) === '1';
    const isAdmin = await redis.sIsMember(RedisKeys.admin(), user.email);
    const isDisplay = await redis.sIsMember(RedisKeys.display(), user.email);
    const isSurviving = await redis.sIsMember(RedisKeys.roomSurvivors(roomId), user.email);
    const isEliminated = await redis.sIsMember(RedisKeys.roomEliminated(roomId), user.email);
    const tieSet = await redis.sMembers(RedisKeys.gameTie(roomId))
    const isTie = tieSet ? tieSet.includes(user.email) : false;
    const isWinner = await redis.get(RedisKeys.gameWinner(roomId)) === user.email;
    const isExistingPlayer = isSurviving || isEliminated || isWinner || isTie;


    // Only block NEW users from joining if game has started
    // Allow existing players (survivors, eliminated, winners, tied) to reconnect

    if (gameStarted && !isAdmin && !isDisplay && !isExistingPlayer) {
      socket.emit('redirect', {
        message: '游戏已开始，请等待下一轮游戏'
      });
      socket.disconnect();
      return;
    }

    if (!isAdmin && !isDisplay && !isExistingPlayer) {
      // 新用户加入游戏
      await gameManager.addPlayer(user.email);
      gameManager.emitPlayerCountUpdate();
    }

    const roomState = await gameManager.getRoomState();

    if (isAdmin) {
      const gameState = { ...roomState, "userAnswer": null };
      socket.emit("game_state", gameState);
    } else if (isDisplay) {
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
          "eliminated": [user.email],
        });
        socket.emit("game_state", { ...roomState, userAnswer: null });
      } else {
        const questionId = roomState.currentQuestion.id;
        const userAnswer = await redis.get(RedisKeys.userAnswer(user.email, questionId));
        const game_state = {
          ...roomState,
          "userAnswer": userAnswer || null,
        }
        socket.emit("game_state", game_state);
      }
    }

    if (isDisplay) {
      console.log('Display reconnected');
      const remainingTime = gameManager.getCurrentTimeLeft();
      socket.emit('countdown_update', { timeLeft: remainingTime });

      const winner = await redis.get(RedisKeys.gameWinner(roomId));
      const tie = await redis.sMembers(RedisKeys.gameTie(roomId));

      if (winner) {
        console.log('Found winner, winner:', user.email);
        socket.emit('winner', { 
          winnerEmail: winner,
        });
      } else if (tie) {
        console.log('Found tie, tie:', user.email);
        socket.emit('tie', { 
          finalists: tie,
        });
      }
    }

    // 断开连接处理
    socket.on('disconnect', () => {
      const user = socket.data.user;
      if (user && !isAdmin && !isDisplay) {
        redis.del(RedisKeys.userOnline(user.email));
        // redis.sRem(RedisKeys.roomSurvivors(roomId), user.email);
      }
      gameManager.emitPlayerCountUpdate();
    });
  });

  return io;
}

// 获取Socket.IO实例
export function getSocketIO(): SocketIOServer | null {
  return io;
} 