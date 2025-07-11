import { SetMetadata } from '@nestjs/common';

/**
 * 公开端点装饰器
 * 
 * 使用此装饰器的端点将跳过 JWT 认证。
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
