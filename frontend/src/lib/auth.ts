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
      // console.log("🔐 signIn callback triggered:", { email: user.email, id: user.id });

      const email = user.email || "";
      const allowed = email.endsWith("@bu.edu") || email.endsWith("@gmail.com");

      // console.log("✅ Email check result:", { email, allowed });
      
      if (!allowed) {

        // console.log("❌ Email not allowed, blocking sign in");

        return false;
      }
      
      return allowed;
    },
    async jwt({ token, user, account }) {

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
          
          // console.log("🔍 Checking admin status for:", user.email);

          const isAdmin = await RedisAdapter.isAdminEmail(user.email || "");
          token.isAdmin = isAdmin;
          
          // console.log("👑 Admin check result:", { email: user.email, isAdmin });

        } catch (error) {

          // console.error("❌ JWT callback error:", error);
          // Don't fail the whole authentication - set defaults
          token.isAdmin = false;
        }
      }

      // console.log("🎫 JWT callback complete:", { id: token.id, isAdmin: token.isAdmin });
      
      return token;
    },

    async session({ session, token }) {

      // console.log("📱 Session callback triggered:", { 
      //   tokenId: token.id, 
      //   tokenIsAdmin: token.isAdmin,
      //   tokenEmail: token.email 
      // });

      // 将用户ID添加到jwt令牌中
      if (token && session.user) {
        session.user.id = String(token.sub || token.id || "");
        session.user.isAdmin = Boolean(token.isAdmin);
      }

      // console.log("📱 Session callback complete:", session.user);

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: false,
}; 