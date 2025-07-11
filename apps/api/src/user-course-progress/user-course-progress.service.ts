import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '@repo/database';
// import { UpdateUserCourseProgressDto } from './dto/user-course-progress.dto';
// 暂时禁用

import { User } from '@repo/common';
import { Cacheable, CacheEvict } from '@repo/common';

/**
 * 📈 用户课程进度管理服务
 *
 * 主要功能:
 * - 查询已注册课程列表
 * - 查询和更新每个课程的学习进度
 * - 自动计算进度
 * - 权限验证(仅本人或管理员可访问)
 */
@Injectable()
export class UserCourseProgressService {
  private readonly logger = new Logger(UserCourseProgressService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 📚 查询用户已注册课程列表(已应用 N+1 优化)
   *
   * 🚀 性能优化:
   * - 使用单个查询获取所有相关数据(userCourseProgress + course + sections + chapters)
   * - 移除不必要的中间 courseId 查询步骤
   * - 通过 Join 实现高效数据获取
   */
  async getUserEnrolledCourses(targetUserId: string, requestUser: User) {
    try {
      this.logger.log(`开始查询已注册课程列表 - 目标用户: ${targetUserId}, 请求用户: ${requestUser.id}`);

      // 权限验证: 仅本人或管理员可查询
      this.validateAccess(targetUserId, requestUser);

      // 🚀 N+1 优化: 使用单个查询获取所有相关数据
      const enrolledCourses = await this.prismaService.userCourseProgress.findMany({
        where: { userId: targetUserId },
        include: {
          course: {
            include: {
              sections: {
                include: {
                  chapters: {
                    orderBy: {
                      orderIndex: 'asc', // 章节排序
                    },
                  },
                },
                orderBy: {
                  orderIndex: 'asc', // 部分排序
                },
              },
            },
          },
        },
        orderBy: {
          course: {
            createdAt: 'desc', // 按最新课程排序
          },
        },
      });

      if (enrolledCourses.length === 0) {
        this.logger.log(`无已注册课程 - 用户: ${targetUserId}`);
        return {
          message: '没有已注册的课程',
          data: [],
          count: 0,
        };
      }

      // 📊 构建包含进度信息的课程数据
      const coursesWithProgress = enrolledCourses.map((enrollment) => ({
        ...enrollment.course,
        progressInfo: {
          overallProgress: enrollment.overallProgress,
          lastAccessedTimestamp: enrollment.lastAccessedTimestamp,
          sections: this.parseSections(enrollment.sections),
        },
      }));

      this.logger.log(`已完成已注册课程列表查询 - 返回 ${coursesWithProgress.length} 个课程`);

      return {
        message: '已注册课程列表查询成功',
        data: coursesWithProgress,
        count: coursesWithProgress.length,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`查询已注册课程列表时发生错误 - 用户: ${targetUserId}`, error);
      throw new BadRequestException('查询已注册课程列表时发生错误');
    }
  }

  /**
   * 📊 查询特定课程的学习进度(已应用 N+1 优化)
   *
   * 🚀 性能优化:
   * - 使用单个查询获取课程和章节数据
   * - 通过 orderBy 优化排序性能
   */
  async getUserCourseProgress(targetUserId: string, courseId: string, requestUser: User) {
    try {
      this.logger.log(`开始查询课程进度 - 用户: ${targetUserId}, 课程: ${courseId}`);

      // 权限验证: 仅本人或管理员可查询
      this.validateAccess(targetUserId, requestUser);

      // 🚀 N+1 优化: 使用单个查询获取课程和章节数据
      const progress = await this.prismaService.userCourseProgress.findUnique({
        where: {
          userId_courseId: {
            userId: targetUserId,
            courseId
          }
        },
        include: {
          course: {
            include: {
              sections: {
                include: {
                  chapters: {
                    orderBy: {
                      orderIndex: 'asc', // 章节排序
                    },
                  },
                },
                orderBy: {
                  orderIndex: 'asc', // 部分排序
                },
              },
            },
          },
        },
      });

      if (!progress) {
        this.logger.warn(`未找到课程进度 - 用户: ${targetUserId}, 课程: ${courseId}`);
        throw new NotFoundException('未找到该用户的课程进度');
      }

      this.logger.log(`课程进度查询完成 - 进度: ${progress.overallProgress}%`);

      // 📈 构建详细进度数据
      return {
        message: '课程进度查询成功',
        data: {
          courseId: progress.courseId,
          userId: progress.userId,
          overallProgress: progress.overallProgress,
          lastAccessedTimestamp: progress.lastAccessedTimestamp,
          sections: this.parseSections(progress.sections),
          course: {
            ...progress.course,
            // 📊 添加章节统计信息
            totalSections: progress.course.sections?.length || 0,
            totalChapters: progress.course.sections?.reduce(
              (acc, section) => acc + (section.chapters?.length || 0), 0
            ) || 0,
          },
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`查询课程进度时发生错误 - 用户: ${targetUserId}, 课程: ${courseId}`, error);
      throw new BadRequestException('查询课程进度时发生错误');
    }
  }

  /**
   * 📝 更新课程学习进度(已应用 N+1 优化 + 缓存失效)
   *
   * 🚀 性能优化:
   * - 在事务中顺序执行查询和更新
   * - 更新后不通过其他查询获取课程信息而是直接附加
   * - 保证数据一致性
   * - 自动使相关缓存失效
   */
  @CacheEvict([
    'user-enrolled-courses:{userId}',
    'user-course-progress:{userId}:{courseId}',
    'course-progress-statistics:{courseId}'
  ])
  async updateUserCourseProgress(
    targetUserId: string,
    courseId: string,
    updateProgressDto: any, // 暂时使用 any 类型
    requestUser: User,
  ) {
    try {
      this.logger.log(`开始更新课程进度 - 用户: ${targetUserId}, 课程: ${courseId}`);

      // 权限验证: 仅本人可修改(管理员也不能直接修改,仅用于日志)
      if (targetUserId !== requestUser.id) {
        this.logger.warn(`无课程进度修改权限 - 目标用户: ${targetUserId}, 请求用户: ${requestUser.id}`);
        throw new ForbiddenException('只能修改自己的学习进度');
      }

      // 🚀 N+1 优化: 使用事务原子执行
      const result = await this.prismaService.$transaction(async (prisma) => {
        // 查询现有进度数据(包含课程信息)
        const existingProgress = await prisma.userCourseProgress.findUnique({
          where: {
            userId_courseId: {
              userId: targetUserId,
              courseId
            }
          },
          include: {
            course: {
              include: {
                sections: {
                  include: {
                    chapters: {
                      orderBy: {
                        orderIndex: 'asc',
                      },
                    },
                  },
                  orderBy: {
                    orderIndex: 'asc',
                  },
                },
              },
            },
          },
        });

        if (!existingProgress) {
          this.logger.warn(`无现有进度数据 - 用户: ${targetUserId}, 课程: ${courseId}`);
          throw new NotFoundException('未找到该课程的进度数据');
        }

        // 合并章节数据并计算进度
        const existingSections = this.parseSections(existingProgress.sections);
        const newSections = updateProgressDto.sections || existingSections;
        const mergedSections = this.mergeSections(existingSections, newSections);
        const calculatedProgress = this.calculateOverallProgress(mergedSections);

        // 更新进度数据
        const updatedProgress = await prisma.userCourseProgress.update({
          where: {
            userId_courseId: {
              userId: targetUserId,
              courseId
            }
          },
          data: {
            sections: JSON.stringify(mergedSections),
            overallProgress: updateProgressDto.overallProgress ?? calculatedProgress,
            lastAccessedTimestamp: new Date(),
          },
        });

        // 📊 返回完整数据(无需额外查询)
        return {
          ...updatedProgress,
          sections: mergedSections,
          course: {
            ...existingProgress.course,
            // 添加统计信息
            totalSections: existingProgress.course.sections?.length || 0,
            totalChapters: existingProgress.course.sections?.reduce(
              (acc, section) => acc + (section.chapters?.length || 0), 0
            ) || 0,
          },
        };
      });

      this.logger.log(`课程进度更新完成 - 新进度: ${result.overallProgress}%`);

      return {
        message: '课程进度更新成功',
        data: result,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`更新课程进度时发生错误 - 用户: ${targetUserId}, 课程: ${courseId}`, error);
      throw new BadRequestException('更新课程进度时发生错误');
    }
  }

  /**
   * 🔍 批量查询多个用户的课程进度(已应用 Batch 优化 + 缓存)
   *
   * 🚀 性能优化:
   * - 使用单个查询获取多个用户的进度
   * - 用于管理员仪表板或报告生成
   * - Redis 缓存(3分钟)
   */
  @Cacheable('batch-user-progress:{userIds}:{courseId}', 180)
  async getBatchUserCourseProgress(
    userIds: string[],
    courseId?: string,
    requestUser?: User
  ) {
    try {
      this.logger.log(`开始批量进度查询 - 用户数: ${userIds.length}`);

      if (userIds.length === 0) {
        return {
          message: '没有要查询的用户',
          data: [],
          count: 0,
        };
      }

      // 构建 WHERE 条件
      const whereCondition: any = {
        userId: { in: userIds },
      };

      if (courseId) {
        whereCondition.courseId = courseId;
      }

      // 🚀 使用单个查询获取所有数据
      const progressData = await this.prismaService.userCourseProgress.findMany({
        where: whereCondition,
        include: {
          course: {
            include: {
              sections: {
                include: {
                  chapters: {
                    orderBy: {
                      orderIndex: 'asc',
                    },
                  },
                },
                orderBy: {
                  orderIndex: 'asc',
                },
              },
            },
          },
        },
        orderBy: [
          { userId: 'asc' },
          { course: { createdAt: 'desc' } },
        ],
      });

      this.logger.log(`批量进度查询完成 - 返回 ${progressData.length} 条记录`);

      return {
        message: '批量进度查询成功',
        data: progressData.map((progress) => ({
          userId: progress.userId,
          courseId: progress.courseId,
          overallProgress: progress.overallProgress,
          lastAccessedTimestamp: progress.lastAccessedTimestamp,
          sections: this.parseSections(progress.sections),
          course: {
            ...progress.course,
            totalSections: progress.course.sections?.length || 0,
            totalChapters: progress.course.sections?.reduce(
              (acc, section) => acc + (section.chapters?.length || 0), 0
            ) || 0,
          },
        })),
        count: progressData.length,
      };
    } catch (error) {
      this.logger.error(`批量进度查询时发生错误`, error);
      throw new BadRequestException('批量进度查询时发生错误');
    }
  }

  /**
   * 📈 查询课程整体进度统计(已应用 N+1 优化 + 缓存)
   *
   * 🚀 性能优化:
   * - 使用聚合函数进行单查询统计
   * - 用于课程进度分析仪表板
   * - Redis 缓存(10分钟)
   */
  @Cacheable('course-progress-statistics:{courseId}', 600)
  async getCourseProgressStatistics(courseId: string, requestUser: User) {
    try {
      this.logger.log(`开始查询课程进度统计 - 课程: ${courseId}`);

      // 权限验证: 仅管理员或教师可访问
      if (requestUser.role !== 'admin' && requestUser.role !== 'teacher') {
        this.logger.warn(`无统计查询权限 - 请求用户: ${requestUser.id}, 角色: ${requestUser.role}`);
        throw new ForbiddenException('无权访问此信息');
      }

      // 🚀 使用聚合查询获取统计数据
      const statistics = await this.prismaService.userCourseProgress.aggregate({
        where: { courseId },
        _count: {
          userId: true,
        },
        _avg: {
          overallProgress: true,
        },
        _min: {
          overallProgress: true,
        },
        _max: {
          overallProgress: true,
        },
      });

      // 查询进度区间分布
      const progressDistribution = await this.prismaService.userCourseProgress.groupBy({
        by: ['overallProgress'],
        where: { courseId },
        _count: {
          userId: true,
        },
        orderBy: {
          overallProgress: 'asc',
        },
      });

      // 按进度范围分类
      const progressRanges = {
        '0-25%': 0,
        '26-50%': 0,
        '51-75%': 0,
        '76-100%': 0,
      };

      progressDistribution.forEach((item) => {
        const progress = item.overallProgress;
        if (progress <= 25) progressRanges['0-25%'] += item._count.userId;
        else if (progress <= 50) progressRanges['26-50%'] += item._count.userId;
        else if (progress <= 75) progressRanges['51-75%'] += item._count.userId;
        else progressRanges['76-100%'] += item._count.userId;
      });

      this.logger.log(`课程进度统计查询完成 - 总计 ${statistics._count.userId} 人`);

      return {
        message: '课程进度统计查询成功',
        data: {
          courseId,
          totalStudents: statistics._count.userId,
          averageProgress: Math.round(statistics._avg.overallProgress || 0),
          minProgress: statistics._min.overallProgress || 0,
          maxProgress: statistics._max.overallProgress || 0,
          progressRanges,
          detailedDistribution: progressDistribution,
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`查询课程进度统计时发生错误 - 课程: ${courseId}`, error);
      throw new BadRequestException('查询课程进度统计时发生错误');
    }
  }
  /**
   * 🔒 访问权限验证
   * 仅本人或管理员可访问
   */
  private validateAccess(targetUserId: string, requestUser: User): void {
    const isOwner = targetUserId === requestUser.id;
    const isAdmin = requestUser.role === 'admin' || requestUser.role === 'teacher';

    if (!isOwner && !isAdmin) {
      this.logger.warn(`无访问权限 - 目标用户: ${targetUserId}, 请求用户: ${requestUser.id}, 角色: ${requestUser.role}`);
      throw new ForbiddenException('无权访问此信息');
    }
  }

  /**
   * 📊 计算总体进度(已优化性能)
   * 已完成章节数 / 总章节数 * 100
   *
   * 🚀 性能优化:
   * - 使用单循环减少 reduce 运算
   * - 添加提前终止条件
   */
  private calculateOverallProgress(sections: any[]): number {
    if (!sections || sections.length === 0) {
      return 0;
    }

    let totalChapters = 0;
    let completedChapters = 0;

    for (const section of sections) {
      if (section.chapters && Array.isArray(section.chapters)) {
        totalChapters += section.chapters.length;
        completedChapters += section.chapters.filter((chapter: any) => chapter.completed).length;
      }
    }

    if (totalChapters === 0) {
      return 0;
    }

    const progress = Math.round((completedChapters / totalChapters) * 100);
    return Math.min(progress, 100); // 最大 100%
  }

  /**
   * 🔄 合并章节数据(已优化性能)
   * 合并现有数据和新数据以保持一致性
   *
   * 🚀 性能优化:
   * - 使用 Map 实现 O(n) 时间复杂度合并
   * - 最小化不必要的数组复制
   */
  private mergeSections(existingSections: any[], newSections: any[]): any[] {
    if (!existingSections || existingSections.length === 0) {
      return newSections || [];
    }

    if (!newSections || newSections.length === 0) {
      return existingSections;
    }

    // 使用 Map 进行高效合并
    const sectionMap = new Map();

    // 将现有章节添加到 Map
    existingSections.forEach(section => {
      sectionMap.set(section.sectionId, section);
    });

    // 用新章节合并
    newSections.forEach((newSection) => {
      const existing = sectionMap.get(newSection.sectionId);

      if (existing) {
        // 更新现有章节
        sectionMap.set(newSection.sectionId, {
          ...existing,
          ...newSection,
          chapters: this.mergeChapters(
            existing.chapters || [],
            newSection.chapters || []
          ),
        });
      } else {
        // 添加新章节
        sectionMap.set(newSection.sectionId, newSection);
      }
    });

    return Array.from(sectionMap.values());
  }

  /**
   * 🔄 合并章节数据(已优化性能)
   *
   * 🚀 性能优化:
   * - 使用 Map 实现 O(n) 时间复杂度合并
   * - 优先应用完成状态
   */
  private mergeChapters(existingChapters: any[], newChapters: any[]): any[] {
    if (!existingChapters || existingChapters.length === 0) {
      return newChapters || [];
    }

    if (!newChapters || newChapters.length === 0) {
      return existingChapters;
    }

    // 使用 Map 进行高效合并
    const chapterMap = new Map();

    // 将现有章节添加到 Map
    existingChapters.forEach(chapter => {
      chapterMap.set(chapter.chapterId, chapter);
    });

    // 用新章节合并
    newChapters.forEach((newChapter) => {
      const existing = chapterMap.get(newChapter.chapterId);

      if (existing) {
        // 更新现有章节(优先应用完成状态)
        chapterMap.set(newChapter.chapterId, {
          ...existing,
          ...newChapter,
        });
      } else {
        // 添加新章节
        chapterMap.set(newChapter.chapterId, newChapter);
      }
    });

    return Array.from(chapterMap.values());
  }

  /**
   * 📄 解析 JSON 章节数据(增强错误处理)
   *
   * 🚀 性能优化:
   * - 最小化类型检查
   * - 安全的 JSON 解析
   */
  private parseSections(sections: any): any[] {
    if (!sections) {
      return [];
    }

    if (Array.isArray(sections)) {
      return sections;
    }

    if (typeof sections === 'string') {
      try {
        const parsed = JSON.parse(sections);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        this.logger.warn('章节数据 JSON 解析失败', error);
        return [];
      }
    }

    return [];
  }
}
