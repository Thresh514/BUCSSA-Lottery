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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user }) {
      // 只允许 bu.edu 和 gmail.com 的邮箱
      console.log("🔐 signIn callback triggered:", { email: user.email, id: user.id });

      const userEmail = user.email || "";
      const allowed = userEmail.endsWith("@bu.edu") || userEmail.endsWith("@gmail.com");

      console.log("✅ Email check result:", { email: userEmail, allowed });
      
      if (!allowed) {
        console.log("❌ Email not allowed, blocking sign in");
        return false;
      }

      // 简化：只检查邮箱格式，管理员检查在 JWT 回调中进行
      console.log("✅ Email allowed, proceeding with authentication");
      return true;
    },
    async jwt({ token, user }) {

      console.log("🎫 JWT callback triggered:", { 
        hasUser: !!user, 
        userEmail: user?.email,
        userId: user?.id,
        tokenSub: token.sub 
      });

      if (user) {
        try {
          // Use token.sub instead of user.id
          token.id = token.sub || user.id || "";
          
          console.log("🔍 Checking admin status for:", user.email);

          const isAdmin = await RedisAdapter.isAdminEmail(user.email || "");
          token.isAdmin = isAdmin;
          
          console.log("👑 Admin check result:", { email: user.email, isAdmin });

        } catch (error) {

          console.error("❌ JWT callback error:", error);
          // Don't fail the whole authentication - set defaults
          token.isAdmin = false;
        }
      }

      console.log("🎫 JWT callback complete:", { id: token.id, isAdmin: token.isAdmin });
      
      return token;
    },

    async session({ session, token }) {

      console.log("📱 Session callback triggered:", { 
        tokenId: token.id, 
        tokenIsAdmin: token.isAdmin,
        tokenEmail: token.email 
      });

      // 将用户ID添加到jwt令牌中
      if (token && session.user) {
        session.user.id = String(token.sub || token.id || "");
        session.user.isAdmin = Boolean(token.isAdmin);
      }

      console.log("📱 Session callback complete:", session.user);

      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirect callback:", { url, baseUrl });
      
      // 检查是否是登录后的重定向
      if (url.includes('/api/auth/signin') || url.includes('/api/auth/callback')) {
        // 这是登录流程，我们需要根据用户身份决定重定向地址
        // 但是在这个回调中我们无法直接访问用户信息
        // 所以我们需要使用其他方法
        console.log("🔄 Login flow detected, will handle redirect in middleware");
        return `${baseUrl}/play`; // 临时重定向到 /play，让 middleware 处理
      }
      
      // 如果是相对URL，转换为绝对URL
      if (url.startsWith("/")) {
        const fullUrl = `${baseUrl}${url}`;
        console.log("🔄 Redirecting to:", fullUrl);
        return fullUrl;
      }
      // 如果是同域URL，允许
      else if (new URL(url).origin === baseUrl) {
        console.log("🔄 Redirecting to:", url);
        return url;
      }
      // 默认返回baseUrl
      console.log("🔄 Default redirect to:", baseUrl);
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/play", // 新用户默认重定向到 /play
  },
  debug: true,
}; 