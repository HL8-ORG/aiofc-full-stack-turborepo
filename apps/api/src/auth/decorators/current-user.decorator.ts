import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * 获取当前认证用户信息的装饰器
 * 
 * 返回由 JWT 守卫设置在 request.user 中的用户信息
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: '找不到认证用户信息。请检查是否设置了 JWT 认证守卫。',
        hint: '请添加 UseGuards(ApiJwtAuthGuard)'
      });
    }

    // 请求特定字段时
    if (data) {
      const value = user[data];
      if (value === undefined) {
        throw new BadRequestException({
          code: 'USER_FIELD_NOT_FOUND',
          message: `用户对象中不存在 '${data}' 字段`,
          availableFields: Object.keys(user),
          requestedField: data
        });
      }
      return value;
    }

    return user;
  },
);
