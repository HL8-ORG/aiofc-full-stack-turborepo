import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';

// 模块
import { AppController } from './app.controller';
import { AppService } from './app.service';

// 守卫、过滤器、拦截器（通用包）
import { AllExceptionsFilter } from '@repo/common';
import { LoggingInterceptor } from '@repo/common';
// import { TokenRefreshInterceptor } from '@repo/common'; // 暂时禁用

// 本地 JWT 守卫和策略

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [],
      envFilePath: ['.env', '.env.development'],
    }),

    // Passport 模块



    
    // 📊 性能监控模块
    
    // 🔧 调试模块（仅用于开发环境 - 生产环境将移除）
  ],
  controllers: [AppController],
  providers: [
    AppService,
    
    // Core NestJS providers
    Reflector,
    
    // JWT 策略
    
    // 本地 JWT Auth Guard（确保 Reflector 依赖）
    


    // 全局异常过滤器（包含 Zod 错误处理）
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },

    // 全局日志拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // 令牌刷新拦截器（JWT 模块准备就绪后启用）
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TokenRefreshInterceptor,
    // },
  ],
  // 导出以供其他模块使用
  exports: [],
})
export class AppModule {}
