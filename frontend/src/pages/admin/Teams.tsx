import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { teamService } from '@/services/teamService';
import * as membersApi from '@/api/members';
import { uploadTeamLogo } from '@/api/teams';
import type { Team, Player, CreateTeamRequest, UpdateTeamRequest, PlayerLevel } from '@/api/types';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  Users,
  Upload as UploadIcon,
  X,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getPositionLabel } from '@/utils/position';
import { PositionType } from '@/types/position';
import HeroSelector from '@/components/team/HeroSelector';
import { getLevelBadgeClasses, getCaptainBadgeClasses } from '@/utils/levelColors';
import { getChampionTitleByEn } from '@/utils/championUtils';
import { ImportDialog, ImportResultDialog, type ImportResult } from '@/components/import';
import { downloadTemplate } from '@/api/teams-import';

interface MemberFormData {
  avatarUrl?: string;
  nickname: string;
  gameId: string;
  position: PositionType;
  bio?: string;
  championPool: string[];
  rating: number;
  isCaptain: boolean;
  liveUrl?: string;
  level?: PlayerLevel;
}

// LOL固定位置
const LOL_POSITIONS: PositionType[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

// 确保队员列表包含所有位置
const ensureAllPositions = (players: any[] = [], teamId: string): any[] => {
  const existingPlayers = [...players];
  const result: any[] = [];

  LOL_POSITIONS.forEach((position, index) => {
    const existingPlayer = existingPlayers.find(p => p.position === position);
    if (existingPlayer) {
      result.push(existingPlayer);
    } else {
      result.push({
        id: `p-${teamId}-${index}-${Date.now()}`,
        nickname: '',
        position,
        avatarUrl: '',
        teamId,
        gameId: '',
        bio: '',
        championPool: [],
        rating: 60,
        isCaptain: false,
        liveUrl: '',
        level: undefined,
      });
    }
  });

  return result;
};

// 将前端 Team 转换为 API CreateTeamRequest
const _toCreateTeamRequest = (team: Team): CreateTeamRequest => ({
  id: team.id,
  name: team.name,
  logo: team.logo,
  battleCry: team.battleCry,
  // 不再发送 members 数组，后端会自动创建 5 个默认队员
});

// 将前端 Team 转换为 API UpdateTeamRequest
const toUpdateTeamRequest = (team: Team): UpdateTeamRequest => ({
  id: team.id,
  name: team.name,
  logo: team.logo,
  battleCry: team.battleCry,
  members:
    team.players?.map(p => ({
      id: p.id,
      nickname: p.nickname || '',
      avatarUrl: p.avatarUrl || '',
      position: p.position as PositionType,
    })) || [],
});

const AdminTeams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // 战队数量限制
  const MAX_TEAMS = 16;

  // ==================== 垂直列表展开方案：新增状态 ====================
  // 展开的战队ID（同时只能展开一个）
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // 正在编辑的战队ID
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // 是否正在编辑战队信息（true=编辑战队，false=编辑队员）
  const [isEditingTeam, setIsEditingTeam] = useState(false);

  // 战队编辑表单数据
  const [editingTeamData, setEditingTeamData] = useState<{
    id?: string;
    name: string;
    logo: string;
    battleCry: string;
  } | null>(null);
  // ==================== 垂直列表展开方案：新增状态结束 ====================

  // 队员卡片折叠状态
  const [expandedPlayerIndex, setExpandedPlayerIndex] = useState<number | null>(null);

  // 队员内联编辑状态
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const [editingPlayerData, setEditingPlayerData] = useState<MemberFormData | null>(null);

  // 英雄选择器状态
  const [isHeroSelectorOpen, setIsHeroSelectorOpen] = useState(false);

  // 导入对话框状态
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImportResultDialogOpen, setIsImportResultDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!hasLoaded) {
      loadTeams();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const backendTeams = await teamService.getAll();
      const mappedTeams = backendTeams.map((team: any) => ({
        ...team,
        players: ensureAllPositions(
          (team.members || []).map(m => ({
            ...m,
            nickname: m.nickname || '',
            avatarUrl: m.avatarUrl || '',
            bio: m.bio || '',
            gameId: m.gameId || '',
            championPool: m.championPool || [],
            rating: m.rating ?? 60,
            isCaptain: m.isCaptain ?? false,
            liveUrl: m.liveUrl || '',
            level: m.level,
          })),
          team.id
        ),
      }));
      setTeams(mappedTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
      toast.error('加载战队列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载模板
  const handleDownloadTemplate = async () => {
    const toastId = toast.loading('正在下载模板...');

    try {
      const blob = await downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const fileName = `驴酱杯_战队导入模板_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // 延迟清理 DOM，给浏览器时间开始下载
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 500);

      toast.success('模板已开始下载，请查看浏览器下载进度', { id: toastId });
    } catch (error) {
      console.error('Failed to download template:', error);
      toast.error('模板下载失败', { id: toastId });
    }
  };

  // 导入成功回调
  const handleImportSuccess = (result: ImportResult) => {
    setImportResult(result);
    setIsImportResultDialogOpen(true);
  };

  // 导入对话框关闭后刷新
  const handleImportResultClose = () => {
    setIsImportResultDialogOpen(false);
    setImportResult(null);
    loadTeams();
  };

  // ==================== 垂直列表展开方案：新增函数 ====================
  // 展开/收起战队详情
  const handleToggleExpand = (teamId: string) => {
    // 如果正在编辑战队，不允许切换展开
    if (editingTeamId && editingTeamId !== teamId) {
      toast.error('请先保存或取消当前编辑');
      return;
    }

    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);

    // 收起时清空队员编辑状态
    if (expandedTeamId === teamId) {
      setExpandedPlayerIndex(null);
      setEditingPlayerIndex(null);
      setEditingPlayerData(null);
    }
  };

  // 开始编辑战队
  const handleStartEditTeam = (team: Team) => {
    setIsEditingTeam(true);
    if (expandedTeamId !== team.id) {
      setExpandedTeamId(team.id);
    }
    setEditingTeamId(team.id);
    setEditingTeamData({
      name: team.name,
      logo: team.logo || team.logoUrl,
      battleCry: team.battleCry,
    });
  };

  // 取消编辑战队
  const handleCancelEditTeam = () => {
    setIsEditingTeam(false);
    setEditingTeamId(null);
    setEditingTeamData(null);
  };

  // 保存战队编辑
  const handleSaveTeamEdit = async (teamId: string) => {
    if (!editingTeamData) return;

    // 验证战队名称
    if (!editingTeamData.name.trim()) {
      toast.error('战队名称不能为空');
      return;
    }

    setLoading(true);
    try {
      const team = teams.find(t => t.id === teamId);
      if (!team) return;

      // 判断是否是新创建的战队
      const isNewTeam = teamId === 'new-team';

      if (isNewTeam) {
        // 创建新战队 - 不传递ID，由后端生成UUID
        const createData: CreateTeamRequest = {
          name: editingTeamData.name,
          logo: editingTeamData.logo,
          battleCry: editingTeamData.battleCry,
        };
        await teamService.create(createData);
        toast.success('战队创建成功');
      } else {
        // 更新现有战队
        const updateData = toUpdateTeamRequest({
          ...team,
          name: editingTeamData.name,
          logo: editingTeamData.logo,
          battleCry: editingTeamData.battleCry,
        });
        await teamService.update(updateData);
        toast.success('战队信息已更新');
      }

      // 退出编辑模式
      setIsEditingTeam(false);
      setEditingTeamId(null);
      setEditingTeamData(null);

      // 刷新列表
      await loadTeams();
    } catch (error) {
      console.error('Failed to save team:', error);
      toast.error(error instanceof Error ? error.message : '保存战队失败');
    } finally {
      setLoading(false);
    }
  };
  // ==================== 垂直列表展开方案：新增函数结束 ====================

  const handleDeleteClick = (id: string) => {
    setTeamToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!teamToDelete) return;

    setLoading(true);
    try {
      await teamService.remove(teamToDelete);
      toast.success('战队已删除');
      await loadTeams();
    } catch (error) {
      console.error('Failed to delete team:', error);
      toast.error(error instanceof Error ? error.message : '删除战队失败');
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setTeamToDelete(null);
    }
  };

  const handleCreateNew = () => {
    // 检查是否达到战队数量限制
    if (teams.length >= MAX_TEAMS) {
      toast.error(`最多只能添加 ${MAX_TEAMS} 支战队`);
      return;
    }

    // 使用特殊前缀标记新战队
    const newTeam: Team = {
      id: 'new-team',
      name: '',
      logo: '',
      battleCry: '',
      players: [],
    };

    // 添加到列表开头并展开，同时进入编辑模式
    setTeams([newTeam, ...teams]);
    setExpandedTeamId('new-team');
    setEditingTeamId('new-team');
    setIsEditingTeam(true);
    setEditingTeamData({
      name: '',
      logo: '',
      battleCry: '',
    });
  };

  // 提取直播间房间号
  const _extractRoomNumber = (url: string): string => {
    const defaultPrefix = 'https://www.douyu.com/';
    if (!url) return defaultPrefix;
    // 如果已经是完整URL，直接返回
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // 如果是纯数字，添加前缀
    if (/^\d+$/.test(url)) return defaultPrefix + url;
    // 其他情况返回原值
    return url;
  };

  // 格式化直播间URL为完整地址
  const formatLiveUrl = (input: string): string => {
    const defaultPrefix = 'https://www.douyu.com/';
    if (!input || !input.trim()) return '';
    const trimmed = input.trim();
    // 如果只是默认前缀，没有房间号，返回空
    if (trimmed === defaultPrefix || trimmed === defaultPrefix.slice(0, -1)) {
      return '';
    }
    // 如果已经是完整URL，直接返回
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // 添加默认前缀
    return `${defaultPrefix}${trimmed}`;
  };

  // 打开队员内联编辑
  const handleEditMember = (player: Player, index: number, teamId: string) => {
    const playerData: MemberFormData = {
      nickname: player.nickname || '',
      gameId: player.gameId || '',
      position: player.position as PositionType,
      avatarUrl: player.avatarUrl || '',
      bio: player.bio || '',
      championPool: player.championPool || [],
      rating: player.rating ?? 60,
      isCaptain: player.isCaptain ?? false,
      liveUrl: player.liveUrl || '',
      level: player.level,
    };

    // 检查战队是否已保存（是否是未保存的新战队）
    const isNewTeam = teamId === 'new-team';
    if (isNewTeam) {
      toast.error('请先保存战队基本信息，然后再编辑队员信息');
      return;
    }

    // 设置当前编辑的战队ID
    setIsEditingTeam(false);
    setEditingTeamId(teamId);
    setExpandedPlayerIndex(index);
    setEditingPlayerIndex(index);
    setEditingPlayerData(playerData);
  };

  // 取消队员编辑
  const handleCancelEditMember = () => {
    setIsEditingTeam(false);
    setEditingTeamId(null);
    setEditingPlayerIndex(null);
    setEditingPlayerData(null);
  };

  // 保存队员编辑
  const handleSaveMember = async () => {
    if (!editingTeamId || editingPlayerIndex === null || !editingPlayerData) return;

    // 评分校验
    const rating = editingPlayerData.rating;
    if (!Number.isInteger(rating) || rating < 0 || rating > 100) {
      toast.error('评分必须是0-100之间的整数');
      return;
    }

    const team = teams.find(t => t.id === editingTeamId);
    if (!team) return;

    const player = team.players[editingPlayerIndex];
    const newPlayers = [...team.players];

    // 准备更新到后端的数据（使用后端期望的字段名）
    // 确保直播间URL是完整格式
    const finalLiveUrl = formatLiveUrl(editingPlayerData.liveUrl);
    const updateData = {
      nickname: editingPlayerData.nickname,
      avatarUrl: editingPlayerData.avatarUrl || '',
      position: editingPlayerData.position,
      bio: editingPlayerData.bio || '',
      gameId: editingPlayerData.gameId,
      championPool: editingPlayerData.championPool,
      rating: editingPlayerData.rating,
      isCaptain: editingPlayerData.isCaptain,
      liveUrl: finalLiveUrl,
      level: editingPlayerData.level,
    };

    try {
      // 调用后端 API 更新队员信息
      await membersApi.updateMember(player.id, updateData);

      // 更新本地状态
      const updatedPlayer: Player = {
        ...newPlayers[editingPlayerIndex],
        nickname: editingPlayerData.nickname,
        avatarUrl: editingPlayerData.avatarUrl || '',
        position: editingPlayerData.position,
        bio: editingPlayerData.bio || '',
        gameId: editingPlayerData.gameId,
        rating: editingPlayerData.rating,
        isCaptain: editingPlayerData.isCaptain,
        liveUrl: finalLiveUrl,
        championPool: editingPlayerData.championPool,
        level: editingPlayerData.level,
      };
      newPlayers[editingPlayerIndex] = updatedPlayer;

      // 更新teams数组
      const updatedTeams = teams.map(t =>
        t.id === editingTeamId ? { ...t, players: newPlayers } : t
      );
      setTeams(updatedTeams);

      setIsEditingTeam(false);
      setEditingPlayerIndex(null);
      setEditingPlayerData(null);
      toast.success('队员信息已保存');
    } catch (error) {
      console.error('Failed to update member:', error);
      toast.error(error instanceof Error ? error.message : '保存队员信息失败');
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">战队管理</h1>
        {teams.length >= MAX_TEAMS && (
          <div
            data-testid="team-limit-warning"
            className="text-sm text-amber-400 bg-amber-400/10 px-3 py-1 rounded"
          >
            已达到战队数量上限 ({teams.length}/{MAX_TEAMS})
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadTeams}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            onClick={handleCreateNew}
            disabled={loading || teams.length >= MAX_TEAMS}
            data-testid="add-team-button"
          >
            <Plus className="w-4 h-4 mr-2" /> 添加战队
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            data-testid="download-template-button"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            下载模板
          </Button>
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            data-testid="batch-import-button"
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border-yellow-300 hover:shadow-[0_0_15px_rgba(250,204,21,0.5)]"
          >
            <UploadIcon className="w-4 h-4 mr-2" />
            批量导入
          </Button>
        </div>
      </div>

      {/* ==================== 垂直列表展开方案：新的渲染结构 ==================== */}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin mr-2" />
          加载中...
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">暂无战队数据</p>
          <p className="text-sm mt-2">点击"添加战队"按钮创建第一个战队</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map(team => {
            const isExpanded = expandedTeamId === team.id;
            const isTeamBeingEdited = isEditingTeam && editingTeamId === team.id;

            return (
              <Card
                key={team.id}
                data-testid={`team-card-${team.id}`}
                className="bg-[#0F172A] border-white/10 overflow-hidden"
              >
                {/* 战队头部（可点击展开） */}
                <div
                  data-testid={`team-header-${team.id}`}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => handleToggleExpand(team.id)}
                >
                  <div className="flex items-center space-x-4">
                    {team.logo || team.logoUrl ? (
                      <img
                        src={team.logo || team.logoUrl}
                        alt={team.name}
                        className="w-12 h-12 rounded object-contain bg-black/20"
                        onError={e => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="%23333"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="16">?</text></svg>';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center text-gray-500">
                        <Users className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-white text-lg font-semibold">
                        {team.name || '未命名战队'}
                      </h3>
                      <p className="text-[#64748B] text-sm">
                        {(team.players?.filter(p => p.nickname).length ?? 0)} / {LOL_POSITIONS.length}{' '}
                        名队员
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isEditingTeam && editingTeamId === null && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            handleStartEditTeam(team);
                          }}
                          disabled={loading}
                          aria-label="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteClick(team.id);
                          }}
                          disabled={loading}
                          aria-label="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </>
                    )}
                    <div
                      className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 展开区域 */}
                {isExpanded && (
                  <div data-testid={`team-detail-${team.id}`} className="border-t border-white/10">
                    {/* 编辑模式 */}
                    {isTeamBeingEdited && editingTeamData ? (
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                              战队名称 <span className="text-red-500">*</span>
                            </label>
                            <input
                              data-testid="team-name-input"
                              type="text"
                              value={editingTeamData.name}
                              onChange={e =>
                                setEditingTeamData({ ...editingTeamData, name: e.target.value })
                              }
                              placeholder="请输入战队名称"
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#475569] focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                              队标
                            </label>
                            <div className="flex items-start gap-3">
                              <div
                                className="relative flex-shrink-0 w-20 h-20 border-2 border-dashed border-white/20 rounded-lg
                                           flex items-center justify-center cursor-pointer
                                           hover:border-blue-500 hover:bg-blue-500/10 transition-all group"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept =
                                    'image/png,image/jpeg,image/jpg,image/gif,image/webp';
                                  input.onchange = async e => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (!file) return;
                                    if (file.size > 5 * 1024 * 1024) {
                                      toast.error('图片大小不能超过 5MB');
                                      return;
                                    }
                                    if (
                                      ![
                                        'image/png',
                                        'image/jpeg',
                                        'image/jpg',
                                        'image/gif',
                                        'image/webp',
                                      ].includes(file.type)
                                    ) {
                                      toast.error('仅支持 JPG/PNG/GIF/WebP 格式图片');
                                      return;
                                    }
                                    try {
                                      const result = await uploadTeamLogo(
                                        editingTeamData.id || 'new',
                                        file
                                      );
                                      setEditingTeamData({ ...editingTeamData, logo: result.url });
                                      toast.success('队标上传成功');
                                    } catch (_error) {
                                      toast.error('上传失败，请重试');
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                {editingTeamData.logo ? (
                                  <>
                                    <img
                                      src={editingTeamData.logo}
                                      alt="队标预览"
                                      className="w-full h-full object-contain rounded"
                                    />
                                    <div
                                      className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100
                                                    flex items-center justify-center transition-opacity"
                                    >
                                      <UploadIcon className="w-6 h-6 text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center text-gray-500">
                                    <UploadIcon className="w-6 h-6 mb-1" />
                                    <span className="text-xs">上传</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={editingTeamData.logo}
                                  onChange={e =>
                                    setEditingTeamData({ ...editingTeamData, logo: e.target.value })
                                  }
                                  placeholder="或输入图标 URL"
                                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white
                                             placeholder-[#475569] focus:outline-none focus:border-blue-500 mb-1.5"
                                />
                                <p className="text-xs text-gray-500">
                                  支持 JPG/PNG 格式，不超过 2MB
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                              参赛宣言
                            </label>
                            <div className="relative">
                              <textarea
                                value={editingTeamData.battleCry}
                                onChange={e =>
                                  setEditingTeamData({
                                    ...editingTeamData,
                                    battleCry: e.target.value,
                                  })
                                }
                                placeholder="请输入参赛宣言"
                                rows={3}
                                maxLength={100}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#475569] focus:outline-none focus:border-blue-500 resize-none"
                              />
                              <span className="absolute bottom-2 right-2 text-xs text-[#64748B]">
                                {editingTeamData.battleCry.length}/100
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            data-testid="cancel-edit-team-btn"
                            variant="ghost"
                            onClick={handleCancelEditTeam}
                            disabled={loading}
                          >
                            取消
                          </Button>
                          <Button
                            data-testid="save-team-btn"
                            onClick={() => handleSaveTeamEdit(team.id)}
                            disabled={loading}
                            className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border-yellow-300 hover:shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? '保存中...' : '保存'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* 查看模式 */
                      <div className="p-4 space-y-4">
                        {/* 战队信息展示 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#64748B] mb-1">战队名称</label>
                            <p className="text-white">{team.name || '未命名'}</p>
                          </div>
                          <div>
                            <label className="block text-xs text-[#64748B] mb-1">队标</label>
                            {team.logo || team.logoUrl ? (
                              <img
                                src={team.logo || team.logoUrl}
                                alt="队标"
                                className="w-16 h-16 rounded object-contain bg-black/20"
                              />
                            ) : (
                              <span className="text-gray-500">未上传</span>
                            )}
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-[#64748B] mb-1">参赛宣言</label>
                            <p className="text-white">{team.battleCry || '暂无参赛宣言'}</p>
                          </div>
                        </div>

                        {/* 队员列表 */}
                        <div className="mt-4">
                          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            队员列表
                          </h4>
                          <div className="space-y-2">
                            {team.players.map((player, idx) => {
                              const isPlayerExpanded = expandedPlayerIndex === idx;
                              const isPlayerEditing =
                                editingPlayerIndex === idx && editingTeamId === team.id;

                              return (
                                <div
                                  key={player.id}
                                  className={`bg-white/5 rounded-lg border transition-all duration-300 ${
                                    isPlayerExpanded || isPlayerEditing
                                      ? 'border-blue-500/50'
                                      : 'border-white/10'
                                  }`}
                                >
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer"
                                    onClick={() => {
                                      if (!isPlayerEditing) {
                                        setExpandedPlayerIndex(isPlayerExpanded ? null : idx);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="px-2 py-0.5 bg-blue-600/30 text-blue-400 text-xs rounded font-medium min-w-[60px] text-center">
                                        {getPositionLabel(player.position)}
                                      </span>
                                      {player.avatarUrl ? (
                                        <img
                                          src={player.avatarUrl}
                                          alt={player.nickname}
                                          className="w-8 h-8 rounded object-cover"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-500 text-xs">
                                          ?
                                        </div>
                                      )}
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-white text-sm">
                                            {player.nickname || '未填写'}
                                          </span>
                                          {player.isCaptain && (
                                            <span className={getCaptainBadgeClasses()}>队长</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {!isPlayerEditing && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleEditMember(player, idx, team.id);
                                          }}
                                          className="h-8 w-8 hover:bg-white/10"
                                        >
                                          <Edit2 className="w-4 h-4 text-blue-400" />
                                        </Button>
                                      )}
                                      <div
                                        className={`transition-transform duration-300 ${isPlayerExpanded || isPlayerEditing ? 'rotate-180' : ''}`}
                                      >
                                        <svg
                                          className="w-5 h-5 text-gray-400"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>
                                  {(isPlayerExpanded || isPlayerEditing) && (
                                    <div className="px-3 pb-3 border-t border-white/10 pt-3">
                                      {isPlayerEditing && editingPlayerData ? (
                                        <div className="space-y-3">
                                          {/* 第1行：基础信息 - 昵称 + 游戏ID */}
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs text-gray-400 mb-1">
                                                昵称 <span className="text-red-500">*</span>
                                              </label>
                                              <input
                                                data-testid="player-nickname-input"
                                                type="text"
                                                value={editingPlayerData.nickname}
                                                onChange={e =>
                                                  setEditingPlayerData({
                                                    ...editingPlayerData,
                                                    nickname: e.target.value,
                                                  })
                                                }
                                                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                                placeholder="请输入昵称"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs text-gray-400 mb-1">
                                                游戏ID
                                              </label>
                                              <input
                                                type="text"
                                                value={editingPlayerData.gameId}
                                                onChange={e =>
                                                  setEditingPlayerData({
                                                    ...editingPlayerData,
                                                    gameId: e.target.value,
                                                  })
                                                }
                                                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                                placeholder="请输入游戏ID"
                                              />
                                            </div>
                                          </div>

                                          {/* 第2行：游戏属性 - 位置 + 评分 + 队长 */}
                                          <div className="grid grid-cols-3 gap-3">
                                            <div>
                                              <label className="block text-xs text-gray-400 mb-1">
                                                位置
                                              </label>
                                              <select
                                                value={editingPlayerData.position}
                                                onChange={e =>
                                                  setEditingPlayerData({
                                                    ...editingPlayerData,
                                                    position: e.target.value as PositionType,
                                                  })
                                                }
                                                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-800"
                                              >
                                                <option
                                                  value="TOP"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  上单
                                                </option>
                                                <option
                                                  value="JUNGLE"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  打野
                                                </option>
                                                <option
                                                  value="MID"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  中单
                                                </option>
                                                <option
                                                  value="ADC"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  ADC
                                                </option>
                                                <option
                                                  value="SUPPORT"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  辅助
                                                </option>
                                              </select>
                                            </div>
                                            <div>
                                              <label className="block text-xs text-gray-400 mb-1">
                                                评分 (0-100)
                                              </label>
                                              <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={editingPlayerData.rating}
                                                onChange={e => {
                                                  const value =
                                                    e.target.value === ''
                                                      ? ''
                                                      : Number(e.target.value);
                                                  if (
                                                    value === '' ||
                                                    (Number.isInteger(value) &&
                                                      value >= 0 &&
                                                      value <= 100)
                                                  ) {
                                                    setEditingPlayerData({
                                                      ...editingPlayerData,
                                                      rating: value as number,
                                                    });
                                                  }
                                                }}
                                                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs text-gray-400 mb-1">
                                                实力等级
                                              </label>
                                              <select
                                                value={editingPlayerData.level || ''}
                                                onChange={e =>
                                                  setEditingPlayerData({
                                                    ...editingPlayerData,
                                                    level:
                                                      (e.target.value as PlayerLevel) || undefined,
                                                  })
                                                }
                                                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-800"
                                              >
                                                <option value="" className="bg-gray-800 text-white">
                                                  未设置
                                                </option>
                                                <option
                                                  value="S"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  S
                                                </option>
                                                <option
                                                  value="A"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  A
                                                </option>
                                                <option
                                                  value="B"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  B
                                                </option>
                                                <option
                                                  value="C"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  C
                                                </option>
                                                <option
                                                  value="D"
                                                  className="bg-gray-800 text-white"
                                                >
                                                  D
                                                </option>
                                              </select>
                                            </div>
                                            <div className="flex items-end">
                                              <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={editingPlayerData.isCaptain}
                                                  onChange={e =>
                                                    setEditingPlayerData({
                                                      ...editingPlayerData,
                                                      isCaptain: e.target.checked,
                                                    })
                                                  }
                                                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-300">
                                                  设为队长
                                                </span>
                                              </label>
                                            </div>
                                          </div>

                                          {/* 第3行：常用英雄 */}
                                          <div className="relative hero-pool-container">
                                            <label className="block text-xs text-gray-400 mb-1">
                                              常用英雄
                                            </label>
                                            <div
                                              className="flex flex-wrap items-center gap-2 min-h-[32px] p-1.5 bg-white/5 border border-white/10 rounded cursor-pointer hover:border-white/20 transition-colors"
                                              onClick={() => setIsHeroSelectorOpen(true)}
                                            >
                                              {editingPlayerData.championPool?.map(
                                                (championId, championIdx) => (
                                                  <span
                                                    key={championId}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      const newChampionPool =
                                                        editingPlayerData.championPool.filter(
                                                          (_, i) => i !== championIdx
                                                        );
                                                      setEditingPlayerData({
                                                        ...editingPlayerData,
                                                        championPool: newChampionPool,
                                                      });
                                                    }}
                                                  >
                                                    {getChampionTitleByEn(championId)}
                                                    <button
                                                      onClick={e => {
                                                        e.stopPropagation();
                                                        const newChampionPool =
                                                          editingPlayerData.championPool.filter(
                                                            (_, i) => i !== championIdx
                                                          );
                                                        setEditingPlayerData({
                                                          ...editingPlayerData,
                                                          championPool: newChampionPool,
                                                        });
                                                      }}
                                                      className="hover:text-blue-300"
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  </span>
                                                )
                                              )}
                                              {(editingPlayerData.championPool?.length || 0) <
                                                5 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400">
                                                  <Plus className="w-3 h-3" />
                                                  添加
                                                </span>
                                              )}
                                            </div>
                                            {/* 英雄选择器下拉框 */}
                                            <HeroSelector
                                              visible={isHeroSelectorOpen}
                                              onClose={() => setIsHeroSelectorOpen(false)}
                                              selectedHeroes={editingPlayerData.championPool || []}
                                              onConfirm={heroes => {
                                                setEditingPlayerData({
                                                  ...editingPlayerData,
                                                  championPool: heroes,
                                                });
                                              }}
                                              maxSelect={5}
                                            />
                                          </div>

                                          {/* 第4行：头像 + 直播间 */}
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs text-gray-400 mb-1">
                                                头像URL
                                              </label>
                                              <input
                                                type="text"
                                                value={editingPlayerData.avatarUrl}
                                                onChange={e =>
                                                  setEditingPlayerData({
                                                    ...editingPlayerData,
                                                    avatarUrl: e.target.value,
                                                  })
                                                }
                                                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                                placeholder="https://example.com/avatar.png"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs text-gray-400 mb-1">
                                                直播间
                                              </label>
                                              <input
                                                type="text"
                                                value={editingPlayerData.liveUrl}
                                                onChange={e =>
                                                  setEditingPlayerData({
                                                    ...editingPlayerData,
                                                    liveUrl: e.target.value,
                                                  })
                                                }
                                                onFocus={e => {
                                                  // 只有当输入框为空时，才动态填入默认前缀
                                                  const defaultUrl = 'https://www.douyu.com/';
                                                  if (
                                                    !e.target.value ||
                                                    e.target.value.trim() === ''
                                                  ) {
                                                    e.target.value = defaultUrl;
                                                    setEditingPlayerData({
                                                      ...editingPlayerData,
                                                      liveUrl: defaultUrl,
                                                    });
                                                    // 将光标移动到最后
                                                    setTimeout(() => {
                                                      e.target.setSelectionRange(
                                                        e.target.value.length,
                                                        e.target.value.length
                                                      );
                                                    }, 0);
                                                  }
                                                }}
                                                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                                placeholder="请输入直播间链接"
                                              />
                                            </div>
                                          </div>

                                          {/* 第5行：简介 */}
                                          <div>
                                            <label className="block text-xs text-gray-400 mb-1">
                                              简介
                                            </label>
                                            <textarea
                                              value={editingPlayerData.bio}
                                              onChange={e =>
                                                setEditingPlayerData({
                                                  ...editingPlayerData,
                                                  bio: e.target.value,
                                                })
                                              }
                                              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                                              rows={2}
                                              placeholder="请输入简介"
                                            />
                                          </div>

                                          {/* 操作按钮 */}
                                          <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={handleCancelEditMember}
                                            >
                                              取消
                                            </Button>
                                            <Button
                                              data-testid="save-player-btn"
                                              size="sm"
                                              onClick={handleSaveMember}
                                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                                            >
                                              <Save className="w-4 h-4 mr-1" />
                                              保存
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-2 text-sm">
                                          <div>
                                            <span className="text-gray-500">昵称:</span>
                                            <span className="text-white ml-2">
                                              {player.nickname || '未填写'}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-3 gap-3">
                                            <div>
                                              <span className="text-gray-500">游戏ID:</span>
                                              <span className="text-white ml-2">
                                                {player.gameId || '未填写'}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">评分:</span>
                                              <span className="text-white ml-2">
                                                {player.rating ?? 60}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">实力等级:</span>
                                              {player.level ? (
                                                <span
                                                  className={`ml-2 ${getLevelBadgeClasses(player.level)}`}
                                                >
                                                  {player.level}
                                                </span>
                                              ) : (
                                                <span className="text-white ml-2">未设置</span>
                                              )}
                                            </div>
                                          </div>

                                          <div>
                                            <span className="text-gray-500">简介:</span>
                                            <span className="text-white ml-2">
                                              {player.bio || '暂无简介'}
                                            </span>
                                          </div>

                                          {player.championPool &&
                                            player.championPool.length > 0 && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-500">常用英雄:</span>
                                                <div className="flex flex-wrap gap-1">
                                                  {player.championPool.map(championId => (
                                                    <span
                                                      key={championId}
                                                      className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded"
                                                    >
                                                      {getChampionTitleByEn(championId)}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                          {player.liveUrl && (
                                            <div>
                                              <span className="text-gray-500">直播间:</span>
                                              <a
                                                href={player.liveUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 ml-2 hover:underline"
                                              >
                                                {player.liveUrl}
                                              </a>
                                            </div>
                                          )}

                                          {player.isCaptain && (
                                            <div
                                              className={getCaptainBadgeClasses(
                                                'inline-flex items-center'
                                              )}
                                            >
                                              队长
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="确认删除战队？"
        message="此操作将永久删除该战队，无法恢复。是否继续？"
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setTeamToDelete(null);
        }}
      />

      {/* 批量导入对话框 */}
      <ImportDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* 导入结果对话框 */}
      <ImportResultDialog
        open={isImportResultDialogOpen}
        onClose={handleImportResultClose}
        result={importResult}
      />
    </AdminLayout>
  );
};

export default AdminTeams;
