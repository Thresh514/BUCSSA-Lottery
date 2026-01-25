const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

class TestFramework {
  constructor(config) {
    this.config = {
      wsTarget: config.wsTarget || 'ws://localhost:4000',
      httpTarget: config.httpTarget || 'http://localhost:4000',
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET,
      metricsEndpoint: config.metricsEndpoint || '/api/metrics',
      metricsInterval: config.metricsInterval || 1000, // 每秒拉取一次
      ...config,
    };
    
    this.stats = {
      connections: [],
      messages: [],
      errors: [],
      metrics: [],
      startTime: null,
      endTime: null,
    };
    
    this.sockets = [];
    this.metricsInterval = null;
    this.isRunning = false;
  }

  // 安全计算 min/max，避免大数组展开导致栈溢出
  static _safeMin(arr) {
    if (!arr || arr.length === 0) return NaN;
    let m = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < m) m = arr[i];
    }
    return m;
  }

  static _safeMax(arr) {
    if (!arr || arr.length === 0) return NaN;
    let m = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > m) m = arr[i];
    }
    return m;
  }

  // 生成认证 token
  generateAuthToken(email, userId) {
    if (!this.config.jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }
    return jwt.sign(
      { email, isAdmin: false, isDisplay: false, id: userId },
      this.config.jwtSecret,
      { expiresIn: '30d', issuer: 'lottery-frontend', audience: 'lottery-backend' }
    );
  }

  // 创建单个用户连接
  createUserConnection(userId, email = null) {
    const userEmail = email || `user_${userId}@gmail.com`;
    const connectStartTime = performance.now();
    
    const socket = io(this.config.wsTarget, {
      auth: { email: userEmail },
      timeout: 10000,
      reconnection: false, // 压测时禁用自动重连
    });

    const connectionRecord = {
      userId,
      email: userEmail,
      socketId: null,
      connectTime: null,
      connected: false,
      disconnected: false,
      disconnectTime: null,
      disconnectReason: null,
      timestamp: Date.now(),
    };

    socket.on('connect', () => {
      const connectTime = performance.now() - connectStartTime;
      connectionRecord.socketId = socket.id;
      connectionRecord.connectTime = connectTime;
      connectionRecord.connected = true;
      
      this.stats.connections.push({
        ...connectionRecord,
        type: 'connect',
        timestamp: Date.now(),
      });
    });

    socket.on('connect_error', (error) => {
      const connectTime = performance.now() - connectStartTime;
      connectionRecord.connectTime = connectTime;
      
      // 记录详细的错误信息
      const errorDetails = {
        userId,
        email: userEmail,
        type: 'connect_error',
        error: error.message,
        errorType: error.type || 'unknown',
        errorDescription: error.description || '',
        connectTime,
        timestamp: Date.now(),
      };
      
      this.stats.errors.push(errorDetails);
      
      // 对于前几个错误，打印详细信息以便调试
      if (this.stats.errors.filter(e => e.type === 'connect_error').length <= 3) {
        console.error(`❌ 连接错误示例 (用户 ${userId}):`, {
          message: error.message,
          type: error.type,
          description: error.description,
          data: error.data,
        });
      }
    });

    socket.on('disconnect', (reason) => {
      connectionRecord.disconnected = true;
      connectionRecord.disconnectTime = performance.now();
      connectionRecord.disconnectReason = reason;
      
      this.stats.connections.push({
        ...connectionRecord,
        type: 'disconnect',
        timestamp: Date.now(),
      });
    });

    // 记录所有收到的消息
    const messageEvents = [
      'game_state',
      'game_start',
      'new_question',
      'round_result',
      'eliminated',
      'winner',
      'tie',
      'answer_submitted',
      'answer_error',
      'player_count_update',
    ];

    messageEvents.forEach((event) => {
      socket.on(event, (data) => {
        this.stats.messages.push({
          userId,
          email: userEmail,
          event,
          timestamp: Date.now(),
          latency: performance.now() - connectStartTime,
        });
      });
    });

    this.sockets.push({ socket, userId, email: userEmail, connectionRecord });
    return { socket, userId, email: userEmail, connectionRecord };
  }

  // 提交答案（通过 HTTP API）
  async submitAnswer(userId, email, answer) {
    const token = this.generateAuthToken(email, userId);
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      try {
        const url = new URL(`${this.config.httpTarget}/api/submit-answer/`);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const postData = JSON.stringify({ answer });
        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(postData),
          },
        };

        const req = httpModule.request(options, (res) => {
          const latency = performance.now() - startTime;
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              this.stats.messages.push({
                userId,
                email,
                event: 'submit_answer_success',
                timestamp: Date.now(),
                latency,
              });
              resolve({ success: true, latency });
            } else {
              this.stats.errors.push({
                userId,
                email,
                type: 'submit_answer_error',
                error: `${res.statusCode} ${data}`,
                latency,
                timestamp: Date.now(),
              });
              resolve({ success: false, latency, error: data });
            }
          });
        });

        req.on('error', (error) => {
          const latency = performance.now() - startTime;
          this.stats.errors.push({
            userId,
            email,
            type: 'submit_answer_error',
            error: error.message,
            latency,
            timestamp: Date.now(),
          });
          resolve({ success: false, latency, error: error.message });
        });

        req.setTimeout(10000, () => {
          req.destroy();
          const latency = performance.now() - startTime;
          this.stats.errors.push({
            userId,
            email,
            type: 'submit_answer_error',
            error: 'timeout',
            latency,
            timestamp: Date.now(),
          });
          resolve({ success: false, latency, error: 'timeout' });
        });

        req.write(postData);
        req.end();
      } catch (error) {
        const latency = performance.now() - startTime;
        this.stats.errors.push({
          userId,
          email,
          type: 'submit_answer_error',
          error: error.message,
          latency,
          timestamp: Date.now(),
        });
        resolve({ success: false, latency, error: error.message });
      }
    });
  }

  // 拉取服务端指标
  async fetchMetrics() {
    return new Promise((resolve) => {
      const url = new URL(this.config.metricsEndpoint, this.config.httpTarget);
      
      http.get(url.toString(), (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const metrics = JSON.parse(data);
            this.stats.metrics.push({
              ...metrics,
              timestamp: Date.now(),
            });
            resolve(metrics);
          } catch (error) {
            resolve(null);
          }
        });
      }).on('error', () => {
        resolve(null);
      });
    });
  }

  // 开始监控指标
  startMetricsCollection() {
    if (this.metricsInterval) return;
    
    this.metricsInterval = setInterval(async () => {
      await this.fetchMetrics();
    }, this.config.metricsInterval);
  }

  // 停止监控指标
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  // 获取连接统计
  getConnectionStats() {
    const connected = this.stats.connections.filter(c => c.type === 'connect' && c.connected);
    const disconnected = this.stats.connections.filter(c => c.type === 'disconnect');
    const failed = this.stats.errors.filter(e => e.type === 'connect_error');
    
    const connectTimes = connected.map(c => c.connectTime).filter(t => t !== null);
    
    const stats = {
      totalAttempts: connected.length + failed.length,
      successful: connected.length,
      failed: failed.length,
      disconnected: disconnected.length,
      successRate: connected.length / (connected.length + failed.length) * 100,
      currentActive: this.sockets.filter(s => s.socket.connected).length,
    };

    if (connectTimes.length > 0) {
      const sorted = [...connectTimes].sort((a, b) => a - b);
      stats.connectTime = {
        min: TestFramework._safeMin(connectTimes),
        max: TestFramework._safeMax(connectTimes),
        avg: connectTimes.reduce((a, b) => a + b, 0) / connectTimes.length,
        p50: this.percentile(sorted, 50),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
      };
    }

    return stats;
  }

  // 获取消息统计
  getMessageStats() {
    const messages = this.stats.messages;
    const duration = this.getDuration() / 1000; // 秒
    
    const byEvent = {};
    messages.forEach((msg) => {
      byEvent[msg.event] = (byEvent[msg.event] || 0) + 1;
    });

    const latencies = messages.map(m => m.latency).filter(l => l !== undefined);
    let latencyStats = null;
    if (latencies.length > 0) {
      const sorted = [...latencies].sort((a, b) => a - b);
      latencyStats = {
        min: TestFramework._safeMin(latencies),
        max: TestFramework._safeMax(latencies),
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p50: this.percentile(sorted, 50),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
      };
    }

    return {
      total: messages.length,
      perSecond: duration > 0 ? messages.length / duration : 0,
      byEvent,
      latency: latencyStats,
    };
  }

  // 获取错误统计
  getErrorStats() {
    const errors = this.stats.errors;
    const byType = {};
    errors.forEach((err) => {
      byType[err.type] = (byType[err.type] || 0) + 1;
    });

    return {
      total: errors.length,
      byType,
    };
  }

  // 获取指标统计
  getMetricsStats() {
    if (this.stats.metrics.length === 0) return null;

    const metrics = this.stats.metrics;
    
    // 提取关键指标
    const eventLoopLags = metrics.map(m => m.eventLoopLag?.p99 || 0).filter(l => l > 0);
    const cpuUsages = metrics.map(m => m.cpu?.usage || 0).filter(u => u > 0);
    const memoryRSS = metrics.map(m => m.memory?.rss || 0).filter(m => m > 0);
    const redisOps = metrics.map(m => m.redis?.opsPerSecond || 0).filter(o => o > 0);
    const redisLatency = metrics.map(m => m.redis?.latency || 0).filter(l => l > 0);
    const connections = metrics.map(m => m.socketIO?.totalConnections || 0).filter(c => c > 0);

    const stats = {};
    
    if (eventLoopLags.length > 0) {
      const sortedLags = [...eventLoopLags].sort((a, b) => a - b);
      stats.eventLoopLag = {
        max: TestFramework._safeMax(eventLoopLags),
        avg: eventLoopLags.reduce((a, b) => a + b, 0) / eventLoopLags.length,
        p95: this.percentile(sortedLags, 95),
        p99: this.percentile(sortedLags, 99),
      };
    }

    if (cpuUsages.length > 0) {
      stats.cpu = {
        max: TestFramework._safeMax(cpuUsages),
        avg: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
      };
    }

    if (memoryRSS.length > 0) {
      const maxRSS = TestFramework._safeMax(memoryRSS);
      const avgRSS = memoryRSS.reduce((a, b) => a + b, 0) / memoryRSS.length;
      stats.memory = {
        max: maxRSS,
        avg: avgRSS,
        maxMB: (maxRSS / 1024 / 1024).toFixed(2),
        avgMB: (avgRSS / 1024 / 1024).toFixed(2),
      };
    }

    if (redisOps.length > 0) {
      stats.redis = {
        maxOpsPerSecond: TestFramework._safeMax(redisOps),
        avgOpsPerSecond: redisOps.reduce((a, b) => a + b, 0) / redisOps.length,
        maxLatency: redisLatency.length > 0 ? TestFramework._safeMax(redisLatency) : null,
        avgLatency: redisLatency.length > 0 ? redisLatency.reduce((a, b) => a + b, 0) / redisLatency.length : null,
      };
    }

    if (connections.length > 0) {
      stats.connections = {
        max: TestFramework._safeMax(connections),
        avg: connections.reduce((a, b) => a + b, 0) / connections.length,
      };
    }

    return stats;
  }

  // 计算百分位数
  percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // 获取测试持续时间
  getDuration() {
    if (!this.stats.startTime) return 0;
    const endTime = this.stats.endTime || performance.now();
    return endTime - this.stats.startTime;
  }

  // 开始测试
  start() {
    this.stats.startTime = performance.now();
    this.isRunning = true;
    this.startMetricsCollection();
  }

  // 结束测试
  stop() {
    this.stats.endTime = performance.now();
    this.isRunning = false;
    this.stopMetricsCollection();
  }

  // 关闭所有连接
  async closeAllConnections() {
    const promises = this.sockets.map(({ socket }) => {
      return new Promise((resolve) => {
        if (socket.connected) {
          socket.disconnect();
        }
        setTimeout(resolve, 100);
      });
    });
    await Promise.all(promises);
    this.sockets = [];
  }

  // 生成报告
  generateReport(phaseName) {
    const connectionStats = this.getConnectionStats();
    const messageStats = this.getMessageStats();
    const errorStats = this.getErrorStats();
    const metricsStats = this.getMetricsStats();

    return {
      phase: phaseName,
      timestamp: new Date().toISOString(),
      duration: {
        seconds: this.getDuration() / 1000,
        milliseconds: this.getDuration(),
      },
      connections: connectionStats,
      messages: messageStats,
      errors: errorStats,
      metrics: metricsStats,
      raw: {
        connections: this.stats.connections.length,
        messages: this.stats.messages.length,
        errors: this.stats.errors.length,
        metricsSamples: this.stats.metrics.length,
      },
    };
  }

  // 保存报告到文件
  saveReport(report, outputDir = 'results') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `results-${report.phase}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    return filepath;
  }

  // 打印摘要
  printSummary(report) {
    console.log('\n--- 📊 测试摘要 ---\n');
    console.log(`阶段: ${report.phase}`);
    console.log(`持续时间: ${report.duration.seconds.toFixed(2)} 秒`);
    console.log(`\n连接统计:`);
    console.log(`  总尝试: ${report.connections.totalAttempts}`);
    console.log(`  成功: ${report.connections.successful}`);
    console.log(`  失败: ${report.connections.failed}`);
    console.log(`  成功率: ${report.connections.successRate.toFixed(2)}%`);
    console.log(`  当前活跃: ${report.connections.currentActive}`);
    
    if (report.connections.connectTime) {
      console.log(`  连接时间:`);
      console.log(`    P50: ${report.connections.connectTime.p50.toFixed(2)}ms`);
      console.log(`    P95: ${report.connections.connectTime.p95.toFixed(2)}ms`);
      console.log(`    P99: ${report.connections.connectTime.p99.toFixed(2)}ms`);
    }

    console.log(`\n消息统计:`);
    console.log(`  总数: ${report.messages.total}`);
    console.log(`  每秒: ${report.messages.perSecond.toFixed(2)} msg/s`);
    
    if (report.messages.latency) {
      console.log(`  延迟:`);
      console.log(`    P50: ${report.messages.latency.p50.toFixed(2)}ms`);
      console.log(`    P95: ${report.messages.latency.p95.toFixed(2)}ms`);
      console.log(`    P99: ${report.messages.latency.p99.toFixed(2)}ms`);
    }

    if (report.errors.total > 0) {
      console.log(`\n错误统计:`);
      console.log(`  总数: ${report.errors.total}`);
      Object.entries(report.errors.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }

    if (report.metrics) {
      console.log(`\n服务端指标:`);
      if (report.metrics.eventLoopLag) {
        console.log(`  Event Loop Lag:`);
        console.log(`    P99: ${report.metrics.eventLoopLag.p99.toFixed(2)}ms`);
        console.log(`    最大: ${report.metrics.eventLoopLag.max.toFixed(2)}ms`);
      }
      if (report.metrics.cpu) {
        console.log(`  CPU 使用率: ${report.metrics.cpu.avg.toFixed(1)}% (最大: ${report.metrics.cpu.max.toFixed(1)}%)`);
      }
      if (report.metrics.memory) {
        console.log(`  内存: ${report.metrics.memory.avgMB}MB (最大: ${report.metrics.memory.maxMB}MB)`);
      }
      if (report.metrics.redis) {
        console.log(`  Redis:`);
        console.log(`    Ops/s: ${report.metrics.redis.avgOpsPerSecond.toFixed(0)} (最大: ${report.metrics.redis.maxOpsPerSecond})`);
        if (report.metrics.redis.avgLatency) {
          console.log(`    延迟: ${report.metrics.redis.avgLatency.toFixed(2)}ms (最大: ${report.metrics.redis.maxLatency.toFixed(2)}ms)`);
        }
      }
    }

    console.log('');
  }

  // 重置统计
  reset() {
    this.stats = {
      connections: [],
      messages: [],
      errors: [],
      metrics: [],
      startTime: null,
      endTime: null,
    };
    this.sockets = [];
  }
}

module.exports = { TestFramework };
