// ==============================
// 🎓 课程相关统一模式
// API服务和Web客户端共同使用
// ==============================

import { z } from 'zod';
import { paginationSchema, sortOrderSchema, idSchema } from '../base';

// ===================================
// 📚 课程相关枚举定义
// ===================================

export enum CourseStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum CourseLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum ChapterType {
  TEXT = 'Text',
  VIDEO = 'Video',
  QUIZ = 'Quiz',
}

// ===================================
// 🔍 基础课程模式
// ===================================

// 创建课程模式
export const createCourseSchema = z
  .object({
    title: z
      .string()
      .min(1, '课程标题为必填项')
      .max(200, '标题不能超过200字'),
    description: z
      .string()
      .max(2000, '描述不能超过2000字')
      .optional(),
    category: z
      .string()
      .min(1, '分类为必填项')
      .max(100, '分类不能超过100字'),
    level: z.nativeEnum(CourseLevel),
    price: z
      .number()
      .min(0, '价格必须大于等于0')
      .max(1000000, '价格不能超过1,000,000元')
      .optional(),
    image: z.string().url('图片URL格式不正确').optional(),
    status: z.nativeEnum(CourseStatus).default(CourseStatus.DRAFT),
    teacherId: idSchema,
  })
  .strict();

// 更新课程模式(通用)
export const updateCourseSchema = z
  .object({
    title: z
      .string()
      .min(1, '课程标题为必填项')
      .max(200, '标题不能超过200字')
      .optional(),
    description: z
      .string()
      .max(2000, '描述不能超过2000字')
      .optional(),
    category: z
      .string()
      .min(1, '分类为必填项')
      .max(100, '分类不能超过100字')
      .optional(),
    level: z.nativeEnum(CourseLevel).optional(),
    price: z
      .number()
      .min(0, '价格必须大于等于0')
      .max(1000000, '价格不能超过1,000,000元')
      .optional(),
    image: z.string().url('图片URL格式不正确').optional(),
    status: z.nativeEnum(CourseStatus).optional(),
  })
  .strict();

// FormData专用更新模式(Web使用)
export const updateCourseFormDataSchema = z
  .object({
    courseTitle: z
      .string()
      .min(1, '课程标题为必填项')
      .max(200, '标题不能超过200字')
      .optional(),
    courseDescription: z
      .string()
      .max(2000, '描述不能超过2000字')
      .optional(),
    courseCategory: z
      .string()
      .min(1, '分类为必填项')
      .max(100, '分类不能超过100字')
      .optional(),
    coursePrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(
        z
          .number()
          .min(0, '价格必须大于等于0')
          .max(1000000, '价格不能超过1,000,000元')
          .optional()
      ),
    courseStatus: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  })
  .strict();

// 课程搜索查询模式
export const courseQuerySchema = paginationSchema
  .extend({
    search: z
      .string()
      .max(100, '搜索词不能超过100字')
      .optional(),
    category: z
      .string()
      .max(100, '分类不能超过100字')
      .optional(),
    level: z.nativeEnum(CourseLevel).optional(),
    status: z.nativeEnum(CourseStatus).optional(),
    minPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(z.number().min(0, '最低价格必须大于等于0').optional()),
    maxPrice: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(z.number().min(0, '最高价格必须大于等于0').optional()),
    teacherId: idSchema.optional(),
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'title', 'price', 'enrollments'])
      .default('createdAt'),
    sortOrder: sortOrderSchema,
  })
  .strict();

// 章节模式
export const sectionSchema = z
  .object({
    sectionId: idSchema,
    sectionTitle: z
      .string()
      .min(1, '章节标题为必填项')
      .max(200, '章节标题不能超过200字'),
    sectionDescription: z
      .string()
      .max(500, '章节描述不能超过500字')
      .optional(),
    order: z.number().int().min(0, '顺序必须大于等于0'),
    chapters: z.array(z.any()).default([]), // 使用any避免循环引用
  })
  .strict();

// 小节模式
export const chapterSchema = z
  .object({
    chapterId: idSchema,
    title: z
      .string()
      .min(1, '小节标题为必填项')
      .max(200, '小节标题不能超过200字'),
    content: z
      .string()
      .max(10000, '小节内容不能超过10,000字')
      .optional(),
    video: z.string().url('视频URL格式不正确').optional(),
    type: z.nativeEnum(ChapterType),
    order: z.number().int().min(0, '顺序必须大于等于0'),
    freePreview: z.boolean().default(false),
    duration: z.number().min(0, '播放时长必须大于等于0').optional(),
  })
  .strict();

// 视频上传URL模式(仅API使用)
export const uploadVideoUrlSchema = z
  .object({
    fileName: z.string().min(1, '文件名为必填项'),
    fileType: z.string().min(1, '文件类型为必填项'),
  })
  .strict();

// ===================================
// 📝 TypeScript类型导出
// ===================================

export type CreateCourseDto = z.infer<typeof createCourseSchema>;
export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;
export type UpdateCourseFormDataDto = z.infer<
  typeof updateCourseFormDataSchema
>;
export type CourseQueryDto = z.infer<typeof courseQuerySchema>;
export type SectionDto = z.infer<typeof sectionSchema>;
export type ChapterDto = z.infer<typeof chapterSchema>;
export type UploadVideoUrlDto = z.infer<typeof uploadVideoUrlSchema>;

// ===================================
// 🏗️ 接口定义
// ===================================

// 完整课程信息接口
export interface Course {
  courseId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description?: string;
  category: string;
  image?: string;
  price?: number; // 单位:元(例如:49000)
  level: CourseLevel;
  status: CourseStatus;
  sections: Section[];
  enrollments?: Array<{
    userId: string;
  }>;
  createdAt: string;
  updatedAt: string;

  // 计算字段
  totalEnrollments?: number;
  totalDuration?: number; // 单位:分钟
  totalChapters?: number;
}

// 章节接口
export interface Section {
  sectionId: string;
  sectionTitle: string;
  sectionDescription?: string;
  order: number;
  chapters: Chapter[];
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

// 小节接口
export interface Chapter {
  chapterId: string;
  title: string;
  content?: string;
  video?: string;
  type: ChapterType;
  order: number;
  freePreview: boolean;
  duration?: number; // 单位:分钟
  sectionId: string;
  createdAt: string;
  updatedAt: string;
}

// API响应接口
export interface CourseResponse {
  message: string;
  data: Course;
}

export interface UploadVideoResponse {
  message: string;
  data: {
    uploadUrl: string;
    videoUrl: string;
  };
}

// 课程统计接口
export interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  averagePrice: number;
  totalRevenue: number;
  popularCategories: Array<{
    category: string;
    count: number;
  }>;
  levelDistribution: {
    [key in CourseLevel]: number;
  };
}

// ===================================
// 🔧 工具函数
// ===================================

// 课程过滤器创建函数
export function createCourseFilter(query: CourseQueryDto) {
  const filter: any = {};

  // 搜索词处理(标题、描述、分类中搜索)
  if (query.search) {
    filter.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // 单个字段过滤
  if (query.category) {
    filter.category = { contains: query.category, mode: 'insensitive' };
  }

  if (query.level) {
    filter.level = query.level;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.teacherId) {
    filter.teacherId = query.teacherId;
  }

  // 价格范围过滤
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) {
      filter.price.gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      filter.price.lte = query.maxPrice;
    }
  }

  return filter;
}

// 排序选项创建函数
export function createCourseOrderBy(query: CourseQueryDto) {
  return {
    [query.sortBy]: query.sortOrder,
  };
}

// 课程统计计算函数
export function calculateCourseStats(courses: Course[]): CourseStats {
  const total = courses.length;
  const published = courses.filter(
    (course) => course.status === CourseStatus.PUBLISHED
  ).length;
  const draft = courses.filter(
    (course) => course.status === CourseStatus.DRAFT
  ).length;

  const totalEnrollments = courses.reduce(
    (sum, course) => sum + (course.enrollments?.length || 0),
    0
  );

  const prices = courses
    .filter((course) => course.price !== undefined)
    .map((course) => course.price!);
  const averagePrice =
    prices.length > 0
      ? Math.round(
          prices.reduce((sum, price) => sum + price, 0) / prices.length
        )
      : 0;
  const totalRevenue = prices.reduce((sum, price) => sum + price, 0);

  // 分类统计
  const categoryCount: Record<string, number> = {};
  courses.forEach((course) => {
    categoryCount[course.category] = (categoryCount[course.category] || 0) + 1;
  });

  const popularCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 级别分布
  const levelDistribution = {
    [CourseLevel.BEGINNER]: courses.filter(
      (c) => c.level === CourseLevel.BEGINNER
    ).length,
    [CourseLevel.INTERMEDIATE]: courses.filter(
      (c) => c.level === CourseLevel.INTERMEDIATE
    ).length,
    [CourseLevel.ADVANCED]: courses.filter(
      (c) => c.level === CourseLevel.ADVANCED
    ).length,
  };

  return {
    totalCourses: total,
    publishedCourses: published,
    draftCourses: draft,
    totalEnrollments,
    averagePrice,
    totalRevenue,
    popularCategories,
    levelDistribution,
  };
}

// 课程搜索查询验证函数
export function validateCourseQuery(query: any): CourseQueryDto {
  const result = courseQuerySchema.safeParse(query);
  if (!result.success) {
    throw new Error(
      `无效的课程搜索查询: ${result.error.errors.map((e) => e.message).join(', ')}`
    );
  }
  return result.data;
}

// 课程权限检查函数
export function canManageCourse(
  currentUserId: string,
  courseTeacherId: string,
  userRole: string
): boolean {
  // 管理员可以管理所有课程
  if (userRole === 'ADMIN') {
    return true;
  }

  // 讲师只能管理自己的课程
  if (userRole === 'INSTRUCTOR' && currentUserId === courseTeacherId) {
    return true;
  }

  return false;
}

// 课程价格格式化函数
export function formatCoursePrice(price?: number): string {
  if (!price || price === 0) {
    return '免费';
  }

  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(price);
}

// 课程级别中文转换函数
export function getCourseLevelText(level: CourseLevel): string {
  const levelMap = {
    [CourseLevel.BEGINNER]: '初级',
    [CourseLevel.INTERMEDIATE]: '中级',
    [CourseLevel.ADVANCED]: '高级',
  };

  return levelMap[level];
}

// 课程状态中文转换函数
export function getCourseStatusText(status: CourseStatus): string {
  const statusMap = {
    [CourseStatus.DRAFT]: '草稿',
    [CourseStatus.PUBLISHED]: '已发布',
  };

  return statusMap[status];
}

// 小节类型中文转换函数
export function getChapterTypeText(type: ChapterType): string {
  const typeMap = {
    [ChapterType.TEXT]: '文本',
    [ChapterType.VIDEO]: '视频',
    [ChapterType.QUIZ]: '测验',
  };

  return typeMap[type];
}

export const courseLevelSchema = z.enum(
  ['Beginner', 'Intermediate', 'Advanced'],
  {
    errorMap: () => ({
      message:
        '课程级别必须是 Beginner、Intermediate、Advanced 之一',
    }),
  }
);

export const chapterTypeSchema = z.enum(['Text', 'Video', 'Quiz'], {
  errorMap: () => ({
    message: '小节类型必须是 Text、Video、Quiz 之一',
  }),
});
