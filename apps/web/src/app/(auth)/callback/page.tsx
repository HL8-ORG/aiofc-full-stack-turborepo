'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { AuthTokens } from '@repo/schemas';

function AuthCallbackHandler() {
  const { login } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam)); // ✅ 恢复 JSON
        login(user, token as unknown as AuthTokens); // ✅ 保存到 Zustand

        const { accessToken, user: savedUser } = useAuthStore.getState();
        console.log('✅ accessToken:', accessToken);
        console.log('✅ savedUser:', savedUser);

        setTimeout(() => {
          router.replace('/user/courses'); // ✅ 登录后跳转到仪表盘（1秒延迟）
        }, 1000);
      } catch (error) {
        console.error('❌ 用户信息解析错误:', error);
        router.replace('/login'); // 发生错误时跳转到登录页面
      }
    } else {
      router.replace('/login'); // 没有令牌时跳转到登录页面
    }
  }, [searchParams, login, router]);

  return <p className="text-center mt-10">登录中...</p>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="text-center mt-10">OAuth 处理中...</p>}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
