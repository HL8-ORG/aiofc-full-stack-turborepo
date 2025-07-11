// ==============================
// 🔐 改进的认证服务
// 使用新的 API 客户端和集成类型
// ==============================

import { useAuthStore } from '@/stores/authStore';
import { authApi, AuthApiClient, ApiError } from '@/lib/api-client';
import type { 
  AuthUser, 
  AuthTokens, 
  LoginDto, 
  RegisterDto 
} from '@repo/schemas';

/**
 * 注册
 */
export async function registerUser(email: string, password: string) {
  try {
    const registerData: RegisterDto = { email, password };
    const result = await authApi.register(registerData);
    
    console.log('✅ 注册成功:', result.user.email);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('❌ 注册失败:', error);
    
    if (error instanceof ApiError) {
      return { 
        errors: error.response.errors?.map(e => e.message) || [error.message] 
      };
    }
    
    return { errors: ['发生网络错误。请重试。'] };
  }
}

/**
 * 登录
 */
export async function loginUser(email: string, password: string) {
  const { login } = useAuthStore.getState();
  
  try {
    const loginData: LoginDto = { email, password };
    const result = await authApi.login(loginData);
    
    // 将登录信息保存到 Zustand store
    login(result.user, result.tokens);
    
    console.log('✅ 登录成功:', result.user.email);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('❌ 登录失败:', error);
    
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    
    return { error: '发生网络错误。请重试。' };
  }
}

/**
 * 登出
 */
export async function logoutUser() {
  const { logout } = useAuthStore.getState();

  try {
    await authApi.logout();
    console.log('✅ 服务器登出成功');
  } catch (error) {
    console.warn('⚠️ 服务器登出失败 (继续客户端登出):', error);
  } finally {
    // 无论服务器请求成功/失败，都清理客户端状态
    logout();
    
    // 清理 cookie
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // 跳转到登录页面
    window.location.href = '/signin';
  }
}

/**
 * 刷新令牌
 */
export async function refreshAccessToken() {
  try {
    const result = await authApi.refreshTokens();
    console.log('✅ 令牌刷新成功');
    return { user: result.user, token: result.tokens.accessToken };
  } catch (error) {
    console.error('❌ 令牌刷新失败:', error);
    return null;
  }
}

/**
 * 获取个人资料（包含令牌验证）
 */
export async function fetchProfile() {
  const { accessToken } = useAuthStore.getState();
  
  if (!accessToken) {
    return null;
  }

  try {
    // 通过刷新令牌恢复个人资料
    const result = await refreshAccessToken();
    return result;
  } catch (error) {
    console.error('❌ 获取个人资料失败:', error);
    return null;
  }
}

/**
 * 更新个人资料
 */
export async function updateProfile(profileData: Partial<AuthUser>) {
  try {
    const result = await authApi.updateProfile(profileData);
    
    // API 客户端已经更新了 store，这里只返回结果
    console.log('✅ 个人资料更新成功:', result.message);
    
    if (result.tokens) {
      console.log('🔄 已发放新令牌');
    }
    
    return result.user;
  } catch (error) {
    console.error('❌ 个人资料更新失败:', error);
    
    if (error instanceof ApiError) {
      // 认证错误
      if (error.status === 401) {
        const { logout } = useAuthStore.getState();
        logout();
        throw new Error('用户信息有问题。请重新登录。');
      }
      
      // 其他 API 错误
      throw new Error(error.message || '个人资料更新失败。');
    }
    
    throw error;
  }
}

/**
 * 需要认证的 API 调用的辅助函数（向下兼容）
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  console.warn('⚠️ fetchWithAuth 已弃用。请使用 AuthenticatedApiClient.call。');
  
  const { accessToken } = useAuthStore.getState();
  
  if (!accessToken) {
    console.error('❌ 没有认证令牌。');
    return null;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      console.warn('🔄 令牌过期，尝试刷新...');
      const refreshResult = await refreshAccessToken();
      
      if (refreshResult?.token) {
        // 使用新令牌重试
        return fetchWithAuth(url, options);
      } else {
        // 令牌刷新失败
        const { logout } = useAuthStore.getState();
        logout();
        throw new Error('认证已过期。请重新登录。');
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('❌ API 请求失败:', error);
    throw error;
  }
}
