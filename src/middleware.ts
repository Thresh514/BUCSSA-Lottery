import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const isAuth = !!token;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (isLoginPage) {
    if (isAuth) {
      // 如果已登录但访问登录页，重定向到游戏页面
      return NextResponse.redirect(new URL("/play", req.url));
    }
    // 未登录访问登录页，允许访问
    return NextResponse.next();
  }

  // 验证邮箱域名
  if (isAuth && token.email) {
    const email = token.email as string;
    const isAllowedEmail = email.endsWith("@bu.edu") || email.endsWith("@gmail.com");
    if (!isAllowedEmail) {
      // 如果邮箱不符合要求，注销并重定向到登录页
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // 未登录用户访问受保护页面，重定向到登录页
  if (!isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/play/:path*",
    "/admin/:path*",
    "/login",
  ],
}; 