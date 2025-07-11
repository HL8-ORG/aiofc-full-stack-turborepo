import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  // 连接池配置
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
}));
