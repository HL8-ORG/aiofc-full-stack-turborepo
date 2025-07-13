import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs'],
  clean: true,
  sourcemap: true,
  // dts: true // 生成类型声明文件
});