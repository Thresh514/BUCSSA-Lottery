const Redis = require('ioredis');

// 创建Redis连接
const redis = new Redis('redis://localhost:6379');

async function viewSimpleUsers() {
  try {
    console.log('🔍 查看Redis中的用户登录信息...\n');
    
    // 获取所有用户登录信息
    const userKeys = await redis.keys('user:*');
    console.log(`📊 找到 ${userKeys.length} 个登录用户:\n`);
    
    if (userKeys.length === 0) {
      console.log('📝 暂无用户登录信息');
    } else {
      for (const key of userKeys) {
        const userData = await redis.get(key);
        if (userData) {
          const user = JSON.parse(userData);
          console.log(`👤 用户: ${user.name}`);
          console.log(`📧 邮箱: ${user.email}`);
          console.log(`🆔 ID: ${user.id}`);
          console.log(`🖼️ 头像: ${user.image}`);
          console.log(`⏰ 登录时间: ${user.loginTime}`);
          console.log('---');
        }
      }
    }
    
    console.log('✅ 查看完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 查看失败:', error.message);
    process.exit(1);
  }
}

viewSimpleUsers(); 