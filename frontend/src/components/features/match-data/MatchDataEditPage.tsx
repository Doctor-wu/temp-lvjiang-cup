import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Edit3, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import MatchDataHeader from './MatchDataHeader';
import MatchInfoCard from './MatchInfoCard';
import GameSwitcher from './GameSwitcher';
import TeamStatsBar from './TeamStatsBar';
import TeamStatsBarEdit from './TeamStatsBarEdit';
import PlayerStatsList from './PlayerStatsList';
import PlayerStatsRowEdit from './PlayerStatsRowEdit';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getMatchSeries, getMatchGameData, updateMatchGameData } from '@/api/matchData';
import type { MatchSeriesInfo, MatchGameData, PlayerStat, PositionType } from '@/types/matchData';
import { ADMIN_PREFIX, adminPath } from '@/constants/routes';
import { useMatchDataStore } from '@/store/matchDataStore';
import { trackAdminEditOpen, trackAdminEditSave } from '@/utils/tracking';
import MatchDataSkeleton from './MatchDataSkeleton';

const POSITION_ORDER: PositionType[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const MatchDataEditPage: React.FC = () => {
  const { id: matchId, gameNumber: routeGameNumber } = useParams<{
    id: string;
    gameNumber: string;
  }>();
  const navigate = useNavigate();

  const [seriesInfo, setSeriesInfo] = useState<MatchSeriesInfo | null>(null);
  const [gameData, setGameData] = useState<MatchGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const preloadAdjacentGame = useMatchDataStore(state => state.preloadAdjacentGame);
  const currentGameRef = useRef(1);

  const [modifiedTeamFields, setModifiedTeamFields] = useState<Set<string>>(new Set());
  const [modifiedPlayerFields, setModifiedPlayerFields] = useState<Set<string>>(new Set());
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);

  useEffect(() => {
    if (routeGameNumber) {
      const gameNum = parseInt(routeGameNumber, 10);
      if (!isNaN(gameNum)) {
        currentGameRef.current = gameNum;
        setIsEditMode(true);
      }
    }
  }, [routeGameNumber]);

  const loadSeriesInfo = useCallback(
    async (mId: string) => {
      try {
        const series = await getMatchSeries(mId);
        setSeriesInfo(series);

        const validGameNumbers = series.games.map(g => g.gameNumber);
        const firstValidGame = validGameNumbers[0];
        if (firstValidGame) {
          currentGameRef.current = firstValidGame;
        }

        const maxGames = Math.max(...validGameNumbers);
        preloadAdjacentGame(mId, currentGameRef.current, maxGames);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取系列赛信息失败');
      }
    },
    [preloadAdjacentGame]
  );

  const loadGameData = useCallback(async (mId: string, gameNum: number) => {
    try {
      const data = await getMatchGameData(mId, gameNum);
      setGameData(data);
      currentGameRef.current = gameNum;
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取游戏数据失败');
    }
  }, []);

  useEffect(() => {
    if (!matchId) {
      setError('缺少比赛ID');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await loadSeriesInfo(matchId);
        await loadGameData(matchId, currentGameRef.current);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [matchId, loadSeriesInfo, loadGameData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (modifiedTeamFields.size > 0 || modifiedPlayerFields.size > 0) {
        e.preventDefault();
        e.returnValue = '有未保存的修改，是否放弃？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [modifiedTeamFields, modifiedPlayerFields]);

  const handleGameChange = useCallback(
    async (gameNumber: number) => {
      if (modifiedTeamFields.size > 0 || modifiedPlayerFields.size > 0) {
        setShowUnsavedConfirm(true);
        setPendingNavigation(() => async () => {
          await loadGameData(matchId!, gameNumber);
        });
        return;
      }
      await loadGameData(matchId!, gameNumber);
    },
    [modifiedTeamFields, modifiedPlayerFields, loadGameData, matchId]
  );

  const handleBack = useCallback(() => {
    const navigateBack = () => {
      if (window.location.pathname.includes(`/${ADMIN_PREFIX}/`)) {
        navigate(adminPath('matches'));
      } else {
        navigate(-1);
      }
    };

    if (modifiedTeamFields.size > 0 || modifiedPlayerFields.size > 0) {
      setShowUnsavedConfirm(true);
      setPendingNavigation(() => navigateBack);
      return;
    }
    navigateBack();
  }, [modifiedTeamFields, modifiedPlayerFields, navigate]);

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setModifiedTeamFields(new Set());
    setModifiedPlayerFields(new Set());
    if (matchId) {
      trackAdminEditOpen(matchId, currentGameRef.current);
    }
  };

  const handleCancelEdit = () => {
    if (modifiedTeamFields.size > 0 || modifiedPlayerFields.size > 0) {
      setShowUnsavedConfirm(true);
      setPendingNavigation(() => () => {
        setIsEditMode(false);
        setModifiedTeamFields(new Set());
        setModifiedPlayerFields(new Set());
      });
    } else {
      setIsEditMode(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!gameData || !matchId) return;

    try {
      const updatedData = {
        winnerTeamId: gameData.winnerTeamId,
        gameDuration: gameData.gameDuration,
        gameStartTime: gameData.gameStartTime,
        blueTeam: {
          teamId: gameData.blueTeam.teamId,
          side: gameData.blueTeam.side,
          kills: gameData.blueTeam.kills,
          gold: gameData.blueTeam.gold,
          towers: gameData.blueTeam.towers,
          dragons: gameData.blueTeam.dragons,
          barons: gameData.blueTeam.barons,
        },
        redTeam: {
          teamId: gameData.redTeam.teamId,
          side: gameData.redTeam.side,
          kills: gameData.redTeam.kills,
          gold: gameData.redTeam.gold,
          towers: gameData.redTeam.towers,
          dragons: gameData.redTeam.dragons,
          barons: gameData.redTeam.barons,
        },
        playerStats: gameData.playerStats.map(p => ({
          playerId: p.playerId,
          teamId: p.teamId,
          position: p.position,
          championName: p.championName,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          cs: p.cs,
          gold: p.gold,
          damageDealt: p.damageDealt,
          damageTaken: p.damageTaken,
          level: p.level,
          visionScore: p.visionScore,
          firstBlood: p.firstBlood,
          mvp: p.mvp,
        })),
      };

      await updateMatchGameData(matchId, gameData.gameNumber, updatedData);
      toast.success('保存成功');
      setIsEditMode(false);
      setModifiedTeamFields(new Set());
      setModifiedPlayerFields(new Set());
      trackAdminEditSave(matchId, gameData.gameNumber);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleConfirmUnsaved = () => {
    setShowUnsavedConfirm(false);
    setModifiedTeamFields(new Set());
    setModifiedPlayerFields(new Set());
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleCancelUnsaved = () => {
    setShowUnsavedConfirm(false);
    setPendingNavigation(null);
  };

  const getPlayersBySide = useCallback(
    (playerStats: PlayerStat[], side: 'blue' | 'red') => {
      return playerStats.filter(p => {
        if (side === 'blue') {
          return p.teamId === gameData?.blueTeam.teamId;
        } else {
          return p.teamId === gameData?.redTeam.teamId;
        }
      });
    },
    [gameData]
  );

  const handleTogglePosition = useCallback((position: string) => {
    setExpandedPosition(prev => (prev === position ? null : position));
  }, []);

  const handleTeamFieldChange = useCallback(
    (team: 'blue' | 'red', field: string, value: number) => {
      const newFields = new Set(modifiedTeamFields);
      const fieldKey = `${team}.${field}`;
      if (newFields.has(fieldKey)) {
        newFields.delete(fieldKey);
      } else {
        newFields.add(fieldKey);
      }
      setModifiedTeamFields(newFields);

      setGameData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [team === 'blue' ? 'blueTeam' : 'redTeam']: {
            ...prev[team === 'blue' ? 'blueTeam' : 'redTeam'],
            [field]: value,
          },
        };
      });
    },
    [modifiedTeamFields]
  );

  const handlePlayerFieldChange = useCallback(
    (playerId: string, field: string, value: number | string) => {
      const newFields = new Set(modifiedPlayerFields);
      const fieldKey = `${playerId}.${field}`;
      if (newFields.has(fieldKey)) {
        newFields.delete(fieldKey);
      } else {
        newFields.add(fieldKey);
      }
      setModifiedPlayerFields(newFields);

      setGameData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          playerStats: prev.playerStats.map(p =>
            p.playerId === playerId ? { ...p, [field]: value } : p
          ),
        };
      });
    },
    [modifiedPlayerFields]
  );

  const renderContent = () => {
    if (!gameData) return null;

    const bluePlayers = getPlayersBySide(gameData.playerStats, 'blue');
    const redPlayers = getPlayersBySide(gameData.playerStats, 'red');

    const sortedBluePlayers = POSITION_ORDER.map(pos =>
      bluePlayers.find(p => p.position === pos)
    ).filter((p): p is PlayerStat => p !== undefined);

    const sortedRedPlayers = POSITION_ORDER.map(pos =>
      redPlayers.find(p => p.position === pos)
    ).filter((p): p is PlayerStat => p !== undefined);

    return (
      <>
        <MatchInfoCard gameData={gameData} />

        <GameSwitcher
          games={seriesInfo?.games || []}
          currentGame={currentGameRef.current}
          onChange={handleGameChange}
          format={seriesInfo?.format}
        />

        {isEditMode ? (
          <TeamStatsBarEdit
            blueTeam={gameData.blueTeam}
            redTeam={gameData.redTeam}
            modifiedFields={modifiedTeamFields}
            onFieldChange={handleTeamFieldChange}
          />
        ) : (
          <TeamStatsBar blueTeam={gameData.blueTeam} redTeam={gameData.redTeam} />
        )}

        <div className="max-w-5xl mx-auto mt-4">
          {isEditMode ? (
            sortedBluePlayers.map((bluePlayer, index) => {
              const redPlayer = sortedRedPlayers[index];
              if (!redPlayer) return null;
              return (
                <PlayerStatsRowEdit
                  key={bluePlayer.playerId}
                  bluePlayer={bluePlayer}
                  redPlayer={redPlayer}
                  isExpanded={expandedPosition === bluePlayer.position}
                  onToggle={() => handleTogglePosition(bluePlayer.position)}
                  modifiedFields={modifiedPlayerFields}
                  onFieldChange={handlePlayerFieldChange}
                />
              );
            })
          ) : (
            <PlayerStatsList
              bluePlayers={sortedBluePlayers}
              redPlayers={sortedRedPlayers}
              expandedPosition={expandedPosition}
              onToggle={handleTogglePosition}
              gameDuration={gameData.gameDuration}
              redTeamStats={gameData.redTeam}
              blueTeamStats={gameData.blueTeam}
            />
          )}
        </div>
      </>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white">
        <MatchDataHeader onBack={handleBack} />
        <div className="flex flex-col items-center justify-center mt-8">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (loading && !seriesInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white">
        <MatchDataHeader onBack={handleBack} />
        <div className="container mx-auto px-4 py-6">
          <MatchDataSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white">
      <MatchDataHeader
        onBack={handleBack}
        subtitle={
          seriesInfo
            ? `${seriesInfo.teamA.name} vs ${seriesInfo.teamB.name} - ${seriesInfo.format}`
            : undefined
        }
        action={
          isEditMode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-[#1E3A8A] bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg hover:shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          ) : (
            <button
              onClick={handleEnterEditMode}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              编辑
            </button>
          )
        }
      />

      <div className="container mx-auto px-4 py-6">
        {renderContent()}

        {loading && (
          <div className="flex justify-center my-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#c49f58]" />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showUnsavedConfirm}
        title="有未保存的修改"
        description="有未保存的修改，是否放弃？"
        onConfirm={handleConfirmUnsaved}
        onCancel={handleCancelUnsaved}
        confirmText="放弃"
        cancelText="继续编辑"
      />
    </div>
  );
};

export default MatchDataEditPage;
