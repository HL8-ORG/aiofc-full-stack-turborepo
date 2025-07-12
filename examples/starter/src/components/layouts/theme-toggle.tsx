"use client";

/**
 * 主题切换组件
 *
 * @description
 * 这是一个用于切换网站主题的 React 组件。
 * 它提供了一个下拉菜单,允许用户在亮色、暗色和系统主题之间切换。
 *
 * @principle 工作原理
 * 1. 主题状态管理:
 *    - 使用 next-themes 的 useTheme hook 管理主题状态
 *    - setTheme 函数用于切换主题
 *
 * 2. 交互机制:
 *    - 通过 DropdownMenu 实现下拉菜单交互
 *    - 点击触发器按钮显示主题选项
 *    - 选择主题选项时调用 setTheme 更新主题
 *
 * 3. 主题切换动画:
 *    - 使用 CSS transform 和 transition 实现图标切换动画
 *    - 在暗色模式下旋转和缩放图标
 *    - Moon 图标绝对定位叠加在 Sun 图标上
 *
 * @implements
 * - 使用 next-themes 实现主题切换
 * - 使用 shadcn/ui 的 DropdownMenu 和 Button 组件
 * - 使用 Tailwind CSS 实现动画和样式
 * - 使用 lucide-react 提供图标
 *
 * @returns {JSX.Element} 返回主题切换下拉菜单组件
 */

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@repo/design-system/components/shadcn-ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/shadcn-ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          亮色模式
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          暗色模式
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
