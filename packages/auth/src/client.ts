/**
 * @description Auth API 客户端类 - 提供认证相关的 HTTP 请求封装
 * @remarks
 * - 使用 Fetch API 发送 HTTP 请求
 * - 统一处理请求/响应格式
 * - 支持自定义 baseUrl
 * - 内置错误处理机制
 */
import type { 
  RegisterDto, 
  LoginDto,
  AuthTokens,
  AuthUser,
  RefreshTokenDto 
} from '@repo/schemas';

export class AuthApiClient {
  /** API 基础路径 */
  private baseUrl: string;

  /**
   * @param baseUrl - API 基础路径,默认为空字符串(使用相对路径)
   */
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * 统一的请求处理方法
   * @param endpoint - API 端点路径
   * @param options - fetch 配置选项
   * @returns 响应数据
   * @throws 请求错误
   * 
   * @remarks
   * - 自动拼接完整 URL
   * - 统一设置 Content-Type
   * - JSON 响应解析
   * - 错误处理与信息提取
   */
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/api/v1/auth${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      // 错误响应处理
      const errorMessage = data.message || data.error || '请求失败';
      const error = new Error(errorMessage);

      // 传递额外的错误信息
      if (data.errors) {
        (error as any).errors = data.errors;
      }

      throw error;
    }

    return data;
  }

  /**
   * 用户注册
   * @param data - 注册信息
   * @returns 用户信息和认证令牌
   */
  async register(data: RegisterDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 用户登录
   * @param data - 登录凭证
   * @returns 用户信息和认证令牌
   */
  async login(data: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 刷新访问令牌
   * @param refreshToken - 刷新令牌
   * @returns 新的认证令牌对
   * 
   * @remarks
   * 使用 refresh token 获取新的 access token,实现无感刷新
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.request('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  /**
   * 用户登出
   * @param accessToken - 访问令牌
   * @returns 登出结果
   * 
   * @remarks
   * 服务端会清除相关的认证信息
   */
  async logout(accessToken: string) {
    return this.request('/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * 获取用户档案
   * @param accessToken - 访问令牌
   * @returns 用户信息
   */
  async getProfile(accessToken: string): Promise<{ success: boolean; data: AuthUser }> {
    return this.request('/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * 检查密码强度
   * @param password - 待检查的密码
   * @returns 密码强度检查结果
   * 
   * @remarks
   * 服务端会根据密码策略进行评估
   */
  async checkPasswordStrength(password: string) {
    return this.request('/check-password-strength', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }
}

/**
 * 默认导出的 API 客户端实例
 * @remarks
 * 使用默认配置创建的客户端实例,可直接使用
 */
export const authApi = new AuthApiClient();
