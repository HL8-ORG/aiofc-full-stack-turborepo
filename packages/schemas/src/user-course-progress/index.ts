// ==============================
// 📈 用户课程进度管理统一模式
// API服务和Web客户端共同使用
// ==============================

import { z } from 'zod';
import { paginationSchema, sortOrderSchema, idSchema } from '../base';

// ===================================
// 📊 进度相关基本模式
// ===================================

// 章节进度模式
export const chapterProgressSchema = z
  .object({
    chapterId: idSchema,
    completed: z.boolean().default(false),
    completedAt: z.string().datetime().optional(),
    timeSpent: z.number().min(0, '耗时必须大于等于0').default(0), // 单位:秒
    lastPosition: z
      .number()
      .min(0, '最后位置必须大于等于0')
      .default(0), // 视频播放位置等
  })
  .strict();

// 单元进度模式
export const sectionProgressSchema = z
  .object({
    sectionId: idSchema,
    chapters: z.array(chapterProgressSchema).default([]),
    completedChapters: z
      .number()
      .int()
      .min(0, '已完成章节数必须大于等于0')
      .default(0),
    totalChapters: z
      .number()
      .int()
      .min(0, '总章节数必须大于等于0')
      .default(0),
    progressPercentage: z
      .number()
      .min(0)
      .max(100, '进度百分比必须在0-100之间')
      .default(0),
  })
  .strict();

// 用户课程进度更新模式
export const updateUserCourseProgressSchema = z
  .object({
    chapterId: idSchema,
    completed: z.boolean(),
    timeSpent: z.number().min(0, '耗时必须大于等于0').optional(),
    lastPosition: z
      .number()
      .min(0, '最后位置必须大于等于0')
      .optional(),
  })
  .strict();

// 进度查询模式
export const progressQuerySchema = paginationSchema
  .extend({
    userId: idSchema.optional(),
    courseId: idSchema.optional(),
    minProgress: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(
        z.number().min(0).max(100, '进度百分比必须在0-100之间').optional()
      ),
    maxProgress: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(
        z.number().min(0).max(100, '进度百分比必须在0-100之间').optional()
      ),
    completed: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => (val ? val === 'true' : undefined)),
    enrolledAfter: z.string().datetime().optional(),
    enrolledBefore: z.string().datetime().optional(),
    lastAccessAfter: z.string().datetime().optional(),
    lastAccessBefore: z.string().datetime().optional(),
    sortBy: z
      .enum([
        'enrollmentDate',
        'lastAccessedTimestamp',
        'overallProgress',
        'timeSpent',
      ])
      .default('lastAccessedTimestamp'),
    sortOrder: sortOrderSchema,
  })
  .strict();

// ===================================
// 📝 TypeScript 类型导出
// ===================================

export type ChapterProgressDto = z.infer<typeof chapterProgressSchema>;
export type SectionProgressDto = z.infer<typeof sectionProgressSchema>;
export type UpdateUserCourseProgressDto = z.infer<
  typeof updateUserCourseProgressSchema
>;
export type ProgressQueryDto = z.infer<typeof progressQuerySchema>;

// ===================================
// 🏗️ 接口定义
// ===================================

// 章节进度接口
export interface ChapterProgress {
  chapterId: string;
  completed: boolean;
  completedAt?: string;
  timeSpent: number; // 单位:秒
  lastPosition: number; // 视频播放位置等
}

// 单元进度接口
export interface SectionProgress {
  sectionId: string;
  chapters: ChapterProgress[];
  completedChapters: number;
  totalChapters: number;
  progressPercentage: number;
}

// 用户课程进度综合接口
export interface UserCourseProgress {
  userId: string;
  courseId: string;
  enrollmentDate: string;
  overallProgress: number; // 0-100百分比
  sections: SectionProgress[];
  lastAccessedTimestamp: string;
  totalTimeSpent: number; // 单位:秒
  completedAt?: string;
  certificateId?: string;

  // 计算字段
  completedChapters?: number;
  totalChapters?: number;
  estimatedTimeRemaining?: number; // 单位:秒
  averageTimePerChapter?: number; // 单位:秒
}

// ===================================
// 🔧 工具函数
// ===================================

// 计算总进度百分比
export function calculateOverallProgress(sections: SectionProgress[]): number {
  if (sections.length === 0) return 0;

  const totalChapters = sections.reduce(
    (sum, section) => sum + section.totalChapters,
    0
  );
  const completedChapters = sections.reduce(
    (sum, section) => sum + section.completedChapters,
    0
  );

  return totalChapters > 0
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;
}

// 计算单元进度百分比
export function calculateSectionProgress(chapters: ChapterProgress[]): number {
  if (chapters.length === 0) return 0;

  const completedChapters = chapters.filter(
    (chapter) => chapter.completed
  ).length;
  return Math.round((completedChapters / chapters.length) * 100);
}

// 学习时间格式化
export function formatStudyTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟`;
  } else {
    return '不到1分钟';
  }
}

// 创建进度查询过滤器
export function createProgressFilter(query: ProgressQueryDto) {
  const filter: any = {};

  if (query.userId) {
    filter.userId = query.userId;
  }

  if (query.courseId) {
    filter.courseId = query.courseId;
  }

  // 进度范围过滤
  if (query.minProgress !== undefined || query.maxProgress !== undefined) {
    filter.overallProgress = {};
    if (query.minProgress !== undefined) {
      filter.overallProgress.gte = query.minProgress;
    }
    if (query.maxProgress !== undefined) {
      filter.overallProgress.lte = query.maxProgress;
    }
  }

  // 完成状态过滤
  if (query.completed !== undefined) {
    if (query.completed) {
      filter.overallProgress = { gte: 100 };
    } else {
      filter.overallProgress = { lt: 100 };
    }
  }

  // 注册日期范围过滤
  if (query.enrolledAfter || query.enrolledBefore) {
    filter.enrollmentDate = {};
    if (query.enrolledAfter) {
      filter.enrollmentDate.gte = new Date(query.enrolledAfter);
    }
    if (query.enrolledBefore) {
      filter.enrollmentDate.lte = new Date(query.enrolledBefore);
    }
  }

  // 最后访问日期范围过滤
  if (query.lastAccessAfter || query.lastAccessBefore) {
    filter.lastAccessedTimestamp = {};
    if (query.lastAccessAfter) {
      filter.lastAccessedTimestamp.gte = new Date(query.lastAccessAfter);
    }
    if (query.lastAccessBefore) {
      filter.lastAccessedTimestamp.lte = new Date(query.lastAccessBefore);
    }
  }

  return filter;
}

// 创建排序选项
export function createProgressOrderBy(query: ProgressQueryDto) {
  return {
    [query.sortBy]: query.sortOrder,
  };
}

// 验证进度查询
export function validateProgressQuery(query: any): ProgressQueryDto {
  const result = progressQuerySchema.safeParse(query);
  if (!result.success) {
    throw new Error(
      `无效的进度查询: ${result.error.errors.map((e) => e.message).join(', ')}`
    );
  }
  return result.data;
}

// 进度百分比转换为状态文本
export function getProgressStatusText(progress: number): string {
  if (progress === 0) return '未开始';
  if (progress < 25) return '已开始';
  if (progress < 50) return '进行中';
  if (progress < 75) return '过半';
  if (progress < 100) return '即将完成';
  return '已完成';
}

// 进度百分比转换为颜色(UI使用)
export function getProgressColor(progress: number): string {
  if (progress === 0) return 'gray';
  if (progress < 25) return 'red';
  if (progress < 50) return 'orange';
  if (progress < 75) return 'yellow';
  if (progress < 100) return 'blue';
  return 'green';
}
