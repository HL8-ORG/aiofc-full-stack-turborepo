#!/bin/bash

# 🔬 LMS 项目性能测量脚本
# 测量实际构建时间、包大小、服务器响应时间等

echo "🚀 LMS 项目性能测量开始"
echo "================================="

# 结果保存目录
BENCHMARK_DIR="/Users/codelab/github_repos/lms-next-nestjs/benchmarks"
RESULTS_FILE="${BENCHMARK_DIR}/performance-results.json"
PROJECT_ROOT="/Users/codelab/github_repos/lms-next-nestjs"

cd "$PROJECT_ROOT"

# JSON 结果文件初始化
echo "{" > "$RESULTS_FILE"
echo '  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",' >> "$RESULTS_FILE"
echo '  "measurements": {' >> "$RESULTS_FILE"

echo "📊 1. 构建时间测量"
echo "==================="

# 清除缓存
echo "🧹 正在清除缓存..."
rm -rf .turbo
rm -rf apps/*/dist
rm -rf apps/*/.next
rm -rf packages/*/dist

# 第一次构建(冷构建)
echo "❄️  冷构建时间测量..."
COLD_BUILD_START=$(date +%s.%N)
pnpm build 2>/dev/null >/dev/null
COLD_BUILD_END=$(date +%s.%N)
COLD_BUILD_TIME=$(echo "$COLD_BUILD_END - $COLD_BUILD_START" | bc)

echo "   冷构建时间: ${COLD_BUILD_TIME}秒"

# 第二次构建(缓存构建)
echo "🔥 缓存构建时间测量..."
CACHED_BUILD_START=$(date +%s.%N)
pnpm build 2>/dev/null >/dev/null
CACHED_BUILD_END=$(date +%s.%N)
CACHED_BUILD_TIME=$(echo "$CACHED_BUILD_END - $CACHED_BUILD_START" | bc)

echo "   缓存构建时间: ${CACHED_BUILD_TIME}秒"

# 各个包的构建时间
echo "📦 各包构建时间测量..."
PACKAGES_BUILD_START=$(date +%s.%N)
pnpm build:packages 2>/dev/null >/dev/null
PACKAGES_BUILD_END=$(date +%s.%N)
PACKAGES_BUILD_TIME=$(echo "$PACKAGES_BUILD_END - $PACKAGES_BUILD_START" | bc)

echo "   包构建时间: ${PACKAGES_BUILD_TIME}秒"

# 构建结果保存到 JSON
echo '    "build_times": {' >> "$RESULTS_FILE"
echo "      \"cold_build_seconds\": $COLD_BUILD_TIME," >> "$RESULTS_FILE"
echo "      \"cached_build_seconds\": $CACHED_BUILD_TIME," >> "$RESULTS_FILE"
echo "      \"packages_build_seconds\": $PACKAGES_BUILD_TIME," >> "$RESULTS_FILE"
echo "      \"cache_improvement_percent\": $(echo "scale=2; (($COLD_BUILD_TIME - $CACHED_BUILD_TIME) / $COLD_BUILD_TIME) * 100" | bc)" >> "$RESULTS_FILE"
echo '    },' >> "$RESULTS_FILE"

echo ""
echo "📏 2. 包大小测量"
echo "=================="

# 包大小测量
echo "📊 构建文件大小分析..."

# Next.js 包大小 (web app)
WEB_BUNDLE_SIZE=0
if [ -d "apps/web/.next" ]; then
    WEB_BUNDLE_SIZE=$(du -sk apps/web/.next | cut -f1)
    echo "   Web 应用包大小: ${WEB_BUNDLE_SIZE}KB"
fi

# Auth 服务包大小
AUTH_BUNDLE_SIZE=0
if [ -d "apps/auth/dist" ]; then
    AUTH_BUNDLE_SIZE=$(du -sk apps/auth/dist | cut -f1)
    echo "   Auth 服务包大小: ${AUTH_BUNDLE_SIZE}KB"
fi

# API 服务包大小
API_BUNDLE_SIZE=0
if [ -d "apps/api/dist" ]; then
    API_BUNDLE_SIZE=$(du -sk apps/api/dist | cut -f1)
    echo "   API 服务包大小: ${API_BUNDLE_SIZE}KB"
fi

# 包大小总和
PACKAGES_BUNDLE_SIZE=0
for package in packages/*/dist; do
    if [ -d "$package" ]; then
        SIZE=$(du -sk "$package" | cut -f1)
        PACKAGES_BUNDLE_SIZE=$((PACKAGES_BUNDLE_SIZE + SIZE))
    fi
done
echo "   包大小总和: ${PACKAGES_BUNDLE_SIZE}KB"

TOTAL_BUNDLE_SIZE=$((WEB_BUNDLE_SIZE + AUTH_BUNDLE_SIZE + API_BUNDLE_SIZE + PACKAGES_BUNDLE_SIZE))
echo "   总包大小: ${TOTAL_BUNDLE_SIZE}KB"

# 包大小结果保存到 JSON
echo '    "bundle_sizes": {' >> "$RESULTS_FILE"
echo "      \"web_app_kb\": $WEB_BUNDLE_SIZE," >> "$RESULTS_FILE"
echo "      \"auth_service_kb\": $AUTH_BUNDLE_SIZE," >> "$RESULTS_FILE"
echo "      \"api_service_kb\": $API_BUNDLE_SIZE," >> "$RESULTS_FILE"
echo "      \"packages_kb\": $PACKAGES_BUNDLE_SIZE," >> "$RESULTS_FILE"
echo "      \"total_kb\": $TOTAL_BUNDLE_SIZE" >> "$RESULTS_FILE"
echo '    },' >> "$RESULTS_FILE"

echo ""
echo "🔍 3. 代码指标测量"
echo "==================="

# 计算代码行数
TOTAL_LINES=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v dist | grep -v .next | xargs wc -l | tail -1 | awk '{print $1}')
echo "   总代码行数: $TOTAL_LINES"

# TypeScript 文件数
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v .next | wc -l)
echo "   TypeScript 文件数: $TS_FILES"

# 包数量
PACKAGE_COUNT=$(find packages -name "package.json" | wc -l)
echo "   包数量: $PACKAGE_COUNT"

# 应用数量
APP_COUNT=$(find apps -name "package.json" | wc -l)
echo "   应用数量: $APP_COUNT"

# 代码指标保存到 JSON
echo '    "code_metrics": {' >> "$RESULTS_FILE"
echo "      \"total_lines\": $TOTAL_LINES," >> "$RESULTS_FILE"
echo "      \"typescript_files\": $TS_FILES," >> "$RESULTS_FILE"
echo "      \"packages_count\": $PACKAGE_COUNT," >> "$RESULTS_FILE"
echo "      \"apps_count\": $APP_COUNT" >> "$RESULTS_FILE"
echo '    }' >> "$RESULTS_FILE"

# JSON 文件结束
echo "  }" >> "$RESULTS_FILE"
echo "}" >> "$RESULTS_FILE"

echo ""
echo "✅ 性能测量完成!"
echo "📄 结果文件: $RESULTS_FILE"
echo ""
echo "📊 总结结果:"
echo "============"
echo "冷构建: ${COLD_BUILD_TIME}秒"
echo "缓存构建: ${CACHED_BUILD_TIME}秒"
echo "缓存改进率: $(echo "scale=1; (($COLD_BUILD_TIME - $CACHED_BUILD_TIME) / $COLD_BUILD_TIME) * 100" | bc)%"
echo "总包大小: ${TOTAL_BUNDLE_SIZE}KB"
echo "总代码行数: $TOTAL_LINES"
