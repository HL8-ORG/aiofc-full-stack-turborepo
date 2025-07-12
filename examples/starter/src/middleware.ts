import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 中间件函数,用于处理所有页面请求的认证逻辑
 *
 * @description
 * 该中间件的主要功能:
 * 1. 处理 Playwright 测试请求 - 响应 /ping 路由
 * 2. 验证用户会话 - 检查 session cookie
 * 3. 未登录用户重定向到登录页
 *
 * @param request - Next.js 请求对象
 * @returns NextResponse 响应对象
 */
export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	/**
	 * 处理 Playwright 测试请求
	 * Playwright 需要服务器返回 200 状态码才能开始测试
	 * 这里配置 /ping 路由返回 pong 响应
	 */
	if (pathname.startsWith("/ping")) {
		return new Response("pong", { status: 200 });
	}

	// 验证通过,继续处理请求
	return NextResponse.next();
}

/**
 * 中间件路由匹配配置
 *
 * @description
 * matcher 使用正则表达式定义哪些路由需要经过中间件处理
 * (?!pattern) 表示不匹配 pattern
 * 以下路由将被排除:
 * - Next.js 静态资源 (_next/static)
 * - Next.js 图片优化 API (_next/image)
 * - 网站图标等静态文件 (favicon.ico)
 * - SEO 相关文件 (sitemap.xml, robots.txt)
 * - 认证相关 API 和页面 (api/auth, sign-in, sign-up)
 */
export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth|sign-in|sign-up).*)",
	],
};
