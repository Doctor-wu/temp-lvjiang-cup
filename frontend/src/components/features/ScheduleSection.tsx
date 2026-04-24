import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { matchService, teamService } from '@/services';
import type { Match as ApiMatch, Team as ApiTeam } from '@/api/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import SwissStage from './SwissStageResponsive';
import EliminationStage from './EliminationStage';
import { useAdvancementStore, calculateAdvancement } from '@/store/advancementStore';
import { PositionType } from '@/types/position';
import { getUploadUrl } from '@/utils/upload';
import SwissEmptyState from './swiss/SwissEmptyState';
import type { Match, Team, EliminationBracket, Player } from '@/types';

// 将 API Match 转换为本地 Match 格式
const convertApiMatchToLocal = (apiMatch: ApiMatch, teams: Team[]): Match => {
  const teamA = teams.find(t => t.id === apiMatch.teamAId);
  const teamB = teams.find(t => t.id === apiMatch.teamBId);

  // 将 API stage 映射到本地 stage
  const stage: Match['stage'] = apiMatch.stage === 'elimination' ? 'elimination' : 'swiss';

  // 将 API eliminationBracket 映射到本地格式
  const bracketMap: Record<string, EliminationBracket> = {
    winners: 'quarterfinals',
    losers: 'semifinals',
    grand_finals: 'finals',
  };
  const eliminationBracket = apiMatch.eliminationBracket
    ? bracketMap[apiMatch.eliminationBracket] || undefined
    : undefined;

  return {
    id: apiMatch.id,
    teamAId: apiMatch.teamAId || '',
    teamBId: apiMatch.teamBId || '',
    teamA,
    teamB,
    scoreA: apiMatch.scoreA || 0,
    scoreB: apiMatch.scoreB || 0,
    winnerId: apiMatch.winnerId || null,
    round: apiMatch.round,
    status: apiMatch.status,
    startTime: apiMatch.startTime || '',
    stage,
    swissRecord: apiMatch.swissRecord,
    swissRound: apiMatch.swissRound,
    boFormat: apiMatch.boFormat,
    eliminationBracket,
  };
};

// 将 API Team 转换为本地 Team 格式
const convertApiTeamToLocal = (apiTeam: ApiTeam): Team => {
  // 优先使用 API 返回的真实队员数据
  const apiPlayers = apiTeam.members || apiTeam.players || [];

  // 如果有真实队员数据，转换为本地格式
  const players: Player[] =
    apiPlayers.length > 0
      ? apiPlayers.map(apiPlayer => ({
          id: apiPlayer.id,
          nickname: apiPlayer.nickname,
          avatarUrl: apiPlayer.avatarUrl,
          position: apiPlayer.position,
          bio: apiPlayer.bio,
          teamId: apiPlayer.teamId,
          gameId: apiPlayer.gameId,
          championPool: apiPlayer.championPool,
          rating: apiPlayer.rating,
          isCaptain: apiPlayer.isCaptain,
          liveUrl: apiPlayer.liveUrl,
          level: apiPlayer.level,
        }))
      : // 如果没有队员数据，创建默认空位
        (['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as PositionType[]).map((position, index) => ({
          id: `${apiTeam.id}-player-${index}`,
          nickname: '待定',
          avatarUrl: undefined,
          position,
          bio: undefined,
        }));

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

// 加载骨架屏组件
const ScheduleSkeleton: React.FC = () => (
  <div className="w-full" data-testid="schedule-skeleton">
    <div className="flex justify-center mb-8">
      <div className="flex space-x-2 bg-gray-800/50 p-1 rounded-lg">
        <div className="w-24 h-10 bg-white/10 rounded animate-pulse" />
        <div className="w-24 h-10 bg-white/10 rounded animate-pulse" />
      </div>
    </div>
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
      ))}
    </div>
  </div>
);

// 错误状态组件
const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-20" data-testid="schedule-error">
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

const ScheduleSection: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('swiss');
  const { advancement, setAdvancement } = useAdvancementStore();
  const [scale, setScale] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  // 加载数据
  const loadData = useCallback(
    async (_forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);

        const [matchesResponse, teamsResponse] = await Promise.all([
          matchService.getAll(),
          teamService.getAll(),
        ]);

        const convertedTeams = teamsResponse.map(convertApiTeamToLocal);
        const convertedMatches = matchesResponse.map(m =>
          convertApiMatchToLocal(m, convertedTeams)
        );

        setTeams(convertedTeams);
        setMatches(convertedMatches);

        // 自动计算晋级名单
        const swissMatches = convertedMatches.filter(m => m.stage === 'swiss');
        if (swissMatches.length > 0) {
          const calculated = calculateAdvancement(swissMatches, convertedTeams);
          setAdvancement(calculated);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '获取赛程数据失败';
        setError(errorMessage);
        console.error('[ScheduleSection] 获取赛程数据失败:', err);
      } finally {
        setLoading(false);
      }
    },
    [setAdvancement]
  );

  // 按阶段筛选比赛
  const swissMatches = matches.filter(m => m.stage === 'swiss');
  const eliminationMatches = matches.filter(m => m.stage === 'elimination');

  // Tab 切换处理
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Tab 切换时刷新数据（强制刷新）
    loadData(true);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 动态计算缩放比例（优化：使用 requestAnimationFrame 减少布局抖动）
  useEffect(() => {
    let rafId: number;
    const calculateScale = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight;
        const headerHeight = 98;
        const availableHeight = viewportHeight - headerHeight;

        if (contentRef.current) {
          const contentHeight = contentRef.current.scrollHeight || 886;
          const newScale = Math.min(1, availableHeight / contentHeight);
          setScale(newScale);
        } else {
          const contentHeight = 886;
          const newScale = Math.min(1, availableHeight / contentHeight);
          setScale(newScale);
        }
      });
    };

    calculateScale();
    window.addEventListener('resize', calculateScale, { passive: true });
    return () => {
      window.removeEventListener('resize', calculateScale);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeTab]);

  return (
    <section id="schedule" className="h-screen flex flex-col bg-black">
      <div className="max-w-7xl mx-auto px-4 flex-1 flex flex-col justify-center min-h-0">
        {loading && matches.length === 0 ? (
          // 加载骨架屏
          <ScheduleSkeleton />
        ) : error && matches.length === 0 ? (
          // 错误状态
          <ErrorState message={error} onRetry={loadData} />
        ) : (
          <div
            ref={contentRef}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              width: '100%',
            }}
          >
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
              data-testid="schedule-tabs"
            >
              <TabsList
                className="w-full max-w-md mx-auto mb-8 flex"
                data-testid="schedule-tab-list"
              >
                <TabsTrigger value="swiss" className="flex-1" data-testid="home-swiss-tab">
                  瑞士轮
                </TabsTrigger>
                <TabsTrigger
                  value="elimination"
                  className="flex-1"
                  data-testid="home-elimination-tab"
                >
                  淘汰赛
                </TabsTrigger>
              </TabsList>

              <TabsContent value="swiss" className="mt-0" data-testid="swiss-content">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  data-testid="swiss-stage-display"
                >
                  {swissMatches.length === 0 ? (
                    <SwissEmptyState message="暂无赛程信息，赛程信息将在比赛开始前公布" />
                  ) : (
                    <SwissStage matches={swissMatches} teams={teams} advancement={advancement} />
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="elimination" className="mt-0" data-testid="elimination-content">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  data-testid="elimination-stage-display"
                >
                  {eliminationMatches.length === 0 ? (
                    <SwissEmptyState message="暂无淘汰赛信息" />
                  ) : (
                    <EliminationStage matches={eliminationMatches} teams={teams} />
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* 刷新指示器 */}
        {loading && matches.length > 0 && (
          <div className="mt-8 flex items-center justify-center space-x-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">更新中...</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default ScheduleSection;
