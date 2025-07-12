import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
// 模块
import { AppController } from './app.controller';
import { AppService } from './app.service';
// 守卫、过滤器、拦截器（通用包）

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),

    
  ],
  controllers: [AppController],
  providers: [
    AppService,
    
  ],
  // 导出以供其他模块使用
  exports: [],
})
export class AppModule {}
