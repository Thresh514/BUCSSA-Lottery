import { createClient } from "redis";
import type { Adapter, AdapterUser, AdapterSession, AdapterAccount } from "next-auth/adapters";

// 改进 Redis 连接管理
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL!,
    });
    
    await redisClient.connect();
    
    redisClient.on("error", (err) => console.error("Redis Error:", err));
  }
  
  return redisClient;
}

// Session 过期时间（秒），与 next-auth 配置保持一致
const SESSION_TTL = 30 * 24 * 60 * 60; // 30天

// 获取会话
async function getSession(sessionToken: string): Promise<AdapterSession | null> {
  try {
    const redis = await getRedisClient();
    const session = await redis.get(`nextauth:session:${sessionToken}`);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// 获取用户
async function getUser(id: string): Promise<AdapterUser | null> {
  try {
    const redis = await getRedisClient();
    const user = await redis.get(`nextauth:user:${id}`);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export const RedisAdapter: Adapter & { isAdminEmail: (email: string) => Promise<boolean> } = {
  // 获取会话和用户
  async getSessionAndUser(sessionToken: string) {
    try {
      const session = await getSession(sessionToken);
      if (!session) {
        return null;
      }

      // 确保会话对象有必要的属性
      if (!session.userId) {
        return null;
      }

      const user = await getUser(session.userId);
      if (!user) {
        return null;
      }

      // 确保会话对象有 expires 属性
      const sessionWithExpires = {
        ...session,
        expires: session.expires ? new Date(session.expires) : new Date(Date.now() + SESSION_TTL * 1000),
      };

      return { session: sessionWithExpires, user };
    } catch (error) {
      console.error('Error in getSessionAndUser:', error);
      return null;
    }
  },

  // 创建用户
  async createUser(data: any): Promise<AdapterUser> {
    const redis = await getRedisClient();
    const id = data.id || `user_${Date.now()}`;
    const user = { ...data, id };
    await redis.set(`nextauth:user:${id}`, JSON.stringify(user));
    // 建立邮箱到userId的索引，便于快速查找
    if (user.email) {
      await redis.set(`nextauth:email:${user.email}`, id);
    }
    return user;
  },

  // 获取用户
  async getUser(id: string): Promise<AdapterUser | null> {
    return await getUser(id);
  },

  // 通过邮箱获取用户（优化：先查索引）
  async getUserByEmail(email: string): Promise<AdapterUser | null> {
    const redis = await getRedisClient();
    const userId = await redis.get(`nextauth:email:${email}`);
    if (userId) {
      return await getUser(userId);
    }
    // 兼容老数据：遍历查找
    const keys = await redis.keys("nextauth:user:*");
    for (const key of keys) {
      const user = await redis.get(key);
      if (user) {
        const userData = JSON.parse(user);
        if (userData.email === email) {
          // 补建索引
          await redis.set(`nextauth:email:${email}`, userData.id);
          return userData;
        }
      }
    }
    return null;
  },

  // 通过账户获取用户
  async getUserByAccount(providerAccountId: { provider: string; providerAccountId: string }): Promise<AdapterUser | null> {
    const redis = await getRedisClient();
    const keys = await redis.keys("nextauth:user:*");
    for (const key of keys) {
      const user = await redis.get(key);
      if (user) {
        const userData = JSON.parse(user);
        if (userData.accounts) {
          const account = userData.accounts.find(
            (acc: any) =>
              acc.provider === providerAccountId.provider &&
              acc.providerAccountId === providerAccountId.providerAccountId
          );
          if (account) {
            return userData;
          }
        }
      }
    }
    return null;
  },

  // 更新用户
  async updateUser(data: any): Promise<AdapterUser> {
    const user = await getUser(data.id);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, ...data };
    const redis = await getRedisClient();
    await redis.set(`nextauth:user:${data.id}`, JSON.stringify(updatedUser));
    // 如果邮箱变更，更新索引
    if (updatedUser.email) {
      await redis.set(`nextauth:email:${updatedUser.email}`, updatedUser.id);
    }
    return updatedUser;
  },

  // 删除用户
  async deleteUser(userId: string): Promise<void> {
    const user = await getUser(userId);
    if (user && user.email) {
      const redis = await getRedisClient();
      await redis.del(`nextauth:email:${user.email}`);
    }
    const redis = await getRedisClient();
    await redis.del(`nextauth:user:${userId}`);
  },

  // 链接账户
  async linkAccount(data: any): Promise<AdapterAccount> {
    const user = await getUser(data.userId);
    if (!user) throw new Error("User not found");

    // 扩展用户类型以包含 accounts
    const userWithAccounts = user as AdapterUser & { accounts?: AdapterAccount[] };
    const accounts = userWithAccounts.accounts || [];
    accounts.push(data);
    const updatedUser = { ...userWithAccounts, accounts };
    const redis = await getRedisClient();
    await redis.set(`nextauth:user:${data.userId}`, JSON.stringify(updatedUser));
    return data;
  },

  // 取消链接账户
  async unlinkAccount(providerAccountId: { provider: string; providerAccountId: string }): Promise<void> {
    const redis = await getRedisClient();
    const keys = await redis.keys("nextauth:user:*");
    for (const key of keys) {
      const user = await redis.get(key);
      if (user) {
        const userData = JSON.parse(user);
        if (userData.accounts) {
          const filteredAccounts = userData.accounts.filter(
            (acc: any) =>
              !(
                acc.provider === providerAccountId.provider &&
                acc.providerAccountId === providerAccountId.providerAccountId
              )
          );
          if (filteredAccounts.length !== userData.accounts.length) {
            const updatedUser = { ...userData, accounts: filteredAccounts };
            await redis.set(key, JSON.stringify(updatedUser));
            return;
          }
        }
      }
    }
  },

  // 创建会话（带TTL）
  async createSession(data: any): Promise<AdapterSession> {
    try {
      const expires = new Date(Date.now() + SESSION_TTL * 1000);
      const session = { 
        ...data, 
        id: data.sessionToken,
        expires: expires
      };
      
      const redis = await getRedisClient();
      
      // 清理同一用户的旧session
      if (data.userId) {
        const existingSessions = await redis.keys("nextauth:session:*");
        for (const sessionKey of existingSessions) {
          try {
            const existingSessionData = await redis.get(sessionKey);
            if (existingSessionData) {
              const existingSession = JSON.parse(existingSessionData);
              if (existingSession.userId === data.userId && existingSession.sessionToken !== data.sessionToken) {
                // 删除同一用户的旧session
                await redis.del(sessionKey);
              }
            }
          } catch (error) {
            // 忽略单个session的解析错误
          }
        }
      }
      
      await redis.set(
        `nextauth:session:${data.sessionToken}`,
        JSON.stringify(session),
        { EX: SESSION_TTL }
      );
      
      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  // 更新会话（重置TTL）
  async updateSession(data: any): Promise<AdapterSession> {
    const session = await getSession(data.sessionToken);
    if (!session) throw new Error("Session not found");

    const expires = new Date(Date.now() + SESSION_TTL * 1000);
    const updatedSession = { 
      ...session, 
      ...data,
      expires: expires
    };
    
    const redis = await getRedisClient();
    
    // 清理同一用户的其他session（除了当前正在更新的）
    if (session.userId) {
      const existingSessions = await redis.keys("nextauth:session:*");
      for (const sessionKey of existingSessions) {
        try {
          const existingSessionData = await redis.get(sessionKey);
          if (existingSessionData) {
            const existingSession = JSON.parse(existingSessionData);
            if (existingSession.userId === session.userId && existingSession.sessionToken !== data.sessionToken) {
              // 删除同一用户的其他session
              await redis.del(sessionKey);
            }
          }
        } catch (error) {
          // 忽略单个session的解析错误
        }
      }
    }
    
    await redis.set(
      `nextauth:session:${data.sessionToken}`,
      JSON.stringify(updatedSession),
      { EX: SESSION_TTL }
    );
    return updatedSession;
  },

  // 删除会话
  async deleteSession(sessionToken: string): Promise<void> {
    const redis = await getRedisClient();
    await redis.del(`nextauth:session:${sessionToken}`);
  },

  // 创建验证令牌
  async createVerificationToken(data: any): Promise<any> {
    const redis = await getRedisClient();
    const token = { ...data, id: data.token };
    await redis.set(
      `nextauth:verification_token:${data.token}`,
      JSON.stringify(token)
    );
    return token;
  },

  // 使用验证令牌
  async useVerificationToken(params: { identifier: string; token: string }): Promise<any> {
    const redis = await getRedisClient();
    const verificationToken = await redis.get(
      `nextauth:verification_token:${params.token}`
    );
    if (verificationToken) {
      await redis.del(`nextauth:verification_token:${params.token}`);
      return JSON.parse(verificationToken);
    }
    return null;
  },

  // 一下均为特殊方法，非 Adapter 标准方法
  // 检查邮箱是否是管理员
  async isAdminEmail(email: string): Promise<boolean> {
    const redis = await getRedisClient();
    const result = await redis.sIsMember("nextauth:admin_emails", email);
    return result === 1;
  }
};