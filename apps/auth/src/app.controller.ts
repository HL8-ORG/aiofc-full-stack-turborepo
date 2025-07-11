import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '@repo/common';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * API 根端点
   */
  @Public()
  @Get()
  getApiInfo() {
    return {
      name: 'NestJS 认证系统 API',
      version: '1.0.0',
      description: '安全增强的 JWT 认证系统',
      status: 'running',
      timestamp: new Date().toISOString(),
      features: [
        'JWT 访问/刷新令牌',
        '社交登录 (Google, GitHub)',
        'Zod 模式验证',
        'Redis 会话管理',
        '防暴力破解',
        '速率限制',
        '全面日志记录',
      ],
      endpoints: {
        'POST /auth/register': '注册',
        'POST /auth/login': '登录',
        'POST /auth/refresh': '令牌刷新',
        'POST /auth/logout': '登出',
        'GET /auth/profile': '查看个人资料',
        'GET /users/me': '用户信息',
        'PUT /users/me': '修改用户信息',
        'GET /health': '健康检查',
      },
    };
  }

  /**
   * 健康检查端点
   */
  @Public()
  @Get('health')
  getHealth() {
    return this.appService.getHealthCheck();
  }
}
