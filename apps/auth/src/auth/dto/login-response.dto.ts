// apps/auth/src/dto/login-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';
import { AuthTokensDto } from './auth-tokens.dto';
import { getSchemaPath } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({
    type: 'object',
    properties: {
      user: { type: () => UserDto }, // Use type function
      tokens: { type: () => AuthTokensDto },
    },
  })
  data: {
    user: UserDto;
    tokens: AuthTokensDto;
  };
}
