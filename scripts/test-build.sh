#!/bin/bash

echo "🔧 依赖安装及构建测试"
echo "==============================="

cd /Users/codelab/github_repos/lms-next-nestjs

echo "📦 正在安装依赖..."
pnpm install

echo "🏗️ 测试构建 common 包..."
cd packages/common
pnpm build

if [ $? -eq 0 ]; then
    echo "✅ common 包构建成功!"
else
    echo "❌ common 包构建失败"
    exit 1
fi

cd ../..

echo "🚀 测试构建整个项目..."
pnpm build:packages

if [ $? -eq 0 ]; then
    echo "✅ 所有包构建成功!"
    echo "🎉 三个阶段的改进已完成!"
else
    echo "❌ 包构建失败"
    exit 1
fi
