import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string;
  successMessage: string;
  isLoading?: boolean;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSubmit,
  error,
  successMessage,
  isLoading = false
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      await onSubmit(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        {/* 邮箱标签 - 应用主题变量 */}
        <Label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </Label>
        {/* 邮箱输入 - 应用主题变量 */}
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="auth-form__input mt-2"
          placeholder="请输入邮箱"
        />
      </div>

      <div>
        {/* 密码标签 - 应用主题变量 */}
        <Label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </Label>
        {/* 密码输入 - 应用主题变量 */}
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className="auth-form__input mt-2"
          placeholder="请输入密码"
        />
      </div>

      {/* 错误信息 - 应用主题变量 */}
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>}

      {/* 成功信息 - 应用主题变量 */}
      {successMessage && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{successMessage}</p>}

      {/* 登录按钮 - 应用主题变量 */}
      <Button
        type="submit"
        disabled={isLoading}
        className="auth-form__button w-full"
      >
        {isLoading ? '登录中...' : 'Sign In'}
      </Button>
    </form>
  );
};
