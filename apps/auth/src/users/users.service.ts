import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@repo/database';
import { generateId } from '@repo/common'; // 🆔 CUID2 ID生成工具
import { CreateUserDto, UpdateUserDto } from '@repo/schemas';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  /**
   * 创建用户
   * @param createUserDto 用户创建数据
   * @returns 创建的用户
   */
  async create(createUserDto: CreateUserDto) {
    const { email, password, username, firstName, lastName } = createUserDto;

    // 检查邮箱是否重复
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('该邮箱已被使用');
    }

    // 检查用户名是否重复(如果有)
    if (username) {
      const existingUsername = await this.findByUsername(username);
      if (existingUsername) {
        throw new ConflictException('该用户名已被使用');
      }
    }

    // 🆔 生成 CUID2 ID
    const userId = generateId();
    const profileId = generateId();
    const settingsId = generateId();

    console.log('🆔 生成新用户 ID:', userId);
    console.log('🆔 生成个人资料 ID:', profileId);
    console.log('🆔 生成设置 ID:', settingsId);

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = await this.prismaService.user.create({
      data: {
        id: userId, // 🆔 直接指定 CUID2 ID
        email,
        password: hashedPassword,
        username,
        firstName,
        lastName,
        // 创建默认个人资料和设置
        profile: {
          create: {
            id: profileId, // 🆔 直接指定 CUID2 ID
          },
        },
        settings: {
          create: {
            id: settingsId, // 🆔 直接指定 CUID2 ID
          },
        },
      },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true,
      },
    });

    // 返回时排除密码
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 通过ID查找用户
   * @param id 用户ID
   * @param options 查询选项(可选)
   * @returns 用户信息
   */
  async findById(
    id: string,
    options?: {
      include?: {
        profile?: boolean;
        settings?: boolean;
        socialAccounts?: boolean;
      };
    }
  ) {
    const query = {
      where: { id },
      include: {
        profile: options?.include?.profile ?? true,
        settings: options?.include?.settings ?? true,
        socialAccounts: options?.include?.socialAccounts ?? true,
      },
    };

    const user = await this.prismaService.user.findUnique(query);

    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 通过邮箱查找用户(包含密码)
   * @param email 邮箱
   * @returns 用户信息
   */
  async findByEmail(email: string) {
    return await this.prismaService.user.findUnique({
      where: { email },
      include: {
        socialAccounts: true,
      },
    });
  }

  /**
   * 通过用户名查找用户
   * @param username 用户名
   * @returns 用户信息
   */
  async findByUsername(username: string) {
    return await this.prismaService.user.findUnique({
      where: { username },
    });
  }

  /**
   * 通过社交账号查找用户
   * @param provider 社交平台
   * @param providerId 平台用户ID
   * @returns 用户信息
   */
  async findBySocialAccount(provider: string, providerId: string) {
    const socialAccount = await this.prismaService.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: {
          include: {
            profile: true,
            settings: true,
            socialAccounts: true,
          },
        },
      },
    });

    return socialAccount?.user || null;
  }

  /**
   * 创建社交账号和用户
   * @param socialData 社交登录数据
   * @returns 创建的用户
   */
  async createWithSocialAccount(socialData: {
    providerId: string;
    provider: string;
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
    providerData?: any;
  }) {
    const {
      providerId,
      provider,
      email,
      firstName,
      lastName,
      username,
      avatar,
      providerData,
    } = socialData;

    // 生成唯一用户名(如果重复)
    let uniqueUsername = username;
    if (username) {
      let counter = 1;
      while (await this.findByUsername(uniqueUsername)) {
        uniqueUsername = `${username}${counter}`;
        counter++;
      }
    }

    // 🆔 生成 CUID2 ID
    const userId = generateId();
    const profileId = generateId();
    const settingsId = generateId();
    const socialAccountId = generateId();

    console.log('🆔 生成社交用户 ID:', userId);
    console.log('🆔 生成社交账号 ID:', socialAccountId);

    const user = await this.prismaService.user.create({
      data: {
        id: userId, // 🆔 直接指定 CUID2 ID
        email,
        firstName,
        lastName,
        username: uniqueUsername,
        avatar,
        isVerified: true, // 社交登录视为已验证邮箱
        profile: {
          create: {
            id: profileId, // 🆔 直接指定 CUID2 ID
          },
        },
        settings: {
          create: {
            id: settingsId, // 🆔 直接指定 CUID2 ID
          },
        },
        socialAccounts: {
          create: {
            id: socialAccountId, // 🆔 直接指定 CUID2 ID
            provider,
            providerId,
            providerData,
          },
        },
      },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 为现有用户关联社交账号
   * @param userId 用户ID
   * @param socialData 社交账号数据
   */
  async linkSocialAccount(
    userId: string,
    socialData: {
      providerId: string;
      provider: string;
      providerData?: any;
    }
  ) {
    const { providerId, provider, providerData } = socialData;

    // 🆔 生成 CUID2 ID
    const socialAccountId = generateId();
    console.log('🆔 生成社交账号关联 ID:', socialAccountId);

    return await this.prismaService.socialAccount.create({
      data: {
        id: socialAccountId, // 🆔 直接指定 CUID2 ID
        userId,
        provider,
        providerId,
        providerData,
      },
    });
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param updateUserDto 更新数据
   * @returns 更新后的用户
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('找不到该用户');
    }

    const { password, ...updateData } = updateUserDto;
    let hashedPassword: string | undefined;

    // 如果更新密码则加密
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: {
        ...updateData,
        ...(hashedPassword && {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        }),
      },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true,
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * 验证密码
   * @param plainPassword 明文密码
   * @param hashedPassword 加密后的密码
   * @returns 验证结果
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 更新用户激活状态
   * @param id 用户ID
   * @param isActive 激活状态
   */
  async updateActiveStatus(id: string, isActive: boolean) {
    return await this.prismaService.user.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * 标记用户邮箱已验证
   * @param id 用户ID
   */
  async markEmailAsVerified(id: string) {
    return await this.prismaService.user.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  /**
   * 更新最后登录时间
   * @param id 用户ID
   */
  async updateLastLogin(id: string) {
    return await this.prismaService.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * 更新用户个人资料
   * @param userId 用户ID
   * @param profileData 个人资料数据
   */
  async updateProfile(userId: string, profileData: any) {
    // 检查用户是否存在
    const existingUser = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('找不到该用户');
    }

    // 检查用户名是否重复(仅在更改时)
    if (
      profileData.username &&
      profileData.username !== existingUser.username
    ) {
      const existingUsername = await this.findByUsername(profileData.username);
      if (existingUsername) {
        throw new ConflictException('该用户名已被使用');
      }
    }

    // 分离用户基本信息和个人资料信息
    const {
      username,
      firstName,
      lastName,
      avatar,
      bio,
      location,
      website,
      dateOfBirth,
      phone,
      ...otherProfileData
    } = profileData;

    // 更新用户基本信息
    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        ...(username !== undefined && { username }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(avatar !== undefined && { avatar }),
      },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true,
      },
    });

    // 更新个人资料扩展信息(仅在需要时)
    const profileUpdateData = {
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(website !== undefined && { website }),
      ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
      ...(phone !== undefined && { phone }),
      ...otherProfileData,
    };

    if (Object.keys(profileUpdateData).length > 0) {
      const profileId = generateId(); // 🆔 生成 CUID2 ID

      await this.prismaService.userProfile.upsert({
        where: { userId },
        update: profileUpdateData,
        create: {
          id: profileId, // 🆔 直接指定 CUID2 ID
          userId,
          ...profileUpdateData,
        },
      });
    }

    // 重新查询更新后的用户信息
    const finalUser = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        settings: true,
        socialAccounts: true,
      },
    });

    const { password, ...userWithoutPassword } = finalUser;
    return userWithoutPassword;
  }

  /**
   * 更新用户设置
   * @param userId 用户ID
   * @param settingsData 设置数据
   */
  async updateSettings(userId: string, settingsData: any) {
    try {
      // 检查用户是否存在
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('找不到该用户');
      }

      const settingsId = generateId(); // 🆔 生成 CUID2 ID

      return await this.prismaService.userSettings.upsert({
        where: { userId },
        update: settingsData,
        create: {
          id: settingsId, // 🆔 直接指定 CUID2 ID
          userId,
          ...settingsData,
        },
      });
    } catch (error) {
      console.error('设置更新错误:', error);
      throw error;
    }
  }

  /**
   * 查询用户列表(支持分页)
   * @param options 查询选项
   */
  async findMany(options: {
    filter?: any;
    orderBy?: any;
    page: number;
    limit: number;
  }) {
    console.log('=== UsersService.findMany 开始 ===');
    console.log('输入选项:', JSON.stringify(options, null, 2));

    const { filter, orderBy, page, limit } = options;
    const skip = (page - 1) * limit;

    console.log(`计算的跳过数: ${skip}`);

    try {
      // 查询总用户数
      console.log('开始查询总用户数...');
      const totalItems = await this.prismaService.user.count({
        where: filter,
      });
      console.log(`总用户数: ${totalItems}`);

      // 查询用户列表
      console.log('开始查询用户列表...');
      const users = await this.prismaService.user.findMany({
        where: filter,
        orderBy,
        skip,
        take: limit,
        include: {
          profile: true,
          settings: true,
          socialAccounts: {
            select: {
              provider: true,
              createdAt: true,
            },
          },
        },
      });
      console.log(`查询到的用户数: ${users.length}`);

      // 移除密码
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      console.log(`移除密码后的用户数: ${usersWithoutPassword.length}`);

      // 计算分页信息
      const totalPages = Math.ceil(totalItems / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      const result = {
        users: usersWithoutPassword,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage,
          hasPreviousPage,
        },
      };

      console.log('最终结果:', {
        usersCount: result.users.length,
        pagination: result.pagination,
      });
      console.log('=== UsersService.findMany 完成 ===');

      return result;
    } catch (error) {
      console.error('UsersService.findMany 错误:', error);
      throw error;
    }
  }

  /**
   * 查询用户数量(用于调试)
   */
  async getUserCount(): Promise<number> {
    return await this.prismaService.user.count();
  }

  /**
   * 删除用户(软删除)
   * @param id 用户ID
   */
  async remove(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('找不到该用户');
    }

    // 软删除 - 停用账号
    return await this.updateActiveStatus(id, false);
  }
}
