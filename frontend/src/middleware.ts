import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequestWithAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // console.log("Middleware token:", token)

    // Protect admin routes
    if (pathname.startsWith('/admin')) {
      if (!token?.isAdmin) {
        return NextResponse.redirect(new URL('/play', req.url))
      }
    }

    // Protect display routes
    if (pathname.startsWith('/show')) {
      if (!token?.isDisplay) {
        return NextResponse.redirect(new URL('/play', req.url))
      }
    }

    // Redirect users based on their roles
    if (pathname.startsWith('/play')) {
      if (token?.isAdmin) {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
      if (token?.isDisplay) {
        return NextResponse.redirect(new URL('/show', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // console.log("Received callback:", { pathname, token })

        // Allow access to login page
        if (pathname.startsWith('/login')) {
          return true
        }

        // Require authentication for protected routes
        if (pathname.startsWith('/admin') || pathname.startsWith('/play') || pathname.startsWith('/show')) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: ['/admin', '/play', '/show', '/login']
  // matcher: ["/((?!_next|.*\\..*).*)"]
}