import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// 配置文件
import { databaseConfig } from '@repo/config';
import { jwtConfig } from '@repo/config';
import { redisConfig } from '@repo/config';
import { socialConfig } from '@repo/config';
import { securityConfig } from '@repo/config';

// 模块
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
// import { RedisModule } from './redis/redis.module';
import { PrismaModule, RedisModule } from '@repo/database';

// 守卫、过滤器、拦截器
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '@repo/common';
import { LoggingInterceptor } from '@repo/common';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig, socialConfig, securityConfig],
      envFilePath: ['.env.local', '.env.development'],
    }),

    // 速率限制模块（防止 DDoS 攻击）
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1分钟
        limit: 100, // 每分钟限制100次请求
      },
    ]),

    // 业务模块
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局守卫配置
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 默认对所有端点应用 JWT 认证
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 应用速率限制
    },

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
  ],
})
export class AppModule {}
