import type { icons, LucideIcon } from 'lucide-react';
import type { ComponentType, SVGAttributes } from 'react';

interface IconProps extends SVGAttributes<SVGElement> {
  children?: never;
  color?: string;
}

export type IconType = ComponentType<IconProps> | LucideIcon;

export type DynamicIconNameType = keyof typeof icons;
