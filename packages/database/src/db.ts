import { PrismaClient } from '@prisma/client';

/**
 * 全局声明 Prisma 客户端实例类型
 * - 使用 var 声明以确保在 Node.js 全局作用域中可用
 * - 在开发环境中用于热重载时复用数据库连接
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Prisma 数据库客户端实例
 */
let db: PrismaClient;

/**
 * 判断当前是否在服务器端运行
 * - 通过检查 process 对象及其版本信息来确定
 * - 用于区分服务器端和客户端环境
 */
const isServer =
  typeof process !== 'undefined' && process.versions && process.versions.node;

/**
 * 初始化 Prisma 客户端
 * 
 * 机制说明:
 * 1. 仅在服务器端环境下初始化数据库连接
 * 2. 生产环境:
 *    - 直接创建新的 Prisma 实例
 *    - 每个进程独立维护自己的数据库连接
 * 3. 开发环境:
 *    - 利用 Node.js 全局对象复用 Prisma 实例
 *    - 防止热重载时创建过多数据库连接
 *    - 启用完整的日志记录用于调试
 */
if (isServer) {
  if (process.env.NODE_ENV === 'production') {
    db = new PrismaClient();
  } else {
    if (!global.prisma) {
      global.prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });
    }
    db = global.prisma;
  }
}

export { db };
