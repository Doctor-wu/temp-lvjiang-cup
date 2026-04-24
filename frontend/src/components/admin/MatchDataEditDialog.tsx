import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import Modal from '../ui/Modal';
import { updateMatchGameData } from '@/api/matchData';
import type { MatchGameData, PlayerStat } from '@/types/matchData';
import { toast } from 'sonner';
import { getPositionLabel } from '@/utils/position';
import { trackAdminEditOpen } from '@/utils/tracking';

interface MatchDataEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  matchId: string;
  gameId: number;
  gameData: MatchGameData;
}

interface EditableTeamStats {
  kills: number;
  gold: number;
  towers: number;
  dragons: number;
  barons: number;
  isWinner: boolean;
}

interface EditablePlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damageDealt: number;
  damageTaken: number;
  visionScore: number;
  wardsPlaced: number;
  level: number;
  firstBlood: boolean;
  mvp: boolean;
}

interface EditFormData {
  gameDuration: string;
  winnerTeamId: string | null;
  blueTeam: EditableTeamStats;
  redTeam: EditableTeamStats;
  playerStats: EditablePlayerStats[];
}

const MatchDataEditDialog: React.FC<MatchDataEditDialogProps> = ({
  open,
  onClose,
  onSuccess,
  matchId,
  gameId,
  gameData,
}) => {
  const [formData, setFormData] = useState<EditFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && gameData) {
      setFormData({
        gameDuration: gameData.gameDuration,
        winnerTeamId: gameData.winnerTeamId,
        blueTeam: {
          kills: gameData.blueTeam.kills,
          gold: gameData.blueTeam.gold,
          towers: gameData.blueTeam.towers,
          dragons: gameData.blueTeam.dragons,
          barons: gameData.blueTeam.barons,
          isWinner: gameData.blueTeam.isWinner,
        },
        redTeam: {
          kills: gameData.redTeam.kills,
          gold: gameData.redTeam.gold,
          towers: gameData.redTeam.towers,
          dragons: gameData.redTeam.dragons,
          barons: gameData.redTeam.barons,
          isWinner: gameData.redTeam.isWinner,
        },
        playerStats: (gameData?.playerStats ?? []).map(p => ({
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          cs: p.cs,
          gold: p.gold,
          damageDealt: p.damageDealt,
          damageTaken: p.damageTaken,
          visionScore: p.visionScore,
          wardsPlaced: p.wardsPlaced,
          level: p.level,
          firstBlood: p.firstBlood,
          mvp: p.mvp,
        })),
      });
      setHasChanges(false);
      setError(null);

      // 跟踪编辑对话框打开事件
      trackAdminEditOpen(matchId, gameData.gameNumber);
    }
  }, [open, gameData, matchId]);

  const updateTeamField = (
    side: 'blueTeam' | 'redTeam',
    field: keyof EditableTeamStats,
    value: number | boolean
  ) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [side]: {
        ...formData[side],
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  const updatePlayerField = (
    index: number,
    field: keyof EditablePlayerStats,
    value: number | boolean
  ) => {
    if (!formData) return;
    const newPlayerStats = [...formData.playerStats];
    newPlayerStats[index] = {
      ...newPlayerStats[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      playerStats: newPlayerStats,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!formData) return;

    setSaving(true);
    setError(null);

    try {
      await updateMatchGameData(matchId, gameId, {
        gameDuration: formData.gameDuration,
        winnerTeamId: formData.winnerTeamId,
        blueTeam: formData.blueTeam,
        redTeam: formData.redTeam,
        playerStats: formData.playerStats.map((p, index) => ({
          ...p,
          playerId: gameData?.playerStats?.[index]?.playerId ?? '',
        })),
      });

      toast.success('比赛数据已更新');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试');
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (!confirm('您有未保存的更改，确定要离开吗？')) {
        return;
      }
    }
    onClose();
  };

  if (!formData) return null;

  const renderTeamSection = (
    side: 'blueTeam' | 'redTeam',
    team: MatchGameData['blueTeam'] | MatchGameData['redTeam']
  ) => {
    const stats = formData[side];
    const isBlue = side === 'blueTeam';

    return (
      <div
        className={`p-4 rounded-lg border ${
          isBlue ? 'bg-blue-500/5 border-blue-500/20' : 'bg-red-500/5 border-red-500/20'
        }`}
      >
        <h4 className={`text-sm font-medium mb-3 ${isBlue ? 'text-blue-400' : 'text-red-400'}`}>
          {isBlue ? '蓝色方' : '红色方'} - {team.teamName}
        </h4>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`${side}-kills`}>
              击杀
            </label>
            <input
              id={`${side}-kills`}
              type="number"
              min="0"
              value={stats.kills}
              onChange={e => updateTeamField(side, 'kills', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              aria-label="击杀"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`${side}-gold`}>
              总经济
            </label>
            <input
              id={`${side}-gold`}
              type="number"
              min="0"
              value={stats.gold}
              onChange={e => updateTeamField(side, 'gold', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`${side}-towers`}>
              推塔数
            </label>
            <input
              id={`${side}-towers`}
              type="number"
              min="0"
              value={stats.towers}
              onChange={e => updateTeamField(side, 'towers', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`${side}-dragons`}>
              控龙数
            </label>
            <input
              id={`${side}-dragons`}
              type="number"
              min="0"
              value={stats.dragons}
              onChange={e => updateTeamField(side, 'dragons', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`${side}-barons`}>
              Baron 数
            </label>
            <input
              id={`${side}-barons`}
              type="number"
              min="0"
              value={stats.barons}
              onChange={e => updateTeamField(side, 'barons', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stats.isWinner}
                onChange={e => updateTeamField(side, 'isWinner', e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">获胜方</span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderPlayerSection = (player: PlayerStat, index: number) => {
    const stats = formData.playerStats[index];

    return (
      <div key={player.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="px-2 py-0.5 bg-blue-600/30 text-blue-400 text-xs rounded font-medium">
            {getPositionLabel(player.position)}
          </div>
          <span className="text-white font-medium">{player.playerName}</span>
          <span className="text-gray-400 text-sm">({player.championName})</span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`player-${index}-kills`}>
              击杀
            </label>
            <input
              id={`player-${index}-kills`}
              type="number"
              min="0"
              value={stats.kills}
              onChange={e => updatePlayerField(index, 'kills', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              aria-label="击杀"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`player-${index}-deaths`}>
              死亡
            </label>
            <input
              id={`player-${index}-deaths`}
              type="number"
              min="0"
              value={stats.deaths}
              onChange={e => updatePlayerField(index, 'deaths', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`player-${index}-assists`}>
              助攻
            </label>
            <input
              id={`player-${index}-assists`}
              type="number"
              min="0"
              value={stats.assists}
              onChange={e => updatePlayerField(index, 'assists', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`player-${index}-cs`}>
              补刀数
            </label>
            <input
              id={`player-${index}-cs`}
              type="number"
              min="0"
              value={stats.cs}
              onChange={e => updatePlayerField(index, 'cs', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`player-${index}-gold`}>
              总经济
            </label>
            <input
              id={`player-${index}-gold`}
              type="number"
              min="0"
              value={stats.gold}
              onChange={e => updatePlayerField(index, 'gold', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label
              className="block text-xs text-gray-400 mb-1"
              htmlFor={`player-${index}-damageDealt`}
            >
              造成伤害
            </label>
            <input
              id={`player-${index}-damageDealt`}
              type="number"
              min="0"
              value={stats.damageDealt}
              onChange={e => updatePlayerField(index, 'damageDealt', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label
              className="block text-xs text-gray-400 mb-1"
              htmlFor={`player-${index}-damageTaken`}
            >
              承受伤害
            </label>
            <input
              id={`player-${index}-damageTaken`}
              type="number"
              min="0"
              value={stats.damageTaken}
              onChange={e => updatePlayerField(index, 'damageTaken', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label
              className="block text-xs text-gray-400 mb-1"
              htmlFor={`player-${index}-visionScore`}
            >
              视野得分
            </label>
            <input
              id={`player-${index}-visionScore`}
              type="number"
              min="0"
              value={stats.visionScore}
              onChange={e => updatePlayerField(index, 'visionScore', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label
              className="block text-xs text-gray-400 mb-1"
              htmlFor={`player-${index}-wardsPlaced`}
            >
              插眼数
            </label>
            <input
              id={`player-${index}-wardsPlaced`}
              type="number"
              min="0"
              value={stats.wardsPlaced}
              onChange={e => updatePlayerField(index, 'wardsPlaced', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor={`player-${index}-level`}>
              等级
            </label>
            <input
              id={`player-${index}-level`}
              type="number"
              min="1"
              max="18"
              value={stats.level}
              onChange={e => updatePlayerField(index, 'level', Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stats.firstBlood}
                onChange={e => updatePlayerField(index, 'firstBlood', e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-300">一血</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stats.mvp}
                onChange={e => updatePlayerField(index, 'mvp', e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-xs text-gray-300">MVP</span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      visible={open}
      onClose={handleClose}
      title={`编辑比赛数据 - 第 ${gameData.gameNumber} 局`}
      className="max-w-4xl max-h-[90vh]"
    >
      <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {/* Game Info */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-sm font-medium text-gray-300 mb-3">比赛信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1" htmlFor="game-duration">
                游戏时长 (MM:SS)
              </label>
              <input
                id="game-duration"
                type="text"
                value={formData.gameDuration}
                onChange={e => {
                  setFormData({ ...formData, gameDuration: e.target.value });
                  setHasChanges(true);
                }}
                placeholder="32:45"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                aria-label="游戏时长"
              />
            </div>
          </div>
        </div>

        {/* Team Stats */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">战队数据</h4>
          <div className="space-y-3">
            {renderTeamSection('blueTeam', gameData.blueTeam)}
            {renderTeamSection('redTeam', gameData.redTeam)}
          </div>
        </div>

        {/* Player Stats */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">选手数据</h4>
          <div className="space-y-3">
            {gameData.playerStats.map((player, index) => renderPlayerSection(player, index))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Unsaved Changes Warning Banner */}
      {hasChanges && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          您有未保存的更改，请记得点击保存按钮
        </div>
      )}

      {/* Footer Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-4">
        <Button variant="ghost" onClick={handleClose} disabled={saving}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存修改
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
};

export default MatchDataEditDialog;
