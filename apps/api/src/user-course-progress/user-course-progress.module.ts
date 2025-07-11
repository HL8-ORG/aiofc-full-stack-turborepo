import { Module } from '@nestjs/common';
import { UserCourseProgressController } from './user-course-progress.controller';
import { UserCourseProgressService } from './user-course-progress.service';
import { PrismaModule } from '@repo/database';
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';

/**
 * 📈 用户课程进度管理模块
 * 
 * 功能:
 * - 查询用户已注册课程列表
 * - 查询和更新每个课程的学习进度
 * - 自动计算进度
 * - Zod 数据验证
 * - JWT 认证保护
 */
@Module({
  imports: [PrismaModule],
  controllers: [UserCourseProgressController],
  providers: [
    UserCourseProgressService,
    ApiJwtAuthGuard, // 本地 JWT 守卫提供
  ],
  exports: [UserCourseProgressService],
})
export class UserCourseProgressModule {}
