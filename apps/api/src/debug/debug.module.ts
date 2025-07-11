import { Module } from '@nestjs/common';
import { IdDebugController } from './id-debug.controller';

/**
 * 🔧 调试模块（仅用于开发环境）
 * 
 * 用于 ID 生成和验证调试的模块。
 * 在生产环境中需要移除此模块。
 */
@Module({
  controllers: [IdDebugController],
})
export class DebugModule {}
