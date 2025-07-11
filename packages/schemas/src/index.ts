// ==============================
// 📋 统一模式库 (客户端/服务端共用)
// ==============================

// 基础模式
export * from './base';

// 认证模式
// export * from './auth.ts.backup';
export * from './auth';

// 用户模式 (从原认证服务迁移)
export * from './user';

// 课程模式
export * from './course';

// 交易(支付)模式
export * from './transaction';

// 用户课程进度模式
export * from './user-course-progress';

// API模式 (从原common包迁移)
// export * from './api.ts.backup';

// Web UI专用模式
// export { chapterSchema, courseSchema, sectionSchema } from './ui';
export * from './ui';

// 工具类
export * from './utils';

// 工具函数
export function validateEmail(email: string): {
  isValid: boolean;
  errors: string[];
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const errors: string[] = [];

  if (!email) {
    errors.push('请输入邮箱');
  } else {
    if (email.length > 255) errors.push('邮箱不能超过255个字符');
    if (!emailRegex.test(email)) errors.push('邮箱格式不正确');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password) {
    errors.push('请输入密码');
  } else {
    if (password.length < 8)
      errors.push('密码长度至少为8个字符');
    if (password.length > 128)
      errors.push('密码不能超过128个字符');

    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (!hasLowerCase || !hasUpperCase || !hasNumbers || !hasSpecialChar) {
      errors.push(
        '密码必须包含大小写字母、数字和特殊字符(@$!%*?&)'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function isValidCuid2(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.length !== 24) return false;
  const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
  return cuid2Regex.test(id);
}
