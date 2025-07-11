'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthApiClient } from '@repo/auth';
import { registerSchema, type RegisterDto } from '@repo/schemas';

// API 网关 URL 配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
const authApi = new AuthApiClient(API_BASE_URL);

interface RegisterFormProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export default function RegisterForm({ onSuccess, onError }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterDto) => {
    setIsLoading(true);
    try {
      const response = await authApi.register(data);

      // 处理成功响应
      if (response && response.user) {
        onSuccess?.(response);
        reset();
      } else {
        throw new Error('注册失败');
      }
    } catch (error: any) {
      console.error('注册错误:', error);

      // 提取错误信息
      let errorMessage = '注册失败';

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

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          用户名（可选）
        </label>
        <input
          id="username"
          type="text"
          {...register('username')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="请输入用户名"
        />
        {errors.username && (
          <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
          姓（可选）
        </label>
        <input
          id="firstName"
          type="text"
          {...register('firstName')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="请输入姓"
        />
        {errors.firstName && (
          <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
          名（可选）
        </label>
        <input
          id="lastName"
          type="text"
          {...register('lastName')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="请输入名"
        />
        {errors.lastName && (
          <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '注册中...' : '注册'}
      </button>
    </form>
  );
}
