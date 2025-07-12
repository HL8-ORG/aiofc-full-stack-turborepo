/**
 * @description 认证令牌管理工具类 - 提供令牌的存储、获取和验证功能
 * @remarks
 * - 使用 localStorage 存储令牌
 * - 支持访问令牌和刷新令牌的管理
 * - 提供令牌过期检查
 * - 兼容服务端渲染(SSR)环境
 */
import type { AuthTokens } from '@repo/schemas';

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  /**
   * 存储认证令牌
   * @param accessToken - 访问令牌字符串
   * @param refreshToken - 刷新令牌字符串
   * @remarks 支持两种调用方式:
   * 1. setTokens(accessToken, refreshToken)
   * 2. setTokens({ accessToken, refreshToken })
   */
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

  /**
   * 获取访问令牌
   * @returns 访问令牌字符串,不存在则返回 null
   */
  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  /**
   * 获取刷新令牌
   * @returns 刷新令牌字符串,不存在则返回 null
   */
  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  /**
   * 清除所有存储的令牌
   */
  static clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  /**
   * 检查JWT令牌是否过期
   * @param token - JWT令牌字符串
   * @returns 是否已过期
   * @remarks
   * - 解析JWT payload部分
   * - 比较exp时间戳与当前时间
   * - 解析失败视为过期
   */
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

/**
 * @description 密码强度验证工具类 - 提供密码复杂度评估功能
 * @remarks
 * - 检查密码长度、大小写字母、数字和特殊字符
 * - 计算密码强度分数
 * - 提供改进建议
 * - 支持密码强度的可视化展示
 */
export class PasswordValidator {
  /**
   * 验证密码强度
   * @param password - 待验证的密码
   * @returns 包含验证结果的对象
   * @remarks
   * - 评分规则:每满足一项要求得1分
   * - 强度等级:弱(<=2分)、中(3-4分)、强(5分)
   */
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

  /**
   * 获取密码强度对应的颜色类名
   * @param strength - 密码强度级别
   * @returns Tailwind CSS 颜色类名
   */
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

  /**
   * 获取密码强度的中文描述
   * @param strength - 密码强度级别
   * @returns 强度描述文本
   */
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

/**
 * @description 表单验证工具类 - 提供通用的表单字段验证功能
 * @remarks
 * - 支持邮箱格式验证
 * - 支持密码复杂度验证
 * - 支持用户名格式验证
 * - 返回详细的错误提示信息
 */
export class FormValidator {
  /**
   * 验证邮箱格式
   * @param email - 待验证的邮箱地址
   * @returns 错误信息,验证通过返回 null
   * @remarks
   * - 使用正则表达式验证基本格式
   * - 检查长度限制
   */
  static validateEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return '请输入邮箱';
    if (!emailRegex.test(email)) return '邮箱格式不正确';
    if (email.length > 255) return '邮箱不能超过255个字符';
    return null;
  }

  /**
   * 验证密码复杂度
   * @param password - 待验证的密码
   * @returns 错误信息,验证通过返回 null
   * @remarks
   * - 检查密码长度(8-128字符)
   * - 验证必需字符类型(大小写字母、数字、特殊字符)
   */
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

  /**
   * 验证用户名格式
   * @param username - 待验证的用户名
   * @returns 错误信息,验证通过返回 null
   * @remarks
   * - 用户名为可选字段
   * - 长度限制:3-30字符
   * - 允许字符:英文字母、数字、下划线、连字符
   */
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
