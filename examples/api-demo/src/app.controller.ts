import { Controller, Get, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AppService } from './app.service';

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

  @Get()
  getHello() {
    return this.appService.getHello();
  }


}
