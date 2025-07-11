import { z } from 'zod';
import { RegisterDto, LoginDto } from '../auth';

// ==============================
// 🔧 浏览器类型定义
// ==============================

// 浏览器环境检查函数
function isBrowser(): boolean {
  return (
    typeof (globalThis as any).window !== 'undefined' &&
    typeof (globalThis as any).localStorage !== 'undefined'
  );
}

// ==============================
// 🔧 Auth 工具类
// ==============================

// Token管理工具
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  static setTokens(accessToken: string, refreshToken: string): void {
    if (isBrowser()) {
      (globalThis as any).localStorage.setItem(
        this.ACCESS_TOKEN_KEY,
        accessToken
      );
      (globalThis as any).localStorage.setItem(
        this.REFRESH_TOKEN_KEY,
        refreshToken
      );
    }
  }

  static getAccessToken(): string | null {
    if (isBrowser()) {
      return (globalThis as any).localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  static getRefreshToken(): string | null {
    if (isBrowser()) {
      return (globalThis as any).localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  static clearTokens(): void {
    if (isBrowser()) {
      (globalThis as any).localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      (globalThis as any).localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      // 仅在浏览器环境中使用atob
      if (typeof (globalThis as any).atob === 'undefined') {
        // Node.js环境使用Buffer
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        );
        const currentTime = Date.now() / 1000;
        return payload.exp < currentTime;
      } else {
        // 浏览器环境使用atob
        const payload = JSON.parse(
          (globalThis as any).atob(token.split('.')[1])
        );
        const currentTime = Date.now() / 1000;
        return payload.exp < currentTime;
      }
    } catch {
      return true;
    }
  }
}

// Auth API客户端
export class AuthApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.baseUrl}/api/v1/auth${endpoint}`;

    // 检查fetch是否可用
    if (typeof fetch === 'undefined') {
      throw new Error('当前环境不支持fetch');
    }

    const response = await (globalThis as any).fetch(url, {
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

  async checkPasswordStrength(password: string) {
    return this.request('/check-password-strength', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }
}

// 密码验证工具
export class PasswordValidator {
  static validateStrength(password: string) {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[@$!%*?&]/.test(password),
    };

    let score = 0;
    if (checks.length) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.numbers) score += 1;
    if (checks.symbols) score += 1;

    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

    return {
      score,
      strength,
      checks,
      suggestions: [
        !checks.length && '请输入至少8个字符',
        !checks.lowercase && '请包含小写字母',
        !checks.uppercase && '请包含大写字母',
        !checks.numbers && '请包含数字',
        !checks.symbols && '请包含特殊字符(@$!%*?&)',
      ].filter(Boolean),
    };
  }

  static getStrengthColor(strength: string): string {
    switch (strength) {
      case 'weak':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'strong':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  }

  static getStrengthText(strength: string): string {
    switch (strength) {
      case 'weak':
        return '弱';
      case 'medium':
        return '中';
      case 'strong':
        return '强';
      default:
        return '无';
    }
  }
}

// 表单验证助手
export class FormValidator {
  static validateEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return '请输入邮箱';
    if (!emailRegex.test(email)) return '邮箱格式不正确';
    if (email.length > 255) return '邮箱不能超过255个字符';
    return null;
  }

  static validatePassword(password: string): string | null {
    if (!password) return '请输入密码';
    if (password.length < 8) return '密码至少需要8个字符';
    if (password.length > 128) return '密码不能超过128个字符';

    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (!hasLowerCase || !hasUpperCase || !hasNumbers || !hasSpecialChar) {
      return '密码必须包含大小写字母、数字和特殊字符';
    }

    return null;
  }

  static validateUsername(username: string): string | null {
    if (!username) return null; // username是可选的
    if (username.length < 3) return '用户名至少需要3个字符';
    if (username.length > 30) return '用户名不能超过30个字符';
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return '用户名只能包含英文字母、数字、下划线和连字符';
    }
    return null;
  }
}
