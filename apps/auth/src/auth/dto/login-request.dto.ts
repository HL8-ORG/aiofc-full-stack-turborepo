// apps/auth/src/dto/login-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LoginRequestDto {
  @ApiProperty({ example: 'student1@example.com', description: '用户邮箱' })
  email: string;

  @ApiProperty({ example: 'password123', description: '密码' })
  password: string;
}
