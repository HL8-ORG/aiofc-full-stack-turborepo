// 令牌管理工具
import type { AuthTokens } from '@repo/schemas';

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  static setTokens(accessToken: string, refreshToken: string): void;
  static setTokens(tokens: AuthTokens): void;
  static setTokens(accessTokenOrTokens: string | AuthTokens, refreshToken?: string): void {
    if (typeof window !== 'undefined') {
      if (typeof accessTokenOrTokens === 'string') {
        // setTokens(accessToken, refreshToken) 形式
        localStorage.setItem(this.ACCESS_TOKEN_KEY, accessTokenOrTokens);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken!);
      } else {
        // setTokens(tokens) 形式
        localStorage.setItem(this.ACCESS_TOKEN_KEY, accessTokenOrTokens.accessToken);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, accessTokenOrTokens.refreshToken);
      }
    }
  }

  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  static clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
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
    if (!username) return null; // 用户名是可选的
    if (username.length < 3) return '用户名至少需要3个字符';
    if (username.length > 30) return '用户名不能超过30个字符';
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return '用户名只能使用英文、数字、下划线和连字符';
    }
    return null;
  }
}
