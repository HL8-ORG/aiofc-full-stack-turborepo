/**
 * @file Button 组件
 * @description 基于 shadcn/ui 的按钮组件,支持多种变体和尺寸,可以作为基础按钮或加载状态按钮使用
 */

import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import type React from 'react';

import type { IconType } from '@repo/design-system/lib/types';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@repo/design-system/lib/utils';

/**
 * 按钮样式变体配置
 * @description 使用 class-variance-authority 定义按钮的样式变体
 * - variant: 定义按钮的视觉风格(默认、破坏性、轮廓、次要、幽灵、链接)
 * - size: 定义按钮的尺寸(默认、小、大、图标)
 */
export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md font-medium text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * 基础按钮组件的属性接口
 * @extends ComponentProps<'button'> - 继承原生按钮属性
 * @extends VariantProps<typeof buttonVariants> - 继承样式变体属性
 */
interface ButtonProps
  extends ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /** 是否将按钮渲染为子组件 */
  asChild?: boolean;
}

/**
 * 基础按钮组件
 * @description 可以通过 asChild 属性将按钮渲染为其他元素,同时保持按钮的样式和行为
 */
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

/**
 * 加载状态按钮组件的属性接口
 * @extends ButtonProps - 继承基础按钮属性
 */
interface ButtonLoadingProps extends ButtonProps {
  /** 是否处于加载状态 */
  isLoading: boolean;
  /** 加载图标的自定义类名 */
  loadingIconClassName?: string;
  /** 普通图标的自定义类名 */
  iconClassName?: string;
  /** 按钮图标组件 */
  icon?: IconType;
}

/**
 * 加载状态按钮组件
 * TODO: 主要的扩展地方
 * @description 在基础按钮的基础上添加了加载状态和图标支持
 * - 加载状态下显示旋转的加载图标
 * - 非加载状态下可以显示自定义图标
 * - 支持自定义图标样式
 */
export function ButtonLoading({
  isLoading,
  disabled,
  children,
  loadingIconClassName,
  iconClassName,
  icon: Icon,
  ...props
}: ButtonLoadingProps) {
  let RenderedIcon: React.ReactNode | undefined;
  if (isLoading) {
    RenderedIcon = (
      <LoaderCircle
        className={cn('me-2 size-4 animate-spin', loadingIconClassName)}
        aria-hidden
      />
    );
  } else if (Icon) {
    RenderedIcon = (
      <Icon className={cn('me-2 size-4', iconClassName)} aria-hidden />
    );
  }

  return (
    <Button
      data-slot="button-loading"
      type="submit"
      disabled={isLoading || disabled}
      aria-live="assertive"
      aria-label={isLoading ? 'Loading' : props['aria-label']}
      {...props}
    >
      {RenderedIcon}
      {children}
    </Button>
  );
}
