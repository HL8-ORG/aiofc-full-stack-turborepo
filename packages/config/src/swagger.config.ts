import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Swagger API 文档配置函数
 * @param app NestJS 应用实例
 * @param config Swagger 配置选项
 */
export interface SwaggerConfig {
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  bearerAuthName?: string;
}

export function setupSwagger(
  app: INestApplication,
  config: SwaggerConfig = {}
): void {
  const {
    title = 'API 文档',
    description = '应用程序 API 文档',
    version = '1.0',
    path = 'api-docs',
    bearerAuthName = 'access-token'
  } = config;

  // Swagger 文档配置
  const swaggerConfig = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: '请输入 JWT 访问令牌（不包含 Bearer 前缀）',
        in: 'header',
      },
      bearerAuthName
    )
    .addServer('http://localhost:4000', '开发服务器')
    .addServer('/', '本地服务器')
    .addTag('🔐 认证 (Authentication)', '用户认证和令牌管理')
    .addTag('👤 用户 (Users)', '用户信息管理')
    .addTag('🔧 调试 (Debug)', '开发和调试用端点')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Swagger UI 配置
  SwaggerModule.setup(path, app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 刷新后保持令牌
      tagsSorter: 'alpha', // 标签按字母排序
      operationsSorter: 'alpha', // 操作按字母排序
      docExpansion: 'none', // 默认折叠
      filter: true, // 启用搜索过滤
      showRequestHeaders: true, // 显示请求头
      tryItOutEnabled: true, // 启用 Try it out 按钮
      displayRequestDuration: true, // 显示请求时间
      defaultModelsExpandDepth: 2, // 模型展开深度
      defaultModelExpandDepth: 2, // 模型展开深度
      requestInterceptor: (req: any) => {
        console.log('Swagger 请求日志:', req.method, req.url);
        return req;
      },
      responseInterceptor: (res: any) => {
        console.log('Swagger 响应日志:', res.status, res.url);
        return res;
      },
    },
    customSiteTitle: title,
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #3b4151; font-size: 28px; }
      .swagger-ui .scheme-container { background: #f7f7f7; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .swagger-ui .auth-wrapper { margin: 20px 0; }
      .swagger-ui .btn.authorize { background-color: #49cc90; border-color: #49cc90; }
      .swagger-ui .btn.authorize:hover { background-color: #3ea672; border-color: #3ea672; }
      .swagger-ui .authorization__btn { background-color: #49cc90; border-color: #49cc90; }
      .swagger-ui .authorization__btn:hover { background-color: #3ea672; border-color: #3ea672; }
      .swagger-ui .try-out__btn { margin-left: 10px; }
      .swagger-ui .execute-wrapper { text-align: center; padding: 20px; }
      .swagger-ui .btn.execute { background: #4990e2; color: white; border-color: #4990e2; }
    `,
  });
}

/**
 * LMS 认证服务的 Swagger 配置
 * @param app NestJS 应用实例
 * @param port 服务端口
 */
export function setupAuthSwagger(app: INestApplication, port: number | string): void {
  setupSwagger(app, {
    title: '🔐 LMS 认证 API',
    description: `
# LMS 系统认证服务 API 文档

此 API 提供 LMS（学习管理系统）的认证服务。

## 🚀 主要功能
- **注册/登录**: 基于邮箱的用户认证
- **JWT 令牌管理**: 访问/刷新令牌的签发与更新
- **安全**: 各种安全功能和错误处理
- **社交登录**: Google、GitHub 集成（计划中）

## 🔑 认证方法
1. 通过 \`/auth/login\` 端点登录
2. 从响应中复制 \`accessToken\`
3. 点击右上角的 **"Authorize"** 按钮
4. 输入 \`accessToken\`（不包含 Bearer 前缀）
5. 现在可以测试带有 🔒 标记的端点了！

## 📝 测试用户
在开发环境中可以使用以下账号进行测试：
- **邮箱**: student1@example.com
- **密码**: password123

## ⚠️ 注意事项
- 令牌将在 15 分钟后过期
- 过期的令牌可通过 \`/auth/refresh\` 端点更新
- 调试端点仅在开发环境中启用
    `,
    version: '1.0.0',
    path: 'api-docs',
    bearerAuthName: 'access-token'
  });

  console.log(`📚 Swagger 文档: http://localhost:${port}/api-docs`);
  console.log(`🔧 认证测试: 登录后点击右上角 "Authorize" 按钮`);
  console.log(`📋 API 路径: http://localhost:${port}/api/v1`);
}
