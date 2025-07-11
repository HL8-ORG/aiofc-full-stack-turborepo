'use client';

import React, { useState } from 'react';
import { LoginForm, RegisterForm } from '@/components/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAuthSuccess = (response: any) => {
    console.log('Auth success response:', response);

    const message = response?.message || '操作成功完成';
    toast.success(message);

    if (activeTab === 'login') {
      // 登录成功后跳转到仪表盘
      router.push('/dashboard');
    } else {
      // 注册成功后切换到登录标签
      setActiveTab('login');
      toast.info('现在可以登录了');
    }
  };

  const handleAuthError = (error: string) => {
    console.error('Auth error:', error);
    toast.error(error || '发生未知错误');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {activeTab === 'login' ? '登录' : '注册'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {activeTab === 'login' ? '登录到您的账户' : '创建新账户'}
          </p>
        </div>

        {/* 标签切换 */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === 'login'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            登录
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === 'register'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            注册
          </button>
        </div>

        {/* 表单容器 */}
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {activeTab === 'login' ? (
            <LoginForm
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
            />
          ) : (
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
            />
          )}
        </div>

        {/* 附加链接 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {activeTab === 'login' ? (
              <>
                还没有账户？{' '}
                <button
                  onClick={() => setActiveTab('register')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  注册
                </button>
              </>
            ) : (
              <>
                已有账户？{' '}
                <button
                  onClick={() => setActiveTab('login')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  登录
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
