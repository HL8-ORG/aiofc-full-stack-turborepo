import { useEffect } from 'react';

import { refreshAccessToken } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

export const useAuthRefresh = () => {
  const { setToken } = useAuthStore();

  useEffect(() => {
    const refreshToken = async () => {
      const result = await refreshAccessToken();
      if (result?.token) {
        setToken(result.token);
      }
    };

    // 定期请求刷新令牌
    const interval = setInterval(refreshToken, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [setToken]);
};
