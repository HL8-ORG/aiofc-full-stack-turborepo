import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@repo/database';
import { generateId } from '@repo/common'; // 🆔 使用 CUID2 生成器
import { CreateCourseDto } from '@repo/schemas';
// 临时禁用: UploadVideoUrlDto, UpdateCourseDto, UpdateCourseFormDataDto

// 🔧 定义类型安全的排序常量
const ORDER_BY_INDEX_ASC: Prisma.SortOrder = 'asc';
const ORDER_BY_CREATED_DESC: Prisma.SortOrder = 'desc';

// 📊 章节排序设置
const SECTION_ORDER_BY: Prisma.SectionOrderByWithRelationInput = {
  orderIndex: ORDER_BY_INDEX_ASC,
};
const CHAPTER_ORDER_BY: Prisma.ChapterOrderByWithRelationInput = {
  orderIndex: ORDER_BY_INDEX_ASC,
};

// 🔧 工具函数: 移除 undefined 值
function removeUndefinedFields<T extends Record<string, any>>(
  obj: T
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// 🏗️ 类型定义 - 用于 Prisma 类型推断
type CourseWithSections = Prisma.CourseGetPayload<{
  include: {
    sections: {
      include: {
        chapters: true;
      };
    };
    _count: {
      select: {
        enrollments: true;
        transactions: true;
        comments: true;
      };
    };
  };
}>;

type CourseWithDetails = Prisma.CourseGetPayload<{
  include: {
    sections: {
      include: {
        chapters: {
          include: {
            _count: {
              select: { comments: true };
            };
            comments?: {
              select: {
                commentId: true;
                text: true;
                createdAt: true;
                user: {
                  select: {
                    id: true;
                    username: true;
                    firstName: true;
                    lastName: true;
                    avatar: true;
                  };
                };
              };
            };
          };
        };
      };
    };
    _count: {
      select: {
        enrollments: true;
        transactions: true;
        comments: true;
      };
    };
  };
}>;

/**
 * 📚 课程管理服务
 *
 * 主要功能:
 * - 课程 CRUD 操作
 * - 课程列表查询(按类别过滤)
 * - 视频上传 URL 生成
 * - 权限验证和数据验证
 */
@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);
  private readonly s3Client: S3Client;

  constructor(private readonly prismaService: PrismaService) {
    // 初始化 S3 客户端
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-northeast-2',
    });
  }

  /**
   * 📋 查询课程列表(支持按类别过滤)
   *
   * 性能优化:
   * - 解决 N+1 查询问题
   * - 单次查询加载所有数据
   * - 选择性加载字段以节省网络开销
   */
  async findAllCourses(category?: string, includeDetails: boolean = true) {
    try {
      this.logger.log(
        `开始查询课程列表 - 类别: ${category || '全部'}, 详情: ${includeDetails}`
      );

      // 构建类别过滤条件
      const whereClause: Prisma.CourseWhereInput = {
        status: 'Published' as const, // 仅已发布课程
        ...(category &&
          category !== 'all' &&
          category.trim() !== '' && {
            category: String(category).trim(),
          }),
      };

      this.logger.debug(`使用的 WHERE 条件:`, whereClause);

      // 🚀 简化的 include 选项(指定类型)
      const includeOptions: Prisma.CourseInclude = includeDetails
        ? {
            sections: {
              include: {
                chapters: {
                  orderBy: CHAPTER_ORDER_BY,
                },
              },
              orderBy: SECTION_ORDER_BY,
            },
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          }
        : {
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          };

      const courses = await this.prismaService.course.findMany({
        where: whereClause,
        include: includeOptions,
        orderBy: [
          { createdAt: ORDER_BY_CREATED_DESC }, // 按最新排序
        ],
      });

      this.logger.log(`课程列表查询完成 - 返回 ${courses.length} 个课程`);

      return {
        message: '课程列表查询成功',
        data: courses,
        count: courses.length,
        optimized: true, // 标记已应用性能优化
      };
    } catch (error) {
      this.logger.error('查询课程列表时出错', error);
      throw new BadRequestException(
        '查询课程列表时发生错误'
      );
    }
  }

  /**
   * 🚀 批量查询多个课程(批处理优化)
   *
   * 性能优化:
   * - 单次查询获取多个课程数据
   * - 用于管理员仪表板或比较功能
   */
  async getBatchCourses(courseIds: string[], includeDetails: boolean = true) {
    try {
      this.logger.log(`开始批量查询课程 - ${courseIds.length} 个课程`);

      if (courseIds.length === 0) {
        return {
          message: '没有要查询的课程',
          data: [],
          count: 0,
        };
      }

      // 🚀 简化的 include 选项(指定类型)
      const includeOptions: Prisma.CourseInclude = includeDetails
        ? {
            sections: {
              include: {
                chapters: {
                  orderBy: CHAPTER_ORDER_BY,
                },
              },
              orderBy: SECTION_ORDER_BY,
            },
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          }
        : {
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          };

      const courses = await this.prismaService.course.findMany({
        where: {
          courseId: { in: courseIds },
          status: 'Published' as const, // 仅已发布课程
        },
        include: includeOptions,
        orderBy: {
          createdAt: ORDER_BY_CREATED_DESC,
        },
      });

      this.logger.log(`批量课程查询完成 - 返回 ${courses.length} 个课程`);

      return {
        message: '批量课程查询成功',
        data: courses,
        count: courses.length,
        optimized: true,
      };
    } catch (error) {
      this.logger.error('批量查询课程时出错', error);
      throw new BadRequestException('批量查询课程时发生错误');
    }
  }

  /**
   * 📈 课程统计仪表板数据(聚合优化)
   *
   * 性能优化:
   * - 使用聚合函数的单次查询统计
   * - 提供课程详细统计信息
   */
  async getCourseStatistics(courseId?: string) {
    try {
      this.logger.log(`开始查询课程统计 - 目标: ${courseId || '全部'}`);

      const whereCondition = courseId
        ? { courseId }
        : { status: 'Published' as const };

      // 🚀 使用聚合查询获取基本统计
      const [courseStats, enrollmentStats, transactionStats] =
        await Promise.all([
          // 课程基本统计
          this.prismaService.course.aggregate({
            where: whereCondition,
            _count: { courseId: true },
            _avg: { price: true },
            _sum: { price: true },
            _min: { price: true },
            _max: { price: true },
          }),

          // 注册统计
          this.prismaService.enrollment.groupBy({
            by: ['courseId'],
            where: courseId ? { courseId } : {},
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 10, // 前 10 个课程
          }),

          // 支付统计
          this.prismaService.transaction.groupBy({
            by: ['courseId'],
            where: courseId ? { courseId } : {},
            _count: { transactionId: true },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 10, // 前 10 个课程
          }),
        ]);

      // 按类别统计
      const categoryStats = await this.prismaService.course.groupBy({
        by: ['category'],
        where: { status: 'Published' as const },
        _count: { courseId: true },
        orderBy: { _count: { courseId: 'desc' } },
      });

      this.logger.log(`课程统计查询完成`);

      return {
        message: '课程统计查询成功',
        data: {
          overview: {
            totalCourses: courseStats._count.courseId,
            averagePrice: Math.round(courseStats._avg.price || 0),
            totalRevenue: courseStats._sum.price || 0,
            priceRange: {
              min: courseStats._min.price || 0,
              max: courseStats._max.price || 0,
            },
          },
          enrollments: {
            topCourses: enrollmentStats,
            totalEnrollments: enrollmentStats.reduce(
              (sum, item) => sum + item._count.userId,
              0
            ),
          },
          transactions: {
            topRevenueCourses: transactionStats,
            totalTransactions: transactionStats.reduce(
              (sum, item) => sum + item._count.transactionId,
              0
            ),
            totalRevenue: transactionStats.reduce(
              (sum, item) => sum + (item._sum.amount || 0),
              0
            ),
          },
          categories: categoryStats,
        },
        optimized: true,
      };
    } catch (error) {
      this.logger.error('查询课程统计时出错', error);
      throw new BadRequestException('查询课程统计时发生错误');
    }
  }

  /**
   * 🔍 查询特定课程详情
   *
   * 性能优化:
   * - 选择性数据加载
   * - 支持渐进式数据加载
   * - 高效收集统计信息
   */
  async findCourseById(courseId: string, includeComments: boolean = false) {
    try {
      this.logger.log(
        `开始查询课程详情 - ID: ${courseId}, 包含评论: ${includeComments}`
      );

      // 🚀 简化的 include 选项
      const includeOptions = {
        sections: {
          include: {
            chapters: {
              include: {
                _count: {
                  select: { comments: true },
                },
                ...(includeComments && {
                  comments: {
                    take: 10, // 最近 10 条评论
                    orderBy: { createdAt: 'desc' as const },
                    select: {
                      commentId: true,
                      text: true,
                      createdAt: true,
                      user: {
                        select: {
                          id: true,
                          username: true,
                          firstName: true,
                          lastName: true,
                          avatar: true,
                        },
                      },
                    },
                  },
                }),
              },
              orderBy: CHAPTER_ORDER_BY,
            },
          },
          orderBy: SECTION_ORDER_BY,
        },
        _count: {
          select: {
            enrollments: true,
            transactions: true,
            comments: true,
          },
        },
      };

      const course = (await this.prismaService.course.findUnique({
        where: { courseId },
        include: includeOptions,
      })) as CourseWithDetails | null;

      if (!course) {
        this.logger.warn(`未找到课程 - ID: ${courseId}`);
        throw new NotFoundException('未找到课程');
      }

      // 确保 sections 为空数组
      course.sections = course.sections || [];

      // 📈 计算统计信息
      const totalChapters = course.sections.reduce(
        (sum, section) => sum + (section.chapters?.length || 0),
        0
      );

      const averageChaptersPerSection =
        course.sections.length > 0
          ? Math.round((totalChapters / course.sections.length) * 10) / 10
          : 0;

      this.logger.log(
        `课程查询完成 - 标题: ${course.title}, 章节: ${course.sections.length}个, 总课时: ${totalChapters}个`
      );

      return {
        message: '课程查询成功',
        data: {
          ...course,
          stats: {
            totalSections: course.sections.length,
            totalChapters,
            averageChaptersPerSection,
            enrollmentCount: course._count.enrollments,
            transactionCount: course._count.transactions,
            commentCount: course._count.comments,
          },
        },
        optimized: true,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`查询课程时出错 - ID: ${courseId}`, error);
      throw new BadRequestException('查询课程时发生错误');
    }
  }

  /**
   * 📝 创建新课程
   */
  async createCourse(createCourseDto: CreateCourseDto, id: string) {
    try {
      this.logger.log(`开始创建课程 - 教师: ${createCourseDto.teacherId}`);

      const newCourse = (await this.prismaService.course.create({
        data: {
          courseId: generateId(), // 🆔 使用 CUID2
          teacherId: createCourseDto.teacherId,
          teacherName: '',
          title: '新课程',
          description: '',
          category: '未分类',
          image: '',
          price: 0,
          level: 'Beginner',
          status: 'Draft',
        },
        include: {
          sections: {
            include: {
              chapters: true,
            },
          },
        },
      })) as CourseWithSections;

      this.logger.log(
        `课程创建完成 - ID: ${newCourse.courseId}, 标题: ${newCourse.title}`
      );

      return {
        message: '课程创建成功',
        data: newCourse,
      };
    } catch (error) {
      this.logger.error('创建课程时出错', error);
      throw new BadRequestException('创建课程时发生错误');
    }
  }

  /**
   * ✏️ 修改课程信息(N+1 优化)
   *
   * 🚀 性能优化:
   * - 在 WHERE 条件中包含权限检查以避免单独查询
   * - 基于事务的原子处理
   * - 仅查询所需数据
   */
  async updateCourse(
    courseId: string,
    updateCourseDto: any,
    userId: string,
    file: Express.Multer.File | undefined
  ) {
    try {
      this.logger.log(`开始修改课程 - ID: ${courseId}, 用户: ${userId}`);
      this.logger.log(`更新数据:`, JSON.stringify(updateCourseDto, null, 2));

      // 🚀 N+1 优化: 使用单个事务同时处理权限检查和更新
      const result = await this.prismaService.$transaction(async (tx) => {
        // 准备更新数据
        const updateData = {
          title: updateCourseDto.title,
          description: updateCourseDto.description,
          category: updateCourseDto.category,
          level: updateCourseDto.level,
          status: updateCourseDto.status,
        };

        // 移除 undefined 值(类型安全方式)
        const cleanedUpdateData = removeUndefinedFields(updateData);

        // 🚀 在单个查询中处理权限检查和更新
        const updatedCourse = (await tx.course.update({
          where: {
            courseId,
            teacherId: userId, // 在 WHERE 条件中包含权限检查
          },
          data: cleanedUpdateData,
          include: {
            sections: {
              include: {
                chapters: {
                  orderBy: CHAPTER_ORDER_BY, // ✅ 使用 orderIndex (迁移后)
                },
              },
              orderBy: SECTION_ORDER_BY, // ✅ 使用 orderIndex (迁移后)
            },
            _count: {
              select: {
                enrollments: true,
                transactions: true,
                comments: true,
              },
            },
          },
        })) as CourseWithSections;

        return updatedCourse;
      });

      this.logger.log(
        `课程修改完成 - ID: ${courseId}, 标题: ${result?.title}`
      );

      return {
        message: '课程修改成功',
        data: result,
        optimized: true, // 标记已应用优化
      };
    } catch (error) {
      // Prisma P2025 错误: 未找到记录(包括无权限)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(
          `无修改课程权限或课程不存在 - ID: ${courseId}, 用户: ${userId}`
        );
        throw new ForbiddenException(
          '您没有修改此课程的权限或课程不存在'
        );
      }

      // Prisma P2022 错误: 未找到列(缺少 orderIndex 字段)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2022'
      ) {
        this.logger.error(
          `数据库架构错误 - 缺少 orderIndex 字段: ${error.meta?.column}`
        );
        throw new BadRequestException(
          '需要更新数据库架构。请联系管理员。'
        );
      }

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `修改课程时出错 - ID: ${courseId}, 用户: ${userId}`,
        error
      );
      throw new BadRequestException(
        '修改课程时发生意外错误'
      );
    }
  }

  /**
   * 🗑️ 删除课程(已优化)
   *
   * 🚀 性能优化:
   * - 在单个查询中处理权限检查和删除
   * - 无需单独查询即可原子删除
   */
  async deleteCourse(courseId: string, userId: string) {
    try {
      this.logger.log(`开始删除课程 - ID: ${courseId}, 用户: ${userId}`);

      // 🚀 优化: 单个查询处理权限检查 + 删除
      const deletedCourse = await this.prismaService.course.delete({
        where: {
          courseId,
          teacherId: userId, // 在 WHERE 条件中包含权限检查
        },
        select: {
          courseId: true,
          title: true,
        },
      });

      this.logger.log(
        `课程删除完成 - ID: ${courseId}, 标题: ${deletedCourse.title}`
      );

      return {
        message: '课程删除成功',
        data: deletedCourse,
        optimized: true, // 标记已应用优化
      };
    } catch (error) {
      // Prisma P2025 错误: 未找到记录(包括无权限)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(
          `无删除课程权限或课程不存在 - ID: ${courseId}, 用户: ${userId}`
        );
        throw new ForbiddenException(
          '您没有删除此课程的权限或课程不存在'
        );
      }

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(`删除课程时出错 - ID: ${courseId}`, error);
      throw new BadRequestException('删除课程时发生错误');
    }
  }

  /**
   * 📹 生成用于视频上传的 S3 预签名 URL
   */
  async generateUploadVideoUrl(uploadVideoUrlDto: any) {
    try {
      this.logger.log(
        `开始生成视频上传 URL - 文件: ${uploadVideoUrlDto.fileName}`
      );

      const { fileName, fileType } = uploadVideoUrlDto;

      // 验证文件扩展名
      const allowedVideoTypes = [
        'video/mp4',
        'video/mov',
        'video/avi',
        'video/mkv',
      ];
      if (!allowedVideoTypes.includes(fileType)) {
        throw new BadRequestException(
          '不支持的视频格式。仅支持 MP4、MOV、AVI、MKV。'
        );
      }

      // 生成 S3 键(包含 CUID2 唯一 ID)
      const uniqueId = generateId(); // 🆔 使用 CUID2
      const s3Key = `videos/${uniqueId}/${fileName}`;

      // S3 上传参数
      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        ContentType: fileType,
      };

      if (!process.env.S3_BUCKET_NAME) {
        this.logger.error('未设置 S3_BUCKET_NAME 环境变量');
        throw new BadRequestException('存储设置不正确');
      }

      // 生成预签名 URL (5分钟有效)
      const command = new PutObjectCommand(s3Params);
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 300, // 5分钟
      });

      // 通过 CloudFront 域名生成视频 URL
      const videoUrl = process.env.CLOUDFRONT_DOMAIN
        ? `${process.env.CLOUDFRONT_DOMAIN}/videos/${uniqueId}/${fileName}`
        : `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/videos/${uniqueId}/${fileName}`;

      this.logger.log(`视频上传 URL 生成完成 - 键: ${s3Key}`);

      return {
        message: '视频上传 URL 生成成功',
        data: {
          uploadUrl,
          videoUrl,
          expiresIn: 300,
          fileSize: '最大 500MB',
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('生成视频上传 URL 时出错', error);
      throw new BadRequestException(
        '生成视频上传 URL 时发生错误'
      );
    }
  }
}
