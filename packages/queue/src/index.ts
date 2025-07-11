import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

/**
 * Redis 连接配置
 * 默认连接本地 Redis 服务器,可通过环境变量覆盖
 * @remarks maxRetriesPerRequest 设为 null 表示无限重试
 * bullmq : 最快、最可靠、基于 Redis 的 Node 分布式队列。
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

/**
 * 队列名称常量
 */
export const QUEUE_NAME = 'queue';

/**
 * BullMQ 队列实例
 * @remarks 使用 Redis 作为后端存储
 */
export const queue = new Queue(QUEUE_NAME, { connection: redis });

/**
 * 任务类型枚举
 * @enum {string}
 */
export enum JobType {
  /** 生成文章任务 */
  GeneratePosts = 'generate-posts',
}

/**
 * 任务数据类型定义
 * @remarks 使用映射类型确保每种任务类型都有对应的数据结构
 */
export type JobData = {
  [JobType.GeneratePosts]: { count: number };
};

/**
 * 将任务添加到队列
 * @template T - 任务类型
 * @param type - 任务类型
 * @param data - 任务数据
 * @returns 返回创建的任务实例
 * @remarks 使用泛型确保类型安全
 */
export async function enqueue<T extends JobType>(type: T, data: JobData[T]) {
  return queue.add(type, data);
}

/**
 * 队列事件监听器实例
 * @remarks 用于监听任务完成等事件
 */
const queueEvents = new QueueEvents(QUEUE_NAME);

/**
 * 添加任务并等待其完成
 * @template T - 任务类型
 * @param type - 任务类型
 * @param data - 任务数据
 * @returns 返回完成的任务实例
 * @remarks
 * - 先将任务加入队列
 * - 然后通过 waitUntilFinished 等待任务完成
 * - 基于 Redis pub/sub 机制实现任务完成通知
 */
export async function enqueueAndWait<T extends JobType>(
  type: T,
  data: JobData[T],
) {
  const job = await enqueue(type, data);
  await job.waitUntilFinished(queueEvents);
  return job;
}
