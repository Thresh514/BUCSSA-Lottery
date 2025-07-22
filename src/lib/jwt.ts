import jwt from 'jsonwebtoken';
import { env } from './env';
import { JWTPayload } from '@/types';

// 生成JWT
export function generateJWT(userId: string, email: string): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId,
    email,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '24h', // 24小时有效期
  });
}

// 验证JWT
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT验证失败:', error);
    return null;
  }
}

// 从请求头中提取JWT
export function extractJWTFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // 移除 "Bearer " 前缀
} 