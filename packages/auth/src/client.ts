// Auth API 客户端
import type { 
  RegisterDto, 
  LoginDto,
  AuthTokens,
  AuthUser,
  RefreshTokenDto 
} from '@repo/schemas';

export class AuthApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

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

  async register(data: RegisterDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.request('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(accessToken: string) {
    return this.request('/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async getProfile(accessToken: string): Promise<{ success: boolean; data: AuthUser }> {
    return this.request('/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async checkPasswordStrength(password: string) {
    return this.request('/check-password-strength', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }
}

// 默认客户端实例
export const authApi = new AuthApiClient();
