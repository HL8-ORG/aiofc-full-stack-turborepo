import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { UserCourseProgressService } from './user-course-progress.service';
import { ZodValidationPipe } from '@repo/common';
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// import type {} from // UpdateUserCourseProgressDto, // 暂时禁用
// UserCourseProgressParamsDto, // 暂时禁用
// UserEnrolledCoursesParamsDto, // 暂时禁用
// './dto/user-course-progress.dto.ts.backup';

// import {} from // UpdateUserCourseProgressSchema, // 暂时禁用
// UserCourseProgressParamsSchema, // 暂时禁用
// UserEnrolledCoursesParamsSchema, // 暂时禁用
// './dto/user-course-progress.dto.ts.backup';

// 其他 schema 暂时禁用
/*
import {
  chapterProgressSchema,
  sectionProgressSchema,
  updateUserCourseProgressSchema,
} from '@repo/common';
*/

import type { User } from '@repo/common';

/**
 * 📈 用户课程进度管理控制器 (已应用 N+1 优化)
 *
 * 🚀 性能优化功能:
 * - 使用单个查询获取相关数据
 * - 添加批量处理端点
 * - 统计查询优化
 * - 基于事务的更新
 *
 * 端点:
 * - GET /users/course-progress/:userId/enrolled-courses - 查询已注册课程列表 (需要认证)
 * - GET /users/course-progress/:userId/courses/:courseId - 查询特定课程进度 (需要认证)
 * - PUT /users/course-progress/:userId/courses/:courseId - 更新课程进度 (需要认证)
 * - GET /users/course-progress/batch - 批量查询多个用户进度 (管理员用)
 * - GET /users/course-progress/statistics/:courseId - 查询课程进度统计 (管理员用)
 */
@ApiTags('用户课程进度')
@Controller('users/course-progress')
@UseGuards(ApiJwtAuthGuard)
@ApiBearerAuth()
export class UserCourseProgressController {
  private readonly logger = new Logger(UserCourseProgressController.name);

  constructor(
    private readonly userCourseProgressService: UserCourseProgressService
  ) {}

  /**
   * 📚 查询用户已注册课程列表 (需要认证, N+1 优化)
   */
  @Get(':userId/enrolled-courses')
  @ApiOperation({
    summary: '查询已注册课程列表',
    description:
      '查询用户已注册的所有课程列表。(已应用 N+1 优化)',
  })
  @ApiResponse({ status: 200, description: '查询已注册课程列表成功' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 403, description: '无访问权限' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 每分钟限制30次
  async getUserEnrolledCourses(
    @Param() params: any, // 暂时直接处理
    @CurrentUser() user: User
  ) {
    // 手动参数验证
    const processedParams = {
      userId: params?.userId || '',
    };

    if (!processedParams.userId) {
      throw new BadRequestException('需要用户ID');
    }

    this.logger.log(
      `查询已注册课程列表请求 - 目标: ${processedParams.userId}, 请求者: ${user.id}`
    );

    const result = await this.userCourseProgressService.getUserEnrolledCourses(
      processedParams.userId,
      user
    );

    this.logger.log(
      `查询已注册课程列表完成 - 返回${result.data.length}个课程`
    );
    return result;
  }

  /**
   * 📊 查询特定课程的学习进度 (需要认证, N+1 优化)
   */
  @Get(':userId/courses/:courseId')
  @ApiOperation({
    summary: '查询课程进度',
    description: '查询特定课程的学习进度。(已应用 N+1 优化)',
  })
  @ApiResponse({ status: 200, description: '查询课程进度成功' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 403, description: '无访问权限' })
  @ApiResponse({ status: 404, description: '未找到进度信息' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 每分钟限制50次
  async getUserCourseProgress(
    @Param() params: any, // 暂时直接处理
    @CurrentUser() user: User
  ) {
    // 手动参数验证
    const processedParams = {
      userId: params?.userId || '',
      courseId: params?.courseId || '',
    };

    if (!processedParams.userId || !processedParams.courseId) {
      throw new BadRequestException('需要用户ID和课程ID');
    }

    this.logger.log(
      `查询课程进度请求 - 用户: ${processedParams.userId}, 课程: ${processedParams.courseId}, 请求者: ${user.id}`
    );

    const result = await this.userCourseProgressService.getUserCourseProgress(
      processedParams.userId,
      processedParams.courseId,
      user
    );

    this.logger.log(
      `查询课程进度完成 - 进度: ${result.data.overallProgress}%`
    );
    return result;
  }

  /**
   * 📝 更新课程学习进度 (需要认证, N+1 优化)
   */
  @Put(':userId/courses/:courseId')
  @ApiOperation({
    summary: '更新课程进度',
    description:
      '更新特定课程的学习进度。(基于事务的优化)',
  })
  @ApiResponse({ status: 200, description: '更新课程进度成功' })
  @ApiResponse({ status: 400, description: '请求数据错误' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 403, description: '无访问权限' })
  @ApiResponse({ status: 404, description: '未找到进度信息' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 每分钟限制100次 (学习活动频繁)
  async updateUserCourseProgress(
    @Param() params: any, // 暂时直接处理
    @Body() updateProgressDto: any, // 暂时直接处理
    @CurrentUser() user: User
  ) {
    // 手动参数验证
    const processedParams = {
      userId: params?.userId || '',
      courseId: params?.courseId || '',
    };

    if (!processedParams.userId || !processedParams.courseId) {
      throw new BadRequestException('需要用户ID和课程ID');
    }

    // 手动处理进度数据
    const processedData = {
      sections: updateProgressDto?.sections || [],
      overallProgress: updateProgressDto?.overallProgress || undefined,
      lastAccessedChapterId:
        updateProgressDto?.lastAccessedChapterId || undefined,
    };

    this.logger.log(
      `更新课程进度请求 - 用户: ${processedParams.userId}, 课程: ${processedParams.courseId}, 请求者: ${user.id}`
    );

    const result =
      await this.userCourseProgressService.updateUserCourseProgress(
        processedParams.userId,
        processedParams.courseId,
        processedData,
        user
      );

    this.logger.log(
      `更新课程进度完成 - 新进度: ${result.data.overallProgress}%`
    );
    return result;
  }

  /**
   * 🔍 批量查询多个用户进度 (管理员用, 批量优化)
   */
  @Get('batch')
  @ApiOperation({
    summary: '批量查询多个用户进度',
    description:
      '批量查询多个用户的课程进度。(管理员/教师用, 批量优化)',
  })
  @ApiResponse({ status: 200, description: '批量查询进度成功' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 403, description: '无访问权限' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 大量数据查询，限制较严
  async getBatchUserCourseProgress(
    @CurrentUser() user: User,
    @Body() body: { userIds: string[]; courseId?: string }
  ) {
    // 权限验证: 仅管理员/教师可访问
    if (user.role !== 'admin' && user.role !== 'teacher') {
      throw new BadRequestException(
        '此功能仅供管理员或教师使用'
      );
    }

    if (
      !body.userIds ||
      !Array.isArray(body.userIds) ||
      body.userIds.length === 0
    ) {
      throw new BadRequestException('需要用户ID列表');
    }

    this.logger.log(
      `批量查询进度请求 - 用户数: ${body.userIds.length}, 请求者: ${user.id}`
    );

    const result =
      await this.userCourseProgressService.getBatchUserCourseProgress(
        body.userIds,
        body.courseId,
        user
      );

    this.logger.log(`批量查询进度完成 - 返回${result.data.length}条记录`);
    return result;
  }

  /**
   * 📈 查询课程进度统计 (管理员用, 聚合优化)
   */
  @Get('statistics/:courseId')
  @ApiOperation({
    summary: '查询课程进度统计',
    description:
      '查询特定课程的整体进度统计。(管理员/教师用, 聚合函数优化)',
  })
  @ApiResponse({ status: 200, description: '查询进度统计成功' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 403, description: '无访问权限' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 统计查询相对频繁
  async getCourseProgressStatistics(
    @Param('courseId') courseId: string,
    @CurrentUser() user: User
  ) {
    if (!courseId) {
      throw new BadRequestException('需要课程ID');
    }

    this.logger.log(
      `查询课程进度统计请求 - 课程: ${courseId}, 请求者: ${user.id}`
    );

    const result =
      await this.userCourseProgressService.getCourseProgressStatistics(
        courseId,
        user
      );

    this.logger.log(
      `查询课程进度统计完成 - 共${result.data.totalStudents}名学生`
    );
    return result;
  }
}
