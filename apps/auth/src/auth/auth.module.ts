import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PrismaModule, RedisModule } from '@repo/database';
// import { RedisModule } from '../redis/redis.module';

// 策略列表
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';

// 守卫列表
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessToken.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessToken.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    RedisModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    GithubStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
