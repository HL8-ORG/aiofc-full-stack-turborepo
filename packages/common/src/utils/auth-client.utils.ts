// ==============================
// 🔐 客户端 Auth API 客户端
// ==============================

import type { RegisterDto, LoginDto } from '../../../schemas/src/auth/index';

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

  // 🔐 认证相关 API
  async register(data: RegisterDto) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginDto) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string) {
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

  async getProfile(accessToken: string) {
    return this.request('/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async forgotPassword(email: string) {
    return this.request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    return this.request('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
  }

  async verifyEmail(token: string) {
    return this.request('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerification(email: string) {
    return this.request('/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string, accessToken: string) {
    return this.request('/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  }

  async updateProfile(data: any, accessToken: string) {
    return this.request('/profile', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(password: string, confirmText: string, accessToken: string) {
    return this.request('/delete-account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password, confirmText }),
    });
  }

  async checkPasswordStrength(password: string) {
    return this.request('/check-password-strength', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // 🔗 社交登录相关
  getSocialLoginUrl(provider: 'google' | 'github', redirectUrl?: string) {
    const params = new URLSearchParams();
    if (redirectUrl) {
      params.set('redirect', redirectUrl);
    }
    
    return `${this.baseUrl}/api/v1/auth/${provider}?${params.toString()}`;
  }

  async handleSocialCallback(provider: 'google' | 'github', code: string, state?: string) {
    return this.request(`/${provider}/callback`, {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }
}

// 默认客户端实例
export const authApi = new AuthApiClient();

// React Hook 风格 API (可选)
export function useAuthApi(baseUrl?: string) {
  return new AuthApiClient(baseUrl);
}
