import { createClient } from "redis";
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

async function clearAllData() {
  const redis = createClient({
    url: REDIS_URL,
  });

  try {
    await redis.connect();
    console.log("=== 清理所有数据 ===");
    console.log("REDIS_URL:", REDIS_URL);

    // 清理所有session
    const sessionKeys = await redis.keys("nextauth:session:*");
    console.log(`找到 ${sessionKeys.length} 个session`);
    if (sessionKeys.length > 0) {
      await redis.del(sessionKeys);
      console.log("✅ 所有session已清理");
    }

    // 清理所有用户
    const userKeys = await redis.keys("nextauth:user:*");
    console.log(`找到 ${userKeys.length} 个用户`);
    if (userKeys.length > 0) {
      await redis.del(userKeys);
      console.log("✅ 所有用户已清理");
    }

    // 清理所有邮箱映射
    const emailKeys = await redis.keys("nextauth:email:*");
    console.log(`找到 ${emailKeys.length} 个邮箱映射`);
    if (emailKeys.length > 0) {
      await redis.del(emailKeys);
      console.log("✅ 所有邮箱映射已清理");
    }

    // 清理所有验证令牌
    const tokenKeys = await redis.keys("nextauth:verification_token:*");
    console.log(`找到 ${tokenKeys.length} 个验证令牌`);
    if (tokenKeys.length > 0) {
      await redis.del(tokenKeys);
      console.log("✅ 所有验证令牌已清理");
    }

    console.log("\n=== 清理完成 ===");
    console.log("现在请：");
    console.log("1. 清理浏览器缓存和Cookie");
    console.log("2. 重新访问 http://localhost:3000/login");
    console.log("3. 选择 jijicandlehouse@gmail.com 登录");
    console.log("4. 确认登录后显示正确的用户信息");

  } catch (error) {
    console.error("❌ 清理失败:", error);
  } finally {
    await redis.disconnect();
  }
}

clearAllData(); 