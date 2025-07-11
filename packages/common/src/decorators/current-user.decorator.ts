import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * 🙋‍♂️ 当前用户信息提取装饰器
 * 
 * 在控制器方法中轻松使用经过 JWT 认证的用户信息。
 * 
 * 使用示例:
 * - @CurrentUser() user: User - 完整用户对象
 * - @CurrentUser('userId') userId: string - 仅用户 ID
 * - @CurrentUser('email') email: string - 仅邮箱
 * 
 * 注意: 此装饰器必须与 @UseGuards(JwtAuthGuard) 一起使用。
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 如果没有用户信息则报错(认证守卫未正常工作的情况)
    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: '找不到已认证的用户信息。请检查是否配置了 JWT 认证守卫。',
        hint: '请添加 UseGuards(JwtAuthGuard)'
      });
    }

    // 请求特定字段的情况
    if (data) {
      const value = user[data];
      
      // 请求的字段不存在或为 undefined 时警告
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

    // 返回完整用户对象
    return user;
  },
);
