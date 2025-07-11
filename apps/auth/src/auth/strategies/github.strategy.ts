import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

/**
 * GitHub OAuth2 认证策略
 * 
 * @description
 * 实现 GitHub OAuth2 登录认证的 Passport 策略。
 * 继承自 PassportStrategy 并使用 passport-github2 包提供的 Strategy。
 * 
 * @mechanism
 * 1. 用户点击 GitHub 登录按钮
 * 2. 重定向到 GitHub 授权页面
 * 3. 用户同意授权后重定向回应用的 callback URL
 * 4. validate 方法处理 GitHub 返回的用户信息
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  /**
   * 构造函数 - 初始化 GitHub OAuth2 配置
   * @param configService - NestJS 配置服务,用于获取环境变量
   */
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('social.github.clientId'),
      clientSecret: configService.get<string>('social.github.clientSecret'),
      callbackURL: configService.get<string>('social.github.callbackUrl'),
      scope: ['user:email'], // 请求用户邮箱权限
    });
  }

  /**
   * GitHub OAuth2 验证回调函数
   * 
   * @param accessToken - GitHub 返回的访问令牌
   * @param refreshToken - GitHub 返回的刷新令牌
   * @param profile - GitHub 返回的用户信息
   * @param done - 验证完成的回调函数
   * @returns 处理后的用户信息
   * 
   * @description
   * 处理 GitHub 返回的原始用户数据,转换为应用标准的用户对象格式
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, username, displayName, emails, photos } = profile;
    
    // 构造标准化的用户信息对象
    const user = {
      provider: 'github',
      providerId: id,
      email: emails?.[0]?.value,
      username: username,
      firstName: displayName?.split(' ')[0], // 分割全名的第一部分作为名
      lastName: displayName?.split(' ').slice(1).join(' '), // 剩余部分作为姓
      avatar: photos?.[0]?.value,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
