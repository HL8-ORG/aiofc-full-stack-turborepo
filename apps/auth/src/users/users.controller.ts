import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@repo/common';
import { Public } from '@repo/common';

// Zod Schema 导入
import {
  updateUserSchema,
  updateProfileSchema,
  updateSettingsSchema,
  userSearchQuerySchema,
  deleteAccountSchema,
  type UpdateUserDto,
  type UpdateProfileDto,
  type UpdateSettingsDto,
  type UserSearchQuery,
  type DeleteAccountDto,
  transformUserResponse,
  createUserFilter,
  createUserOrderBy,
} from '@repo/schemas';

// 基础 Schema
import { paginationSchema } from '@repo/schemas';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * 检查数据库状态（无需认证 - 用于调试）
   */
  @Get('debug/count')
  @Public()
  async getUserCount() {
    try {
      const count = await this.usersService.getUserCount();
      return {
        success: true,
        message: `数据库中共有 ${count} 名用户`,
        data: { count },
      };
    } catch (error) {
      this.logger.error(`获取用户数量失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 无需认证获取用户列表（用于调试）
   */
  @Get('debug/list')
  @Public()
  async getUsersDebug() {
    try {
      this.logger.debug('调试模式：无需认证获取用户列表');

      const result = await this.usersService.findMany({
        filter: {},
        orderBy: { createdAt: 'desc' },
        page: 1,
        limit: 10,
      });

      this.logger.debug(`调试查询结果：${result.users.length} 名用户，共 ${result.pagination.totalItems} 名`);

      return {
        success: true,
        message: '调试模式：成功获取用户列表',
        data: result,
      };
    } catch (error) {
      this.logger.error(`调试用户列表获取失败: ${error.message}`);
      this.logger.error(`错误堆栈: ${error.stack}`);
      throw error;
    }
  }

  /**
   * 已认证用户调试（需要认证）
   */
  @Get('debug/authenticated-list')
  @UseGuards(JwtAuthGuard)
  async getAuthenticatedUsersDebug(@CurrentUser('userId') userId: string) {
    try {
      this.logger.debug(`已认证用户 ID: ${userId}`);
      this.logger.debug('尝试以认证状态获取用户列表');

      const result = await this.usersService.findMany({
        filter: {},
        orderBy: { createdAt: 'desc' },
        page: 1,
        limit: 10,
      });

      this.logger.debug(`认证查询结果：${result.users.length} 名用户，共 ${result.pagination.totalItems} 名`);

      return {
        success: true,
        message: '成功以认证状态获取用户列表',
        data: {
          currentUserId: userId,
          ...result,
        },
      };
    } catch (error) {
      this.logger.error(`认证用户列表获取失败: ${error.message}`);
      this.logger.error(`错误堆栈: ${error.stack}`);
      throw error;
    }
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser('userId') userId: string) {
    try {
      this.logger.debug(`用户 ID: ${userId}, 类型: ${typeof userId}`);

      // 检查用户 ID 是否存在
      if (!userId) {
        throw new NotFoundException('未找到用户 ID');
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('未找到用户');
      }

      return {
        success: true,
        data: transformUserResponse(user),
      };
    } catch (error) {
      this.logger.error(`用户信息获取失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(
    @CurrentUser('userId') userId: string,
    @Body() updateUserDto: any, // 临时使用 any
  ) {
    try {
      this.logger.debug(`更新数据: ${JSON.stringify(updateUserDto)}`);

      if (!userId) {
        throw new NotFoundException('未找到用户 ID');
      }

      // 如果是空对象则只返回用户信息
      if (!updateUserDto || Object.keys(updateUserDto).length === 0) {
        const user = await this.usersService.findById(userId);
        return {
          success: true,
          message: '没有变更',
          data: transformUserResponse(user),
        };
      }

      // Zod 验证
      const validatedData = updateUserSchema.parse(updateUserDto);

      const user = await this.usersService.update(userId, validatedData);

      return {
        success: true,
        message: '用户信息已更新',
        data: transformUserResponse(user),
      };
    } catch (error) {
      this.logger.error(`用户信息更新失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新用户档案
   */
  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateProfileDto: any, // 临时使用 any
  ) {
    try {
      this.logger.debug(`档案更新数据: ${JSON.stringify(updateProfileDto)}`);

      if (!userId) {
        throw new NotFoundException('未找到用户 ID');
      }

      // 如果是空对象则返回现有档案
      if (!updateProfileDto || Object.keys(updateProfileDto).length === 0) {
        const user = await this.usersService.findById(userId);
        return {
          success: true,
          message: '没有变更',
          data: user?.profile || {},
        };
      }

      // Zod 验证
      const validatedData = updateProfileSchema.parse(updateProfileDto);

      const profile = await this.usersService.updateProfile(userId, validatedData);

      return {
        success: true,
        message: '档案已更新',
        data: profile,
      };
    } catch (error) {
      this.logger.error(`档案更新失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新用户设置
   */
  @Put('me/settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @CurrentUser('userId') userId: string,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    try {
      this.logger.debug(`设置更新数据: ${JSON.stringify(updateSettingsDto)}`);
      this.logger.debug(`用户 ID: ${userId}`);

      if (!userId) {
        throw new NotFoundException('未找到用户 ID');
      }

      // 如果是空对象则返回现有设置
      if (!updateSettingsDto || Object.keys(updateSettingsDto).length === 0) {
        const user = await this.usersService.findById(userId);
        return {
          success: true,
          message: '没有变更',
          data: user?.settings || {},
        };
      }

      // Zod 验证
      const validatedData = updateSettingsSchema.parse(updateSettingsDto);
      this.logger.debug(`验证后的数据: ${JSON.stringify(validatedData)}`);

      const settings = await this.usersService.updateSettings(userId, validatedData);

      return {
        success: true,
        message: '设置已更新',
        data: settings,
      };
    } catch (error) {
      this.logger.error(`设置更新失败: ${error.message}`);
      this.logger.error(`错误堆栈: ${error.stack}`);
      throw error;
    }
  }

  /**
   * 删除账户（软删除）
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser('userId') userId: string,
    @Body() deleteDto: any, // 临时使用 any
  ) {
    try {
      this.logger.debug(`账户删除数据: ${JSON.stringify(deleteDto)}`);

      if (!userId) {
        throw new NotFoundException('未找到用户 ID');
      }

      // Zod 验证（实际使用时）
      // const validatedData = deleteAccountSchema.parse(deleteDto);

      // TODO: 实现账户删除逻辑（包括密码确认）
      // await this.usersService.deleteAccount(userId, validatedData);

      return {
        success: true,
        message: '账户删除功能尚未实现',
      };
    } catch (error) {
      this.logger.error(`账户删除失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询特定用户（管理员用）
   */
  // @Get(':id')
  // @UseGuards(JwtAuthGuard)
  // async getUserById(@Param('id') id: string) {
  //   try {
  //     const validatedId = uuidSchema.parse(id);

  //     const user = await this.usersService.findById(validatedId);
  //     if (!user) {
  //       throw new NotFoundException('未找到用户');
  //     }

  //     return {
  //       success: true,
  //       data: transformUserResponse(user),
  //     };
  //   } catch (error) {
  //     this.logger.error(`用户查询失败: ${error.message}`);
  //     throw error;
  //   }
  // }

  /**
   * 获取用户列表（管理员用）
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getUsers(@Query() rawQuery: any, @CurrentUser('userId') userId: string) {
    try {
      this.logger.debug(`=== 开始获取用户列表 API ===`);
      this.logger.debug(`请求者 ID: ${userId}`);
      this.logger.debug(`请求查询: ${JSON.stringify(rawQuery)}`);

      // 查询参数验证
      const query = userSearchQuerySchema.parse(rawQuery);
      this.logger.debug(`验证后的查询: ${JSON.stringify(query)}`);

      const filter = createUserFilter(query);
      const orderBy = createUserOrderBy(query);

      this.logger.debug(`生成的过滤器: ${JSON.stringify(filter)}`);
      this.logger.debug(`生成的排序: ${JSON.stringify(orderBy)}`);

      this.logger.debug(`调用服务 findMany 方法前...`);

      // 实际获取用户列表
      const result = await this.usersService.findMany({
        filter,
        orderBy,
        page: query.page,
        limit: query.limit,
      });

      this.logger.debug(`服务 findMany 方法调用完成`);
      this.logger.debug(`最终查询结果：${result.users.length} 名用户，共 ${result.pagination.totalItems} 名`);

      const response = {
        success: true,
        data: result,
      };

      this.logger.debug(`返回数据大小: ${JSON.stringify(response).length} 字节`);
      this.logger.debug(`=== 用户列表获取 API 完成 ===`);

      return response;
    } catch (error) {
      this.logger.error(`用户列表获取失败: ${error.message}`);
      this.logger.error(`错误堆栈: ${error.stack}`);
      throw error;
    }
  }
}
