import { Controller, Get, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AppService } from './app.service';
import { Public } from '@repo/common';

/**
 * 🏠 API 主控制器
 *
 * 主要端点:
 * - GET / - API 状态检查
 * - GET /health - 健康检查
 */
@ApiTags('系统')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  /**
   * 🏠 API 主页
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'API 主页', description: '返回 API 服务器的基本信息。' })
  @ApiResponse({ status: 200, description: 'API 信息返回成功' })
  getHello() {
    this.logger.log('API 主页请求');
    return this.appService.getApiInfo();
  }

  /**
   * ❤️ 健康检查端点
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: '健康检查', description: '检查 API 服务器的状态。' })
  @ApiResponse({ status: 200, description: '服务器状态正常' })
  getHealth() {
    this.logger.log('健康检查请求');
    return this.appService.getHealthCheck();
  }

  /**
   * 🎨 Favicon 处理
   */
  @Public()
  @Get('favicon.ico')
  @ApiOperation({ summary: 'Favicon', description: '返回 Favicon 文件。' })
  @ApiResponse({ status: 204, description: '无 Favicon' })
  getFavicon(@Res() res: Response) {
    this.logger.log('Favicon 请求');
    // 使用 204 No Content 响应处理 favicon 请求
    res.status(204).end();
  }
}
