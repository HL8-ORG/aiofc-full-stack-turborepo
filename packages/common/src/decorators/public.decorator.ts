import { SetMetadata } from '@nestjs/common';

/**
 * 🔓 公共端点装饰器
 * 
 * 标记为公共的端点将绕过 JWT 认证守卫。
 * 
 * 使用示例:
 * ```typescript
 * @Public()
 * @Get('public-endpoint')
 * async publicEndpoint() {
 *   return 'This endpoint is public';
 * }
 * ```
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
