import { getRequestConfig } from "next-intl/server";
import { safe } from "ts-safe";
import { getLocaleAction } from "./get-locale";
import deepmerge from "deepmerge";

/**
 * 默认语言(英语)的消息资源对象
 * @type {any | undefined}
 */
let defaultMessages: any = undefined;

/**
 * Next.js国际化请求配置生成器
 *
 * @description
 * 该配置处理国际化资源的加载和回退机制:
 * 1. 获取当前语言设置
 * 2. 懒加载默认语言(英语)资源
 * 3. 尝试加载目标语言资源
 * 4. 合并默认资源和目标语言资源
 *
 * 工作机制:
 * - 首次加载时缓存英语(默认语言)资源
 * - 使用safe包装器安全地加载目标语言资源
 * - 如果目标语言加载失败,回退到默认语言
 * - 非英语语言会与默认资源深度合并,确保资源完整性
 *
 * @returns {Promise<{
 *   locale: string,
 *   messages: object,
 *   getMessageFallback: Function
 * }>} 返回国际化配置对象
 */
export default getRequestConfig(async () => {
  // 获取当前语言设置
  const locale = await getLocaleAction();

  // 懒加载并缓存默认语言资源
  if (!defaultMessages) {
    defaultMessages = (await import(`./messages/en.json`)).default;
  }

  // 安全加载目标语言资源,失败时回退到默认资源
  const messages = await safe(() => import(`./messages/${locale}.json`))
    .map((m) => m.default)
    .orElse(defaultMessages);

  return {
    locale,
    // 英语直接使用默认资源,其他语言需要与默认资源合并
    messages:
      locale === "en" ? defaultMessages : deepmerge(defaultMessages, messages),
    // 消息键未找到时的回退处理函数
    getMessageFallback({ key, namespace }) {
      return `${namespace}.${key}`;
    },
  };
});
