export interface JWTPayload {
  email: string;
  id: string;
  isAdmin?: boolean;
  isDisplay?: boolean;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}