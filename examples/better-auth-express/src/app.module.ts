import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app/app.controller';
import { AuthModule } from './auth/auth-module';
import { AppService } from './app/app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local'],
      isGlobal: true,
    }),
    AuthModule.forRoot({
      disableExceptionFilter: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
