/**
 * 🆔 ID 生成工具
 * 
 * 使用 CUID2 生成安全且防止冲突的 ID
 * CUID2 默认由 24 位小写字母和数字组成
 */

import { createId } from '@paralleldrive/cuid2';

/**
 * 生成新的 CUID2 ID
 * @returns 24位 CUID2 字符串 (例如: "yefj4way7aurp2kamr0bwr8n")
 */
export function generateId(): string {
  const id = createId();
  
  // 确保 CUID2 始终为 24 位
  if (id.length !== 24) {
    console.warn(`⚠️ 生成的 ID 长度异常: ${id} (长度: ${id.length})`);
    throw new Error(`CUID2 生成错误: 预期长度 24 位, 实际 ${id.length} 位`);
  }
  
  return id;
}

/**
 * CUID2 格式验证 (严格验证)
 * @param id 待验证的 ID 字符串
 * @returns 是否为有效的 CUID2
 */
export function isValidCuid2(id: string): boolean {
  // CUID2 必须恰好 24 位, 首字符为小写字母, 其余为小写字母或数字
  const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
  
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // 先检查长度 (性能优化)
  if (id.length !== 24) {
    return false;
  }
  
  return cuid2Regex.test(id);
}

/**
 * ID 类型检测
 * @param id 待验证的 ID 字符串
 * @returns ID 类型信息
 */
export function detectIdType(id: string): {
  type: 'cuid2' | 'invalid';
  length: number;
  valid: boolean;
  message: string;
} {
  if (!id || typeof id !== 'string') {
    return {
      type: 'invalid',
      length: 0,
      valid: false,
      message: '未提供 ID 或不是字符串类型'
    };
  }
  
  if (isValidCuid2(id)) {
    return {
      type: 'cuid2',
      length: id.length,
      valid: true,
      message: '有效的 CUID2 ID'
    };
  }
  
  return {
    type: 'invalid',
    length: id.length,
    valid: false,
    message: `无效的 ID 格式 (长度: ${id.length}, 预期: 24位 CUID2)`
  };
}

/**
 * 批量生成多个 CUID2 ID
 * @param count 要生成的 ID 数量
 * @returns CUID2 ID 数组
 */
export function generateIds(count: number): string[] {
  if (count <= 0) {
    return [];
  }
  
  return Array.from({ length: count }, () => generateId());
}

/**
 * 利用 CUID2 包含时间戳的特性进行排序
 * @param ids CUID2 ID 数组
 * @param order 排序顺序 ('asc' | 'desc')
 * @returns 排序后的 ID 数组
 */
export function sortCuid2Ids(ids: string[], order: 'asc' | 'desc' = 'desc'): string[] {
  return [...ids].sort((a, b) => {
    if (order === 'desc') {
      return b.localeCompare(a);
    }
    return a.localeCompare(b);
  });
}

// 类型定义
export type Cuid2 = string & { readonly __brand: unique symbol };

/**
 * 类型安全的 CUID2 生成
 * @returns 类型已保证的 CUID2
 */
export function generateTypedId(): Cuid2 {
  return generateId() as Cuid2;
}
