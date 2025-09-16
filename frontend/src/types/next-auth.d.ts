import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isAdmin?: boolean
      isDisplay?: boolean
      accessToken?: string | null
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    accounts?: Array<{
      provider: string
      providerAccountId: string
      type: string
      userId: string
    }>
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isAdmin?: boolean
    isDisplay?: boolean
    accessToken?: string | null
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    isAdmin?: boolean
    isDisplay?: boolean
    accounts?: Array<{
      provider: string
      providerAccountId: string
      type: string
      userId: string
    }>
  }
}