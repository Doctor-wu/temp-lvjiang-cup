import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  Users,
  Calendar,
  LogOut,
  Home,
  Loader2,
  User,
  Video,
  Trophy,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { adminPath } from '../../constants/routes';

/**
 * AdminLayout 组件属性接口
 */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * 管理后台布局组件
 *
 * 功能：
 * - 侧边栏导航
 * - 集成 useAuth Hook 的登出功能
 * - 显示当前登录用户信息
 * - 响应式布局
 *
 * @example
 * ```tsx
 * <AdminLayout>
 *   <Dashboard />
 * </AdminLayout>
 * ```
 */
const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { logout, user, loading } = useAuth();

  /**
   * 处理登出
   */
  const handleLogout = () => {
    logout();
  };

  /**
   * 导航菜单项配置
   */
  const navItems = [
    { path: adminPath('dashboard'), label: '仪表盘', icon: LayoutDashboard },
    { path: adminPath('stream'), label: '直播配置', icon: Radio },
    { path: adminPath('streamers'), label: '主播管理', icon: User },
    { path: adminPath('videos'), label: '视频管理', icon: Video },
    { path: adminPath('teams'), label: '战队管理', icon: Users },
    { path: adminPath('schedule'), label: '赛程管理', icon: Calendar },
    { path: adminPath('matches'), label: '对战数据', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Logo 区域 */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-secondary">驴酱杯</span> 管理后台
          </h2>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-md transition-colors',
                  isActive
                    ? 'bg-secondary/20 text-secondary'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 底部区域 - 用户信息和操作 */}
        <div className="p-4 border-t border-gray-700 space-y-3">
          {/* 显示当前用户信息 */}
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          ) : user ? (
            <div className="px-4 py-2">
              <p className="text-sm text-gray-400">当前用户</p>
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              {user.role && <p className="text-xs text-gray-500 capitalize">{user.role}</p>}
            </div>
          ) : null}

          {/* 返回网站链接 */}
          <Link
            to="/"
            className="flex items-center space-x-3 px-4 py-2 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>返回网站</span>
          </Link>

          {/* 登出按钮 */}
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={handleLogout}
            disabled={loading}
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
