import React from 'react';
import type { PlayerStat, PositionType, TeamGameData } from '@/types/matchData';
import PlayerStatsRow from './PlayerStatsRow';
import PlayerStatsHeader from './PlayerStatsHeader';
import RadarChart from './RadarChart';

interface PlayerStatsListProps {
  bluePlayers: PlayerStat[];
  redPlayers: PlayerStat[];
  expandedPosition: string | null;
  onToggle: (position: string) => void;
  gameDuration: string;
  redTeamStats: TeamGameData;
  blueTeamStats: TeamGameData;
}

const POSITION_ORDER: PositionType[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const PlayerStatsList: React.FC<PlayerStatsListProps> = ({
  bluePlayers,
  redPlayers,
  expandedPosition,
  onToggle,
  gameDuration,
  redTeamStats,
  blueTeamStats,
}) => {
  const getPlayerByPosition = (
    players: PlayerStat[],
    position: PositionType
  ): PlayerStat | undefined => {
    return players.find(p => p.position === position);
  };

  const handleToggle = (position: string) => {
    onToggle(position);
  };

  return (
    <div className="max-w-5xl mx-auto mt-4">
      {/* 表头 */}
      <PlayerStatsHeader />

      {/* 选手数据行 */}
      <div className="rounded-b-lg overflow-hidden bg-[#2d2d2d]">
        {POSITION_ORDER.map(position => {
          const bluePlayer = getPlayerByPosition(bluePlayers, position);
          const redPlayer = getPlayerByPosition(redPlayers, position);

          if (!bluePlayer || !redPlayer) return null;

          const isExpanded = expandedPosition === position;

          return (
            <React.Fragment key={position}>
              {/* 选手行 */}
              <PlayerStatsRow
                bluePlayer={bluePlayer}
                redPlayer={redPlayer}
                isExpanded={isExpanded}
                onToggle={() => handleToggle(position)}
              />

              {/* 雷达图（展开时显示在该行下方） */}
              {isExpanded && (
                <RadarChart
                  player1={bluePlayer}
                  player2={redPlayer}
                  gameDuration={gameDuration}
                  redTeamStats={redTeamStats}
                  blueTeamStats={blueTeamStats}
                  visible={true}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerStatsList;
