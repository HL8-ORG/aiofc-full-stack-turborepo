// apps/auth/src/dto/user.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: '用户 ID' })
  id: string;

  @ApiProperty({ description: '邮箱' })
  email: string;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '姓名' })
  name: string;

  @ApiProperty({ description: '角色', enum: ['USER', 'ADMIN', 'INSTRUCTOR'] })
  role: string;
}
