'use client';

import { SignInForm } from '@/components/SignInForm';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/services/authService';
import Link from 'next/link';

export default function SignInComponent() {
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (email: string, password: string) => {
    setError('');
    setIsLoading(true);

    try {
      const res = await loginUser(email, password);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setSuccessMessage('登录成功！正在跳转页面...');
        console.log('✅ 登录完成，用户信息:', res.user);

        // 短暂延迟后重定向（让用户能看到成功消息）
        setTimeout(() => {
          router.push('/user/courses');
        }, 1000);
      }
    } catch (error) {
      console.error('❌ 登录处理过程中出错:', error);
      setError('登录处理过程中发生错误。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <>
      {/* 认证页面整体包装器 - 应用主题变量 */}
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6">
        {/* 认证卡片包装器 - 应用主题变量 */}
        <div className="w-full max-w-md bg-card text-card-foreground p-8 rounded-lg shadow-lg">
          {/* 认证标题 - 应用主题变量 */}
          <h2 className="text-3xl font-bold text-center mb-4">Sign In</h2>

          <SignInForm
            onSubmit={handleSubmit}
            error={error}
            successMessage={successMessage}
            isLoading={isLoading}
          />

          <div className="flex items-center mt-6">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="mx-3 text-sm auth-form__divider-text">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>

          <SocialLoginButtons onSocialLogin={handleSocialLogin} />

          {/* 跳转到注册页面 */}
          <div className="mt-6 text-center">
            <Link href="/signup" className="auth-form__link">
              New here? Create an account!
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
