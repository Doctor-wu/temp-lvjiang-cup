import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/button';
import { teamService } from '@/services/teamService';
import { matchService } from '@/services/matchService';
import { streamService } from '@/services/streamService';
import { Users, Trophy, Radio, Activity, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { adminPath } from '../../constants/routes';

interface DashboardStats {
  totalTeams: number;
  totalMatches: number;
  upcomingMatches: number;
  ongoingMatches: number;
  finishedMatches: number;
  liveStream: boolean;
  matchesWithData: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalTeams: 0,
    totalMatches: 0,
    upcomingMatches: 0,
    ongoingMatches: 0,
    finishedMatches: 0,
    liveStream: false,
    matchesWithData: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // 加载统计数据
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      // 并行获取数据
      const [teamsResult, matchesResult, streamResult] = await Promise.all([
        teamService.getAll(),
        matchService.getAll(),
        streamService.get().catch(() => null),
      ]);

      const teams = teamsResult || [];
      const matches = matchesResult || [];

      // 计算统计数据 - 将 API 状态映射到前端状态
      const mapStatus = (status: string): string => {
        switch (status) {
          case 'scheduled':
            return 'upcoming';
          case 'live':
            return 'ongoing';
          case 'completed':
            return 'finished';
          default:
            return 'upcoming';
        }
      };

      const upcomingMatches = matches.filter(m => mapStatus(m.status) === 'upcoming').length;
      const ongoingMatches = matches.filter(m => mapStatus(m.status) === 'ongoing').length;
      const finishedMatches = matches.filter(m => mapStatus(m.status) === 'finished').length;

      // 计算有多少比赛有对战数据（通过检查 finished 状态的比赛）
      // 这里简化处理，假设已完成且有比分的比赛有数据
      const matchesWithData = matches.filter(m => {
        const status = mapStatus(m.status);
        return status === 'finished' && m.scoreA > 0 && m.scoreB > 0;
      }).length;

      setStats({
        totalTeams: teams.length,
        totalMatches: matches.length,
        upcomingMatches,
        ongoingMatches,
        finishedMatches,
        liveStream: streamResult?.isActive || false,
        matchesWithData,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('加载统计数据失败');
    } finally {
      setLoadingStats(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
    onClick,
  }: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
    onClick?: () => void;
  }) => (
    <div
      className={`bg-gray-800 p-6 rounded-lg border border-gray-700 ${onClick ? 'hover:border-secondary/50 cursor-pointer transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{loadingStats ? '-' : value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">管理仪表盘</h1>
        <Button
          onClick={loadStats}
          disabled={loadingStats}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <Activity className="w-4 h-4 mr-2" />
          {loadingStats ? '刷新中...' : '刷新统计'}
        </Button>
      </div>

      {/* 统计卡片区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="参赛战队"
          value={stats.totalTeams}
          icon={Users}
          color="bg-blue-600"
          subtitle="已注册战队总数"
        />
        <StatCard
          title="比赛总数"
          value={stats.totalMatches}
          icon={Trophy}
          color="bg-purple-600"
          subtitle={`${stats.upcomingMatches} 未开始 / ${stats.ongoingMatches} 进行中 / ${stats.finishedMatches} 已结束`}
        />
        <StatCard
          title="对战数据"
          value={stats.matchesWithData}
          icon={BarChart3}
          color="bg-secondary"
          subtitle={`${stats.totalMatches - stats.matchesWithData} 场比赛待导入`}
          onClick={() => navigate(adminPath('matches'))}
        />
        <StatCard
          title="直播状态"
          value={stats.liveStream ? '直播中' : '未直播'}
          icon={Radio}
          color={stats.liveStream ? 'bg-green-600' : 'bg-gray-600'}
          subtitle={stats.liveStream ? '当前正在直播' : '暂无直播'}
        />
        <StatCard
          title="系统状态"
          value="正常"
          icon={Activity}
          color="bg-green-600"
          subtitle="所有服务运行正常"
        />
      </div>

      {/* 快捷操作区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer"
          onClick={() => (window.location.href = adminPath('stream'))}
        >
          <h3 className="text-xl font-semibold text-secondary mb-2">直播管理</h3>
          <p className="text-gray-400">管理直播链接和状态</p>
          <div className="mt-4 flex items-center text-sm text-blue-400">
            <span>进入管理</span>
            <span className="ml-1">→</span>
          </div>
        </div>
        <div
          className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer"
          onClick={() => (window.location.href = adminPath('streamers'))}
        >
          <h3 className="text-xl font-semibold text-secondary mb-2">主播管理</h3>
          <p className="text-gray-400">管理主播信息和直播间配置</p>
          <div className="mt-4 flex items-center text-sm text-blue-400">
            <span>进入管理</span>
            <span className="ml-1">→</span>
          </div>
        </div>
        <div
          className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer"
          onClick={() => (window.location.href = adminPath('videos'))}
        >
          <h3 className="text-xl font-semibold text-secondary mb-2">视频管理</h3>
          <p className="text-gray-400">管理赛事视频内容和展示配置</p>
          <div className="mt-4 flex items-center text-sm text-blue-400">
            <span>进入管理</span>
            <span className="ml-1">→</span>
          </div>
        </div>
        <div
          className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer"
          onClick={() => (window.location.href = adminPath('teams'))}
        >
          <h3 className="text-xl font-semibold text-secondary mb-2">战队管理</h3>
          <p className="text-gray-400">管理参赛战队和队员信息</p>
          <div className="mt-4 flex items-center text-sm text-blue-400">
            <span>进入管理</span>
            <span className="ml-1">→</span>
          </div>
        </div>
        <div
          className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer"
          onClick={() => (window.location.href = adminPath('schedule'))}
        >
          <h3 className="text-xl font-semibold text-secondary mb-2">赛程管理</h3>
          <p className="text-gray-400">更新比赛结果和赛程安排</p>
          <div className="mt-4 flex items-center text-sm text-blue-400">
            <span>进入管理</span>
            <span className="ml-1">→</span>
          </div>
        </div>
        <div
          className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer"
          onClick={() => (window.location.href = adminPath('matches'))}
        >
          <h3 className="text-xl font-semibold text-secondary mb-2">对战数据管理</h3>
          <p className="text-gray-400">导入和管理比赛详细数据</p>
          <div className="mt-4 flex items-center text-sm text-blue-400">
            <span>进入管理</span>
            <span className="ml-1">→</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
