export interface JwtPayload {
  sub: string; // 用户 ID (标准 JWT 字段)
  userId: string; // 为兼容性添加的字段
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string; // 用户 ID
  tokenId: string; // 令牌唯一 ID
  iat?: number;
  exp?: number;
}

export interface SocialUser {
  provider: string;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  tokens: TokenPair;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}
