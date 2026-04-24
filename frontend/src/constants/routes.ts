/**
 * 路由常量配置
 * 统一管理所有路由前缀，便于安全加固和路径混淆
 */

/**
 * 管理后台路由前缀
 * 通过环境变量 VITE_ADMIN_ROUTE_PREFIX 配置，默认为 'admin'
 */
export const ADMIN_PREFIX = import.meta.env.VITE_ADMIN_ROUTE_PREFIX || 'admin';

/**
 * 构建管理后台路由路径
 * @param path - 管理后台内的相对路径，如 'login', 'dashboard'
 * @returns 完整的管理后台路由路径，如 '/admin/login'
 */
export function adminPath(path: string): string {
  return `/${ADMIN_PREFIX}/${path}`;
}
