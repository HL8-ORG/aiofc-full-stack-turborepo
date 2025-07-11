'use client';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
export const useCheckoutNavigation = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 当用户信息加载完成时，将 `isLoaded` 设置为 true
    if (user !== undefined) {
      setIsLoaded(true);
    }
  }, [user]);

  const courseId = searchParams.get('id') ?? '';
  const isSignedIn = !!user;
  const checkoutStep = parseInt(searchParams.get('step') ?? '1', 10);

  const navigateToStep = useCallback(
    (step: number) => {
      const newStep = Math.min(Math.max(1, step), 3);
      const showSignUp = isSignedIn ? 'true' : 'false';

      router.push(`/checkout?step=${newStep}&id=${courseId}&showSignUp=${showSignUp}`, {
        scroll: false,
      });
    },
    [courseId, isSignedIn, router]
  );

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn && checkoutStep > 1) {
        // 如果未登录且步骤大于1，则返回第1步
        navigateToStep(1);
      } else if (isSignedIn && checkoutStep === 1) {
        // 如果已登录但停留在第1步，则前进到第2步
        navigateToStep(2);
      }
    }
  }, [isLoaded, isSignedIn, checkoutStep, navigateToStep]);

  return { checkoutStep, navigateToStep };
};