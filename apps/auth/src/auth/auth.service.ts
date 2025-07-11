import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService, RedisService } from '@repo/database';
import { generateId, parseTimeString } from '@repo/common'; // 🆔 CUID2生成工具
import { RegisterDto, LoginDto, UpdateProfileDto } from '@repo/schemas';
import {
  JwtPayload,
  JwtRefreshPayload,
  SocialUser,
  TokenPair,
  LoginResponse,
} from './interfaces/auth.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  // 🔐 安全配置值 - 从环境变量动态加载
  private readonly maxLoginAttempts: number;
  private readonly lockoutDuration: number;
  private readonly maxIpAttempts: number;
  private readonly logAuthAttempts: boolean;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private prismaService: PrismaService
  ) {
    // 🔐 安全配置值初始化
    const securityConfig = this.configService.get('security.bruteForce');
    this.maxLoginAttempts = securityConfig?.maxLoginAttempts || 5;
    this.lockoutDuration = (securityConfig?.lockoutDurationMinutes || 15) * 60; // 分钟 -> 秒转换
    this.maxIpAttempts = securityConfig?.maxIpAttempts || 10;
    this.logAuthAttempts = this.configService.get('security.logging.logAuthAttempts', true);

    // 🔍 配置状态日志
    this.logger.log('🔐 安全配置加载完成:');
    this.logger.log(`  - 最大登录尝试次数: ${this.maxLoginAttempts}次`);
    this.logger.log(`  - 账户锁定时间: ${this.lockoutDuration / 60}分钟`);
    this.logger.log(`  - IP最大尝试次数: ${this.maxIpAttempts}次`);
    this.logger.log(`  - 认证日志: ${this.logAuthAttempts ? '启用' : '禁用'}`);

    // JWT配置调试(仅在开发环境)
    if (this.configService.get('security.logging.logSensitiveData', false)) {
      const accessSecret = this.configService.get<string>('jwt.accessToken.secret');
      const refreshSecret = this.configService.get<string>('jwt.refreshToken.secret');
      const expiresIn = this.configService.get<string>('jwt.accessToken.expiresIn');

      this.logger.debug('🔍 JWT配置状态:');
      this.logger.debug(`  - Access Secret: ${accessSecret ? accessSecret.substring(0, 8) + '...' : '无'}`);
      this.logger.debug(`  - Refresh Secret: ${refreshSecret ? refreshSecret.substring(0, 8) + '...' : '无'}`);
      this.logger.debug(`  - Expires In: ${expiresIn}`);
    }
  }

  /**
   * 用户注册
   * @param registerDto 注册数据
   * @returns 注册结果
   */
  async register(
    registerDto: RegisterDto
  ): Promise<{ message: string; user: any }> {
    try {
      const user = await this.usersService.create(registerDto);

      // 记录登录历史
      await this.createLoginHistory({
        userId: user.id,
        email: user.email,
        success: true,
        provider: 'local',
      });

      this.logger.log(`新用户注册: ${user.email}`);

      return {
        message: '注册完成',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isVerified, // isVerified -> isEmailVerified 映射
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('注册处理过程中出错:', error);

      // 根据已知错误类型处理消息
      if (error instanceof ConflictException) {
        throw error; // 邮箱/用户名已被使用错误
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : '发生未知错误';
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * 用户登录
   * @param loginDto 登录数据
   * @param ipAddress 客户端IP地址
   * @param userAgent 用户代理
   * @returns 登录结果
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    const { email, password } = loginDto;

    // 暴力破解防护检查
    await this.checkBruteForceProtection(email, ipAddress);

    try {
      // 查询用户
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        await this.handleFailedLogin(email, ipAddress, userAgent);
        throw new UnauthorizedException(
          '邮箱或密码不正确'
        );
      }

      // 密码验证
      if (
        !user.password ||
        !(await this.usersService.validatePassword(password, user.password))
      ) {
        await this.handleFailedLogin(email, ipAddress, userAgent);
        throw new UnauthorizedException(
          '邮箱或密码不正确'
        );
      }

      // 检查账户激活状态
      if (!user.isActive) {
        await this.handleFailedLogin(email, ipAddress, userAgent);
        throw new UnauthorizedException('账户已被禁用');
      }

      // 登录成功处理
      await this.handleSuccessfulLogin(user.id, email, ipAddress, userAgent);

      // 生成令牌
      const tokens = await this.generateTokenPair(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username || '',
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isVerified, // isVerified -> isEmailVerified 映射
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        tokens,
      };
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        const errorMessage =
          error instanceof Error ? error.message : '发生未知错误';
        this.logger.error(`登录处理过程中出错: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * 社交登录处理
   * @param socialUser 社交用户信息
   * @returns 登录结果
   */
  async handleSocialLogin(socialUser: SocialUser): Promise<LoginResponse> {
    try {
      let user: any = await this.usersService.findBySocialAccount(
        socialUser.provider,
        socialUser.providerId
      );

      if (!user) {
        // 通过邮箱查找现有用户
        const existingUser = await this.usersService.findByEmail(
          socialUser.email
        );

        if (existingUser) {
          // 为现有用户关联社交账号
          await this.usersService.linkSocialAccount(existingUser.id, {
            provider: socialUser.provider,
            providerId: socialUser.providerId,
            providerData: {
              accessToken: socialUser.accessToken,
              refreshToken: socialUser.refreshToken,
            },
          });

          user = await this.usersService.findById(existingUser.id);
        } else {
          // 创建新用户
          user = await this.usersService.createWithSocialAccount({
            providerId: socialUser.providerId,
            provider: socialUser.provider,
            email: socialUser.email,
            firstName: socialUser.firstName,
            lastName: socialUser.lastName,
            username: socialUser.username,
            avatar: socialUser.avatar,
            providerData: {
              accessToken: socialUser.accessToken,
              refreshToken: socialUser.refreshToken,
            },
          });
        }
      }

      // 记录登录历史
      await this.createLoginHistory({
        userId: user.id,
        email: user.email,
        success: true,
        provider: socialUser.provider,
      });

      // 更新最后登录时间
      await this.usersService.updateLastLogin(user.id);

      // 生成令牌
      const tokens = await this.generateTokenPair(user);

      this.logger.log(
        `社交登录成功: ${user.email} (${socialUser.provider})`
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isVerified, // isVerified -> isEmailVerified 映射
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        tokens,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '发生未知错误';
      this.logger.error(`社交登录处理过程中出错: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 刷新令牌
   * @param refreshToken 刷新令牌
   * @param tokenId 令牌ID
   * @returns 新的令牌对
   */
  async refreshTokens(
    refreshToken: string,
    tokenId: string
  ): Promise<TokenPair> {
    try {
      // 验证刷新令牌
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshToken.secret'),
      }) as JwtRefreshPayload;

      // 在Redis中验证令牌有效性
      if (
        !(await this.redisService.isRefreshTokenValid(payload.sub, tokenId))
      ) {
        throw new UnauthorizedException('刷新令牌无效');
      }

      // 查询用户
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException(
          '找不到用户或用户已被禁用'
        );
      }

      // 使现有刷新令牌失效
      await this.redisService.removeRefreshToken(payload.sub, tokenId);

      // 生成新的令牌对
      const tokens = await this.generateTokenPair(user);

      this.logger.debug(`令牌刷新完成: ${user.email}`);

      return tokens;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '发生未知错误';
      this.logger.error(`令牌刷新失败: ${errorMessage}`);
      throw new UnauthorizedException('令牌刷新失败');
    }
  }

  /**
   * 登出
   * @param userId 用户ID
   * @param accessToken 访问令牌
   * @param refreshTokenId 刷新令牌ID (可选)
   */
  async logout(
    userId: string,
    accessToken: string,
    refreshTokenId?: string
  ): Promise<void> {
    try {
      // 将访问令牌加入黑名单
      const tokenPayload = this.jwtService.decode(accessToken) as JwtPayload;
      if (tokenPayload && tokenPayload.exp) {
        const expiresIn = tokenPayload.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await this.redisService.addToBlacklist(accessToken, expiresIn);
        }
      }

      // 使特定刷新令牌失效或使所有令牌失效
      if (refreshTokenId) {
        await this.redisService.removeRefreshToken(userId, refreshTokenId);
      } else {
        await this.redisService.blacklistUserTokens(userId);
      }

      this.logger.log(`用户登出: ${userId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '发生未知错误';
      this.logger.error(`登出处理过程中出错: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 从所有设备登出
   * @param userId 用户ID
   */
  async logoutFromAllDevices(userId: string): Promise<void> {
    try {
      await this.redisService.blacklistUserTokens(userId);
      this.logger.log(`用户从所有设备登出: ${userId}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`全部登出处理过程中出错: ${error.message}`);
      } else {
        this.logger.error(
          '全部登出处理过程中发生未知错误'
        );
      }
      throw error;
    }
  }

  /**
   * 生成令牌对
   * 
   * 业务逻辑:
   * 1. 生成JWT载荷(使用sub声明)
   * 2. 为刷新令牌添加唯一ID
   * 3. 异步同时生成
   * 4. 在Redis中存储刷新令牌
   * 5. 计算过期时间并返回
   * 
   * @param user 用户信息
   * @returns 令牌对(accessToken, refreshToken, expiresIn, tokenType)
   */
  private async generateTokenPair(user: any): Promise<TokenPair> {
    // 标准JWT载荷(移除重复字段)
    const payload: JwtPayload = {
      sub: user.id, // 标准JWT 'sub'声明
      email: user.email,
      username: user.username,
      role: user.role || 'user',
    };

    // 为刷新令牌生成唯一ID
    const tokenId = uuidv4();
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      tokenId,
    };

    this.logger.debug('🔑 生成JWT令牌 - 载荷:', {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    });

    try {
      // 生成令牌
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          secret: this.configService.get<string>('jwt.accessToken.secret'),
          expiresIn: this.configService.get<string>('jwt.accessToken.expiresIn'),
        }),
        this.jwtService.signAsync(refreshPayload, {
          secret: this.configService.get<string>('jwt.refreshToken.secret'),
          expiresIn: this.configService.get<string>('jwt.refreshToken.expiresIn'),
        }),
      ]);

      this.logger.log(`✅ JWT令牌生成完成 - 用户: ${user.email}`);
      this.logger.debug('🔍 生成的访问令牌预览:', accessToken.substring(0, 50) + '...');

      // 在Redis中存储刷新令牌(使用工具函数)
      const refreshExpiresIn = parseTimeString(
        this.configService.get<string>('jwt.refreshToken.expiresIn', '7d')
      );
      await this.redisService.storeRefreshToken(user.id, tokenId, refreshExpiresIn);

      // 计算过期时间(使用工具函数)
      const accessExpiresIn = parseTimeString(
        this.configService.get<string>('jwt.accessToken.expiresIn', '15m')
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: accessExpiresIn,
        tokenType: 'Bearer'
      };
    } catch (error) {
      this.logger.error('😱 JWT令牌生成失败:', error);
      throw new Error(`令牌生成失败: ${error.message}`);
    }
  }

  /**
   * 暴力破解防护检查
   * @param identifier 标识符(邮箱或IP)
   * @param ipAddress IP地址
   */
  private async checkBruteForceProtection(
    identifier: string,
    ipAddress?: string
  ): Promise<void> {
    const emailAttempts = await this.redisService.getLoginAttempts(identifier);
    const ipAttempts = ipAddress
      ? await this.redisService.getLoginAttempts(ipAddress)
      : 0;

    // 🔐 使用动态配置值
    if (
      emailAttempts >= this.maxLoginAttempts ||
      ipAttempts >= this.maxIpAttempts
    ) {
      const lockoutMinutes = this.lockoutDuration / 60;
      throw new BadRequestException(
        `登录尝试次数过多。请${lockoutMinutes}分钟后重试。`
      );
    }
  }

  /**
   * 登录失败处理
   * @param email 邮箱
   * @param ipAddress IP地址
   * @param userAgent 用户代理
   */
  private async handleFailedLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // 增加失败次数(使用动态配置值)
    await this.redisService.incrementLoginAttempts(
      email,
      this.lockoutDuration
    );
    if (ipAddress) {
      await this.redisService.incrementLoginAttempts(
        ipAddress,
        this.lockoutDuration
      );
    }

    // 记录登录历史(根据配置选择性记录)
    if (this.logAuthAttempts) {
      await this.createLoginHistory({
        email,
        success: false,
        ipAddress,
        userAgent,
        provider: 'local',
      });
    }

    this.logger.warn(`登录失败: ${email} (IP: ${ipAddress})`);
  }

  /**
   * 登录成功处理
   * @param userId 用户ID
   * @param email 邮箱
   * @param ipAddress IP地址
   * @param userAgent 用户代理
   */
  private async handleSuccessfulLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // 重置失败次数
    await this.redisService.resetLoginAttempts(email);
    if (ipAddress) {
      await this.redisService.resetLoginAttempts(ipAddress);
    }

    // 更新最后登录时间
    await this.usersService.updateLastLogin(userId);

    // 记录登录历史(根据配置选择性记录)
    if (this.logAuthAttempts) {
      await this.createLoginHistory({
        userId,
        email,
        success: true,
        ipAddress,
        userAgent,
        provider: 'local',
      });
    }

    this.logger.log(`登录成功: ${email} (IP: ${ipAddress})`);
  }

  /**
   * 创建登录历史
   * @param data 登录历史数据
   */
  private async createLoginHistory(data: {
    userId?: string;
    email: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    provider?: string;
  }): Promise<void> {
    try {
      const historyId = generateId(); // 🆔 生成CUID2 ID
      
      await this.prismaService.loginHistory.create({
        data: {
          id: historyId, // 🆔 直接指定CUID2 ID
          ...data,
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '登录历史保存失败';
      this.logger.error(`登录历史保存失败: ${errorMessage}`);
      // 历史保存失败不影响整体登录流程
    }
  }

  /**
   * 令牌有效性验证
   * @param token JWT令牌
   * @param type 令牌类型('access' | 'refresh')
   * @returns 验证结果
   */
  async validateToken(
    token: string,
    type: 'access' | 'refresh' = 'access'
  ): Promise<any> {
    try {
      const secret =
        type === 'access'
          ? this.configService.get<string>('jwt.accessToken.secret')
          : this.configService.get<string>('jwt.refreshToken.secret');

      const payload = this.jwtService.verify(token, { secret });

      // 访问令牌检查黑名单
      if (type === 'access' && (await this.redisService.isBlacklisted(token))) {
        return null;
      }

      // 刷新令牌检查Redis存储
      if (type === 'refresh') {
        const refreshPayload = payload as JwtRefreshPayload;
        if (
          !(await this.redisService.isRefreshTokenValid(
            refreshPayload.sub,
            refreshPayload.tokenId
          ))
        ) {
          return null;
        }
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 更新用户资料
   * @param userId 用户ID
   * @param updateProfileDto 要更新的资料数据
   * @returns 更新后的用户信息和新令牌
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto
  ): Promise<{ message: string; user: any; tokens?: any }> {
    try {
      // 检查用户是否存在
      const existingUser = await this.usersService.findById(userId);
      if (!existingUser) {
        throw new UnauthorizedException('找不到用户');
      }

      // 更新资料
      const updatedUser = await this.usersService.updateProfile(
        userId,
        updateProfileDto
      );

      // 重要信息(用户名、邮箱等)变更时发放新令牌
      let newTokens = null;
      const shouldRefreshToken = 
        updateProfileDto.username || 
        updateProfileDto.firstName || 
        updateProfileDto.lastName;

      if (shouldRefreshToken) {
        // 使用更新后的用户信息生成新令牌
        newTokens = await this.generateTokenPair(updatedUser);
        this.logger.log(`因资料更新而刷新令牌: ${updatedUser.email}`);
      }

      this.logger.log(`用户资料更新: ${updatedUser.email}`);

      return {
        message: '资料更新成功',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          bio: updatedUser.profile?.bio,
          location: updatedUser.profile?.location,
          website: updatedUser.profile?.website,
          dateOfBirth: updatedUser.profile?.dateOfBirth,
          phone: updatedUser.profile?.phone,
          avatar: updatedUser.avatar,
          isEmailVerified: updatedUser.isVerified,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        },
        ...(newTokens && { tokens: newTokens }), // 如果有新令牌则包含
      };
    } catch (error) {
      this.logger.error('资料更新处理过程中出错:', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof ConflictException) {
        throw error; // 用户名重复等
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : '发生未知错误';
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * 获取所有用户(用于调试)
   * @returns 用户列表
   */
  async getUsers(): Promise<any[]> {
    try {
      const result = await this.usersService.findMany({
        filter: {},
        orderBy: { createdAt: 'desc' },
        page: 1,
        limit: 100, // 默认限制100个用户
      });

      // 从分页结果中获取用户数组
      return result.users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isEmailVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '发生未知错误';
      this.logger.error(`获取用户列表失败: ${errorMessage}`);
      throw error;
    }
  }
}
