import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  BadRequestException, // 新增
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CoursesService } from './courses.service';
import { ZodValidationPipe, RoleUtils } from '@repo/common';

// 使用本地守卫和装饰器
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// import {
//   CreateCourseSchema,
  // UpdateCourseSchema, // 暂时禁用
  // UpdateCourseFormDataSchema, // 暂时禁用
  // UploadVideoUrlSchema, // 暂时禁用
  // CourseQuerySchema, // 暂时禁用
// } from './dto/course.dto.ts.backup';
// import type {
//   CreateCourseDto,
  // UpdateCourseDto, // 暂时禁用
  // UpdateCourseFormDataDto, // 暂时禁用
  // UploadVideoUrlDto, // 暂时禁用
  // CourseQueryDto, // 暂时禁用
// } from './dto/course.dto.ts.backup';

// import type { User } from '@repo/common';
import { createCourseSchema as CreateCourseSchema } from '@repo/schemas';
import type { CreateCourseDto, User } from '@repo/schemas';

/**
 * 📚 课程管理控制器
 *
 * 端点:
 * - GET /courses - 获取课程列表(公开)
 * - POST /courses - 创建课程(需要认证)
 * - GET /courses/:courseId - 获取特定课程(公开)
 * - PUT /courses/:courseId - 更新课程(需要认证)
 * - DELETE /courses/:courseId - 删除课程(需要认证)
 * - POST /courses/:courseId/sections/:sectionId/chapters/:chapterId/get-upload-url - 获取视频上传URL(需要认证)
 */
@ApiTags('课程管理')
@Controller('courses')
@UseGuards(ApiJwtAuthGuard) // 在控制器级别应用默认认证
export class CoursesController {
  private readonly logger = new Logger(CoursesController.name);

  constructor(private readonly coursesService: CoursesService) {}

  /**
   * 📋 获取课程列表(公开访问)
   * 支持按类别筛选
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: '获取课程列表',
    description:
      '获取所有已注册的课程。可以按类别进行筛选。',
  })
  @ApiResponse({ status: 200, description: '成功获取课程列表' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 每分钟限制20次
  async listCourses(@Query() query: any) {
    // 手动提取和验证类别值
    const category = query?.category || undefined;

    this.logger.log(`请求获取课程列表 - 类别: ${category || '全部'}`);

    const result = await this.coursesService.findAllCourses(category);

    this.logger.log(`课程列表获取完成 - 返回${result.data.length}个课程`);
    return result;
  }

  /**
   * 📝 创建新课程(需要认证)
   */
  @Post()
  @ApiOperation({
    summary: '创建课程',
    description: '创建一个新课程。',
  })
  @ApiResponse({ status: 201, description: '课程创建成功' })
  @ApiResponse({ status: 400, description: '请求数据无效' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 403, description: '没有权限' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async createCourse(
    @Body(new ZodValidationPipe(CreateCourseSchema))
    createCourseDto: CreateCourseDto,
    @CurrentUser() user: User
  ) {
    this.logger.log(
      `创建课程请求 - 教师: ${createCourseDto.teacherId} (${createCourseDto.teacherId}), 请求者: ${user.id}, 角色: ${user.role}`
    );

    // 权限验证: 只有讲师或管理员可以创建课程
    if (!RoleUtils.canManageCourses(user.role)) {
      this.logger.warn(
        `没有创建课程权限 - 用户: ${user.id}, 角色: ${user.role}`
      );
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message:
          '没有创建课程的权限。需要讲师或管理员权限。',
        allowedRoles: ['INSTRUCTOR', 'TEACHER', 'ADMIN'],
        userRole: user.role,
        isInstructor: RoleUtils.isInstructor(user.role),
        isAdmin: RoleUtils.isAdmin(user.role),
      });
    }

    const result = await this.coursesService.createCourse(
      createCourseDto,
      user.id
    );

    this.logger.log(
      `✅ 课程创建完成 - ID: ${result.data.courseId}, 讲师: ${user.role}`
    );
    return result;
  }

  /**
   * 🔍 获取特定课程(公开访问)
   */
  @Public()
  @Get(':courseId')
  @ApiOperation({
    summary: '获取课程详情',
    description: '获取特定课程的详细信息。',
  })
  @ApiResponse({ status: 200, description: '成功获取课程' })
  @ApiResponse({ status: 404, description: '未找到课程' })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 每分钟限制30次
  async getCourse(@Param('courseId') courseId: string) {
    this.logger.log(`请求课程详情 - ID: ${courseId}`);

    const result = await this.coursesService.findCourseById(courseId);

    if (result.data) {
      this.logger.log(`课程获取完成 - 标题: ${result.data.title}`);
    }

    return result;
  }

  /**
   * ✏️ 更新课程(需要认证，支持文件上传)
   */
  @Put(':courseId')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: '更新课程',
    description: '更新现有课程的信息。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '课程更新成功' })
  @ApiResponse({ status: 400, description: '请求数据无效' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 403, description: '没有更新权限' })
  @ApiResponse({ status: 404, description: '未找到课程' })
  @ApiBearerAuth()
  async updateCourse(
    @Param('courseId') courseId: string,
    @Body() updateCourseDto: any, // 临时直接处理
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User
  ) {
    try {
      this.logger.log(`=== 开始课程更新请求 ===`);
      this.logger.log(`课程 ID: ${courseId}`);
      this.logger.log(`用户: ${user.id} (${user.role})`);
      this.logger.log(`原始数据类型: ${typeof updateCourseDto}`);
      this.logger.log(
        `原始数据内容:`,
        JSON.stringify(updateCourseDto, null, 2)
      );
      this.logger.log(
        `文件信息:`,
        file
          ? {
              name: file.originalname,
              type: file.mimetype,
              size: file.size,
            }
          : '无文件'
      );

      // 数据安全处理
      const safeData: any = {};

      if (updateCourseDto?.title && updateCourseDto.title.trim()) {
        safeData.title = String(updateCourseDto.title).trim();
      }

      if (updateCourseDto?.description !== undefined) {
        safeData.description = String(updateCourseDto.description || '').trim();
      }

      if (updateCourseDto?.category && updateCourseDto.category.trim()) {
        safeData.category = String(updateCourseDto.category).trim();
      }

      if (
        updateCourseDto?.price !== undefined &&
        updateCourseDto.price !== ''
      ) {
        const price = parseFloat(String(updateCourseDto.price));
        if (!isNaN(price) && price >= 0) {
          safeData.price = price;
        }
      }

      if (updateCourseDto?.level) {
        safeData.level = String(updateCourseDto.level);
      }

      if (updateCourseDto?.status) {
        safeData.status = String(updateCourseDto.status);
      }

      this.logger.log(`处理后的数据:`, JSON.stringify(safeData, null, 2));
      this.logger.log(`=== 开始调用服务 ===`);

      const result = await this.coursesService.updateCourse(
        courseId,
        safeData,
        user.id,
        file
      );

      this.logger.log(`=== 课程更新完成 ===`);
      return result;
    } catch (error) {
      this.logger.error(`=== 控制器错误 ===`);
      this.logger.error(`课程 ID: ${courseId}`);
      this.logger.error(
        `错误类型: ${error instanceof Error ? error.constructor.name : '未知'}`
      );
      this.logger.error(
        `错误信息: ${error instanceof Error ? error.message : String(error)}`
      );
      if ((error as Error)?.stack) {
        this.logger.error(`堆栈跟踪:`);
        (error as Error)?.stack
          ?.split('\n')
          .slice(0, 8)
          .forEach((line: string, i: number) => {
            this.logger.error(`  ${i + 1}. ${line.trim()}`);
          });
      }
      throw error;
    }
  }

  /**
   * 🗑️ 删除课程(需要认证)
   */
  @Delete(':courseId')
  @ApiOperation({
    summary: '删除课程',
    description: '删除现有课程。',
  })
  @ApiResponse({ status: 200, description: '课程删除成功' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 403, description: '没有删除权限' })
  @ApiResponse({ status: 404, description: '未找到课程' })
  @ApiBearerAuth()
  async deleteCourse(
    @Param('courseId') courseId: string,
    @CurrentUser() user: User
  ) {
    this.logger.log(
      `删除课程请求 - ID: ${courseId}, 用户: ${user.id}, 角色: ${user.role}`
    );

    const result = await this.coursesService.deleteCourse(courseId, user.id);

    this.logger.log(`课程删除完成 - ID: ${courseId}`);
    return result;
  }

  /**
   * 📹 生成视频上传URL(需要认证)
   */
  @Post(':courseId/sections/:sectionId/chapters/:chapterId/get-upload-url')
  @ApiOperation({
    summary: '生成视频上传URL',
    description: '生成用于将视频上传到S3的预签名URL。',
  })
  @ApiResponse({ status: 200, description: 'URL生成成功' })
  @ApiResponse({ status: 400, description: '请求数据无效' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiBearerAuth()
  async getUploadVideoUrl(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Param('chapterId') chapterId: string,
    @Body() uploadVideoUrlDto: any, // 临时直接处理
    @CurrentUser() user: User
  ) {
    // 手动数据验证
    const processedData = {
      fileName: uploadVideoUrlDto?.fileName || '',
      fileType: uploadVideoUrlDto?.fileType || '',
    };

    if (!processedData.fileName || !processedData.fileType) {
      throw new BadRequestException('文件名和文件类型是必需的');
    }

    this.logger.log(
      `请求视频上传URL - 课程: ${courseId}, 章节: ${chapterId}, 文件: ${processedData.fileName}, 用户: ${user.id}`
    );

    const result =
      await this.coursesService.generateUploadVideoUrl(processedData);

    this.logger.log(`视频上传URL生成完成`);
    return result;
  }
}
