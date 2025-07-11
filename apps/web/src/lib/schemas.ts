import * as z from "zod";
import {
  emailSchema,
  courseLevelSchema,
  chapterTypeSchema,
  // UI 专用 Schema
  courseEditorSchema,
  chapterFormSchema,
  sectionFormSchema,
  guestCheckoutSchema,
  uploadFormSchema,
  notificationSettingsSchema,
  progressUpdateSchema,
  // 类型定义
  type CourseEditorFormData,
  type ChapterFormData,
  type SectionFormData,
  type GuestCheckoutFormData,
  type UploadFormData,
  type NotificationSettingsFormData,
  type ProgressUpdateFormData,
  // 工具函数
  convertCourseFormToApi,
  formatFileSize,
  calculateProgress,
  formatPrice,
  getLevelText,
  getStatusText,
} from "@repo/schemas";

// ==============================
// 🎨 为保持兼容性而重新导出
// ==============================

// 为保持与现有 Schema 名称的兼容性而设置的别名
export const courseSchema = courseEditorSchema;
export const chapterSchema = chapterFormSchema;
export const sectionSchema = sectionFormSchema;
export const guestSchema = guestCheckoutSchema;

// 为保持与现有类型名称的兼容性
export type CourseFormData = CourseEditorFormData;
export type GuestFormData = GuestCheckoutFormData;

// 重新导出所有 Schema 和类型
export {
  // Schema
  emailSchema,
  courseLevelSchema,
  chapterTypeSchema,
  courseEditorSchema,
  chapterFormSchema,
  sectionFormSchema,
  guestCheckoutSchema,
  uploadFormSchema,
  notificationSettingsSchema,
  progressUpdateSchema,
  // 类型
  type CourseEditorFormData,
  type ChapterFormData,
  type SectionFormData,
  type GuestCheckoutFormData,
  type UploadFormData,
  type NotificationSettingsFormData,
  type ProgressUpdateFormData,
  // 工具函数
  convertCourseFormToApi,
  formatFileSize,
  calculateProgress,
  formatPrice,
  getLevelText,
  getStatusText,
};

// ==============================
// 🔧 额外的 Web 应用专用工具函数
// ==============================

// 将搜索过滤器转换为查询参数
export function convertSearchFilterToQuery(filter: any) {
  const query: Record<string, string> = {};

  if (filter.query) query.search = filter.query;
  if (filter.category) query.category = filter.category;
  if (filter.level) query.level = filter.level;
  if (filter.priceRange?.min !== undefined) query.minPrice = filter.priceRange.min.toString();
  if (filter.priceRange?.max !== undefined) query.maxPrice = filter.priceRange.max.toString();
  if (filter.isFree) query.isFree = filter.isFree.toString();
  if (filter.language) query.language = filter.language;

  return query;
}

// 文件类型验证
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => file.type.startsWith(type));
}

// 时间格式化（秒 -> 时:分:秒）
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 生成星级评分数组
export function generateStarArray(rating: number): Array<'full' | 'half' | 'empty'> {
  const stars: Array<'full' | 'half' | 'empty'> = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < fullStars; i++) {
    stars.push('full');
  }

  if (hasHalfStar) {
    stars.push('half');
  }

  while (stars.length < 5) {
    stars.push('empty');
  }

  return stars;
}

// 日期格式化（中文）
export function formatDateKo(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 相对时间显示（例如："3天前"）
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();

  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < week) return `${Math.floor(diff / day)}天前`;
  if (diff < month) return `${Math.floor(diff / week)}周前`;
  if (diff < year) return `${Math.floor(diff / month)}个月前`;

  return `${Math.floor(diff / year)}年前`;
}

// 文本截断（添加省略号）
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
