"use server";
import { cookies, headers } from "next/headers";
import { COOKIE_KEY_LOCALE, SUPPORTED_LOCALES } from "@/lib/const";

/**
 * 验证给定的语言代码是否在支持的语言列表中
 * @param locale - 需要验证的语言代码
 * @returns 如果语言代码有效返回true,否则返回false
 */
function validateLocale(locale?: string): boolean {
  return SUPPORTED_LOCALES.some((v) => v.code === locale);
}

/**
 * 从Cookie中获取用户设置的语言偏好
 *
 * 工作机制:
 * 1. 读取Cookie存储中的语言设置
 * 2. 验证语言代码是否有效
 * 3. 如果有效则返回语言代码,否则返回undefined
 *
 * @returns 返回Cookie中存储的有效语言代码,如果不存在则返回undefined
 */
async function getLocaleFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_KEY_LOCALE)?.value;

  return validateLocale(locale) ? locale : undefined;
}

/**
 * 从请求头中获取用户浏览器的语言偏好设置
 *
 * 工作机制:
 * 1. 读取accept-language请求头
 * 2. 解析第一个语言选项(优先级最高)
 * 3. 提取主要语言代码(例如从zh-CN中提取zh)
 * 4. 验证语言代码是否有效
 *
 * @returns 返回请求头中的有效语言代码,如果不存在则返回undefined
 */
async function getLocalFromHeader(): Promise<string | undefined> {
  const headerStore = await headers();
  const locale = headerStore
    .get("accept-language")
    ?.split(",")[0]
    ?.trim()
    .split("-")[0];

  return validateLocale(locale) ? locale : undefined;
}

/**
 * 获取用户的语言偏好设置
 *
 * 工作机制:
 * 1. 首先尝试从Cookie中获取用户显式设置的语言偏好
 * 2. 如果Cookie中没有有效设置,则尝试从浏览器请求头中获取语言偏好
 * 3. 如果以上都没有获取到有效语言设置,则使用默认语言(SUPPORTED_LOCALES中的第一个选项)
 *
 * @returns 返回确定的语言代码
 */
export async function getLocaleAction() {
  let locale: string | undefined;

  locale = await getLocaleFromCookie();
  if (!locale) {
    locale = await getLocalFromHeader();
  }

  return locale || SUPPORTED_LOCALES[0].code;
}
