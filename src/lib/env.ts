export const env = {
  // Redis 配置
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // NextAuth 配置
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your_nextauth_secret_key_here_change_in_production',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  
  // 应用配置
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  DEFAULT_ROOM_ID: process.env.DEFAULT_ROOM_ID || 'main_room',
}; 