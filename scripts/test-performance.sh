#!/bin/bash

# 📊 性能监控系统测试脚本

echo "🧪 LMS 性能监控系统测试开始"
echo "============================================"

API_BASE_URL="http://localhost:4001/api/v1"

# 1. 通过基本请求生成性能数据
echo "1. 正在通过基本 API 请求生成性能数据..."
for i in {1..5}; do
  curl -s "${API_BASE_URL}/courses" > /dev/null
  curl -s "${API_BASE_URL}/user-course-progress/test-user/test-course" > /dev/null
  echo "  请求 $i/5 完成"
done

echo ""

# 2. 查询性能指标
echo "2. 📊 性能指标查询测试"
echo "--------------------------------"
response=$(curl -s "${API_BASE_URL}/admin/performance/metrics")
echo $response | jq '.' 2>/dev/null || echo "响应: $response"

echo ""

# 3. 慢端点分析
echo "3. 🐌 慢端点分析测试"
echo "--------------------------------"
response=$(curl -s "${API_BASE_URL}/admin/performance/slow-endpoints?limit=5&threshold=500")
echo $response | jq '.' 2>/dev/null || echo "响应: $response"

echo ""

# 4. 内存使用量查询
echo "4. 💾 内存使用量查询测试"
echo "--------------------------------"
response=$(curl -s "${API_BASE_URL}/admin/performance/memory-usage?period=1h")
echo $response | jq '.data.current' 2>/dev/null || echo "响应: $response"

echo ""

# 5. 系统健康检查
echo "5. 🔍 系统健康检查测试"
echo "--------------------------------"
response=$(curl -s "${API_BASE_URL}/admin/performance/health")
echo $response | jq '.data' 2>/dev/null || echo "响应: $response"

echo ""
echo "✅ 性能监控系统测试完成！"
echo ""
echo "📝 额外测试方法："
echo "  - 设置 LOG_PERFORMANCE=true 并重启服务器"
echo "  - 在浏览器中访问 http://localhost:4001/api/v1/admin/performance/metrics"
echo "  - 发送多次 API 请求后检查慢端点"
