import { performance, PerformanceObserver } from 'perf_hooks';
import os from 'os';
import { redis } from './redis.js';
import { getSocketIO } from './socket.js';

interface EventLoopLag {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  max: number;
}

interface MemoryMetrics {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

interface CPUMetrics {
  usage: number;
  user: number;
  system: number;
}

interface SocketIOMetrics {
  totalConnections: number;
  connectionsByRoom: Record<string, number>;
  eventsPerSecond: {
    join: number;
    submit_answer: number;
    broadcast: number;
  };
}

interface RedisMetrics {
  opsPerSecond: number;
  connectedClients: number;
  usedMemory: number;
  latency?: number;
}

interface SystemMetrics {
  eventLoopLag: EventLoopLag;
  memory: MemoryMetrics;
  cpu: CPUMetrics;
  socketIO: SocketIOMetrics;
  redis: RedisMetrics;
  timestamp: string;
}

class MetricsCollector {
  private eventLoopLags: number[] = [];
  private maxLagHistory = 1000;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCpuTime = Date.now();
  private eventCounts = {
    join: 0,
    submit_answer: 0,
    broadcast: 0,
  };
  private lastEventReset = Date.now();
  private logInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startEventLoopMonitoring();
    this.startPeriodicLogging();
  }

  private startEventLoopMonitoring() {
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.entryType === 'measure' && entry.name === 'event-loop-lag') {
          const lag = entry.duration;
          this.eventLoopLags.push(lag);
          if (this.eventLoopLags.length > this.maxLagHistory) {
            this.eventLoopLags.shift();
          }
        }
      }
    });
    obs.observe({ entryTypes: ['measure'] });

    // 每 100ms 测量一次 event loop lag
    setInterval(() => {
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        performance.mark('event-loop-start');
        performance.mark('event-loop-end');
        performance.measure('event-loop-lag', 'event-loop-start', 'event-loop-end');
        // 手动记录 lag 值
        this.eventLoopLags.push(lag);
        if (this.eventLoopLags.length > this.maxLagHistory) {
          this.eventLoopLags.shift();
        }
      });
    }, 100);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private getEventLoopLag(): EventLoopLag {
    if (this.eventLoopLags.length === 0) {
      return { p50: 0, p95: 0, p99: 0, mean: 0, max: 0 };
    }

    const sorted = [...this.eventLoopLags].sort((a, b) => a - b);
    return {
      p50: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      max: Math.max(...sorted),
    };
  }

  private getMemoryMetrics(): MemoryMetrics {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
    };
  }

  private getCPUMetrics(): CPUMetrics {
    const cpus = os.cpus();
    const now = Date.now();
    const timeDiff = now - this.lastCpuTime;

    if (this.lastCpuUsage === null || timeDiff < 100) {
      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = now;
      return { usage: 0, user: 0, system: 0 };
    }

    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    const totalCpuTime = currentUsage.user + currentUsage.system;
    const totalTime = timeDiff * 1000; // 转换为微秒
    const usagePercent = (totalCpuTime / totalTime) * 100;

    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = now;

    return {
      usage: Math.min(100, usagePercent),
      user: currentUsage.user / 1000, // 转换为毫秒
      system: currentUsage.system / 1000,
    };
  }

  private async getSocketIOMetrics(): Promise<SocketIOMetrics> {
    const io = getSocketIO();
    if (!io) {
      return {
        totalConnections: 0,
        connectionsByRoom: {},
        eventsPerSecond: { join: 0, submit_answer: 0, broadcast: 0 },
      };
    }

    const sockets = await io.fetchSockets();
    const roomId = process.env.DEFAULT_ROOM_ID || 'default';
    const room = io.sockets.adapter.rooms.get(roomId);
    const roomSize = room ? room.size : 0;

    // 计算每秒事件数
    const now = Date.now();
    const timeDiff = (now - this.lastEventReset) / 1000;
    const eventsPerSecond = {
      join: this.eventCounts.join / timeDiff,
      submit_answer: this.eventCounts.submit_answer / timeDiff,
      broadcast: this.eventCounts.broadcast / timeDiff,
    };

    // 重置计数器（每秒重置一次）
    if (timeDiff >= 1) {
      this.eventCounts = { join: 0, submit_answer: 0, broadcast: 0 };
      this.lastEventReset = now;
    }

    return {
      totalConnections: sockets.length,
      connectionsByRoom: {
        [roomId]: roomSize,
      },
      eventsPerSecond,
    };
  }

  private async getRedisMetrics(): Promise<RedisMetrics> {
    try {
      const info = await redis.info('stats');
      const memoryInfo = await redis.info('memory');
      
      // 解析 Redis INFO 输出
      const opsMatch = info.match(/instantaneous_ops_per_sec:(\d+)/);
      const clientsMatch = info.match(/connected_clients:(\d+)/);
      const memoryMatch = memoryInfo.match(/used_memory:(\d+)/);

      // 测量 Redis 延迟
      const start = performance.now();
      await redis.ping();
      const latency = performance.now() - start;

      return {
        opsPerSecond: opsMatch ? parseInt(opsMatch[1], 10) : 0,
        connectedClients: clientsMatch ? parseInt(clientsMatch[1], 10) : 0,
        usedMemory: memoryMatch ? parseInt(memoryMatch[1], 10) : 0,
        latency,
      };
    } catch (error) {
      console.error('Failed to get Redis metrics:', error);
      return {
        opsPerSecond: 0,
        connectedClients: 0,
        usedMemory: 0,
      };
    }
  }

  // 记录事件（供外部调用）
  recordEvent(eventType: 'join' | 'submit_answer' | 'broadcast') {
    this.eventCounts[eventType]++;
  }

  // 获取所有指标
  async getAllMetrics(): Promise<SystemMetrics> {
    const [socketIO, redis] = await Promise.all([
      this.getSocketIOMetrics(),
      this.getRedisMetrics(),
    ]);

    return {
      eventLoopLag: this.getEventLoopLag(),
      memory: this.getMemoryMetrics(),
      cpu: this.getCPUMetrics(),
      socketIO,
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  // 启动定期日志输出
  private startPeriodicLogging() {
    this.logInterval = setInterval(async () => {
      const metrics = await this.getAllMetrics();
      this.logMetrics(metrics);
    }, 1000); // 每秒输出一次
  }

  private logMetrics(metrics: SystemMetrics) {
    const memMB = (metrics.memory.rss / 1024 / 1024).toFixed(2);
    const heapMB = (metrics.memory.heapUsed / 1024 / 1024).toFixed(2);
    
    console.log(
      `[METRICS] ` +
      `Conn:${metrics.socketIO.totalConnections} ` +
      `CPU:${metrics.cpu.usage.toFixed(1)}% ` +
      `Mem:${memMB}MB ` +
      `Heap:${heapMB}MB ` +
      `Lag:${metrics.eventLoopLag.p99.toFixed(2)}ms ` +
      `Redis:${metrics.redis.opsPerSecond}ops/s ` +
      `Lat:${metrics.redis.latency?.toFixed(2) || 'N/A'}ms`
    );
  }

  // 停止监控
  stop() {
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
  }
}

// 单例
let metricsCollectorInstance: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!metricsCollectorInstance) {
    metricsCollectorInstance = new MetricsCollector();
  }
  return metricsCollectorInstance;
}

export type { SystemMetrics, EventLoopLag, MemoryMetrics, CPUMetrics, SocketIOMetrics, RedisMetrics };
