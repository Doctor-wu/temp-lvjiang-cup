import React from 'react';
import type { PlayerStat, PositionType } from '@/types/matchData';
import PlayerStatsRow from './PlayerStatsRow';
import PlayerStatsHeader from './PlayerStatsHeader';

interface PlayerStatsListProps {
  bluePlayers: PlayerStat[];
  redPlayers: PlayerStat[];
  expandedPosition: string | null;
  onToggle: (position: string) => void;
}

const POSITION_ORDER: PositionType[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const PlayerStatsList: React.FC<PlayerStatsListProps> = ({
  bluePlayers,
  redPlayers,
  expandedPosition,
  onToggle,
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

          return (
            <PlayerStatsRow
              key={position}
              bluePlayer={bluePlayer}
              redPlayer={redPlayer}
              isExpanded={expandedPosition === position}
              onToggle={() => handleToggle(position)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PlayerStatsList;
