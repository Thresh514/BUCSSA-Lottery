import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { RedisAdapter } from "./redis-adapter";
import jwt from 'jsonwebtoken';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    })
  ],
  adapter: RedisAdapter,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    // async signIn({ user }) {
    //     // 只允许 bu.edu 和 gmail.com 的邮箱
    //     console.log("🔐 signIn callback triggered:", { email: user.email, id: user.id });

    //     const userEmail = user.email || "";
    //     const allowed = userEmail.endsWith("@bu.edu") || userEmail.endsWith("@gmail.com");

    //     console.log("✅ Email check result:", { email: userEmail, allowed });

    //     if (!allowed) {
    //       console.log("❌ Email not allowed, blocking sign in");
    //       return false;
    //     }

    //     // 简化：只检查邮箱格式，管理员检查在 JWT 回调中进行
    //     console.log("✅ Email allowed, proceeding with authentication");
    //   return true;
    // },
    async jwt({ token, user }) {

      // console.log("🎫 JWT callback triggered:", { 
      //   hasUser: !!user, 
      //   userEmail: user?.email,
      //   userId: user?.id,
      //   tokenSub: token.sub 
      // });

      if (user) {
        try {
          // Use token.sub instead of user.id
          token.id = token.sub || user.id || "";

          // console.log("🔍 Checking admin and display status for:", user.email);

          const isAdmin = await RedisAdapter.isAdminEmail(user.email || "");
          const isDisplay = await RedisAdapter.isDisplayEmail(user.email || "");
          token.isAdmin = isAdmin;
          token.isDisplay = isDisplay;

          const accessToken = jwt.sign({ email: user.email, isAdmin: isAdmin, isDisplay: isDisplay, id: token.id }, process.env.JWT_SECRET!, { expiresIn: '30d', issuer: 'lottery-frontend', audience: 'lottery-backend' });
          token.accessToken = accessToken;

          // console.log("👑 Role check result:", { email: user.email, isAdmin, isDisplay });

        } catch (error) {

          // console.error("❌ JWT callback error:", error);
          // Don't fail the whole authentication - set defaults
          token.isAdmin = false;
          token.isDisplay = false;
          token.accessToken = null;
        }
      }

      // console.log("🎫 JWT callback complete:", { id: token.id, isAdmin: token.isAdmin, isDisplay: token.isDisplay });

      return token;
    },

    async session({ session, token }) {

      // console.log("📱 Session callback triggered:", { 
      //   tokenId: token.id, 
      //   tokenIsAdmin: token.isAdmin,
      //   tokenIsDisplay: token.isDisplay,
      //   tokenEmail: token.email 
      // });

      // 将用户ID添加到jwt令牌中
      if (token && session.user) {
        session.user.id = String(token.sub || token.id || "");
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isDisplay = Boolean(token.isDisplay);
        session.user.accessToken = String(token.accessToken) || null;
      }

      // console.log("📱 Session callback complete:", session.user);

      return session;
    },

    async redirect({ url, baseUrl }) {
      // console.log("🔄 Redirect callback:", { url, baseUrl });

      return `${baseUrl}/play`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/play", // 新用户默认重定向到 /play
  },
  debug: true,
}; 