// apps/auth/src/dto/register-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';

export class RegisterResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({
    type: 'object',
    properties: {
      user: { type: () => UserDto },  // Correct syntax for nested DTO
    },
  })
  data: {
    user: UserDto;
  };
}
