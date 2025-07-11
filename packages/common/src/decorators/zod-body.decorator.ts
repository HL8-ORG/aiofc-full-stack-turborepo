import { UsePipes } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
/**
 * 📝 Zod 请求体验证装饰器
 * 
 * 使用 Zod Schema 验证请求体数据的装饰器。
 * 
 * 工作机制:
 * 1. 通过 @UsePipes() 装饰器注册 ZodValidationPipe
 * 2. ZodValidationPipe 会在请求处理前拦截请求体
 * 3. 使用提供的 Zod Schema 对请求体进行验证
 * 4. 验证失败时抛出格式化的错误信息
 * 5. 验证通过后将解析后的数据传递给控制器方法
 * 
 * 使用示例:
 * ```typescript
 * const UserSchema = z.object({
 *   name: z.string(),
 *   age: z.number().min(0)
 * });
 * 
 * @Post()
 * @ZodBody(UserSchema)
 * createUser(@Body() user: z.infer<typeof UserSchema>) {
 *   return this.userService.create(user);
 * }
 * ```
 */

export const ZodBody = (schema: ZodSchema) => UsePipes(new ZodValidationPipe(schema));
