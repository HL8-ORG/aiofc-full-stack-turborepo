import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PrismaModule } from '@repo/database';
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';

/**
 * 📚 课程管理模块
 * 
 * 功能:
 * - 课程 CRUD (创建、查询、修改、删除)
 * - 课程列表查询 (按分类筛选)
 * - 视频上传 URL 生成 (S3)
 * - 基于 Zod 的数据验证
 * - JWT 认证保护
 */
@Module({
  imports: [PrismaModule],
  controllers: [CoursesController],
  providers: [
    CoursesService,
    ApiJwtAuthGuard, // 提供本地 JWT 守卫
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
