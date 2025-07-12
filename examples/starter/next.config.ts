import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
	compiler: {
		removeConsole:
			process.env.NODE_ENV === "production"
				? {
						exclude: ["error"],
					}
				: false,
	},
	cleanDistDir: true,
	// 开发模式指示器配置
	devIndicators: {
		position: "bottom-right",
	},
	// 图片域名配置
	images: {
		domains: ["i.pravatar.cc", "images.unsplash.com"], // 允许加载的图片域名
	},
	// 环境变量配置
	env: {
		NO_HTTPS: process.env.NO_HTTPS,
		NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
	},
};

/**
 * Next.js 国际化插件实例
 *
 * @description
 * 使用 next-intl 创建的插件实例,用于处理多语言路由和翻译
 */
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
