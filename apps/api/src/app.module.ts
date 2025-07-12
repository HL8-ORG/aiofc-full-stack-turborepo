import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// 配置文件
import { databaseConfig } from '@repo/config';
import { jwtConfig } from '@repo/config';
import { redisConfig } from '@repo/config';

// 模块
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UserCourseProgressModule } from './user-course-progress/user-course-progress.module';
import { DebugModule } from './debug/debug.module'; // 🔧 仅用于开发环境
import { PerformanceModule } from './performance/performance.module'; // 📊 性能监控
import { PrismaModule, RedisModule } from '@repo/database';

// 守卫、过滤器、拦截器（通用包）
import { AllExceptionsFilter } from '@repo/common';
import { LoggingInterceptor } from '@repo/common';
// import { TokenRefreshInterceptor } from '@repo/common'; // 暂时禁用

// 本地 JWT 守卫和策略
import { ApiJwtAuthGuard } from './auth/guards/api-jwt-auth.guard';
import { JwtStrategy } from './auth/strategies/jwt.strategy';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig],
      envFilePath: ['.env.local'],
    }),

    // Passport 模块
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT 模块配置
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('jwt.secret');
        const jwtExpiresIn = configService.get<string>('jwt.expiresIn');
        
        if (!jwtSecret) {
          throw new Error('未设置 JWT_SECRET。请检查环境变量。');
        }

        console.log('🔑 JWT 模块配置完成 - 密钥存在:', !!jwtSecret);

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: jwtExpiresIn || '1h',
          },
        };
      },
    }),

    // 速率限制模块（防止 DDoS）
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1分钟
        limit: 100, // 每分钟限制100次请求
      },
    ]),

    // 业务模块
    PrismaModule,
    RedisModule,
    CoursesModule,
    TransactionsModule,
    UserCourseProgressModule,
    
    // 📊 性能监控模块
    PerformanceModule,
    
    // 🔧 调试模块（仅用于开发环境 - 生产环境将移除）
    DebugModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    
    // Core NestJS providers
    Reflector,
    
    // JWT 策略
    JwtStrategy,
    
    // 本地 JWT Auth Guard（确保 Reflector 依赖）
    ApiJwtAuthGuard,
    
    // 应用速率限制
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
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

    // 令牌刷新拦截器（JWT 模块准备就绪后启用）
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TokenRefreshInterceptor,
    // },
  ],
  // 导出以供其他模块使用
  exports: [ApiJwtAuthGuard, JwtModule],
})
export class AppModule {}
