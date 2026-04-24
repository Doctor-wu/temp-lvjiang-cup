import React, { useEffect, useState, useCallback } from 'react';
import { Users, Loader2, AlertCircle } from 'lucide-react';
import { teamService } from '../../services';
import type { Team as ApiTeam, Player } from '../../api/types';
import { Button } from '../ui/button';
import { PlayerDetailModal } from '../team/PlayerDetailModal';
import { TeamMemberModal } from '../team/TeamMemberModal';
import PlayerDetailDrawer from '../team/PlayerDetailDrawer';
import { getUploadUrl } from '@/utils/upload';
import type { PositionType } from '@/types/position';

// 本地 Team 类型（与后端数据模型一致）
interface Team {
  id: string;
  name: string;
  logo: string;
  battleCry: string;
  players: Player[];
}

// 骨架屏组件（正方形卡片样式，队标队名同一区域，图标队名占比更大）
const TeamCardSkeleton: React.FC = () => (
  <div
    className="aspect-square bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden animate-pulse"
    data-testid="team-card-skeleton"
  >
    <div className="h-full flex flex-col items-center justify-center p-2 gap-1">
      <div className="w-16 h-16 rounded-lg bg-white/10" />
      <div className="h-4 w-16 bg-white/10 rounded" />
    </div>
  </div>
);

// 空数据状态组件
const EmptyState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div
    className="col-span-full flex flex-col items-center justify-center py-20"
    data-testid="empty-teams"
  >
    <Users className="w-16 h-16 text-gray-500 mb-4" />
    <p className="text-xl text-gray-400 mb-2">暂无战队数据</p>
    <p className="text-sm text-gray-500 mb-6">当前没有可用的战队信息</p>
    <Button
      variant="outline"
      onClick={onRetry}
      className="border-secondary text-secondary hover:bg-secondary/10"
    >
      刷新数据
    </Button>
  </div>
);

// 错误状态组件
const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20">
    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
    <p className="text-xl text-red-400 mb-2">加载失败</p>
    <p className="text-sm text-gray-400 mb-6">{message}</p>
    <Button
      variant="outline"
      onClick={onRetry}
      className="border-red-400 text-red-400 hover:bg-red-400/10"
    >
      重试
    </Button>
  </div>
);

const TeamSection: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 弹框状态
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);

  // 抽屉状态（独立于弹框）
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 检测是否为移动端
  const [isMobile, setIsMobile] = useState(false);

  // 点击战队卡片打开弹框
  const handleTeamClick = useCallback((team: Team) => {
    setSelectedTeam(team);
    setIsTeamModalOpen(true);
  }, []);

  // 点击队员打开抽屉
  const handlePlayerClick = useCallback((player: Player) => {
    setSelectedPlayer(player);
  }, []);

  // 关闭旧版队员详情弹框
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
  }, []);

  // 关闭弹框（清空所有状态）
  const handleCloseTeamModal = useCallback(() => {
    setIsTeamModalOpen(false);
    setSelectedTeam(null);
    setSelectedPlayer(null); // 同时清空 selectedPlayer
  }, []);

  // 关闭抽屉
  const handleCloseDrawer = useCallback(() => {
    setSelectedPlayer(null);
  }, []);

  // 将 API Team 转换为本地 Team 格式
  const convertApiTeamToLocal = (apiTeam: ApiTeam): Team => {
    // 使用 members 字段（后端返回）
    const members = apiTeam.members || [];

    // 如果 API 返回了队员数据，使用真实数据；否则生成模拟数据
    let players: Player[];
    if (members.length > 0) {
      players = members.map(apiPlayer => ({
        id: apiPlayer.id,
        nickname: apiPlayer.nickname,
        avatarUrl:
          apiPlayer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiPlayer.id}`,
        position: apiPlayer.position,
        teamId: apiTeam.id,
        gameId: apiPlayer.gameId,
        bio: apiPlayer.bio,
        championPool: apiPlayer.championPool,
        rating: apiPlayer.rating,
        isCaptain: apiPlayer.isCaptain,
        liveUrl: apiPlayer.liveUrl,
        level: apiPlayer.level,
      }));
    } else {
      // 生成模拟队员数据（当 API 没有返回队员数据时）
      const positions: PositionType[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
      players = positions.map((position, index) => ({
        id: `${apiTeam.id}-player-${index}`,
        nickname: '待补充',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiTeam.id}-${index}`,
        position,
        teamId: apiTeam.id,
      }));
    }

    return {
      id: apiTeam.id,
      name: apiTeam.name,
      logo:
        getUploadUrl(apiTeam.logo || apiTeam.logoUrl) ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${apiTeam.id}`,
      players,
      battleCry: apiTeam.battleCry || '暂无参赛宣言',
    };
  };

  // 获取战队数据
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamService.getAll();
      const convertedTeams = response.map(convertApiTeamToLocal);
      setTeams(convertedTeams);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取战队数据失败';
      setError(errorMessage);
      console.error('[TeamSection] 获取战队数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section id="teams" className="h-[calc(100vh-96px)] flex flex-col bg-black relative">
      <div className="container mx-auto px-4 flex-1 flex flex-col justify-center min-h-0 py-8">
        {/* 加载骨架屏 */}
        {loading && teams.length === 0 ? (
          <div className="grid grid-cols-4 gap-4 max-w-5xl mx-auto w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(i => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        ) : error && teams.length === 0 ? (
          /* 错误状态 */
          <div className="grid grid-cols-1">
            <ErrorState message={error} onRetry={fetchTeams} />
          </div>
        ) : teams.length === 0 ? (
          /* 空数据状态 */
          <div className="grid grid-cols-1">
            <EmptyState onRetry={fetchTeams} />
          </div>
        ) : (
          /* 正常数据展示（4行4列正方形卡片布局，队标队名占比更大） */
          <div className="grid grid-cols-4 gap-4 max-w-3xl mx-auto w-full" data-testid="teams-grid">
            {teams.map(team => (
              <div
                key={team.id}
                className="aspect-square bg-[#1a1a2e] border border-white/10 hover:border-white/30 transition-all duration-300 hover:transform hover:-translate-y-1 group overflow-hidden cursor-pointer rounded-lg"
                data-testid="team-card"
                onClick={() => handleTeamClick(team)}
              >
                {/* 队标和队名在同一区域垂直居中显示，图标队名占比更大 */}
                <div className="h-full flex flex-col items-center justify-center p-2 gap-1">
                  <img
                    src={team.logo}
                    alt={team.name}
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 object-contain drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                    data-testid="team-logo"
                  />
                  <span
                    className="text-sm text-center text-gray-300 group-hover:text-white transition-colors truncate font-medium max-w-full"
                    data-testid="team-name"
                  >
                    {team.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 刷新指示器 */}
        {loading && teams.length > 0 && (
          <div className="mt-8 flex items-center justify-center space-x-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">更新中...</span>
          </div>
        )}

        {/* 旧版队员详情弹框（向后兼容保留） */}
        {selectedPlayer && (
          <PlayerDetailModal
            player={selectedPlayer}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
          />
        )}

        {/* 新版弹框：战队成员列表 */}
        {selectedTeam && (
          <TeamMemberModal
            team={{
              id: selectedTeam.id,
              name: selectedTeam.name,
              logoUrl: selectedTeam.logo,
              battleCry: selectedTeam.battleCry,
              members: selectedTeam.players,
            }}
            isOpen={isTeamModalOpen}
            onClose={handleCloseTeamModal}
            onPlayerClick={handlePlayerClick}
          />
        )}

        {/* 嵌套在弹框内的抽屉：队员详情 */}
        <PlayerDetailDrawer
          player={selectedPlayer}
          onClose={handleCloseDrawer}
          isMobile={isMobile}
        />
      </div>
    </section>
  );
};

export default TeamSection;
