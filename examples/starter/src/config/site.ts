/**
 * 站点配置文件
 *
 * @description
 * 这是一个用于配置网站基本信息的配置文件。
 * 它包含了网站的基本信息、社交媒体链接、主题设置等核心配置。
 *
 * @principle 工作原理
 * 1. 基础配置机制:
 *    - 使用环境变量和默认值配置基础URL
 *    - 统一管理所有社交媒体链接
 *    - 提供完整的站点元信息配置
 *
 * 2. 主题配置机制:
 *    - 支持亮色/暗色主题切换
 *    - 响应系统主题设置
 *    - 提供默认主题配置
 *
 * 3. 图标资源管理:
 *    - 统一管理各类图标资源
 *    - 支持不同平台的图标需求
 *    - 提供多种尺寸和格式选项
 *
 * 4. 社交媒体链接管理:
 *    - 集中管理所有社交媒体链接
 *    - 使用常量避免重复定义
 *    - 便于统一更新和维护
 *
 * 5. 元信息配置:
 *    - 提供站点名称、标语、描述等基本信息
 *    - 配置作者和创建者信息
 *    - 支持多作者配置
 *
 * @implements
 * - 使用 TypeScript 类型定义确保类型安全
 * - 使用环境变量实现灵活配置
 * - 实现完整的站点信息配置
 * - 支持多主题切换
 * - 统一管理图标资源
 *
 * @type {string} BASE_URL - 站点基础URL
 * @type {string} SOURCE_CODE_URL - 源代码仓库地址
 * @type {string} PRO_VERSION - 专业版本链接
 * @type {SiteConfig} siteConfig - 站点配置对象
 */

import type { SiteConfig } from '@/types/site-config';

export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://nextforge.dev';

export const SOURCE_CODE_URL = 'https://github.com/weijunext/nextjs-15-starter';
export const PRO_VERSION = 'https://nexty.dev';

const TWITTER_URL = 'https://x.com/weijunext';
const BSKY_URL = 'https://bsky.app/profile/judewei.bsky.social';
const EMAIL_URL = 'mailto:weijunext@gmail.com';
const GITHUB_URL = 'https://github.com/weijunext';

export const siteConfig: SiteConfig = {
  name: 'Aiofix',
  tagLine: 'Multilingual Next.js 15 Starter',
  description:
    'A multilingual Next.js 15 starter with built-in i18n support. Launch your global-ready web application with a clean, efficient, and SEO-friendly foundation.',
  url: BASE_URL,
  authors: [
    {
      name: 'weijunext',
      url: 'https://weijunext.com',
    },
  ],
  creator: '@weijunext',
  socialLinks: {
    bluesky: BSKY_URL,
    twitter: TWITTER_URL,
    email: EMAIL_URL,
    github: GITHUB_URL,
  },
  themeColors: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  defaultNextTheme: 'system', // next-theme option: system | dark | light
  icons: {
    icon: '/favicon.ico',
    shortcut: '/logo.png',
    apple: '/logo.png', // apple-touch-icon.png
  },
};
