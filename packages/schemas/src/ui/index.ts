import { z } from 'zod';
import { emailSchema } from '../base';
import { courseLevelSchema, chapterTypeSchema } from '../course';

// ==============================
// 🎨 Web UI 专用模式
// ==============================

// 课程编辑器模式 (Web UI 专用)
export const courseEditorSchema = z
  .object({
    courseTitle: z
      .string()
      .min(1, '标题为必填项')
      .max(200, '标题不能超过200字'),
    courseDescription: z
      .string()
      .min(1, '描述为必填项')
      .max(2000, '描述不能超过2000字'),
    courseCategory: z
      .string()
      .min(1, '分类为必填项')
      .max(50, '分类不能超过50字'),
    coursePrice: z.string().transform((val) => {
      if (!val || val === '') return 0;
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('不是有效的数字');
      if (num < 0) throw new Error('价格必须大于等于0');
      return num;
    }),
    courseLevel: courseLevelSchema,
    courseStatus: z.boolean().transform((val) => (val ? 'Published' : 'Draft')),
    courseImage: z.string().url('请输入正确的图片URL').optional(),
  })
  .strict();

// 章节表单模式 (Web UI 专用)
export const chapterFormSchema = z
  .object({
    title: z
      .string()
      .min(2, '标题至少需要2个字符')
      .max(200, '标题不能超过200字'),
    content: z
      .string()
      .min(10, '内容至少需要10个字符')
      .max(10000, '内容不能超过10000字'),
    type: chapterTypeSchema.default('Text'),
    video: z
      .union([
        z.string().url('请输入正确的视频URL'),
        z.instanceof(File),
      ])
      .optional(),
  })
  .strict();

// 章节表单模式 (Web UI 专用)
export const sectionFormSchema = z
  .object({
    title: z
      .string()
      .min(2, '标题至少需要2个字符')
      .max(200, '标题不能超过200字'),
    description: z
      .string()
      .min(10, '描述至少需要10个字符')
      .max(1000, '描述不能超过1000字'),
  })
  .strict();

// 访客结账模式
export const guestCheckoutSchema = z
  .object({
    email: emailSchema,
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: '必须同意使用条款',
    }),
    agreeToPrivacy: z.boolean().refine((val) => val === true, {
      message: '必须同意隐私政策',
    }),
  })
  .strict();

// 文件上传模式 (Web UI 专用)
export const uploadFormSchema = z
  .object({
    file: z
      .instanceof(File)
      .refine((file) => file.size > 0, {
        message: '文件为空',
      })
      .refine((file) => {
        const maxSize = 100 * 1024 * 1024; // 100MB
        return file.size <= maxSize;
      }, '文件大小不能超过100MB'),
    description: z
      .string()
      .max(200, '文件描述不能超过200字')
      .optional(),
  })
  .strict();

// 通知设置模式 (Web UI 专用)
export const notificationSettingsSchema = z
  .object({
    courseNotifications: z.boolean().default(true),
    emailAlerts: z.boolean().default(true),
    smsAlerts: z.boolean().default(false),
    pushNotifications: z.boolean().default(true),
    notificationFrequency: z
      .enum(['immediate', 'daily', 'weekly'], {
        errorMap: () => ({
          message: '通知频率必须是 immediate、daily 或 weekly 之一',
        }),
      })
      .default('immediate'),
    marketingEmails: z.boolean().default(false),
    newCourseAlerts: z.boolean().default(true),
    progressReminders: z.boolean().default(true),
  })
  .strict();

// 进度更新模式 (Web UI 专用)
export const progressUpdateSchema = z
  .object({
    chapterId: z.string().min(1),
    completed: z.boolean(),
    timeSpent: z.number().min(0).optional(), // 单位：秒
    notes: z.string().max(500, '笔记不能超过500字').optional(),
    rating: z.number().min(1).max(5).optional(),
  })
  .strict();

// 为保持与现有模式名称的兼容性
export const courseSchema = courseEditorSchema;
// export const chapterSchema = chapterFormSchema;
// export const sectionSchema = sectionFormSchema;
export const guestSchema = guestCheckoutSchema;

// TypeScript 类型提取
export type CourseEditorFormData = z.infer<typeof courseEditorSchema>;
export type ChapterFormData = z.infer<typeof chapterFormSchema>;
export type SectionFormData = z.infer<typeof sectionFormSchema>;
export type GuestCheckoutFormData = z.infer<typeof guestCheckoutSchema>;
export type UploadFormData = z.infer<typeof uploadFormSchema>;
export type NotificationSettingsFormData = z.infer<
  typeof notificationSettingsSchema
>;
export type ProgressUpdateFormData = z.infer<typeof progressUpdateSchema>;

// 现有类型名称兼容性
export type CourseFormData = CourseEditorFormData;
export type GuestFormData = GuestCheckoutFormData;

// ==============================
// 🔧 Web UI 专用工具函数
// ==============================

// 将表单数据转换为API模式
export function convertCourseFormToApi(formData: CourseEditorFormData) {
  return {
    title: formData.courseTitle,
    description: formData.courseDescription,
    category: formData.courseCategory,
    price: formData.coursePrice,
    level: formData.courseLevel,
    status: formData.courseStatus as 'Draft' | 'Published',
    image: formData.courseImage,
  };
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 计算进度
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// 价格格式化 (人民币)
export function formatPrice(price: number): string {
  if (price === 0) return '免费';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(price);
}

// 级别文本转换
export function getLevelText(level: string): string {
  switch (level) {
    case 'Beginner':
      return '初级';
    case 'Intermediate':
      return '中级';
    case 'Advanced':
      return '高级';
    default:
      return level;
  }
}

// 状态文本转换
export function getStatusText(status: string): string {
  switch (status) {
    case 'Draft':
      return '草稿';
    case 'Published':
      return '已发布';
    default:
      return status;
  }
}
