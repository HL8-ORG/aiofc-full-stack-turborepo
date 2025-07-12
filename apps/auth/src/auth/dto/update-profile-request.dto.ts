// apps/auth/src/dto/update-profile-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileRequestDto {
  @ApiProperty({ example: 'newusername', description: '用户名' })
  username?: string;

  @ApiProperty({ example: '金', description: '名字' })
  firstName?: string;

  @ApiProperty({ example: '哲洙', description: '姓氏' })
  lastName?: string;

  @ApiProperty({ example: '你好,我是一名开发者', description: '个人简介' })
  bio?: string;

  @ApiProperty({ example: '首尔,韩国', description: '位置' })
  location?: string;

  @ApiProperty({ example: 'https://example.com', description: '网站' })
  website?: string;

  @ApiProperty({ example: '1990-01-01', description: '出生日期' })
  dateOfBirth?: string;

  @ApiProperty({ example: '010-1234-5678', description: '电话号码' })
  phone?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', description: '头像 URL' })
  avatar?: string;
}
