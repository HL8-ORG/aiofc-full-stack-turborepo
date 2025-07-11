'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';

// JWT 解码函数 (客户端用)
function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT 解码错误:', error);
    return null;
  }
}

export default function DebugAuthPage() {
  const { user, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [decodedToken, setDecodedToken] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (accessToken) {
      const decoded = decodeJWT(accessToken);
      setDecodedToken(decoded);
    }
  }, [accessToken]);

  if (!mounted) {
    return <div>加载中...</div>;
  }

  const isTokenExpired = decodedToken && decodedToken.exp && Date.now() >= decodedToken.exp * 1000;

  // 检查 userId 是否匹配 (比较令牌中的 userId 和存储的 userId)
  const tokenUserId = decodedToken?.userId || decodedToken?.sub;
  const storedUserId = user?.id;
  const userIdMismatch = tokenUserId && storedUserId && tokenUserId !== storedUserId;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 认证状态调试</h1>

      <div className="space-y-6">
        {/* 当前认证状态 */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">📊 当前认证状态</h2>
          <div className="space-y-2">
            <p><strong>登录状态:</strong> {user ? '✅ 已登录' : '❌ 未登录'}</p>
            <p><strong>令牌状态:</strong> {accessToken ? '✅ 有令牌' : '❌ 无令牌'}</p>
            <p><strong>令牌有效期:</strong> {
              decodedToken
                ? (isTokenExpired ? '❌ 已过期' : '✅ 有效')
                : '❓ 无法确认'
            }</p>
            <p><strong>userId 匹配:</strong> {
              userIdMismatch
                ? '❌ 不匹配'
                : (tokenUserId && storedUserId ? '✅ 匹配' : '❓ 无法确认')
            }</p>
          </div>
        </div>

        {/* userId 不匹配警告 */}
        {userIdMismatch && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-red-800">⚠️ 发现严重问题</h2>
            <div className="space-y-2 text-red-700">
              <p><strong>存储的 userId:</strong> {storedUserId}</p>
              <p><strong>令牌中的 userId:</strong> {tokenUserId}</p>
              <p className="font-bold">两个值不一致！这是导致 403 错误的原因。</p>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/signin';
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded mt-2"
              >
                退出并重新登录
              </button>
            </div>
          </div>
        )}

        {/* JWT 令牌分析 */}
        {accessToken && (
          <div className="bg-card p-4 rounded-lg border">
            <h2 className="text-lg font-semibold mb-3">🔐 JWT 令牌分析</h2>
            {decodedToken ? (
              <div className="space-y-3">
                <div>
                  <p><strong>令牌 userId:</strong> {tokenUserId || '无'}</p>
                  <p><strong>令牌 sub:</strong> {decodedToken.sub || '无'}</p>
                  <p><strong>邮箱:</strong> {decodedToken.email || '无'}</p>
                  <p><strong>角色:</strong> {decodedToken.role || '无'}</p>
                  <p><strong>签发时间:</strong> {
                    decodedToken.iat
                      ? new Date(decodedToken.iat * 1000).toLocaleString('zh-CN')
                      : '无'
                  }</p>
                  <p><strong>过期时间:</strong> {
                    decodedToken.exp
                      ? new Date(decodedToken.exp * 1000).toLocaleString('zh-CN')
                      : '无'
                  }</p>
                  <p><strong>当前时间:</strong> {new Date().toLocaleString('zh-CN')}</p>
                  {isTokenExpired && (
                    <p className="text-red-600 font-bold">⚠️ 令牌已过期！</p>
                  )}
                </div>
                <div>
                  <p><strong>完整载荷:</strong></p>
                  <pre className="bg-muted p-2 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(decodedToken, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-red-600">❌ 无法解码 JWT 令牌。</p>
            )}
          </div>
        )}

        {/* 用户信息 */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">👤 存储的用户信息</h2>
          {user ? (
            <div className="space-y-2">
              <p><strong>userId:</strong> {user.id || '❌ 无'}</p>
              <p><strong>id:</strong> {user.id || '❌ 无'}</p>
              <p><strong>email:</strong> {user.email || '❌ 无'}</p>
              <p><strong>name:</strong> {user.username || '❌ 无'}</p>
              <p><strong>role:</strong> {user.role || '❌ 无'}</p>
              <p><strong>picture:</strong> {user.avatar || '❌ 无'}</p>
              <p><strong>created_at:</strong> {user.createdAt || '❌ 无'}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">没有用户信息。</p>
          )}
        </div>

        {/* API 测试按钮 */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">🧪 API 测试</h2>
          <div className="space-y-3 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/debug/jwt-verify', {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                  });

                  const responseText = await response.text();
                  console.log('JWT 验证响应:', response.status, responseText);
                  alert(`JWT 验证响应: ${response.status}\n${responseText}`);
                } catch (error) {
                  console.error('JWT 验证错误:', error);
                  alert('JWT 验证错误: ' + error);
                }
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
              disabled={!accessToken}
            >
              🔍 JWT 验证测试
            </button>

            <button
              onClick={async () => {
                try {
                  // 检查认证服务 JWT 配置
                  const authResponse = await fetch('/api/auth/debug/jwt-config');
                  const authData = await authResponse.json();

                  // 检查 API 网关 JWT 配置
                  const apiResponse = await fetch('/api/debug/jwt-verify', {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                  });
                  const apiData = await apiResponse.json();

                  const authSecret = authData.data?.accessSecret_preview || 'ERROR';
                  const apiSecret = apiData.secret_preview || 'ERROR';
                  const isMatch = authSecret === apiSecret;

                  console.log('JWT 配置比较:', { authSecret, apiSecret, isMatch });
                  alert(`JWT 密钥比较:\n\n认证服务: ${authSecret}\nAPI 网关: ${apiSecret}\n\n结果: ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);
                } catch (error) {
                  console.error('JWT 配置比较错误:', error);
                  alert('JWT 配置比较错误: ' + error);
                }
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
            >
              ⚙️ JWT 配置比较
            </button>

            <button
              onClick={async () => {
                if (!user?.id) {
                  alert('没有 userId！');
                  return;
                }

                try {
                  const response = await fetch(`/api/transactions?userId=${user.id}`, {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                  });

                  const responseText = await response.text();
                  console.log('交易 API 响应:', response.status, responseText);
                  alert(`交易 API 响应: ${response.status}\n${responseText}`);
                } catch (error) {
                  console.error('交易 API 错误:', error);
                  alert('交易 API 错误: ' + error);
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              disabled={!user?.id || !accessToken}
            >
              💳 交易 API
            </button>

            <button
              onClick={async () => {
                if (!user?.id) {
                  alert('没有 userId！');
                  return;
                }

                try {
                  const response = await fetch(`/api/users/course-progress/${user.id}/enrolled-courses`, {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                  });

                  const responseText = await response.text();
                  console.log('已报名课程 API 响应:', response.status, responseText);
                  alert(`已报名课程 API 响应: ${response.status}\n${responseText}`);
                } catch (error) {
                  console.error('已报名课程 API 错误:', error);
                  alert('已报名课程 API 错误: ' + error);
                }
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              disabled={!user?.id || !accessToken}
            >
              📚 已报名课程 API
            </button>

            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include',
                  });

                  const responseText = await response.text();
                  console.log('令牌刷新响应:', response.status, responseText);
                  alert(`令牌刷新响应: ${response.status}\n${responseText}`);

                  if (response.ok) {
                    window.location.reload();
                  }
                } catch (error) {
                  console.error('令牌刷新错误:', error);
                  alert('令牌刷新错误: ' + error);
                }
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
            >
              🔄 刷新令牌
            </button>

            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/signin';
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              🚪 退出并重新登录
            </button>
          </div>
        </div>

        {/* 问题诊断 */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">🔧 问题诊断</h2>
          <div className="space-y-2">
            {!user && (
              <p className="text-red-600">❌ 没有用户信息。需要登录。</p>
            )}
            {user && !user.id && (
              <p className="text-red-600">❌ 缺少 userId 字段。请检查认证响应结构。</p>
            )}
            {!accessToken && (
              <p className="text-red-600">❌ 没有访问令牌。请检查登录流程。</p>
            )}
            {isTokenExpired && (
              <p className="text-red-600">❌ 令牌已过期。请刷新或重新登录。</p>
            )}
            {userIdMismatch && (
              <p className="text-red-600">❌ 存储的 userId 与令牌中的 userId 不匹配。(403 错误的主要原因)</p>
            )}
            {user && user.id && accessToken && !isTokenExpired && !userIdMismatch && (
              <p className="text-green-600">✅ 所有必要信息都正确。API 调用应该正常工作。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
