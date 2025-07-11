#!/bin/bash

# 🌱 LMS 数据库种子执行脚本 (修改版)
#
# 此脚本用于初始化数据库并生成种子数据。

set -e  # 发生错误时终止脚本

echo "🌱 LMS 数据库种子执行"
echo "================================="
echo ""

# 检查当前位置
if [[ ! -f "packages/database/package.json" ]]; then
    echo "❌ 请在项目根目录下执行。"
    exit 1
fi

echo "📍 当前位置: $(pwd)"
echo ""

# 第2步: 构建公共包
echo "📦 第2步: 构建公共包"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd packages/common
echo "📦 正在构建 common 包..."
pnpm build
cd ../..

echo "✅ 公共包构建完成"
echo ""

# 第3步: 初始化数据库
echo "🗄️ 第3步: 初始化数据库"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd packages/database

echo "🔄 正在重新生成 Prisma 客户端..."
npx prisma generate

echo "🗑️ 正在初始化数据库..."
npx prisma db push --force-reset

echo "✅ 数据库初始化完成"
echo ""

# 第4步: 生成种子数据
echo "🌱 第4步: 生成种子数据"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 正在插入种子数据..."

# 检查是否安装了 tsx
if ! command -v tsx &> /dev/null; then
    echo "📦 正在安装 tsx..."
    pnpm install tsx --save-dev
fi

# 执行种子脚本
pnpm seed:dev

cd ../..

echo ""
echo "🎉 种子任务完成！"
echo ""
echo "📌 下一步:"
echo "  1. 启动 API 服务器: cd apps/api && pnpm start:dev"
echo "  2. 启动认证服务器: cd apps/auth && pnpm start:dev"
echo "  3. 启动 Web 客户端: cd apps/web && pnpm dev"
echo ""
echo "✨ 测试账号:"
echo "  📧 讲师: instructor1@example.com"
echo "  📧 学生: student1@example.com"
echo "  📧 管理员: admin@example.com"
echo "  🔑 密码: password123"
echo ""
