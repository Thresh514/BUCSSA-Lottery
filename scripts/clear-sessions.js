import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

async function clearSessions() {
  const redis = createClient({
    url: REDIS_URL,
  });

  try {
    await redis.connect();
    console.log("Connected to Redis");

    // 获取所有会话键
    const sessionKeys = await redis.keys("nextauth:session:*");
    console.log(`Found ${sessionKeys.length} session keys`);

    if (sessionKeys.length > 0) {
      // 删除所有会话
      await redis.del(sessionKeys);
      console.log("Cleared all sessions");
    }

    // 获取所有验证令牌键
    const tokenKeys = await redis.keys("nextauth:verification_token:*");
    console.log(`Found ${tokenKeys.length} verification token keys`);

    if (tokenKeys.length > 0) {
      // 删除所有验证令牌
      await redis.del(tokenKeys);
      console.log("Cleared all verification tokens");
    }

    console.log("Session cleanup completed");
  } catch (error) {
    console.error("Error clearing sessions:", error);
  } finally {
    await redis.disconnect();
  }
}

clearSessions(); 