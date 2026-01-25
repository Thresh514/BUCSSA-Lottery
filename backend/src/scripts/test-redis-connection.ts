import { createClient } from 'redis';
import 'dotenv/config';

async function testRedisConnection() {
  console.log('🔍 测试 Redis 连接...\n');

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(`Redis URL: ${redisUrl}\n`);

  // 解析 URL 以显示详细信息
  try {
    const url = new URL(redisUrl);
    console.log('连接信息:');
    console.log(`  协议: ${url.protocol}`);
    console.log(`  主机: ${url.hostname}`);
    console.log(`  端口: ${url.port || '6379 (默认)'}`);
    console.log(`  密码: ${url.password ? '***已设置***' : '未设置'}`);
    console.log(`  数据库: ${url.pathname || '/0 (默认)'}\n`);
  } catch (error) {
    console.error('❌ URL 格式错误:', error);
    process.exit(1);
  }

  const redis = createClient({ url: redisUrl });

  // 设置错误处理
  redis.on('error', (err) => {
    console.error('❌ Redis 错误:', err.message);
    
    if (err.message.includes('password') || err.message.includes('AUTH')) {
      console.error('\n💡 密码认证失败！');
      console.error('   可能的原因:');
      console.error('   1. Redis 设置了密码，但 REDIS_URL 中没有提供密码');
      console.error('   2. REDIS_URL 中的密码不正确');
      console.error('\n   解决方案:');
      console.error('   如果 Redis 有密码，使用格式: redis://:yourpassword@localhost:6379');
      console.error('   如果 Redis 没有密码，使用格式: redis://localhost:6379');
      console.error('\n   检查 Redis 密码配置:');
      console.error('   - 查看 Redis 配置文件: redis-cli CONFIG GET requirepass');
      console.error('   - 或者直接连接测试: redis-cli -a yourpassword ping');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.error('\n💡 连接被拒绝！');
      console.error('   可能的原因:');
      console.error('   1. Redis 服务未启动');
      console.error('   2. Redis 运行在不同的端口');
      console.error('   3. 防火墙阻止了连接');
      console.error('\n   解决方案:');
      console.error('   1. 启动 Redis: redis-server (或 brew services start redis)');
      console.error('   2. 检查 Redis 是否运行: redis-cli ping');
      console.error('   3. 检查端口: lsof -i :6379');
    } else if (err.message.includes('ENOTFOUND')) {
      console.error('\n💡 无法解析主机名！');
      console.error('   请检查 REDIS_URL 中的主机名是否正确');
    }
    
    process.exit(1);
  });

  try {
    console.log('正在连接...');
    await redis.connect();
    console.log('✅ 连接成功！\n');

    // 测试基本操作
    console.log('测试基本操作...');
    await redis.ping();
    console.log('✅ PING 成功');

    const testKey = 'test:connection';
    await redis.set(testKey, 'test-value');
    console.log('✅ SET 成功');

    const value = await redis.get(testKey);
    console.log(`✅ GET 成功: ${value}`);

    await redis.del(testKey);
    console.log('✅ DEL 成功');

    // 获取 Redis 信息
    console.log('\n📊 Redis 服务器信息:');
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      console.log(`   版本: ${versionMatch[1]}`);
    }

    const memoryInfo = await redis.info('memory');
    const usedMemoryMatch = memoryInfo.match(/used_memory:(\d+)/);
    if (usedMemoryMatch) {
      const usedMemoryMB = (parseInt(usedMemoryMatch[1]) / 1024 / 1024).toFixed(2);
      console.log(`   已用内存: ${usedMemoryMB} MB`);
    }

    const clientsInfo = await redis.info('clients');
    const connectedClientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
    if (connectedClientsMatch) {
      console.log(`   已连接客户端: ${connectedClientsMatch[1]}`);
    }

    console.log('\n✅ 所有测试通过！Redis 连接正常。\n');

    await redis.quit();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    await redis.quit().catch(() => {});
    process.exit(1);
  }
}

testRedisConnection();
