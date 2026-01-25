const { TestFramework } = require('../lib/test-framework.js');
require('dotenv').config();

const CONFIG = {
  wsTarget: process.env.WS_TARGET || 'ws://localhost:4000',
  httpTarget: process.env.HTTP_TARGET || 'http://localhost:4000',
  jwtSecret: process.env.JWT_SECRET,
  concurrentUsers: parseInt(process.env.PHASE3_CONCURRENT || '1000', 10),
  stages: [
    { rate: 100, duration: 300 },   // 100 msg/s, 5 分钟
    { rate: 200, duration: 300 },   // 200 msg/s, 5 分钟
    { rate: 400, duration: 300 },   // 400 msg/s, 5 分钟
    { rate: 800, duration: 300 },   // 800 msg/s, 5 分钟
  ],
};

async function runPhase3() {
  console.log('🚀 Phase 3: 中等吞吐逐步加速测试');
  console.log(`目标: ${CONFIG.wsTarget}`);
  console.log(`并发用户数: ${CONFIG.concurrentUsers}`);
  console.log(`阶段数: ${CONFIG.stages.length}`);
  CONFIG.stages.forEach((stage, i) => {
    console.log(`  阶段 ${i + 1}: ${stage.rate} msg/s, ${stage.duration} 秒`);
  });
  console.log('---\n');

  const framework = new TestFramework(CONFIG);
  framework.start();

  // 先建立所有连接
  console.log('📡 正在建立连接...');
  for (let i = 1; i <= CONFIG.concurrentUsers; i++) {
    framework.createUserConnection(i);
    if (i % 100 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // 等待所有连接建立
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const stats = framework.getConnectionStats();
      if (stats.currentActive >= CONFIG.concurrentUsers * 0.95) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 1000);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 60000);
  });

  console.log(`✅ 已建立 ${framework.getConnectionStats().currentActive} 个连接\n`);

  // 消息发送控制
  let currentStage = 0;
  let messageQueue = [];
  let isRunning = true;
  let queueFillerInterval = null;
  const MAX_QUEUE_SIZE = 10000; // 限制队列大小，防止内存溢出

  // 消息发送器（带速率限制）
  const messageSender = async (senderId) => {
    let lastSendTime = Date.now();
    const minInterval = 10; // 最小发送间隔 10ms
    
    while (isRunning) {
      if (messageQueue.length > 0) {
        const now = Date.now();
        const timeSinceLastSend = now - lastSendTime;
        
        // 速率限制：确保不会发送过快
        if (timeSinceLastSend >= minInterval) {
          const { userId, email } = messageQueue.shift();
          const answer = Math.random() < 0.5 ? 'A' : 'B';
          
          try {
            await framework.submitAnswer(userId, email, answer);
            lastSendTime = Date.now();
          } catch (error) {
            // 忽略单个消息的错误，继续发送
            console.error(`发送器 ${senderId} 错误:`, error.message);
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, minInterval - timeSinceLastSend));
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  };

  // 启动多个发送器（根据目标速率动态调整）
  let senderCount = 10;
  const senders = [];
  for (let i = 0; i < senderCount; i++) {
    senders.push(messageSender(i));
  }

  // 定期打印进度
  const progressInterval = setInterval(() => {
    try {
      const stats = framework.getConnectionStats();
      const msgStats = framework.getMessageStats();
      const elapsed = framework.getDuration() / 1000;
      
      console.log(
        `⏱️  ${elapsed.toFixed(1)}s - ` +
        `阶段: ${currentStage + 1}/${CONFIG.stages.length}, ` +
        `目标速率: ${CONFIG.stages[currentStage]?.rate || 0} msg/s, ` +
        `实际速率: ${msgStats.perSecond.toFixed(2)} msg/s, ` +
        `队列长度: ${messageQueue.length}, ` +
        `活跃连接: ${stats.currentActive}`
      );
      
      // 如果队列堆积过多，警告
      if (messageQueue.length > MAX_QUEUE_SIZE * 0.8) {
        console.warn(`⚠️  队列堆积警告: ${messageQueue.length}/${MAX_QUEUE_SIZE}`);
      }
    } catch (error) {
      console.error('进度打印错误:', error.message);
    }
  }, 10000);

  // 运行各个阶段
  for (let stageIndex = 0; stageIndex < CONFIG.stages.length; stageIndex++) {
    currentStage = stageIndex;
    const stage = CONFIG.stages[stageIndex];
    
    console.log(`\n📊 阶段 ${stageIndex + 1}: ${stage.rate} msg/s (${stage.duration} 秒)\n`);

    // 清空队列
    messageQueue = [];
    
    // 计算精确的发送速率
    const targetRate = stage.rate; // msg/s
    const checkInterval = 100; // 每 100ms 检查一次
    const messagesPerCheck = (targetRate * checkInterval) / 1000; // 每次检查应该发送的消息数
    
    let messagesSentThisStage = 0;
    const stageStartTime = Date.now();
    
    // 填充消息队列（改进的速率控制）
    queueFillerInterval = setInterval(() => {
      // 检查队列大小限制
      if (messageQueue.length >= MAX_QUEUE_SIZE) {
        return; // 队列已满，停止填充
      }
      
      // 计算应该发送多少消息
      const elapsed = (Date.now() - stageStartTime) / 1000;
      const expectedMessages = Math.floor(targetRate * elapsed);
      const messagesToAdd = Math.max(0, expectedMessages - messagesSentThisStage);
      
      // 限制单次添加数量，避免突发
      const maxAddPerCheck = Math.ceil(messagesPerCheck * 2);
      const actualAdd = Math.min(messagesToAdd, maxAddPerCheck, MAX_QUEUE_SIZE - messageQueue.length);
      
      // 随机选择用户发送
      const activeSockets = framework.sockets.filter(s => s.socket.connected);
      for (let i = 0; i < actualAdd && i < activeSockets.length; i++) {
        const randomIndex = Math.floor(Math.random() * activeSockets.length);
        const { userId, email } = activeSockets[randomIndex];
        messageQueue.push({ userId, email });
        messagesSentThisStage++;
      }
    }, checkInterval);

    // 运行指定时间
    await new Promise((resolve) => {
      setTimeout(() => {
        if (queueFillerInterval) {
          clearInterval(queueFillerInterval);
          queueFillerInterval = null;
        }
        resolve();
      }, stage.duration * 1000);
    });

    // 等待队列清空（最多等待 30 秒）
    const queueEmptyStart = Date.now();
    while (messageQueue.length > 0 && (Date.now() - queueEmptyStart) < 30000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (messageQueue.length > 0) {
        console.log(`⏳ 等待队列清空，剩余: ${messageQueue.length}`);
      }
    }
    
    if (messageQueue.length > 0) {
      console.warn(`⚠️  阶段 ${stageIndex + 1} 结束时队列仍有 ${messageQueue.length} 条消息未发送`);
      messageQueue = []; // 强制清空
    }
    
    // 打印阶段统计
    try {
      const stageReport = framework.generateReport(`phase3-stage-${stageIndex + 1}`);
      console.log(`\n阶段 ${stageIndex + 1} 统计:`);
      console.log(`  消息速率: ${stageReport.messages.perSecond.toFixed(2)} msg/s`);
      if (stageReport.messages.latency) {
        console.log(`  P99 延迟: ${stageReport.messages.latency.p99.toFixed(2)}ms`);
      }
      console.log('');
    } catch (error) {
      console.error(`生成阶段 ${stageIndex + 1} 报告失败:`, error.message);
    }
  }

  // 停止测试
  isRunning = false;
  if (queueFillerInterval) {
    clearInterval(queueFillerInterval);
  }
  clearInterval(progressInterval);
  
  // 等待所有发送器完成
  console.log('⏳ 等待所有消息发送完成...');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  framework.stop();

  // 生成报告
  const report = framework.generateReport('phase3-progressive-throughput');
  framework.printSummary(report);
  
  const reportPath = framework.saveReport(report);
  console.log(`📄 详细报告已保存到: ${reportPath}\n`);

  // 关闭所有连接
  console.log('🔚 正在关闭所有连接...');
  await framework.closeAllConnections();
  console.log('✅ 所有连接已关闭\n');

  return report;
}

// 如果直接运行此脚本
if (require.main === module) {
  runPhase3()
    .then(() => {
      console.log('✅ Phase 3 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Phase 3 测试失败:', error);
      process.exit(1);
    });
}

module.exports = { runPhase3 };
