'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TokenManager, AuthApiClient } from '@repo/auth';
import type { AuthUser } from '@repo/schemas';

// API 网关 URL 配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
const authApi = new AuthApiClient(API_BASE_URL);

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = TokenManager.getRefreshToken();

      if (!refreshTokenValue) {
        throw new Error('没有可用的刷新令牌');
      }

      const response = await authApi.refreshToken(refreshTokenValue);

      if (response && response.accessToken && response.refreshToken) {
        TokenManager.setTokens(
          response.accessToken,
          response.refreshToken
        );

        // 使用新令牌更新个人资料信息
        const profileResponse = await authApi.getProfile(response.accessToken);
        if (profileResponse.success && profileResponse.data) {
          setUser(profileResponse.data);
        }
      }
    } catch (error) {
      console.error('令牌刷新失败:', error);
      TokenManager.clearTokens();
      setUser(null);
      throw error;
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const accessToken = TokenManager.getAccessToken();

      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      // 检查令牌是否过期
      if (TokenManager.isTokenExpired(accessToken)) {
        await refreshToken();
        return;
      }

      // 获取个人资料信息
      const response = await authApi.getProfile(accessToken);
      if (response.success && response.data) {
        // response.data 已经是 AuthUser 类型
        setUser(response.data);
      }
    } catch (error) {
      console.error('认证状态检查失败:', error);
      TokenManager.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken]);

  // 初始加载时检查令牌
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // 定期刷新令牌
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        refreshToken();
      }, 5 * 60 * 1000); // 每5分钟尝试刷新令牌

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshToken]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });

      if (response && response.user && response.tokens) {
        TokenManager.setTokens(
          response.tokens.accessToken,
          response.tokens.refreshToken
        );
        setUser(response.user);
      } else {
        throw new Error('登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const accessToken = TokenManager.getAccessToken();
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      TokenManager.clearTokens();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
