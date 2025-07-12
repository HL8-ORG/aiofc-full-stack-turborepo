/**
 * @file auth.controller.ts
 * @description 认证控制器,处理用户认证相关的请求
 * @module auth/controller
 * 
 * @mechanism
 * 1. 认证流程:
 *    - 注册: 创建新用户并存储加密密码
 *    - 登录: 验证凭据并签发JWT令牌
 *    - 刷新: 使用刷新令牌获取新访问令牌
 *    - 登出: 使令牌失效
 * 
 * 2. 安全机制:
 *    - JWT令牌认证
 *    - 密码加密存储
 *    - 令牌轮换
 *    - IP和设备追踪
 * 
 * 3. 数据验证:
 *    - Zod schema验证
 *    - DTO类型检查
 *    - Swagger文档
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import express from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  extractClientIp,
  extractBearerToken,
  prepareSecurityLogData,
  Public,
  CurrentUser,
  ZodBody,
  ZodValidationPipe,
} from '@repo/common';

// 从统一的 schemas 包导入 Zod schema
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordStrengthSchema,
  updateProfileSchema,
  type RegisterDto,
  type LoginDto,
  type RefreshTokenDto,
  type UpdateProfileDto,
} from '@repo/schemas';

import { SuccessResponseDto } from './dto/success-response.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { UserDto } from './dto/user.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { PasswordStrengthRequestDto } from './dto/password-strength-request.dto';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';

/**
 * @class AuthController
 * @description 认证控制器类
 * @mechanism 处理所有认证相关的HTTP请求
 */
@ApiTags('🔐 认证 (Authentication)')
@ApiExtraModels(
  LoginRequestDto,
  RegisterRequestDto,
  RefreshTokenRequestDto,
  PasswordStrengthRequestDto,
  UpdateProfileRequestDto,
  ErrorResponseDto,
)
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * 注册
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ZodBody(registerSchema)
  @ApiOperation({ 
    summary: '用户注册',
    description: '创建新用户账号' 
  })
  @ApiBody({ 
    type: RegisterRequestDto,
    description: '注册信息'
  })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求数据无效',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '邮箱或用户名已存在',
    type: ErrorResponseDto,
  })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        success: true,
        message: result.message,
        data: {
          user: result.user,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`注册失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 登录
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ZodBody(loginSchema)
  @ApiOperation({ 
    summary: '用户登录',
    description: '使用邮箱和密码登录并获取 JWT 令牌' 
  })
  @ApiBody({ 
    type: LoginRequestDto,
    description: '登录信息',
    examples: {
      student: {
        summary: '学生账号',
        value: {
          email: 'student1@example.com',
          password: 'password123'
        }
      },
      instructor: {
        summary: '讲师账号',
        value: {
          email: 'instructor1@example.com',
          password: 'password123'
        }
      },
      admin: {
        summary: '管理员账号',
        value: {
          email: 'admin@example.com',
          password: 'password123'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '登录信息无效',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求数据无效',
    type: ErrorResponseDto,
  })
  async login(@Body() loginDto: LoginDto, @Req() req: express.Request) {
    try {
      // 使用工具函数提取 IP 和代理信息
      const clientIp = extractClientIp(req);
      const userAgent = req.get('User-Agent');

      // 准备安全日志数据
      const securityLogData = prepareSecurityLogData(req, {
        action: 'login_attempt',
        email: loginDto.email,
      });

      this.logger.log(`登录尝试: ${loginDto.email}`, securityLogData);

      const result = await this.authService.login(
        loginDto,
        clientIp,
        userAgent
      );

      return {
        success: true,
        message: '登录成功',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`登录失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 令牌刷新
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ZodBody(refreshTokenSchema)
  @ApiOperation({ 
    summary: '令牌刷新',
    description: '使用刷新令牌获取新的访问令牌' 
  })
  @ApiBody({ 
    type: RefreshTokenRequestDto,
    description: '刷新令牌'
  })
  @ApiResponse({
    status: 200,
    description: '令牌刷新成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '令牌已刷新' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            expiresIn: { type: 'number', example: 900 }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '刷新令牌无效',
    type: ErrorResponseDto,
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      // 从刷新令牌中提取令牌 ID
      const refreshToken = refreshTokenDto.refreshToken;
      const tokenPayload = await this.authService.validateToken(
        refreshToken,
        'refresh'
      );

      if (!tokenPayload) {
        throw new UnauthorizedException('刷新令牌无效');
      }

      const tokens = await this.authService.refreshTokens(
        refreshToken,
        tokenPayload.tokenId
      );

      return {
        success: true,
        message: '令牌已刷新',
        data: tokens,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`令牌刷新失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 登出
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: '登出',
    description: '从当前设备登出。访问令牌将被失效。' 
  })
  @ApiResponse({
    status: 200,
    description: '登出成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '登出成功' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '需要认证',
    type: ErrorResponseDto,
    examples: {
      'missing-token': {
        summary: '缺少令牌',
        value: {
          success: false,
          statusCode: 401,
          error: 'Unauthorized',
          message: '需要认证',
          details: '需要 Authorization 头。请使用 "Bearer <token>" 格式。',
          timestamp: '2025-06-18T02:56:45.000Z',
          path: '/api/v1/auth/logout',
          method: 'POST'
        }
      }
    }
  })
  async logout(
    @CurrentUser('userId') userId: string,
    @Req() req: express.Request
  ) {
    try {
      // 使用工具函数提取令牌
      const accessToken = extractBearerToken(req);
      
      // 安全日志
      const securityLogData = prepareSecurityLogData(req, {
        action: 'logout',
        userId,
      });
      
      this.logger.log(`登出尝试: ${userId}`, securityLogData);
      
      await this.authService.logout(userId, accessToken);

      return {
        success: true,
        message: '登出成功',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`登出失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 从所有设备登出
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: '从所有设备登出',
    description: '从用户的所有设备登出。所有令牌将被失效。' 
  })
  @ApiResponse({
    status: 200,
    description: '全部登出成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '已从所有设备登出' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '需要认证',
    type: ErrorResponseDto,
  })
  async logoutFromAllDevices(@CurrentUser('userId') userId: string) {
    try {
      await this.authService.logoutFromAllDevices(userId);

      return {
        success: true,
        message: '已从所有设备登出',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`全部登出失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 获取用户资料 (用于认证测试)
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: '获取用户资料',
    description: '获取当前登录用户的资料信息' 
  })
  @ApiResponse({
    status: 200,
    description: '获取资料成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: 'm3n4o5p6q7r8s9t0u1v2w3x4' },
            id: { type: 'string', example: 'm3n4o5p6q7r8s9t0u1v2w3x4' },
            email: { type: 'string', example: 'student1@example.com' },
            username: { type: 'string', example: 'student_park' },
            name: { type: 'string', example: '朴学生' },
            role: { type: 'string', example: 'USER' },
            isVerified: { type: 'boolean', example: true },
            isActive: { type: 'boolean', example: true }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '需要认证',
    type: ErrorResponseDto,
    examples: {
      'missing-token': {
        summary: '缺少令牌',
        value: {
          success: false,
          statusCode: 401,
          error: 'Unauthorized',
          message: '需要认证',
          details: '需要 Authorization 头。请使用 "Bearer <token>" 格式。',
          timestamp: '2025-06-18T02:56:45.000Z',
          path: '/api/v1/auth/profile',
          method: 'GET'
        }
      },
      'invalid-token': {
        summary: '令牌无效',
        value: {
          success: false,
          statusCode: 401,
          error: 'Invalid Token',
          message: '令牌无效',
          details: '令牌格式错误或签名无效',
          timestamp: '2025-06-18T02:56:45.000Z',
          path: '/api/v1/auth/profile',
          method: 'GET'
        }
      },
      'expired-token': {
        summary: '令牌过期',
        value: {
          success: false,
          statusCode: 401,
          error: 'Token Expired',
          message: '访问令牌已过期',
          details: '请使用 /auth/refresh 端点获取新令牌',
          timestamp: '2025-06-18T02:56:45.000Z',
          path: '/api/v1/auth/profile',
          method: 'GET'
        }
      }
    }
  })
  async getProfile(@CurrentUser() user: any) {
    return {
      success: true,
      data: user,
    };
  }

  /**
   * 更新用户资料
   */
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: '更新用户资料',
    description: '更新当前登录用户的资料信息' 
  })
  @ApiBody({ 
    type: UpdateProfileRequestDto,
    description: '要更新的资料信息'
  })
  @ApiResponse({
    status: 200,
    description: '资料更新成功 (重要信息变更时包含新令牌)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '资料更新成功。已发放新令牌。' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'm3n4o5p6q7r8s9t0u1v2w3x4' },
                email: { type: 'string', example: 'student1@example.com' },
                username: { type: 'string', example: 'new_username' },
                firstName: { type: 'string', example: '金' },
                lastName: { type: 'string', example: '哲洙' },
                bio: { type: 'string', example: '你好,我是一名开发者' },
                location: { type: 'string', example: '首尔,韩国' },
                website: { type: 'string', example: 'https://example.com' },
                phone: { type: 'string', example: '010-1234-5678' },
                avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                isEmailVerified: { type: 'boolean', example: true },
                createdAt: { type: 'string', example: '2025-06-02T11:00:00.000Z' },
                updatedAt: { type: 'string', example: '2025-06-19T07:58:30.000Z' }
              }
            },
            tokens: {
              type: 'object',
              description: '仅在用户名、姓名等重要信息变更时包含',
              properties: {
                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                expiresIn: { type: 'number', example: 900 },
                tokenType: { type: 'string', example: 'Bearer' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '需要认证',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求数据无效',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '用户名已被使用',
    type: ErrorResponseDto,
  })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateProfileDto: any // 临时使用 any 类型
  ) {
    try {
      // 手动验证 Zod schema
      const validatedData = updateProfileSchema.parse(updateProfileDto);
      
      const result = await this.authService.updateProfile(userId, validatedData);
      
      const response: any = {
        success: true,
        message: result.message,
        data: {
          user: result.user,
        },
      };

      // 如果有新令牌则包含在响应中
      if (result.tokens) {
        response.data.tokens = result.tokens;
        response.message += ' 已发放新令牌。';
      }

      return response;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`资料更新失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 检查密码强度
   */
  @Public()
  @Post('check-password-strength')
  @HttpCode(HttpStatus.OK)
  @ZodBody(passwordStrengthSchema)
  @ApiOperation({ 
    summary: '检查密码强度',
    description: '检查输入密码的强度' 
  })
  @ApiBody({ 
    type: PasswordStrengthRequestDto,
    description: '要检查强度的密码'
  })
  @ApiResponse({
    status: 200,
    description: '密码强度检查结果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            password: { type: 'string', example: 'MyStrongPassword123!' },
            score: { type: 'number', example: 5 },
            strength: { type: 'string', example: 'strong' },
            checks: {
              type: 'object',
              properties: {
                length: { type: 'boolean', example: true },
                lowercase: { type: 'boolean', example: true },
                uppercase: { type: 'boolean', example: true },
                numbers: { type: 'boolean', example: true },
                symbols: { type: 'boolean', example: true }
              }
            },
            suggestions: { type: 'array', items: { type: 'string' }, example: [] }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '请求数据无效',
    type: ErrorResponseDto,
  })
  async checkPasswordStrength(@Body() body: { password: string }) {
    try {
      const result = passwordStrengthSchema.parse(body);

      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`密码强度检查失败: ${errorMessage}`);
      throw new BadRequestException('密码强度检查失败');
    }
  }

  /**
   * 健康检查端点
   */
  @Public()
  @Get('health')
  @ApiOperation({ 
    summary: '健康检查',
    description: '检查认证服务的状态' 
  })
  @ApiResponse({
    status: 200,
    description: '服务正常',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'auth-service' },
        timestamp: { type: 'string', example: '2025-06-18T02:56:45.199Z' }
      }
    }
  })
  getHealth() {
    return {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };
  }

  // === 调试方法 ===

  /**
   * 获取用户列表 (调试用)
   */
  @Public()
  @Get('debug/users')
  @ApiOperation({ 
    summary: '[调试] 获取用户列表',
    description: '在开发环境中获取所有用户列表' 
  })
  @ApiResponse({
    status: 200,
    description: '用户列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'm3n4o5p6q7r8s9t0u1v2w3x4' },
              email: { type: 'string', example: 'student1@example.com' },
              username: { type: 'string', example: 'student_park' },
              firstName: { type: 'string', example: '朴' },
              lastName: { type: 'string', example: '学生' },
              isActive: { type: 'boolean', example: true },
              isEmailVerified: { type: 'boolean', example: true },
              createdAt: { type: 'string', example: '2025-06-02T11:00:00.000Z' },
              updatedAt: { type: 'string', example: '2025-06-17T06:38:24.855Z' }
            }
          }
        }
      }
    }
  })
  async getUsers() {
    try {
      const users = await this.authService.getUsers();
      return {
        success: true,
        data: users,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`사용자 목록 조회 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * JWT 시크릿 확인 (디버깅용)
   */
  @Public()
  @Get('debug/jwt-config')
  @ApiOperation({ 
    summary: '[디버깅] JWT 설정 확인',
    description: '개발환경에서 JWT 설정 상태를 확인합니다.' 
  })
  @ApiResponse({
    status: 200,
    description: 'JWT 설정 정보',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            accessSecret_preview: { type: 'string', example: 'abcd1234...' },
            refreshSecret_preview: { type: 'string', example: 'efgh5678...' },
            expiresIn: { type: 'string', example: '15m' },
            JWT_ACCESS_SECRET_env: { type: 'string', example: 'abcd1234...' },
            REFRESH_TOKEN_SECRET_env: { type: 'string', example: 'efgh5678...' }
          }
        }
      }
    }
  })
  async getJwtConfig() {
    const configService = this.authService['configService'];
    const accessSecret = configService.get<string>('jwt.accessToken.secret');
    const refreshSecret = configService.get<string>('jwt.refreshToken.secret');
    const expiresIn = configService.get<string>('jwt.accessToken.expiresIn');

    return {
      success: true,
      data: {
        accessSecret_preview: accessSecret
          ? accessSecret.substring(0, 8) + '...'
          : 'NONE',
        refreshSecret_preview: refreshSecret
          ? refreshSecret.substring(0, 8) + '...'
          : 'NONE',
        expiresIn,
        JWT_ACCESS_SECRET_env: process.env.JWT_ACCESS_SECRET
          ? process.env.JWT_ACCESS_SECRET.substring(0, 8) + '...'
          : 'NONE',
        REFRESH_TOKEN_SECRET_env: process.env.REFRESH_TOKEN_SECRET
          ? process.env.REFRESH_TOKEN_SECRET.substring(0, 8) + '...'
          : 'NONE',
      },
    };
  }
}
