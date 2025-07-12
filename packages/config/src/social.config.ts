import { registerAs } from '@nestjs/config';

/**
 * 社交登录配置模块
 * 
 * @description
 * 该模块提供了第三方社交平台(Google、GitHub)的OAuth认证配置。
 * OAuth是一个开放标准的授权协议,允许用户授权第三方应用访问其资源。
 * 
 * @mechanism
 * 1. OAuth 2.0 认证流程:
 *    - clientId: 应用标识,由社交平台分配
 *    - clientSecret: 应用密钥,用于安全验证
 *    - callbackUrl: 认证成功后的回调地址
 * 
 * 2. 认证步骤:
 *    a. 用户点击社交登录按钮
 *    b. 重定向到社交平台的授权页面
 *    c. 用户同意授权后重定向回callbackUrl
 *    d. 后端使用code换取access_token
 * 
 * @security
 * - 使用环境变量存储敏感信息
 * - 提供默认的回调地址用于本地开发
 * - 支持配置自定义回调地址
 */
export default registerAs('social', () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3003/auth/google/callback',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL ||
      'http://localhost:3003/auth/github/callback',
  },
}));
