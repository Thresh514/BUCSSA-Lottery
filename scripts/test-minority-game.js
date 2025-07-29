const Redis = require('ioredis');

// 模拟Redis连接
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// 模拟少数派游戏逻辑
async function testMinorityGame() {
  console.log('🧪 测试少数派游戏逻辑...\n');

  const roomId = 'test-room';
  
  // 清理测试数据
  await redis.del(`room:${roomId}:survivors`);
  await redis.del(`room:${roomId}:eliminated`);
  await redis.del(`current_question:${roomId}`);
  await redis.del(`game:${roomId}:round`);
  await redis.del(`game:${roomId}:state`);

  // 添加测试用户
  const testUsers = [
    'user1@bu.edu',
    'user2@bu.edu', 
    'user3@bu.edu',
    'user4@bu.edu',
    'user5@bu.edu'
  ];

  console.log('👥 添加测试用户...');
  for (const user of testUsers) {
    await redis.sadd(`room:${roomId}:survivors`, user);
  }

  // 模拟题目
  const question = {
    id: 'q_test_1',
    question: '你更喜欢哪种颜色？',
    optionA: '红色',
    optionB: '蓝色'
  };

  console.log('📝 发布测试题目...');
  await redis.hset(`current_question:${roomId}`, {
    id: question.id,
    question: question.question,
    optionA: question.optionA,
    optionB: question.optionB,
  });

  // 模拟用户答题
  const answers = {
    'user1@bu.edu': 'A', // 选择红色
    'user2@bu.edu': 'A', // 选择红色  
    'user3@bu.edu': 'A', // 选择红色
    'user4@bu.edu': 'B', // 选择蓝色
    'user5@bu.edu': 'B', // 选择蓝色
  };

  console.log('✏️ 模拟用户答题...');
  for (const [user, answer] of Object.entries(answers)) {
    await redis.set(`user:${user}:answer:${question.id}`, answer);
    console.log(`  ${user} 选择了 ${answer}`);
  }

  // 统计结果
  console.log('\n📊 统计答题结果...');
  const survivors = await redis.smembers(`room:${roomId}:survivors`);
  
  let A_count = 0;
  let B_count = 0;
  let noAnswer_count = 0;

  for (const user of survivors) {
    const answer = await redis.get(`user:${user}:answer:${question.id}`);
    if (answer === 'A') {
      A_count++;
    } else if (answer === 'B') {
      B_count++;
    } else {
      noAnswer_count++;
    }
  }

  console.log(`  A选项（红色）: ${A_count} 人`);
  console.log(`  B选项（蓝色）: ${B_count} 人`);
  console.log(`  未答题: ${noAnswer_count} 人`);

  // 少数派逻辑
  const minority = A_count <= B_count ? 'A' : 'B';
  const majority = A_count > B_count ? 'A' : 'B';
  const minorityCount = A_count <= B_count ? A_count : B_count;
  const majorityCount = A_count > B_count ? A_count : B_count;

  console.log(`\n🏆 少数派结果:`);
  console.log(`  少数派选项: ${minority} (${minorityCount}人选择)`);
  console.log(`  多数派选项: ${majority} (${majorityCount}人选择)`);

  // 更新存活和淘汰列表
  const A_users = [];
  const B_users = [];

  for (const user of survivors) {
    const answer = await redis.get(`user:${user}:answer:${question.id}`);
    if (answer === 'A') {
      A_users.push(user);
    } else if (answer === 'B') {
      B_users.push(user);
    }
  }

  const minorityUsers = A_count <= B_count ? A_users : B_users;
  const majorityUsers = A_count > B_count ? A_users : B_users;

  // 清空存活列表，重新添加少数派
  await redis.del(`room:${roomId}:survivors`);
  if (minorityUsers.length > 0) {
    await redis.sadd(`room:${roomId}:survivors`, ...minorityUsers);
  }

  // 将多数派加入淘汰列表
  if (majorityUsers.length > 0) {
    await redis.sadd(`room:${roomId}:eliminated`, ...majorityUsers);
  }

  // 显示最终结果
  const finalSurvivors = await redis.smembers(`room:${roomId}:survivors`);
  const finalEliminated = await redis.smembers(`room:${roomId}:eliminated`);

  console.log(`\n🎯 最终结果:`);
  console.log(`  存活用户: ${finalSurvivors.join(', ')}`);
  console.log(`  淘汰用户: ${finalEliminated.join(', ')}`);

  if (finalSurvivors.length === 1) {
    console.log(`\n🎉 游戏结束！获胜者: ${finalSurvivors[0]}`);
  } else if (finalSurvivors.length === 0) {
    console.log(`\n😔 游戏结束！没有获胜者`);
  } else {
    console.log(`\n⏳ 游戏继续，剩余 ${finalSurvivors.length} 人`);
  }

  await redis.disconnect();
  console.log('\n✅ 测试完成！');
}

// 运行测试
testMinorityGame().catch(console.error); 