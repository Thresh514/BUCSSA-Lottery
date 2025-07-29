const io = require('socket.io-client');

// 压测配置
const CONFIG = {
  serverUrl: 'http://localhost:3000',
  numClients: 100, // 并发客户端数量
  testDuration: 60000, // 测试持续时间 (毫秒)
};

// 模拟用户类
class SimulatedUser {
  constructor(id) {
    this.id = id;
    this.socket = null;
    this.connected = false;
    this.stats = {
      connectTime: null,
      questionsReceived: 0,
      answersSubmitted: 0,
      eliminated: false,
    };
  }

  // 连接到服务器
  connect(email) {
    return new Promise((resolve, reject) => {
      this.socket = io(CONFIG.serverUrl, {
        auth: { email },
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.stats.connectTime = Date.now();
        console.log(`用户 ${this.id} (${email}) 已连接`);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error(`用户 ${this.id} 连接失败:`, error.message);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        console.log(`用户 ${this.id} 断开连接`);
      });

      // 监听游戏事件
      this.socket.on('new_question', (data) => {
        this.stats.questionsReceived++;
        this.answerQuestion(data);
      });

      this.socket.on('eliminated', (data) => {
        this.stats.eliminated = true;
        console.log(`用户 ${this.id} 被淘汰: ${data.message}`);
      });

      this.socket.on('game_ended', (data) => {
        console.log(`用户 ${this.id} 游戏结束: ${data.message}`);
      });

      this.socket.on('round_result', (data) => {
        console.log(`用户 ${this.id} 轮次结果: 少数派${data.minorityOption}, 淘汰${data.eliminatedCount}人`);
      });
    });
  }

  // 自动答题 (随机选择A或B)
  answerQuestion(questionData) {
    if (this.stats.eliminated) return;

    const options = ['A', 'B'];
    const randomOption = options[Math.floor(Math.random() * options.length)];
    
    // 模拟思考时间 (1-5秒)
    const thinkingTime = Math.random() * 4000 + 1000;
    
    setTimeout(async () => {
      if (this.connected && !this.stats.eliminated) {
        try {
          // 使用HTTP API提交答案
          const response = await fetch(`${CONFIG.serverUrl}/api/submit-answer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ answer: randomOption }),
          });

          if (response.ok) {
            this.stats.answersSubmitted++;
            console.log(`用户 ${this.id} 提交答案: ${randomOption}`);
          } else {
            const error = await response.json();
            console.log(`用户 ${this.id} 提交答案失败: ${error.error}`);
          }
        } catch (error) {
          console.log(`用户 ${this.id} 提交答案网络错误: ${error.message}`);
        }
      }
    }, thinkingTime);
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // 获取统计信息
  getStats() {
    return {
      id: this.id,
      connected: this.connected,
      ...this.stats,
    };
  }
}

// 主压测函数
async function runLoadTest() {
  console.log(`开始少数派游戏压测: ${CONFIG.numClients} 个并发用户`);
  console.log(`测试持续时间: ${CONFIG.testDuration / 1000} 秒`);
  console.log('=' * 50);

  const users = [];
  const startTime = Date.now();

  // 创建模拟用户
  for (let i = 1; i <= CONFIG.numClients; i++) {
    const user = new SimulatedUser(i);
    users.push(user);
  }

  // 批量连接用户 (避免同时连接过多)
  const batchSize = 10;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (user) => {
        try {
          // 使用模拟邮箱
          const mockEmail = `user${user.id}@bu.edu`;
          await user.connect(mockEmail);
        } catch (error) {
          console.error(`用户 ${user.id} 连接失败`);
        }
      })
    );

    // 批次间隔
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`所有用户连接完成，已连接: ${users.filter(u => u.connected).length}/${users.length}`);

  // 运行测试
  await new Promise(resolve => setTimeout(resolve, CONFIG.testDuration));

  // 收集统计信息
  const stats = users.map(user => user.getStats());
  const connectedUsers = stats.filter(s => s.connected);
  const eliminatedUsers = stats.filter(s => s.eliminated);

  console.log('\n' + '=' * 50);
  console.log('少数派游戏压测结果统计:');
  console.log(`总用户数: ${users.length}`);
  console.log(`成功连接: ${connectedUsers.length}`);
  console.log(`连接成功率: ${(connectedUsers.length / users.length * 100).toFixed(2)}%`);
  console.log(`被淘汰用户: ${eliminatedUsers.length}`);
  console.log(`淘汰率: ${(eliminatedUsers.length / connectedUsers.length * 100).toFixed(2)}%`);

  const totalQuestions = stats.reduce((sum, s) => sum + s.questionsReceived, 0);
  const totalAnswers = stats.reduce((sum, s) => sum + s.answersSubmitted, 0);
  console.log(`总接收题目数: ${totalQuestions}`);
  console.log(`总提交答案数: ${totalAnswers}`);
  console.log(`答题率: ${(totalAnswers / totalQuestions * 100).toFixed(2)}%`);

  const testDuration = Date.now() - startTime;
  console.log(`实际测试时长: ${(testDuration / 1000).toFixed(2)} 秒`);

  // 断开所有连接
  users.forEach(user => user.disconnect());
  
  console.log('\n少数派游戏压测完成!');
  process.exit(0);
}

// 运行压测
if (require.main === module) {
  runLoadTest().catch(console.error);
}

module.exports = { SimulatedUser, runLoadTest }; 