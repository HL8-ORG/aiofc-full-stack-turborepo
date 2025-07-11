// 数据库和服务配置
export { default as databaseConfig } from './database.config';
export { default as jwtConfig } from './jwt.config';
export { default as redisConfig } from './redis.config';
export { default as socialConfig } from './social.config';
export { default as securityConfig } from './security.config';

// Swagger API 文档配置
export {
  setupSwagger,
  setupAuthSwagger,
  type SwaggerConfig,
} from './swagger.config';
