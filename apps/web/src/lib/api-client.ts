// ==============================
// 🌐 集成 API 客户端
// 标准化和集中管理所有 API 调用
// ==============================

import { useAuthStore } from '@/stores/authStore';
import type { 
  AuthUser, 
  AuthTokens, 
  LoginDto, 
  RegisterDto,
  AuthResponse 
} from '@repo/schemas';

// API 基本配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// 标准 API 响应类型
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// API 错误类
export class ApiError extends Error {
  constructor(
    public status: number,
    public response: ApiResponse,
    message?: string
  ) {
    super(message || response.message || '发生未知错误');
    this.name = 'ApiError';
  }
}

// JWT 解码工具
function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT 解码错误:', error);
    return null;
  }
}

// 基础 fetch 包装器
async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    credentials: 'include',
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  console.log(`🌐 API 请求: ${config.method || 'GET'} ${url}`);
  console.log(`🔑 认证令牌: ${accessToken ? '存在' : '不存在'}`);
  
  const response = await fetch(url, config);
  
  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error(`❌ JSON 解析错误:`, error);
    throw new ApiError(response.status, { 
      success: false, 
      message: 'JSON 解析错误' 
    });
  }
  
  console.log(`📝 API 响应 (${response.status}):`, data);

  if (!response.ok) {
    console.error(`❌ API 错误 ${response.status}:`, data);
    throw new ApiError(response.status, data);
  }

  console.log(`✅ API 成功: ${config.method || 'GET'} ${url}`);
  return data;
}

// 认证相关 API 客户端
export class AuthApiClient {
  /**
   * 注册
   */
  static async register(data: RegisterDto): Promise<{ user: AuthUser }> {
    const response = await fetchApi<ApiResponse<{ user: AuthUser }>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.success || !response.data) {
      throw new Error('注册响应数据不正确');
    }

    return response.data;
  }

  /**
   * 登录
   */
  static async login(data: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const response = await fetchApi<ApiResponse<{ user: AuthUser; tokens: AuthTokens }>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.success || !response.data) {
      throw new Error('登录响应数据不正确');
    }

    const { user, tokens } = response.data;
    
    // 从 JWT 令牌中提取并规范化用户信息
    const decodedToken = decodeJWT(tokens.accessToken);
    if (!decodedToken) {
      throw new Error('无法解码令牌');
    }

    // 规范化用户信息以符合 AuthUser 类型
    const normalizedUser: AuthUser = {
      id: user.id || decodedToken.userId || decodedToken.sub,
      email: user.email || decodedToken.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role || decodedToken.role || 'USER',
      isActive: user.isActive !== undefined ? user.isActive : true,
      isVerified: user.isVerified !== undefined ? user.isVerified : false,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt,
    };

    return { user: normalizedUser, tokens };
  }

  /**
   * 登出
   */
  static async logout(): Promise<void> {
    await fetchApi('/api/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * 刷新令牌
   */
  static async refreshTokens(): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const response = await fetchApi<ApiResponse<AuthTokens>>('/api/auth/refresh', {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new Error('令牌刷新失败');
    }

    const tokens = response.data;
    const decodedToken = decodeJWT(tokens.accessToken);
    const currentUser = useAuthStore.getState().user;

    if (!decodedToken || !currentUser) {
      throw new Error('令牌或用户信息不存在');
    }

    // 使用新令牌信息更新当前用户信息
    const updatedUser: AuthUser = {
      ...currentUser,
      id: currentUser.id || decodedToken.userId || decodedToken.sub,
      email: decodedToken.email || currentUser.email,
      role: decodedToken.role || currentUser.role,
    };

    return { user: updatedUser, tokens };
  }

  /**
   * 获取用户资料
   */
  static async getProfile(): Promise<AuthUser> {
    const response = await fetchApi<ApiResponse<AuthUser>>('/api/auth/profile');

    if (!response.success || !response.data) {
      throw new Error('获取资料失败');
    }

    return response.data;
  }

  /**
   * 更新资料
   */
  static async updateProfile(data: Partial<AuthUser>): Promise<{ user: AuthUser; tokens?: AuthTokens; message: string }> {
    console.log('🔄 更新资料 API 请求:', data);
    
    const response = await fetchApi<ApiResponse<{ user: AuthUser; tokens?: AuthTokens }>>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    console.log('📝 更新资料响应:', response);

    if (!response.success) {
      throw new Error(response.message || '更新资料失败');
    }

    if (!response.data || !response.data.user) {
      console.error('❌ 响应结构错误:', response);
      throw new Error('服务器响应数据不正确');
    }

    const result = {
      user: response.data.user,
      tokens: response.data.tokens,
      message: response.message
    };

    console.log('✅ 更新资料结果:', result);

    // 如果有新令牌则更新存储
    if (result.tokens) {
      console.log('🔄 使用新令牌更新登录状态');
      const { login } = useAuthStore.getState();
      login(result.user, result.tokens);
    } else {
      console.log('📝 仅更新用户信息');
      // 如果没有令牌则只更新用户信息
      const { setUser } = useAuthStore.getState();
      setUser(result.user);
    }

    return result;
  }
}

// 包含自动重试和令牌刷新的认证 API 客户端
export class AuthenticatedApiClient {
  private static async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 1
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && maxRetries > 0) {
        console.log('🔄 令牌过期，尝试自动刷新...');
        
        try {
          const { user, tokens } = await AuthApiClient.refreshTokens();
          const { login } = useAuthStore.getState();
          login(user, tokens);
          
          console.log('✅ 令牌刷新成功，重试 API');
          return await this.executeWithRetry(apiCall, maxRetries - 1);
        } catch (refreshError) {
          console.error('❌ 令牌刷新失败:', refreshError);
          // 令牌刷新失败时执行登出
          const { logout } = useAuthStore.getState();
          logout();
          throw new Error('认证已过期。请重新登录。');
        }
      }
      throw error;
    }
  }

  /**
   * 需要认证的 API 调用
   */
  static async call<T>(apiCall: () => Promise<T>): Promise<T> {
    return this.executeWithRetry(apiCall);
  }
}

// 为方便使用的默认导出
export const authApi = AuthApiClient;
export const authenticatedApi = AuthenticatedApiClient;

// 为保持兼容性的导出（渐进式迁移）
export { fetchApi as fetchWithAuth };
