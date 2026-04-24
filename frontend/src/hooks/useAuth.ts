import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginApi, getCurrentUser, logout as logoutApi } from '../api/auth';
import type { LoginRequest, UserInfo } from '../api/types';
import { isTokenValid } from '../utils/tokenUtils';
import { adminPath } from '../constants/routes';

/**
 * 认证状态接口
 */
interface AuthState {
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 当前用户信息 */
  user: UserInfo | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * useAuth Hook 返回值接口
 */
interface UseAuthReturn extends AuthState {
  /** 登录函数 */
  login: (credentials: LoginRequest) => Promise<void>;
  /** 登出函数 */
  logout: () => void;
  /** 清除错误 */
  clearError: () => void;
  /** 刷新用户信息 */
  refreshUser: () => Promise<void>;
}

/**
 * 本地存储 Token 的键名
 */
const TOKEN_KEY = 'token';

/**
 * 认证 Hook
 *
 * 提供完整的认证功能：
 * - 登录/登出逻辑
 * - 认证状态检查
 * - Token 管理（localStorage）
 * - 用户信息管理
 *
 * @returns UseAuthReturn 认证相关的状态和方法
 *
 * @example
 * ```tsx
 * const { isAuthenticated, user, login, logout, loading } = useAuth();
 *
 * // 登录
 * await login({ username: 'admin', password: '123456' });
 *
 * // 登出
 * logout();
 * ```
 */
export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();

  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  /**
   * 检查本地存储的 Token 并恢复登录状态
   */
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      if (!isTokenValid(token)) {
        localStorage.removeItem(TOKEN_KEY);
        setState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        const userInfo = await getCurrentUser();
        setState({
          isAuthenticated: true,
          user: userInfo,
          loading: false,
          error: null,
        });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        });
      }
    };

    checkAuth();
  }, []);

  /**
   * 登录函数
   * @param credentials 登录凭证（用户名和密码）
   */
  const login = useCallback(
    async (credentials: LoginRequest): Promise<void> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await loginApi(credentials);

        // 后端返回 access_token，适配前端存储
        const token = response.access_token || response.token;

        // 保存 Token 到 localStorage
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
        }

        // 后端不返回user信息，根据登录用户名构造
        const userInfo: UserInfo = response.user || {
          id: 'admin',
          username: credentials.username,
          role: 'admin',
        };

        setState({
          isAuthenticated: true,
          user: userInfo,
          loading: false,
          error: null,
        });

        // 登录成功后跳转到管理后台
        navigate(adminPath('dashboard'));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '登录失败，请检查用户名和密码';
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          loading: false,
          error: errorMessage,
        }));
        throw err;
      }
    },
    [navigate]
  );

  /**
   * 登出函数
   */
  const logout = useCallback((): void => {
    // 调用 API 层的登出函数清除 Token
    logoutApi();

    // 重置状态
    setState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    });

    // 跳转到登录页
    navigate(adminPath('login'));
  }, [navigate]);

  /**
   * 清除错误信息
   */
  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * 刷新用户信息
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!state.isAuthenticated) return;

    try {
      const userInfo = await getCurrentUser();
      setState(prev => ({
        ...prev,
        user: userInfo,
        error: null,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户信息失败';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, [state.isAuthenticated]);

  return {
    ...state,
    login,
    logout,
    clearError,
    refreshUser,
  };
}

export default useAuth;
