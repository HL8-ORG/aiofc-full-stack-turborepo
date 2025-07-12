import Cookies from 'js-cookie';
import { create } from 'zustand';
/**
 * 语言提示状态管理接口
 * 
 * @description
 * 这是一个用于管理语言提示状态的接口定义。
 * 它负责控制语言提示的显示状态以及用户的交互行为。
 */
interface LocaleState {
  /** 是否显示语言提示 */
  showLanguageAlert: boolean
  /** 设置语言提示显示状态 */
  setShowLanguageAlert: (show: boolean) => void
  /** 关闭语言提示并记住用户选择 */
  dismissLanguageAlert: () => void
  /** 获取用户是否已关闭过语言提示 */
  getLangAlertDismissed: () => boolean
}

/**
 * 语言提示状态管理存储
 * 
 * @description
 * 这是一个使用 zustand 实现的状态管理存储。
 * 它负责管理语言提示的显示状态,并通过 Cookie 持久化用户的选择。
 * 
 * @principle 工作原理
 * 1. 状态管理机制:
 *    - 使用 zustand 管理语言提示状态
 *    - 提供状态读取和更新方法
 *    - 支持组件间状态共享
 * 
 * 2. 持久化机制:
 *    - 使用 Cookie 存储用户选择
 *    - Cookie 有效期为30天
 *    - 支持跨会话状态保持
 * 
 * 3. 交互控制机制:
 *    - 支持手动控制提示显示
 *    - 提供一键关闭并记住选择
 *    - 自动检查历史选择状态
 * 
 * @implements
 * - 使用 zustand 实现状态管理
 * - 使用 js-cookie 实现状态持久化
 * - 实现用户选择的记忆功能
 */
export const useLocaleStore = create<LocaleState>((set) => ({
  showLanguageAlert: false,
  setShowLanguageAlert: (show) => set({ showLanguageAlert: show }),
  dismissLanguageAlert: () => {
    // cookie expires 30 days
    Cookies.set("langAlertDismissed", "true", { expires: 30 });
    set({ showLanguageAlert: false });
  },
  getLangAlertDismissed: () => {
    return Cookies.get("langAlertDismissed") === "true";
  },
}))