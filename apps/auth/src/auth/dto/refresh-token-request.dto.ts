// apps/auth/src/dto/refresh-token-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenRequestDto {
  @ApiProperty({ example: 'eyJhbGci...', description: '刷新令牌' })
  refreshToken: string;
}
