// apps/auth/src/dto/password-strength-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PasswordStrengthRequestDto {
  @ApiProperty({ example: 'MyStrongPassword123!', description: '密码' })
  password: string;
}
