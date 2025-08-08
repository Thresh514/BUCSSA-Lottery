import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { RedisAdapter } from "./redis-adapter";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  adapter: RedisAdapter,
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user }) {
      // 只允许 bu.edu 和 gmail.com 的邮箱
      const email = user.email || "";
      const allowed = email.endsWith("@bu.edu") || email.endsWith("@gmail.com");
      
      if (!allowed) {
        return false;
      }
      
      return allowed;
    },
    async session({ session, user }) {
      // 将用户ID添加到会话中
      if (user && session.user) {
        session.user.id = user.id;
        
        // 检查是否是管理员
        try {
          const isAdmin = await RedisAdapter.isAdminEmail(user.email || "");
          session.user.isAdmin = !!isAdmin;
        } catch (error) {
          console.error("Error checking admin status:", error);
          session.user.isAdmin = false;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: false,
}; 