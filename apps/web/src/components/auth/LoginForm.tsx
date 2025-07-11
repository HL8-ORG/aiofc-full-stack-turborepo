'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthApiClient, TokenManager } from '@repo/auth';
import { loginSchema, type LoginDto } from '@repo/schemas';

// API 网关 URL 配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
const authApi = new AuthApiClient(API_BASE_URL);

interface LoginFormProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export default function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginDto) => {
    setIsLoading(true);
    console.log('登录尝试:', { email: data.email, apiUrl: API_BASE_URL });

    try {
      const response = await authApi.login(data);
      console.log('登录响应:', response);

      // 处理成功响应
      if (response && response.user && response.tokens) {
        console.log('成功响应数据:', response);

        // 保存令牌
        TokenManager.setTokens(
          response.tokens.accessToken,
          response.tokens.refreshToken
        );
        console.log('令牌保存完成');

        onSuccess?.(response);
        reset();
      } else {
        console.error('意外的响应格式:', response);
        throw new Error('登录失败');
      }
    } catch (error: any) {
      console.error('登录错误详情:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });

      // 提取错误信息
      let errorMessage = '登录失败';

      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        // Zod 验证错误
        errorMessage = error.errors.map((err: any) => err.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }

      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          邮箱
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="请输入邮箱"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          密码
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="请输入密码"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '登录中...' : '登录'}
      </button>
    </form>
  );
}
