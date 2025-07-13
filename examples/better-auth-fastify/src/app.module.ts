import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// 模块
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { AuthModule, auth as options } from "./better-auth";


@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),

    AuthModule.forRoot({
      auth: options,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
  // 导出以供其他模块使用
  // exports: [],
})
export class AppModule {}
