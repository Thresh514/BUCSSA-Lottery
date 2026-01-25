# 压测工具使用指南

本目录包含完整的压测工具集，用于建立可复现的压测基线，精确定位系统瓶颈。

## 📋 目录结构

```
flood-test/
├── check-limits.js              # 环境硬上限检查脚本
├── run-all-phases.js            # 主控脚本（执行所有阶段）
├── analyze-results.js           # 结果分析脚本
├── config.json                  # 统一配置文件
├── lib/
│   ├── test-framework.js        # 统一压测框架
│   └── report-generator.js      # 报告生成器
└── phases/
    ├── phase1-connection-capacity.js      # Phase 1: 连接容量基线
    ├── phase2-low-frequency-messages.js   # Phase 2: 低频消息吞吐
    ├── phase3-progressive-throughput.js   # Phase 3: 中等吞吐逐步加速
    ├── phase4-settlement-spike.js        # Phase 4: 结算尖峰专项
    └── phase5-reconnect-storm.js         # Phase 5: 重连风暴专项
```

## 🚀 快速开始

### 1. 环境准备

确保已安装依赖：

```bash
cd flood-test
npm install
```

配置环境变量（创建 `.env` 文件）：

```env
WS_TARGET=ws://localhost:4000
HTTP_TARGET=http://localhost:4000
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://localhost:6379
```

### 2. 环境检查

在开始压测前，先检查系统硬上限：

```bash
node check-limits.js
```

此脚本会检查：
- 文件句柄数限制 (`ulimit -n`)
- 系统内存
- TCP 连接数限制
- Redis 连接和配置

### 3. 运行压测

#### 运行所有阶段（推荐）

```bash
node run-all-phases.js
```

这将按顺序执行所有 5 个压测阶段，并生成汇总报告。

#### 运行单个阶段

```bash
# Phase 1: 连接容量基线
node phases/phase1-connection-capacity.js

# Phase 2: 低频消息吞吐
node phases/phase2-low-frequency-messages.js

# Phase 3: 中等吞吐逐步加速
node phases/phase3-progressive-throughput.js

# Phase 4: 结算尖峰专项
node phases/phase4-settlement-spike.js

# Phase 5: 重连风暴专项
node phases/phase5-reconnect-storm.js
```

### 4. 分析结果

压测完成后，分析结果：

```bash
node analyze-results.js [results目录]
```

此脚本会：
- 识别瓶颈类型（CPU、Redis、网络、协议层）
- 生成瓶颈分析报告
- 提供优化建议

## 📊 压测阶段说明

### Phase 1: 连接容量基线测试

**目的**: 验证系统能否稳定支持目标并发连接数

**测试内容**:
- 平滑 ramp 到目标并发数（默认每秒 30 连接）
- 保持连接 10 分钟
- 监控连接成功率、断连率、event loop lag、内存增长

**关键指标**:
- 连接成功率 ≥ 99%
- 稳定期断连率极低
- event loop lag 不应持续飙升
- 内存不应线性增长

### Phase 2: 低频消息吞吐测试

**目的**: 验证 `submit_answer` 热路径的 Redis 往返放大效应

**测试内容**:
- 固定 1000 连接
- 每用户每 10-15 秒提交一次答案
- 持续 10 分钟

**关键指标**:
- `submit_answer` ack P99
- Redis ops/sec 是否陡增
- broadcast 延迟

### Phase 3: 中等吞吐逐步加速测试

**目的**: 找出系统吞吐拐点

**测试内容**:
- 固定 1000 连接
- 逐步提升消息速率：100 → 200 → 400 → 800 msg/s
- 每段持续 5 分钟

**关键指标**:
- ack P99 是否出现非线性上升
- event loop lag 是否出现持续性堆积
- Redis latency 是否出现尖峰
- 掉线/重连是否开始出现正反馈

### Phase 4: 结算尖峰专项测试

**目的**: 验证结算 O(N) 操作是否导致系统崩溃

**测试内容**:
- 1000 人进入同一 room
- 1-2 秒窗口内所有人提交答案
- 立即触发结算

**关键指标**:
- 结算耗时（开始到广播结果）
- 结算期间 Redis ops/sec 与 latency 的尖峰
- 结算期间 event loop lag
- 结算期间掉线/心跳超时比例

### Phase 5: 重连风暴专项测试

**目的**: 检验 join/getRoomState + 广播路径在压力下是否会形成正反馈

**测试内容**:
- 1000 在线稳定后
- 强制断开 30% 客户端
- 5 秒后同时重连并 join

**关键指标**:
- 重连成功率
- join/getRoomState 的 P99
- 系统是否进入"越掉越掉"的循环

## 📄 报告格式

每次压测会生成以下报告：

1. **JSON 报告** (`results/results-{phase}-{timestamp}.json`)
   - 完整的原始数据
   - 包含所有指标和统计数据

2. **文本报告** (`results/report-{phase}-{timestamp}.txt`)
   - 人类可读的摘要
   - 关键指标和统计信息

3. **汇总报告** (`results/summary-{timestamp}.json` 和 `.txt`)
   - 所有阶段的汇总
   - 总体统计和趋势

## 🔍 瓶颈识别

分析脚本会根据以下阈值识别瓶颈：

| 指标 | 警告阈值 | 严重阈值 |
|------|---------|---------|
| Event Loop Lag | 50ms | 100ms |
| CPU 使用率 | 70% | 90% |
| 内存使用 | 1GB | 2GB |
| Redis 延迟 | 5ms | 10ms |
| 连接成功率 | 95% | 90% |
| 消息延迟 | 100ms | 500ms |

## ⚙️ 配置说明

编辑 `config.json` 可以调整压测参数：

- `server`: 服务器地址和监控配置
- `phases`: 各阶段的并发数、持续时间、消息速率等
- `output`: 输出目录和报告选项

也可以通过环境变量覆盖配置：

```bash
PHASE1_CONCURRENT=2000 PHASE1_RAMP_RATE=50 node phases/phase1-connection-capacity.js
```

## 🎯 使用流程

1. **运行环境检查**
   ```bash
   node check-limits.js
   ```

2. **启动后端服务**
   确保服务端运行并监控端点可用：
   ```bash
   curl http://localhost:4000/api/metrics
   ```

3. **运行压测**
   ```bash
   node run-all-phases.js
   ```

4. **分析结果**
   ```bash
   node analyze-results.js
   ```

5. **根据瓶颈分析报告决定优化方向**
   - CPU 瓶颈 → 优化代码、水平扩展
   - Redis 瓶颈 → 优化 Redis 操作、使用管道/批量
   - 网络瓶颈 → 优化广播、减少消息大小
   - 连接瓶颈 → 检查系统硬上限、优化连接管理

## 📝 注意事项

1. **压测机和服务端分开**: 压测不要在同一台机器上跑，否则 CPU/网络/端口会互相污染结果

2. **Redis 位置**: Redis 最好与服务端同网段（低 RTT），并记录 Redis 是本机还是远端

3. **系统资源**: 确保压测机有足够的资源（CPU、内存、网络带宽）

4. **监控**: 压测期间观察服务端监控日志，关注 event loop lag 和内存增长

5. **可复现性**: 每次压测使用相同的配置和环境，确保结果可比较

## 🐛 故障排查

### 连接失败率高

- 检查 `ulimit -n` 是否足够
- 检查 Redis `maxclients` 配置
- 检查系统 TCP 连接数限制
- 检查网络和防火墙设置

### 消息延迟高

- 检查 Redis 延迟
- 检查 event loop lag
- 检查广播频率和消息大小
- 检查网络带宽

### 内存持续增长

- 检查是否有内存泄漏
- 检查连接是否正确关闭
- 检查 Redis 内存使用

## 📚 相关文档

- [后端监控模块文档](../backend/src/lib/metrics.ts)
- [压测框架文档](./lib/test-framework.js)
- [结果分析脚本文档](./analyze-results.js)
