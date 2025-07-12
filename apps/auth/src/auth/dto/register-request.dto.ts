// apps/auth/src/dto/register-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class RegisterRequestDto {
  @ApiProperty({ example: 'newuser@example.com', description: '用户邮箱' })
  email: string;

  @ApiProperty({ example: 'Password123!', description: '密码' })
  password: string;

  @ApiProperty({ example: 'newuser', description: '用户名' })
  username?: string;

  @ApiProperty({ example: '洪', description: '名字' })
  firstName?: string;

  @ApiProperty({ example: '吉童', description: '姓氏' })
  lastName?: string;
}
