import React from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import Home from '../pages/Home';
import AdminLogin from '../pages/admin/Login';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminStream from '../pages/admin/Stream';
import AdminTeams from '../pages/admin/Teams';
import AdminSchedule from '../pages/admin/Schedule';
import AdminStreamers from '../pages/admin/Streamers';
import Videos from '../pages/admin/Videos';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import MatchDataList from '../pages/admin/MatchDataList';
import MatchDataManagement from '../pages/admin/MatchDataManagement';
import MatchDataEditPage from '../components/features/match-data/MatchDataEditPage';
import { adminPath } from '../constants/routes';

/**
 * 路由配置
 * 使用 React Router v6+ 的数据路由器
 */
export const routes: RouteObject[] = [
  // 公开路由
  {
    path: '/',
    element: <Home />,
  },
  {
    path: adminPath('login'),
    element: <AdminLogin />,
  },

  // 受保护的管理后台路由
  {
    path: adminPath('dashboard'),
    element: (
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: adminPath('stream'),
    element: (
      <ProtectedRoute>
        <AdminStream />
      </ProtectedRoute>
    ),
  },
  {
    path: adminPath('teams'),
    element: (
      <ProtectedRoute>
        <AdminTeams />
      </ProtectedRoute>
    ),
  },
  {
    path: adminPath('schedule'),
    element: (
      <ProtectedRoute>
        <AdminSchedule />
      </ProtectedRoute>
    ),
  },
  {
    path: adminPath('streamers'),
    element: (
      <ProtectedRoute>
        <AdminStreamers />
      </ProtectedRoute>
    ),
  },
  {
    path: adminPath('videos'),
    element: (
      <ProtectedRoute>
        <Videos />
      </ProtectedRoute>
    ),
  },
  {
    path: adminPath('matches'),
    element: (
      <ProtectedRoute>
        <MatchDataList />
      </ProtectedRoute>
    ),
  },
  {
    path: adminPath('matches/:matchId/games/:gameNumber/edit'),
    element: (
      <ProtectedRoute>
        <MatchDataEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: adminPath('matches/:matchId/games'),
    element: (
      <ProtectedRoute>
        <MatchDataManagement />
      </ProtectedRoute>
    ),
  },
];

/**
 * 创建浏览器路由器实例
 */
export const router = createBrowserRouter(routes);

export default router;
