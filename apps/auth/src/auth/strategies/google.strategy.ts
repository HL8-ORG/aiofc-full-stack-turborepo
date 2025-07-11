import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

/**
 * Google OAuth2 认证策略
 * 
 * @description
 * 实现 Google OAuth2 登录认证的 Passport 策略。
 * 继承自 PassportStrategy 并使用 passport-google-oauth20 包提供的 Strategy。
 * 
 * @mechanism
 * 1. 用户点击 Google 登录按钮
 * 2. 重定向到 Google 授权页面
 * 3. 用户同意授权后重定向回应用的 callback URL
 * 4. validate 方法处理 Google 返回的用户信息
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  /**
   * 构造函数 - 初始化 Google OAuth2 配置
   * @param configService - NestJS 配置服务,用于获取环境变量
   */
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('social.google.clientId'),
      clientSecret: configService.get<string>('social.google.clientSecret'),
      callbackURL: configService.get<string>('social.google.callbackUrl'),
      scope: ['email', 'profile'], // 请求用户邮箱和基本资料权限
    });
  }

  /**
   * Google OAuth2 验证回调函数
   * 
   * @param accessToken - Google 返回的访问令牌
   * @param refreshToken - Google 返回的刷新令牌
   * @param profile - Google 返回的用户信息
   * @param done - 验证完成的回调函数
   * @returns 处理后的用户信息
   * 
   * @description
   * 处理 Google 返回的原始用户数据,转换为应用标准的用户对象格式
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    // 构造标准化的用户信息对象
    const user = {
      provider: 'google',
      providerId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      avatar: photos[0].value,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
