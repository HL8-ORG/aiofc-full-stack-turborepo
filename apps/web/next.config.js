/** @type {import('next').NextConfig}  */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  // 🔧 workspace 包 transpile 配置
  transpilePackages: ['@repo/schemas'],
  
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:4000/api/v1/auth/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:4001/api/v1/:path*',
      },
    ];
  },
  
  // 🔧 HTTP 请求头配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'x-next-proxy',
            value: 'true',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=60',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  // 🗜️ 压缩配置
  compress: true,
  
  // 📦 Webpack 配置（最小化）
  webpack: (config, { dev, isServer }) => {
    // 在生产环境中移除源码映射
    if (!dev && !isServer) {
      config.devtool = false;
    }
    return config;
  },
  
  // 🖼️ 图片优化配置（Next.js 15 兼容）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天
  },
  
  // 📦 输出配置
  output: 'standalone',
};

module.exports = withBundleAnalyzer(nextConfig);