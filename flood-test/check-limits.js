const { execSync } = require('child_process');
const { createClient } = require('redis');
const { performance } = require('perf_hooks');
const os = require('os');
require('dotenv').config();

const CONFIG = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};

const results = {
  checks: [],
  warnings: [],
  errors: [],
};

function check(name, checkFn) {
  try {
    const result = checkFn();
    results.checks.push({ name, ...result, status: 'ok' });
    if (result.warning) {
      results.warnings.push({ name, message: result.warning });
    }
  } catch (error) {
    results.checks.push({ name, status: 'error', error: error.message });
    results.errors.push({ name, error: error.message });
  }
}

// 检查文件句柄数限制
check('文件句柄数 (ulimit -n)', () => {
  try {
    const limit = parseInt(execSync('ulimit -n', { encoding: 'utf8' }).trim(), 10);
    const recommended = 65535;
    
    if (limit < 10000) {
      return {
        value: limit,
        recommended: recommended,
        warning: `文件句柄数过低 (${limit})，建议至少 ${recommended}。高并发连接可能需要更多句柄。`,
      };
    }
    
    return {
      value: limit,
      recommended: recommended,
      message: limit >= recommended ? '文件句柄数充足' : '文件句柄数可接受但建议提升',
    };
  } catch (error) {
    // 在某些系统上可能无法获取
    return {
      value: 'unknown',
      warning: '无法获取文件句柄数限制，请手动检查 ulimit -n',
    };
  }
});

// 检查系统内存
check('系统可用内存', () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usedPercent = (usedMem / totalMem) * 100;
  
  const totalGB = (totalMem / 1024 / 1024 / 1024).toFixed(2);
  const freeGB = (freeMem / 1024 / 1024 / 1024).toFixed(2);
  const usedGB = (usedMem / 1024 / 1024 / 1024).toFixed(2);
  
  if (freeMem < 512 * 1024 * 1024) { // 小于 512MB
    return {
      value: `${freeGB}GB / ${totalGB}GB`,
      usedPercent: usedPercent.toFixed(2),
      warning: `可用内存不足 (${freeGB}GB)，可能影响性能`,
    };
  }
  
  return {
    value: `${freeGB}GB / ${totalGB}GB`,
    usedPercent: usedPercent.toFixed(2),
    message: '内存充足',
  };
});

// 检查 TCP 连接数限制
check('TCP 连接数限制', () => {
  try {
    // 尝试获取系统 TCP 连接限制
    const platform = os.platform();
    let maxConnections = 'unknown';
    
    if (platform === 'linux') {
      try {
        const tcpMax = execSync('cat /proc/sys/net/core/somaxconn 2>/dev/null || echo 4096', { encoding: 'utf8' }).trim();
        maxConnections = parseInt(tcpMax, 10);
      } catch (e) {
        // 忽略错误
      }
    } else if (platform === 'darwin') {
      try {
        const kernMaxFiles = execSync('sysctl -n kern.maxfiles 2>/dev/null || echo 10240', { encoding: 'utf8' }).trim();
        maxConnections = parseInt(kernMaxFiles, 10);
      } catch (e) {
        // 忽略错误
      }
    }
    
    return {
      value: maxConnections,
      platform: platform,
      message: typeof maxConnections === 'number' && maxConnections < 10000 
        ? `TCP 连接限制可能较低 (${maxConnections})，建议检查系统配置`
        : 'TCP 连接限制检查完成',
    };
  } catch (error) {
    return {
      value: 'unknown',
      warning: '无法获取 TCP 连接限制',
    };
  }
});

// 检查 Redis 连接和配置
async function checkRedis() {
  return new Promise((resolve) => {
    const redis = createClient({ url: CONFIG.redisUrl });
    let connected = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        results.checks.push({
          name: 'Redis 连接',
          status: 'error',
          error: '连接超时',
        });
        results.errors.push({ name: 'Redis 连接', error: '连接超时' });
        redis.quit().catch(() => {});
        resolve();
      }
    }, 5000);
    
    redis.connect()
      .then(async () => {
        connected = true;
        clearTimeout(timeout);
        
        try {
          // 检查 Redis 延迟
          const start = performance.now();
          await redis.ping();
          const latency = performance.now() - start;
          
          // 获取 Redis 配置
          const info = await redis.info('server');
          const clientsInfo = await redis.info('clients');
          const memoryInfo = await redis.info('memory');
          
          const maxClientsMatch = clientsInfo.match(/maxclients:(\d+)/);
          const maxClients = maxClientsMatch ? parseInt(maxClientsMatch[1], 10) : null;
          
          const usedMemoryMatch = memoryInfo.match(/used_memory:(\d+)/);
          const usedMemory = usedMemoryMatch ? parseInt(usedMemoryMatch[1], 10) : null;
          const usedMemoryMB = usedMemory ? (usedMemory / 1024 / 1024).toFixed(2) : 'unknown';
          
          results.checks.push({
            name: 'Redis 连接',
            status: 'ok',
            latency: `${latency.toFixed(2)}ms`,
            maxClients: maxClients,
            usedMemory: `${usedMemoryMB}MB`,
          });
          
          if (maxClients && maxClients < 10000) {
            results.warnings.push({
              name: 'Redis maxclients',
              message: `Redis maxclients 配置较低 (${maxClients})，建议至少 10000 以支持高并发`,
            });
          }
          
          if (latency > 10) {
            results.warnings.push({
              name: 'Redis 延迟',
              message: `Redis 延迟较高 (${latency.toFixed(2)}ms)，可能影响性能。建议检查网络或使用本地 Redis`,
            });
          }
          
          await redis.quit();
          resolve();
        } catch (error) {
          results.checks.push({
            name: 'Redis 配置检查',
            status: 'error',
            error: error.message,
          });
          await redis.quit().catch(() => {});
          resolve();
        }
      })
      .catch((error) => {
        connected = true;
        clearTimeout(timeout);
        results.checks.push({
          name: 'Redis 连接',
          status: 'error',
          error: error.message,
        });
        results.errors.push({ name: 'Redis 连接', error: error.message });
        resolve();
      });
  });
}

// 检查 CPU 核心数
check('CPU 核心数', () => {
  const cpus = os.cpus();
  const cores = cpus.length;
  
  return {
    value: cores,
    model: cpus[0]?.model || 'unknown',
    message: cores >= 4 ? 'CPU 核心数充足' : `CPU 核心数较少 (${cores})，可能影响高并发性能`,
  };
});

// 主函数
async function runChecks() {
  console.log('🔍 开始环境硬上限检查...\n');
  console.log(`Redis URL: ${CONFIG.redisUrl}\n`);
  
  await checkRedis();
  
  console.log('\n--- 检查结果 ---\n');
  
  results.checks.forEach((check) => {
    const status = check.status === 'ok' ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    if (check.value !== undefined) {
      console.log(`   值: ${check.value}`);
    }
    if (check.message) {
      console.log(`   ${check.message}`);
    }
    if (check.warning) {
      console.log(`   ⚠️  ${check.warning}`);
    }
    if (check.error) {
      console.log(`   ❌ 错误: ${check.error}`);
    }
    if (check.latency) {
      console.log(`   延迟: ${check.latency}`);
    }
    if (check.maxClients) {
      console.log(`   maxclients: ${check.maxClients}`);
    }
    if (check.usedMemory) {
      console.log(`   已用内存: ${check.usedMemory}`);
    }
    console.log('');
  });
  
  if (results.warnings.length > 0) {
    console.log('\n--- ⚠️  警告 ---\n');
    results.warnings.forEach((warning) => {
      console.log(`⚠️  ${warning.name}: ${warning.message}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n--- ❌ 错误 ---\n');
    results.errors.forEach((error) => {
      console.log(`❌ ${error.name}: ${error.error}`);
    });
  }
  
  console.log('\n--- 总结 ---\n');
  const errorCount = results.errors.length;
  const warningCount = results.warnings.length;
  
  if (errorCount === 0 && warningCount === 0) {
    console.log('✅ 所有检查通过，环境配置良好！');
  } else if (errorCount === 0) {
    console.log(`⚠️  有 ${warningCount} 个警告，建议修复以优化性能`);
  } else {
    console.log(`❌ 有 ${errorCount} 个错误和 ${warningCount} 个警告，请先修复错误`);
  }
  
  // 保存结果到文件
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFile = `check-limits-${timestamp}.json`;
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`\n📄 详细结果已保存到: ${resultFile}`);
}

runChecks().catch(console.error);
