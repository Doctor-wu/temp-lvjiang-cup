import apiClient from './axios';
import type { ApiResponse, LoginRequest, LoginResponse, UserInfo } from './types';
import { jwtDecode } from 'jwt-decode';
import { adminPath } from '../constants/routes';

/**
 * 认证 API
 */

/**
 * 从 JWT Token 中解析用户信息
 * @param token JWT Token
 * @returns 用户信息
 * @throws 如果 token 格式无效则抛出错误
 */
function parseToken(token: string): UserInfo {
  try {
    const decoded = jwtDecode<{ username: string; sub: string }>(token);
    if (!decoded.sub) {
      throw new Error('Invalid token payload');
    }
    return {
      id: decoded.sub,
      username: decoded.username,
      role: 'admin',
    };
  } catch {
    throw new Error('Invalid token format');
  }
}

/**
 * 用户登录
 * @param data 登录信息
 * @returns 登录响应（包含 Token 和用户信息）
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/admin/auth/login', data);
  const responseData = response.data;

  if (!responseData.success || !responseData.data) {
    throw new Error(responseData.message || '登录失败');
  }

  const token = responseData.data.access_token || responseData.data.token;
  if (!token) {
    throw new Error('登录响应中缺少 token');
  }

  try {
    parseToken(token);
  } catch {
    throw new Error('登录响应 token 格式无效');
  }

  localStorage.setItem('token', token);
  return responseData.data;
}

/**
 * 获取当前用户信息
 * 后端没有 /admin/auth/me 接口，从 localStorage 的 token 中解析
 * @returns 用户信息
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('未登录');
  }

  // 从 token 中解析用户信息
  return parseToken(token);
}

/**
 * 退出登录
 */
export function logout(): void {
  // 清除 Token
  localStorage.removeItem('token');

  // 跳转到登录页
  window.location.href = adminPath('login');
}

/**
 * 检查是否已登录
 * @returns 是否已登录
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}

export default {
  login,
  getCurrentUser,
  logout,
  isAuthenticated,
};
