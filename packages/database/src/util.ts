import { createId } from '@paralleldrive/cuid2';

// 🆔 基于 CUID2 的 ID 生成工具
export const genId = (): string => {
  return createId();
};

// 生成多个 ID
export const genIds = (count: number): string[] => {
  return Array.from({ length: count }, () => createId());
};

// 为了兼容性的别名
export const generateId = genId;
export const generateIds = genIds;
