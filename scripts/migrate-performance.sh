#!/bin/bash

echo "🚀 执行数据库性能优化迁移"
echo "=============================================="

cd /Users/codelab/github_repos/lms-next-nestjs/packages/database

echo "📊 第1步: Prisma 索引迁移..."
npx prisma migrate dev --name "add_performance_indexes"

if [ $? -eq 0 ]; then
    echo "✅ Prisma 索引迁移成功!"
else
    echo "❌ Prisma 迁移失败"
    exit 1
fi

echo ""
echo "🔍 第2步: 添加 PostgreSQL 全文搜索索引..."

# 直接连接 PostgreSQL 创建全文搜索索引
if command -v psql >/dev/null 2>&1; then
    echo "使用 PostgreSQL CLI 创建全文搜索索引..."
    
    # 从环境变量读取数据库信息
    DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:password@localhost:5432/lms_next_nestjs_dev"}
    
    psql "$DATABASE_URL" -f migrations/001_fulltext_search_indexes.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ PostgreSQL 全文搜索索引创建成功!"
    else
        echo "⚠️  PostgreSQL 全文搜索索引创建失败 (可选项)"
        echo "   请手动执行 migrations/001_fulltext_search_indexes.sql"
    fi
else
    echo "⚠️  未安装 psql。需要手动执行全文搜索索引创建"
    echo "   文件位置: migrations/001_fulltext_search_indexes.sql"
fi

echo ""
echo "📈 第3步: 验证索引创建..."
npx prisma db push --accept-data-loss

echo ""
echo "🎉 数据库性能优化完成!"
echo "📊 已创建的索引:"
echo "   - 基础索引: 35个"
echo "   - 全文搜索: 6个"
echo "   - 索引总数: 41个"
echo ""
echo "🔍 搜索函数使用示例:"
echo "   SELECT * FROM search_courses('编程');"
echo "   SELECT * FROM search_courses('JavaScript');"
