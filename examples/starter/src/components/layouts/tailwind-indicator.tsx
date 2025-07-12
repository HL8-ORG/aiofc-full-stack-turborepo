/**
 * Tailwind CSS 响应式断点指示器组件
 *
 * @description
 * 这是一个用于在开发环境中显示当前 Tailwind CSS 响应式断点的调试组件。
 * 它在屏幕左下角显示一个圆形指示器,展示当前视口所处的断点范围。
 *
 * @principle 工作原理
 * 1. 环境检测:
 *    - 通过 process.env.NODE_ENV 判断当前环境
 *    - 仅在开发环境中显示,生产环境返回 null
 *
 * 2. 响应式显示机制:
 *    - 使用 Tailwind 的响应式类控制不同断点下的显示/隐藏
 *    - 通过 hidden 和 block 类实现互斥显示
 *    - 断点范围:
 *      xs: < 640px
 *      sm: 640px - 768px
 *      md: 768px - 1024px
 *      lg: 1024px - 1280px
 *      xl: 1280px - 1536px
 *      2xl: >= 1536px
 *
 * 3. 样式设计:
 *    - fixed 定位固定在左下角
 *    - z-50 确保显示在最上层
 *    - 圆形背景配合等宽字体显示断点文本
 *
 * @returns {JSX.Element | null} 返回断点指示器组件或 null
 */
export function TailwindIndicator() {
  // 在生产环境中不显示
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // 返回断点指示器组件
  return (
    <div className="fixed bottom-1 left-1 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 p-3 font-mono text-xs text-white">
      <div className="sm:hidden">xs</div>
      <div className="hidden sm:block md:hidden">sm</div>
      <div className="hidden md:block lg:hidden">md</div>
      <div className="hidden lg:block xl:hidden">lg</div>
      <div className="hidden xl:block 2xl:hidden">xl</div>
      <div className="hidden 2xl:block">2xl</div>
    </div>
  );
}
