import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { adminPath } from '../../constants/routes';

/**
 * ProtectedRoute 组件属性接口
 */
interface ProtectedRouteProps {
  /** 子组件 */
  children: React.ReactNode;
}

/**
 * 受保护路由组件
 *
 * 功能：
 * - 基于 Token 验证用户认证状态
 * - 未登录时重定向到 /admin/login
 * - 已登录时显示子组件
 * - 支持加载状态显示
 * - 保留原始访问路径，登录后可跳转回来
 *
 * @example
 * ```tsx
 * <Route path="/admin/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 * ```
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录，重定向到登录页，并保留原始路径
  if (!isAuthenticated) {
    return <Navigate to={adminPath('login')} state={{ from: location.pathname }} replace />;
  }

  // 已登录，显示子组件
  return <>{children}</>;
};

export default ProtectedRoute;
