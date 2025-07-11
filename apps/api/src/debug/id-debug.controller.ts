import { Controller, Get, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  generateId,
  isValidCuid2,
  detectIdType,
  // migrateToNewId
} from '@repo/common';

/**
 * 🔧 ID 调试和测试控制器
 * 仅在开发环境中使用（生产环境中移除）
 */
@ApiTags('ID 调试（开发用）')
@Controller('debug/ids')
export class IdDebugController {
  private readonly logger = new Logger(IdDebugController.name);

  /**
   * 测试生成新的 CUID2 ID
   */
  @Get('generate')
  @ApiOperation({
    summary: '生成 CUID2 ID（默认5个）',
    description: '默认生成5个新的 CUID2 ID。',
  })
  @ApiResponse({ status: 200, description: 'ID 生成成功' })
  generateDefaultIds() {
    return this.generateIdsWithCount('5');
  }

  /**
   * 生成指定数量的 CUID2 ID
   */
  @Get('generate/:count')
  @ApiOperation({
    summary: '生成 CUID2 ID（指定数量）',
    description: '生成指定数量的新 CUID2 ID。',
  })
  @ApiResponse({ status: 200, description: 'ID 生成成功' })
  generateCountIds(@Param('count') count: string) {
    return this.generateIdsWithCount(count);
  }

  private generateIdsWithCount(count: string) {
    const numIds = count ? parseInt(count, 10) : 5;
    const maxIds = Math.min(numIds, 20); // 限制最多20个

    const ids = [];
    const stats = {
      totalGenerated: 0,
      validCount: 0,
      invalidCount: 0,
      lengthStats: {} as Record<number, number>
    };

    for (let i = 0; i < maxIds; i++) {
      try {
        const id = generateId();
        const isValid = isValidCuid2(id);

        ids.push({
          id,
          length: id.length,
          valid: isValid,
          index: i + 1
        });

        stats.totalGenerated++;
        if (isValid) {
          stats.validCount++;
        } else {
          stats.invalidCount++;
        }

        // 按长度统计
        stats.lengthStats[id.length] = (stats.lengthStats[id.length] || 0) + 1;

      } catch (error) {
        this.logger.error(`ID 生成失败（第 ${i + 1} 个）:`, error);
        ids.push({
          id: null,
          length: 0,
          valid: false,
          error: error instanceof Error ? error.message : String(error),
          index: i + 1
        });
        stats.invalidCount++;
      }
    }

    return {
      success: true,
      message: `已生成 ${maxIds} 个 CUID2 ID`,
      data: {
        ids,
        statistics: {
          ...stats,
          successRate: `${((stats.validCount / stats.totalGenerated) * 100).toFixed(1)}%`,
          expectedLength: 24,
          allCorrectLength: Object.keys(stats.lengthStats).length === 1 &&
                           Object.keys(stats.lengthStats)[0] === '24'
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ID 格式验证和分析
   */
  @Get('analyze/:id')
  @ApiOperation({
    summary: 'ID 格式分析',
    description: '分析和验证提供的 ID 格式。',
  })
  @ApiResponse({ status: 200, description: 'ID 分析完成' })
  analyzeId(@Param('id') id: string) {
    this.logger.log(`ID 分析请求: ${id}`);

    try {
      const detection = detectIdType(id);
      const isValidCuid2Result = isValidCuid2(id);

      // 迁移信息
      // const migration = migrateToNewId(id);

      // 详细分析
      const analysis = {
        inputId: id,
        length: id.length,
        expectedLength: 24,
        lengthMatch: id.length === 24,

        // 字符构成分析
        characterAnalysis: {
          firstChar: id.charAt(0),
          firstCharIsLowercase: /^[a-z]$/.test(id.charAt(0)),
          remainingChars: id.slice(1),
          remainingCharsValid: /^[a-z0-9]+$/.test(id.slice(1)),
          hasUppercase: /[A-Z]/.test(id),
          hasSpecialChars: /[^a-z0-9]/.test(id)
        },

        // 验证结果
        validation: {
          isValidCuid2: isValidCuid2Result,
          detectedType: detection.type,
          detectionMessage: detection.message,
          detectionValid: detection.valid
        },

        // 迁移信息
        // migration: {
        //   required: migration.migrationRequired,
        //   reason: migration.reason,
        //   newId: migration.migrationRequired ? migration.newId : null,
        //   oldId: migration.oldId
        // }
      };

      return {
        success: true,
        message: `ID 分析已完成: ${detection.message}`,
        data: analysis,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('ID 分析出错:', error);
      return {
        success: false,
        error: {
          message: 'ID 分析过程中发生错误',
          details: error instanceof Error ? error.message : String(error)
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 旧版 ID 迁移助手
   */
  // @Get('migrate/:legacyId')
  // @ApiOperation({
  //   summary: '旧版 ID 迁移',
  //   description: '将旧版 ID 转换为新的 CUID2。',
  // })
  // @ApiResponse({ status: 200, description: '迁移完成' })
  // migrateLegacyId(@Param('legacyId') legacyId: string) {
  //   this.logger.log(`旧版 ID 迁移请求: ${legacyId}`);

  //   try {
  //     // const result = migrateToNewId(legacyId);

  //     return {
  //       success: true,
  //       message: result.migrationRequired
  //         ? '已迁移至新的 CUID2 ID'
  //         : '已经是有效的 CUID2 ID',
  //       data: {
  //         ...result,
  //         recommendation: result.migrationRequired
  //           ? `请在数据库中将 "${result.oldId}" 更新为 "${result.newId}"`
  //           : '无需迁移'
  //       },
  //       timestamp: new Date().toISOString()
  //     };

  //   } catch (error) {
  //     this.logger.error('迁移过程中出错:', error);
  //     return {
  //       success: false,
  //       error: {
  //         message: '迁移过程中发生错误',
  //         details: error.message
  //       },
  //       timestamp: new Date().toISOString()
  //     };
  //   }
  // }
}
