import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { redis, RedisKeys } from './redis.js';
import { getGameManager } from './game.js';


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
          winnerEmail: user.email,
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

    socket.on('submit_answer', async (data) => {
      console.log(`🎯 [提交答案] 收到答案提交请求`, {
        socketId: socket.id,
        userEmail: socket.data.user?.email,
        data: data,
        timestamp: new Date().toISOString()
      });

      try {
        const { answer } = data;
        const user = socket.data.user;

        console.log(`📝 [提交答案] 开始处理答案提交`, {
          userEmail: user?.email,
          answer: answer,
          isAdmin: isAdmin,
          isDisplay: isDisplay,
          roomId: roomId
        });

        if (isAdmin || isDisplay) {
          console.log(`❌ [提交答案] 管理员或展示用户尝试提交答案`, {
            userEmail: user?.email,
            isAdmin: isAdmin,
            isDisplay: isDisplay
          });
          socket.emit('answer_error', { error: '无权访问' });
          return;
        }

        if (!answer || !['A', 'B'].includes(answer)) {
          console.log(`❌ [提交答案] 答案格式无效`, {
            userEmail: user?.email,
            receivedAnswer: answer,
            validAnswers: ['A', 'B']
          });
          socket.emit('answer_error', { error: '请选择A或B选项' });
          return;
        }

        console.log(`✅ [提交答案] 答案格式验证通过，开始提交到GameManager`, {
          userEmail: user.email,
          answer: answer
        });

        await gameManager.submitAnswer(user.email, answer);

        console.log(`🎉 [提交答案] 答案提交成功`, {
          userEmail: user.email,
          answer: answer,
          timestamp: new Date().toISOString()
        });

        socket.emit('answer_submitted', {
          message: '答案已提交',
          answer
        });

        console.log(`📊 [提交答案] 获取更新后的游戏状态`, {
          userEmail: user.email
        });

        const roomState = await gameManager.getRoomState();
        const questionId = roomState.currentQuestion?.id;

        console.log(`🔍 [提交答案] 当前游戏状态`, {
          userEmail: user.email,
          questionId: questionId,
          gameStatus: roomState.status,
          round: roomState.round,
          timeLeft: roomState.timeLeft,
          survivorsCount: roomState.survivorsCount
        });

        if (questionId) {
          const userAnswer = await redis.get(RedisKeys.userAnswer(user.email, questionId));
          console.log(`💾 [提交答案] 从Redis获取用户答案`, {
            userEmail: user.email,
            questionId: questionId,
            storedAnswer: userAnswer
          });

          const gameState = {
            ...roomState,
            userAnswer: userAnswer || null,
          };

          socket.emit('game_state', gameState);
          console.log(`📤 [提交答案] 已发送游戏状态更新给用户`, {
            userEmail: user.email,
            gameState: {
              status: gameState.status,
              round: gameState.round,
              userAnswer: gameState.userAnswer,
              timeLeft: gameState.timeLeft
            }
          });
        } else {
          console.log(`⚠️  [提交答案] 当前没有有效的题目ID`, {
            userEmail: user.email,
            roomState: roomState
          });
        }

        // 获取当前答案统计并记录
        const currentAnswers = await redis.hGetAll(RedisKeys.gameAnswers(roomId));
        console.log(`📈 [提交答案] 当前答案统计`, {
          userEmail: user.email,
          answerCounts: {
            A: currentAnswers.A || '0',
            B: currentAnswers.B || '0'
          },
          totalAnswers: (parseInt(currentAnswers.A || '0') + parseInt(currentAnswers.B || '0'))
        });

      } catch (error: any) {
        console.error(`💥 [提交答案] 处理答案提交时发生错误`, {
          userEmail: socket.data.user?.email,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });

        if (error.message === '没有进行中的游戏') {
          console.log(`🚫 [提交答案] 没有进行中的游戏`, {
            userEmail: socket.data.user?.email
          });
          socket.emit('answer_error', { error: '当前没有进行中的游戏' });
        } else if (error.message === '您已被淘汰') {
          console.log(`☠️  [提交答案] 用户已被淘汰`, {
            userEmail: socket.data.user?.email
          });
          socket.emit('answer_error', { error: '您已被淘汰，无法继续答题' });
        } else {
          console.log(`🔥 [提交答案] 服务器内部错误`, {
            userEmail: socket.data.user?.email,
            errorMessage: error.message
          });
          socket.emit('answer_error', { error: '服务器内部错误' });
        }
      }
    });
  });

  return io;
}

// 获取Socket.IO实例
export function getSocketIO(): SocketIOServer | null {
  return io;
} 