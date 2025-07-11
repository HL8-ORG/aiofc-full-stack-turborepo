'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser, loginUser } from '@/services/authService';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // 邮箱/密码注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccess('');

    const res = await registerUser(email, password);
    console.log(res);
    if (res?.errors?.length > 0) {
      console.log(res.errors);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setErrors(res?.errors?.map((err: any) => err.message));
      return;
    }

    setSuccess('注册成功！正在跳转到仪表盘...');
    if (res?.success) {
      // 注册后自动登录处理
      const loginRes = await loginUser(email, password);
      if (loginRes?.success) {
        setTimeout(() => {
          router.push('/user/courses'); // 登录成功后重定向到仪表盘
        }, 500);
      }
    }
  };

  // 注册页面整体包装器 - 应用主题变量
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6">
      {/* 注册卡片包装器 - 应用主题变量 */}
      <div className="w-full max-w-md bg-card text-card-foreground p-8 rounded-lg shadow-lg flex flex-col items-center">
        {/* 注册标题 - 应用主题变量 */}
        <h2 className="text-3xl font-bold text-center">Sign Up</h2>

        {/* 错误信息 - 应用主题变量 */}
        {errors.length > 0 && (
          <Alert variant="destructive" className="mt-4 text-sm text-destructive text-center">
            <ul className="list-disc list-inside">
              {errors.map((errMsg, index) => (
                <li key={index}>{errMsg}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* 成功信息 - 应用主题变量 */}
        {success && (
          <Alert variant="default" className="mt-4 text-sm text-success text-center">
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 w-full">
          <div>
            <label className="block text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-form__input mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-form__input mt-2"
            />
          </div>

          <Button
            type="submit"
            className="auth-form__button mt-4"
          >
            Sign Up
          </Button>
        </form>
        {/* 分割线 - 应用主题变量 */}
        <div className="flex items-center mt-6 w-full">
          <div className="flex-grow auth-form__divider"></div>
          <span className="mx-3 text-sm auth-form__divider-text">OR</span>
          <div className="flex-grow auth-form__divider"></div>
        </div>
        {/* 跳转到登录页面 - 放置在卡片内底部 */}
        <div className="mt-6 text-center w-full">
          <Link href="/signin" className="auth-form__link">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
