const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

// 压力测试配置
const CONFIG = {
  wsTarget: 'ws://198.23.211.34:4000',
  wssTarget: 'wss://lottery.bucssa.org',
  httpTarget: 'http://198.23.211.34:4000',
  httpsTarget: 'https://lottery.bucssa.org',
  concurrentUsers: 300,
  testDuration: 600,
  arrivalRate: 20
};

let connectedUsers = 0;
let failedUsers = 0;
let totalMessages = 0;
let startTime = performance.now();
let stats = {
  connections: [],
  messages: [],
  errors: []
};

// 游戏进程数据
// {
//   1: { 
//         answerCounts: { A: 2, B: 1 },
//         eliminatedAnswer: 'A',
//         userAnswers: { 'user_1@gmail.com': 'A',
//                        'user_2@gmail.com': 'B',
//                        'user_3@gmail.com': 'A' 
//                      },
//         noAnswers: ('user_4@gmail.com', 'user_5@gmail.com'),
//         eliminated: ['user_1@gmail.com','user_3@gmail.com','user_4@gmail.com', 'user_5@gmail.com'],
//      },
// }
let gameData = { winner: null, tie: [] };
let currentRound = 1;



class User {
  constructor(id) {
    this.id = id;
    this.email = `user_${id}@gmail.com`;
    this.eliminated = false;
  }

  // 创建单个用户连接
  initializeUser() {
    const email = this.email;
    const userStartTime = performance.now();

    const socket = io(CONFIG.wsTarget, {
      auth: { email },
      timeout: 10000
    });

    socket.on('connect', () => {
      const connectTime = performance.now() - userStartTime;
      connectedUsers++;

      stats.connections.push({
        userId: this.id,
        connectTime,
        timestamp: Date.now()
      });

      console.log(`✅ 用户 ${this.id} 连接成功 (${connectedUsers} 已连接, ${connectTime.toFixed(2)}ms)`);
    });

    socket.on('connect_error', (error) => {
      const connectTime = performance.now() - userStartTime;
      failedUsers++;

      stats.errors.push({
        userId: this.id,
        error: error.message,
        connectTime,
        timestamp: Date.now()
      });

      console.log(`❌ 用户 ${this.id} 连接失败: ${error.message} (${failedUsers} 失败, ${connectTime.toFixed(2)}ms)`);
    });

    socket.on('game_state', (data) => {
      // console.log(`用户 ${this.id} 收到游戏状态更新`);
      totalMessages++;
      stats.messages.push({
        userId: this.id,
        message: 'game_state',
        timestamp: Date.now()
      });
    });

    socket.on("game_start", (data) => {
      // console.log(`用户 ${userId} 收到游戏开始通知`);
      totalMessages++;
      stats.messages.push({
        userId: this.id,
        message: 'game_start',
        timestamp: Date.now()
      });

      this.eliminated = false;

      gameData[currentRound] = {
        eliminatedAnswer: null,
        answerCounts: { A: 0, B: 0 },
        userAnswers: {},
        noAnswers: [],
        eliminated: []
      };
    });

    socket.on('new_question', (data) => {
      // console.log(`用户 ${userId} 收到新问题: ${data.currentQuestion}`);
      totalMessages++;
      stats.messages.push({
        userId: this.id,
        message: 'new_question',
        timestamp: Date.now()
      });

      currentRound = data.round;
      gameData[currentRound] = {
        eliminatedAnswer: null,
        answerCounts: { A: 0, B: 0 },
        userAnswers: {},
        noAnswers: [],
        eliminated: []
      };

      if (this.eliminated) {
        console.log(`用户 ${this.id} 已被轮被淘汰`);
        return;
      }

      // 模拟回答问题
      setTimeout(async () => {
        // 30% 的用户不提交答案
        if (Math.random() < 0.3) {
          console.log(`用户 ${this.id} 未提交答案`);
          gameData[currentRound].noAnswers.push(email);
          return;
        }

        const userAnswer = Math.random() < 0.5 ? 'A' : 'B'; // 随机选择 A 或 B
        const token = generateAuthToken(email, this.id);

        const response = await fetch(
          `${CONFIG.httpTarget}/api/submit-answer/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token || ""}`,
            },
            body: JSON.stringify({
              answer: userAnswer,
            }),
          }
        );

        if (response.ok) {
          totalMessages++;
          stats.messages.push({
            userId: this.id,
            message: 'submit_answer',
            answer: userAnswer,
            timestamp: Date.now()
          });
          console.log(`用户 ${this.id} 提交答案: ${userAnswer}`);

          gameData[currentRound].userAnswers[email] = userAnswer;
        } else if (response.status !== 400) {
          const errorText = await response.text();
          stats.errors.push({
            userId: this.id,
            error: `提交答案失败: ${response.status} ${errorText}`,
            timestamp: Date.now()
          });
          console.log(`❌ 用户 ${this.id} 提交答案失败: ${response.status} ${errorText}`);
        }

      }, Math.random() * 5000); // 在 0-5 秒内随机回答
    });

    socket.on("round_result", (data) => {
      // 如果用户已被淘汰，则不再处理后续逻辑
      if (this.eliminated) {
        return;
      }

      // console.log(`用户 ${userId} 收到回合结果: ${data.correctAnswer}`);
      totalMessages++;
      stats.messages.push({
        userId: this.id,
        message: 'round_result',
        correctAnswer: data.correctAnswer,
        timestamp: Date.now()
      });

      gameData[currentRound].answerCounts = data.answers;
      if (data.answers.A == 0 || data.answers.B == 0) {
        gameData[currentRound].eliminatedAnswer = 'None'
      } else {
        gameData[currentRound].eliminatedAnswer = data.answers.A > data.answers.B ? 'A' : 'B';
      }

      // // 检查用户是否被淘汰
      // const userAnswer = gameData[currentRound].userAnswers[email];
      // if (!userAnswer || userAnswer === gameData[currentRound].eliminatedAnswer) {
      //   this.eliminated = true;
      //   console.log(`用户 ${this.id} 在第 ${currentRound} 轮被淘汰`);
      // }
    });


    socket.on("eliminated", (data) => {
      // console.log(`用户 ${userId} 被淘汰: ${data.reason}`);
      totalMessages++;
      stats.messages.push({
        userId: this.id,
        message: 'eliminated',
        reason: data.reason,
        timestamp: Date.now()
      });

      gameData[currentRound].eliminated = data.eliminated;
      const eliminatedUsers = new Set(data.eliminated);
      if (eliminatedUsers.has(email)) {
        this.eliminated = true;
        console.log(`用户 ${this.id} 确认被淘汰`);
      }
    });

    socket.on("winner", (data) => {
      // console.log(`用户 ${userId} 获胜: ${data.winnerEmail}`);
      totalMessages++;
      stats.messages.push({
        userId: this.id,
        message: 'winner',
        winnerEmail: data.winnerEmail,
        timestamp: Date.now()
      });
    });

    socket.on("tie", (data) => {
      // console.log(`用户 ${userId} 平局: ${data.finalists}`);
      totalMessages++;
      stats.messages.push({
        userId: this.id,
        message: 'tie',
        finalists: data.finalists,
        timestamp: Date.now()
      });
    });

    socket.on('disconnect', (reason) => {
      // 静默处理，避免日志过多
    });

    return socket;
  }
}

function generateAuthToken(userEmail, userId) {
  const accessToken = jwt.sign({ email: userEmail, isAdmin: false, isDisplay: false, id: userId }, process.env.JWT_SECRET, { expiresIn: '30d', issuer: 'lottery-frontend', audience: 'lottery-backend' });
  return accessToken;
}

// 打印统计信息
function printStats() {
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n--- 📊 压力测试结果 ---');
  console.log(`测试时长: ${duration.toFixed(2)} 秒`);
  console.log(`总连接尝试: ${connectedUsers + failedUsers}`);
  console.log(`成功连接: ${connectedUsers}`);
  console.log(`失败连接: ${failedUsers}`);
  console.log(`成功率: ${((connectedUsers / (connectedUsers + failedUsers)) * 100).toFixed(2)}%`);
  console.log(`总消息数: ${totalMessages}`);
  console.log(`平均连接率: ${(connectedUsers / duration).toFixed(2)} 连接/秒`);
  console.log(`平均消息率: ${(totalMessages / duration).toFixed(2)} 消息/秒`);

  if (stats.connections.length > 0) {
    const connectTimes = stats.connections.map(c => c.connectTime);
    const avgConnectTime = connectTimes.reduce((a, b) => a + b, 0) / connectTimes.length;
    const maxConnectTime = Math.max(...connectTimes);
    const minConnectTime = Math.min(...connectTimes);

    console.log(`平均连接时间: ${avgConnectTime.toFixed(2)}ms`);
    console.log(`最快连接时间: ${minConnectTime.toFixed(2)}ms`);
    console.log(`最慢连接时间: ${maxConnectTime.toFixed(2)}ms`);
  }

  if (stats.errors.length > 0) {
    console.log('\n--- ❌ 错误统计 ---');
    const errorTypes = {};
    stats.errors.forEach(error => {
      errorTypes[error.error] = (errorTypes[error.error] || 0) + 1;
    });

    Object.entries(errorTypes).forEach(([error, count]) => {
      console.log(`${error}: ${count} 次`);
    });
  }
  fs.writeFileSync('gameState.json', JSON.stringify(gameData, null, 2));
  console.log('✅ 游戏状态已保存到 gameState.json');
}

// 运行压力测试
async function runLoadTest() {
  console.log('🚀 开始高强度压力测试...');
  console.log(`目标: ${CONFIG.httpTarget}`);
  console.log(`并发用户数: ${CONFIG.concurrentUsers}`);
  console.log(`测试时长: ${CONFIG.testDuration} 秒`);
  console.log(`到达率: ${CONFIG.arrivalRate} 用户/秒`);
  console.log('---');

  const sockets = [];
  let userId = 0;

  // 创建用户连接
  const createInterval = setInterval(() => {
    if (sockets.length < CONFIG.concurrentUsers) {
      const testUser = new User(++userId);
      const socket = testUser.initializeUser(userId);
      sockets.push(socket);
    }
  }, 1000 / CONFIG.arrivalRate);

  // 定期打印进度
  const progressInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    console.log(`⏱️  ${elapsed.toFixed(1)}s - 已连接: ${connectedUsers}, 失败: ${failedUsers}, 消息: ${totalMessages}`);
  }, 10000);

  // 运行指定时间
  setTimeout(() => {
    clearInterval(createInterval);
    clearInterval(progressInterval);

    // 等待 5 秒后开始关闭连接
    setTimeout(() => {
      console.log('\n🔚 测试完成，正在总结游戏状态');
      printStats();

      // 关闭所有连接
      sockets.forEach(socket => socket.disconnect());
    }, 5000);
  }, CONFIG.testDuration * 1000);
}

process.on('SIGINT', () => {
  console.log('\n\n🛑 收到中断信号，正在总结游戏状态...');
  printStats();
  process.exit(0);
});

runLoadTest();