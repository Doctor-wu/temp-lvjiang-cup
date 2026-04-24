import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { teamService } from '@/services/teamService';
import { matchService } from '@/services/matchService';
import type { Match, MatchStatus, Team } from '@/types';
import type { UpdateMatchRequest } from '@/api/types';
import { Toaster, toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import SwissStageVisualEditor from './SwissStageVisualEditor';
import EliminationStage from '@/components/features/EliminationStage';
import { useAdvancementStore, calculateAdvancement } from '@/store/advancementStore';
import { RefreshCw, Trophy, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { initSlots } from '@/api/admin';
import { getUploadUrl } from '@/utils/upload';

// 将前端 Match 转换为 API UpdateMatchRequest
const toUpdateMatchRequest = (match: Match): UpdateMatchRequest => ({
  id: match.id,
  teamAId: match.teamAId,
  teamBId: match.teamBId,
  scoreA: match.scoreA,
  scoreB: match.scoreB,
  winnerId: match.winnerId || undefined,
  status: mapStatusToApi(match.status),
  startTime: match.startTime,
  swissRound: match.swissRound,
  boFormat: match.boFormat,
});

// 将前端状态映射到 API 状态
const mapStatusToApi = (status: MatchStatus): 'upcoming' | 'ongoing' | 'finished' => {
  // 前端状态和 API 状态保持一致
  return status;
};

// 将 API 状态映射到前端状态
const mapStatusToFrontend = (status: string): MatchStatus => {
  switch (status) {
    case 'upcoming':
      return 'upcoming';
    case 'ongoing':
      return 'ongoing';
    case 'finished':
      return 'finished';
    default:
      return 'upcoming';
  }
};

// 将 API Match 转换为前端 Match
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFrontendMatch = (apiMatch: any): Match => ({
  id: apiMatch.id,
  teamAId: apiMatch.teamAId,
  teamBId: apiMatch.teamBId,
  scoreA: apiMatch.scoreA || 0,
  scoreB: apiMatch.scoreB || 0,
  winnerId: apiMatch.winnerId || null,
  round: apiMatch.round,
  status: mapStatusToFrontend(apiMatch.status),
  startTime: apiMatch.startTime || '',
  stage: apiMatch.stage as 'swiss' | 'elimination',
  swissRecord: apiMatch.swissRecord,
  swissRound: apiMatch.swissRound,
  boFormat: apiMatch.boFormat,
  eliminationBracket: apiMatch.eliminationBracket,
});

const AdminSchedule: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [initSlotsLoading, setInitSlotsLoading] = useState(false);
  const [showInitConfirm, setShowInitConfirm] = useState(false);

  const advancement = useAdvancementStore(state => state.advancement);
  const setAdvancement = useAdvancementStore(state => state.setAdvancement);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [backendMatches, teamsResult] = await Promise.all([
        matchService.getAll(),
        teamService.getAll(),
      ]);

      const mappedMatches = backendMatches.map(toFrontendMatch);
      const mappedTeams = teamsResult.map(t => ({
        id: t.id,
        name: t.name,
        logo: getUploadUrl(t.logo || t.logoUrl) || '',
        battleCry: t.battleCry || '',
        players: (t.members || []).map((player, index: number) => ({
          id: player.id || `p-${t.id}-${index}`,
          name: player.nickname,
          position: player.position || ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'][index] || 'SUB',
          avatar: player.avatarUrl || '',
          description: '',
          teamId: t.id,
        })),
      }));

      setMatches(mappedMatches);
      setTeams(mappedTeams as Team[]);

      const swissMatches = mappedMatches.filter(m => m.stage === 'swiss');
      if (swissMatches.length > 0) {
        const calculated = calculateAdvancement(swissMatches, mappedTeams as Team[]);
        setAdvancement(calculated);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchUpdate = async (updatedMatch: Match) => {
    setLoading(true);
    try {
      const updateData = toUpdateMatchRequest(updatedMatch);
      await matchService.update(updateData);
      toast.success('比赛信息已更新');
      await loadData();
    } catch (error) {
      console.error('Failed to update match:', error);
      toast.error(error instanceof Error ? error.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理瑞士轮创建新比赛（实际上是找到空槽位并更新）
  const handleMatchCreate = async (newMatch: Omit<Match, 'id'>) => {
    // 验证是否选择了至少一支队伍
    if (!newMatch.teamAId || !newMatch.teamBId) {
      toast.error('请选择两支队伍');
      return;
    }

    setLoading(true);
    try {
      // 找到对应战绩分组的空槽位
      const swissRecord = newMatch.swissRecord;
      const existingMatches = matches.filter(
        m => m.stage === 'swiss' && m.swissRecord === swissRecord
      );

      // 查找没有队伍的槽位（teamAId 或 teamBId 为空或空字符串）
      const emptySlot = existingMatches.find(
        m => !m.teamAId || m.teamAId === '' || !m.teamBId || m.teamBId === ''
      );

      if (emptySlot) {
        // 更新现有槽位
        const updateData: UpdateMatchRequest = {
          id: emptySlot.id,
          teamAId: newMatch.teamAId,
          teamBId: newMatch.teamBId,
          scoreA: newMatch.scoreA,
          scoreB: newMatch.scoreB,
          status: newMatch.status,
          startTime: newMatch.startTime,
        };
        await matchService.update(updateData);
        toast.success('比赛已创建');
        await loadData();
      } else {
        toast.error('该战绩分组已满，无法添加更多比赛');
      }
    } catch (error) {
      console.error('Failed to create match:', error);
      toast.error(error instanceof Error ? error.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化比赛槽位
  const handleInitSlots = () => {
    setShowInitConfirm(true);
  };

  const confirmInitSlots = async () => {
    setShowInitConfirm(false);
    setInitSlotsLoading(true);
    try {
      const result = await initSlots();
      toast.success(`比赛槽位初始化成功！共创建 ${result.count} 场比赛`);
      await loadData();
    } catch (error) {
      console.error('Failed to init slots:', error);
      toast.error(error instanceof Error ? error.message : '初始化失败');
    } finally {
      setInitSlotsLoading(false);
    }
  };

  const swissMatches = matches.filter(m => m.stage === 'swiss');
  const eliminationMatches = matches.filter(m => m.stage === 'elimination');

  return (
    <AdminLayout>
      <Toaster position="top-right" theme="dark" />
      <ConfirmDialog
        isOpen={showInitConfirm}
        title="初始化比赛槽位"
        message="确定要初始化比赛槽位吗？这将创建瑞士轮 32 场和淘汰赛 7 场比赛槽位。如果槽位已存在，则不会重复创建。"
        confirmText="确定初始化"
        cancelText="取消"
        onConfirm={confirmInitSlots}
        onCancel={() => setShowInitConfirm(false)}
      />
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 data-testid="schedule-page-title" className="text-3xl font-bold text-white">
              赛程管理
            </h1>
            <p data-testid="schedule-match-count" className="text-sm text-gray-400 mt-1">
              共 {matches.length} 场比赛 · {swissMatches.length} 场瑞士轮 ·{' '}
              {eliminationMatches.length} 场淘汰赛
            </p>
          </div>
          <div className="flex gap-2">
            {teams.length > 0 &&
              (matches.length === 0 ||
                swissMatches.length === 0 ||
                eliminationMatches.length === 0) && (
                <Button
                  data-testid="init-slots-button"
                  variant="default"
                  onClick={handleInitSlots}
                  disabled={initSlotsLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className={`w-4 h-4 mr-2 ${initSlotsLoading ? 'animate-spin' : ''}`} />
                  {initSlotsLoading ? '初始化中...' : '初始化比赛槽位'}
                </Button>
              )}
            <Button
              data-testid="refresh-schedule-button"
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0F172A] rounded-lg border border-gray-800 p-6">
          {loading && matches.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mr-2" />
              加载中...
            </div>
          ) : (
            <Tabs defaultValue="swiss" className="w-full">
              <TabsList
                data-testid="schedule-tabs"
                className="mb-6 bg-gray-800/50 border border-gray-700"
              >
                <TabsTrigger
                  data-testid="swiss-tab"
                  value="swiss"
                  className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  瑞士轮 (Swiss Stage)
                  <span className="ml-1 text-xs opacity-70">({swissMatches.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  data-testid="elimination-tab"
                  value="elimination"
                  className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  淘汰赛 (Elimination Stage)
                  <span className="ml-1 text-xs opacity-70">({eliminationMatches.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="swiss" className="mt-0">
                {teams.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>请先添加战队数据</p>
                  </div>
                ) : swissMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400">
                      <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">比赛槽位未初始化</p>
                      <p className="text-sm mt-2 text-gray-500">
                        请先点击右上角"初始化比赛槽位"按钮创建比赛槽位
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 text-sm text-gray-400" data-testid="advancement-status">
                      晋级状态：前8名晋级淘汰赛 · {advancement?.top8?.length ?? 0} 队已晋级 ·{' '}
                      {advancement?.eliminated?.length ?? 0} 队已淘汰
                    </div>
                    <SwissStageVisualEditor
                      matches={swissMatches}
                      teams={teams}
                      advancement={advancement}
                      onMatchUpdate={handleMatchUpdate}
                      onMatchCreate={handleMatchCreate}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="elimination" className="mt-0">
                {teams.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>请先添加战队数据</p>
                  </div>
                ) : eliminationMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">比赛槽位未初始化</p>
                      <p className="text-sm mt-2 text-gray-500">
                        请先点击右上角"初始化比赛槽位"按钮创建比赛槽位
                      </p>
                    </div>
                  </div>
                ) : (
                  <EliminationStage
                    matches={eliminationMatches}
                    teams={teams}
                    editable={true}
                    onMatchUpdate={handleMatchUpdate}
                  />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSchedule;
