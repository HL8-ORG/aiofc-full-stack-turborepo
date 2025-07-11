import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, AuthTokens } from '@repo/schemas';

// 状态接口定义
interface AuthState {
  // 用户信息 (使用 AuthUser 类型)
  user: AuthUser | null;
  
  // 令牌信息
  accessToken: string | null;
  
  // 操作方法
  login: (user: AuthUser, tokens: AuthTokens) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  clearStorage: () => void; // 用于调试的存储清理
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      
      // 登录操作 - 保存用户信息和令牌
      login: (user, tokens) => {
        if (!user || !tokens?.accessToken) {
          console.error('❌ 登录失败: 缺少用户信息或令牌');
          return;
        }
        
        console.log('✅ 登录成功:', {
          userId: user.id,
          email: user.email,
          hasToken: !!tokens.accessToken
        });
        
        set({ 
          user, 
          accessToken: tokens.accessToken 
        });
      },
      
      // 登出操作 - 重置所有状态
      logout: () => {
        console.log('🔴 登出 - 重置状态');
        set({ user: null, accessToken: null });
        
        // 从本地存储中完全移除
        try {
          localStorage.removeItem('auth-storage');
        } catch (error) {
          console.warn('⚠️ 本地存储移除失败:', error);
        }
      },
      
      // 更新用户信息
      setUser: (user) => {
        console.log('📝 更新用户信息:', user?.email || 'null');
        set({ user });
      },
      
      // 更新令牌
      setToken: (token) => {
        console.log('🔑 更新令牌:', token ? '有令牌' : '无令牌');
        set({ accessToken: token });
      },
      
      // 紧急存储清理（用于调试）
      clearStorage: () => {
        console.warn('🧨 执行紧急存储清理');
        set({ user: null, accessToken: null });
        try {
          localStorage.removeItem('auth-storage');
          localStorage.clear(); // 清理整个本地存储
          console.log('✅ 存储清理完成');
        } catch (error) {
          console.error('❌ 存储清理失败:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      
      // 存储恢复时的验证逻辑
      onRehydrateStorage: () => (state) => {
        try {
          if (state?.user) {
            // 处理空对象或无效数据
            const isEmptyObject = typeof state.user === 'object' && 
              Object.keys(state.user).length === 0;
            
            if (isEmptyObject) {
              console.warn('⚠️ 存储恢复: 发现空用户对象，正在初始化');
              state.user = null;
              state.accessToken = null;
              return;
            }
            
            // 基本用户数据验证
            const hasRequiredFields = 
              state.user.id && 
              typeof state.user.id === 'string' &&
              state.user.email && 
              typeof state.user.email === 'string';
              
            if (!hasRequiredFields) {
              console.warn('⚠️ 存储恢复: 用户数据不完整，正在初始化', {
                user: state.user,
                hasId: !!state.user.id,
                hasEmail: !!state.user.email
              });
              
              // 初始化不完整的数据
              state.user = null;
              state.accessToken = null;
            } else {
              console.log('✅ 从存储中恢复认证状态成功:', {
                userId: state.user.id,
                email: state.user.email,
                hasToken: !!state.accessToken
              });
            }
          } else {
            console.log('📭 存储: 无已保存的用户信息');
          }
        } catch (error) {
          console.error('❌ 存储恢复过程中出错:', error);
          // 发生错误时安全初始化
          if (state) {
            state.user = null;
            state.accessToken = null;
          }
        }
      },
    }
  )
);
