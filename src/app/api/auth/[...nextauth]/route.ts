import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
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
    async jwt({ token, user, account }) {
      console.log("JWT callback:", { token, user, account });
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 