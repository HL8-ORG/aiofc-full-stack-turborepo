/**
 * 🔄 客户端令牌自动刷新工具
 * 
 * 基于服务器发送的头部信息自动刷新令牌
 * 或向用户提供适当的提示
 */

/** 令牌刷新 API 响应接口 */
interface TokenRefreshResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
    tokenType?: string;
  };
  message?: string;
  error?: string;
}

/** 令牌状态管理接口 */
interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isRefreshing: boolean;
  lastRefreshAt: number | null;
}

/** 令牌相关事件类型 */
type TokenEvent = 'refreshed' | 'expired' | 'cleared' | 'error';

/** 事件回调类型 */
type TokenEventCallback = (event: TokenEvent, data?: any) => void;

// 令牌状态管理
let tokenState: TokenState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  isRefreshing: false,
  lastRefreshAt: null,
};

// 刷新中的 Promise (防止重复刷新)
let refreshPromise: Promise<boolean> | null = null;

// 事件监听器
const eventListeners: Map<TokenEvent, Set<TokenEventCallback>> = new Map();

// 配置常量
const CONFIG = {
  REFRESH_THRESHOLD_MINUTES: 5, // 过期前 5 分钟刷新
  MAX_RETRY_COUNT: 3, // 最大重试次数
  RETRY_DELAY_MS: 1000, // 重试延迟时间
  MONITORING_INTERVAL_MS: 60000, // 监控周期 (1分钟)
  MIN_REFRESH_INTERVAL_MS: 30000, // 最小刷新间隔 (30秒)
} as const;

/**
 * 注册令牌事件监听器
 */
export function addTokenEventListener(event: TokenEvent, callback: TokenEventCallback): void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(callback);
}

/**
 * 移除令牌事件监听器
 */
export function removeTokenEventListener(event: TokenEvent, callback: TokenEventCallback): void {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.delete(callback);
  }
}

/**
 * 触发令牌事件
 */
function emitTokenEvent(event: TokenEvent, data?: any): void {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('令牌事件回调执行错误:', error);
      }
    });
  }
}

/**
 * 安全访问本地存储
 */
function safeLocalStorage() {
  try {
    return typeof window !== 'undefined' && window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 初始化令牌状态
 */
export function initializeTokens(
  accessToken: string, 
  refreshToken: string, 
  expiresIn?: number
): void {
  if (!accessToken || !refreshToken) {
    throw new Error('访问令牌和刷新令牌都是必需的');
  }

  const now = Date.now();
  tokenState.accessToken = accessToken;
  tokenState.refreshToken = refreshToken;
  tokenState.lastRefreshAt = now;
  
  if (expiresIn && expiresIn > 0) {
    tokenState.expiresAt = now + (expiresIn * 1000);
  }
  
  // 安全地存储到本地存储
  const localStorage = safeLocalStorage();
  if (localStorage) {
    try {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('lastRefreshAt', now.toString());
      
      if (tokenState.expiresAt) {
        localStorage.setItem('tokenExpiresAt', tokenState.expiresAt.toString());
      }
    } catch (error) {
      console.warn('本地存储保存失败:', error);
    }
  }
  
  console.log('🔑 令牌初始化完成', {
    expiresAt: tokenState.expiresAt ? new Date(tokenState.expiresAt).toISOString() : '无'
  });
  
  emitTokenEvent('refreshed', { accessToken, expiresAt: tokenState.expiresAt });
}

/**
 * 加载已存储的令牌
 */
export function loadStoredTokens(): boolean {
  const localStorage = safeLocalStorage();
  if (!localStorage) {
    return false;
  }

  try {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    const lastRefreshAt = localStorage.getItem('lastRefreshAt');
    
    if (accessToken && refreshToken) {
      tokenState.accessToken = accessToken;
      tokenState.refreshToken = refreshToken;
      tokenState.expiresAt = expiresAt ? parseInt(expiresAt) : null;
      tokenState.lastRefreshAt = lastRefreshAt ? parseInt(lastRefreshAt) : null;
      
      // 检查令牌是否已过期
      if (tokenState.expiresAt && Date.now() >= tokenState.expiresAt) {
        console.warn('⚠️ 已存储的令牌已过期');
        clearTokens();
        return false;
      }
      
      console.log('🔄 已存储的令牌加载完成');
      return true;
    }
  } catch (error) {
    console.error('已存储的令牌加载失败:', error);
    clearTokens();
  }
  
  return false;
}

/**
 * 返回当前访问令牌
 */
export function getAccessToken(): string | null {
  return tokenState.accessToken;
}

/**
 * 返回当前刷新令牌
 */
export function getRefreshToken(): string | null {
  return tokenState.refreshToken;
}

/**
 * 检查令牌是否过期
 */
export function isTokenExpired(): boolean {
  if (!tokenState.expiresAt) return false;
  return Date.now() >= tokenState.expiresAt;
}

/**
 * 检查是否需要刷新令牌 (过期前 N 分钟)
 */
export function shouldRefreshToken(): boolean {
  if (!tokenState.expiresAt || tokenState.isRefreshing) return false;
  
  const thresholdMs = CONFIG.REFRESH_THRESHOLD_MINUTES * 60 * 1000;
  const shouldRefresh = Date.now() >= (tokenState.expiresAt - thresholdMs);
  
  // 检查最小刷新间隔 (避免过于频繁的刷新)
  if (shouldRefresh && tokenState.lastRefreshAt) {
    const timeSinceLastRefresh = Date.now() - tokenState.lastRefreshAt;
    if (timeSinceLastRefresh < CONFIG.MIN_REFRESH_INTERVAL_MS) {
      return false;
    }
  }
  
  return shouldRefresh;
}

/**
 * 执行令牌刷新 (包含重试逻辑)
 */
export async function refreshTokens(): Promise<boolean> {
  // 如果已在刷新中则返回现有 Promise
  if (refreshPromise) {
    return refreshPromise;
  }
  
  if (!tokenState.refreshToken) {
    console.warn('⚠️ 没有刷新令牌');
    emitTokenEvent('error', { reason: 'no-refresh-token' });
    return false;
  }
  
  console.log('🔄 开始刷新令牌');
  tokenState.isRefreshing = true;
  
  refreshPromise = performTokenRefresh();
  
  try {
    const result = await refreshPromise;
    return result;
  } finally {
    tokenState.isRefreshing = false;
    refreshPromise = null;
  }
}

/**
 * 实际的令牌刷新逻辑 (包含重试)
 */
async function performTokenRefresh(): Promise<boolean> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_COUNT; attempt++) {
    try {
      console.log(`🔄 令牌刷新尝试 ${attempt}/${CONFIG.MAX_RETRY_COUNT}`);
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: tokenState.refreshToken,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`令牌刷新失败: ${response.status} ${response.statusText}`);
      }
      
      const result: TokenRefreshResponse = await response.json();
      
      if (result.success && result.data) {
        // 使用新令牌更新
        initializeTokens(
          result.data.accessToken,
          result.data.refreshToken,
          result.data.expiresIn
        );
        
        console.log('✅ 令牌刷新成功');
        return true;
      } else {
        throw new Error(result.error || '令牌刷新响应无效');
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ 令牌刷新尝试 ${attempt} 失败:`, error);
      
      // 如果不是最后一次尝试则等待后重试
      if (attempt < CONFIG.MAX_RETRY_COUNT) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS * attempt));
      }
    }
  }
  
  // 所有尝试都失败
  console.error('❌ 令牌刷新最终失败:', lastError);
  emitTokenEvent('error', { reason: 'refresh-failed', error: lastError });
  
  // 刷新失败时执行登出
  clearTokens();
  emitTokenEvent('expired');
  
  // 重定向到登录页面
  if (typeof window !== 'undefined') {
    window.location.href = '/login?reason=token-expired';
  }
  
  return false;
}

/**
 * 清除令牌 (登出)
 */
export function clearTokens(): void {
  tokenState = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    isRefreshing: false,
    lastRefreshAt: null,
  };
  
  const localStorage = safeLocalStorage();
  if (localStorage) {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('lastRefreshAt');
    } catch (error) {
      console.warn('本地存储清除失败:', error);
    }
  }
  
  console.log('🗑️ 令牌清除完成');
  emitTokenEvent('cleared');
}

/**
 * 分析并自动处理 HTTP 响应头
 */
export function handleTokenHeaders(headers: Headers): void {
  const refreshRecommended = headers.get('X-Token-Refresh-Recommended');
  const tokenExpired = headers.get('X-Token-Expired');
  const refreshRequired = headers.get('X-Refresh-Required');
  const expiresIn = headers.get('X-Token-Expires-In');
  
  if (tokenExpired === 'true' && refreshRequired === 'true') {
    console.log('⚠️ 检测到令牌过期 - 开始自动刷新');
    refreshTokens();
  } else if (refreshRecommended === 'true') {
    const remainingTime = expiresIn ? parseInt(expiresIn) : 0;
    console.log(`💡 建议刷新令牌 - ${remainingTime}秒后过期`);
    
    // 如果剩余时间低于阈值则自动刷新
    const thresholdSeconds = CONFIG.REFRESH_THRESHOLD_MINUTES * 60;
    if (remainingTime < thresholdSeconds) {
      refreshTokens();
    }
  }
}

/**
 * Fetch 包装函数 (包含自动令牌处理)
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 如果需要则预先刷新令牌
  if (shouldRefreshToken() && !tokenState.isRefreshing) {
    console.log('🔄 执行预先令牌刷新');
    await refreshTokens();
  }
  
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('没有认证令牌');
  }
  
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  
  let response = await fetch(url, {
    ...options,
    headers,
  });
  
  // 分析响应头
  handleTokenHeaders(response.headers);
  
  // 认证错误时尝试刷新令牌
  if (response.status === 401) {
    try {
      const errorBody = await response.clone().json();
      
      if (errorBody.code === 'TOKEN_EXPIRED' || errorBody.message?.includes('expired')) {
        console.log('🔄 因令牌过期收到 401 - 刷新后重试');
        
        const refreshed = await refreshTokens();
        if (refreshed) {
          // 使用新令牌重试
          const newAccessToken = getAccessToken();
          if (newAccessToken) {
            headers.set('Authorization', `Bearer ${newAccessToken}`);
            response = await fetch(url, { ...options, headers });
          }
        }
      }
    } catch (parseError) {
      console.warn('401 响应解析失败:', parseError);
    }
  }
  
  return response;
}

/**
 * 启动令牌自动刷新监控
 */
export function startTokenMonitoring(): () => void {
  // 页面加载时检查已存储的令牌
  loadStoredTokens();
  
  // 定期检查令牌状态
  const intervalId = setInterval(() => {
    if (shouldRefreshToken() && !tokenState.isRefreshing) {
      console.log('⏰ 定期令牌刷新检查');
      refreshTokens();
    }
  }, CONFIG.MONITORING_INTERVAL_MS);
  
  console.log('🎯 令牌自动刷新监控已启动');
  
  // 返回清理函数
  return () => {
    clearInterval(intervalId);
    console.log('🛑 令牌监控已停止');
  };
}

/**
 * 返回当前令牌状态 (用于调试)
 */
export function getTokenState(): Readonly<TokenState> {
  return { ...tokenState };
}

/**
 * 返回令牌过期前的剩余时间 (秒)
 */
export function getTimeUntilExpiry(): number | null {
  if (!tokenState.expiresAt) return null;
  const remaining = tokenState.expiresAt - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
}

// 导出类型定义
export type { 
  TokenRefreshResponse, 
  TokenState, 
  TokenEvent, 
  TokenEventCallback 
};
