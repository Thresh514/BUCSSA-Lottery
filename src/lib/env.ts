export const env = {
  // Redis 配置
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT 密钥
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
  
  // 邮件服务配置
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  
  // 应用配置
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  DEFAULT_ROOM_ID: process.env.DEFAULT_ROOM_ID || 'main_room',
}; 