import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // 只允许 bu.edu 和 gmail.com 的邮箱
      const email = user.email || "";
      const allowed = email.endsWith("@bu.edu") || email.endsWith("@gmail.com");
      console.log("Sign in attempt:", { email, allowed });
      return allowed;
    },
    async session({ session, token }) {
      console.log("Session callback:", { session, token });
      return session;
    },
    async jwt({ token, user }) {
      console.log("JWT callback:", { token, user });
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: true,
}; 