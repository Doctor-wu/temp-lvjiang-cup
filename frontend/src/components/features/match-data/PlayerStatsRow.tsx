import React from 'react';
import type { PlayerStat, PositionType } from '@/types/matchData';
import {
  TopIcon,
  JungleIcon,
  MidIcon,
  AdcIcon,
  SupportIcon,
} from '@/components/icons/PositionIcons';
import { getChampionIconUrl } from '@/utils/championUtils';

const PositionIcon: React.FC<{ position: PositionType }> = ({ position }) => {
  switch (position) {
    case 'TOP':
      return <TopIcon />;
    case 'JUNGLE':
      return <JungleIcon />;
    case 'MID':
      return <MidIcon />;
    case 'ADC':
      return <AdcIcon />;
    case 'SUPPORT':
      return <SupportIcon />;
    default:
      return null;
  }
};

interface PlayerStatsRowProps {
  bluePlayer: PlayerStat;
  redPlayer: PlayerStat;
  isExpanded: boolean;
  onToggle: () => void;
}

const PlayerStatsRow: React.FC<PlayerStatsRowProps> = ({
  bluePlayer,
  redPlayer,
  isExpanded,
  onToggle,
}) => {
  const formatGold = (gold: number): string => {
    return `${(gold / 1000).toFixed(1)}k`;
  };

  const handleRowClick = () => {
    onToggle();
  };

  const getPlayerAvatar = (player: PlayerStat): string | null => {
    return null;
  };

  return (
    <div
      className="bg-[#2d2d2d] hover:bg-[#27252c]
                 py-5 px-4 cursor-pointer transition-all duration-200 border-b border-white/10"
      onClick={handleRowClick}
    >
      <div className="flex items-center justify-between">
        {/* 左侧：红色方 - 列宽与表头完全一致 */}
        <div className="flex items-center gap-2" style={{ width: 532 }}>
          {/* 选手头像和昵称 - 上下布局 */}
          <div className="flex flex-col items-center gap-1" style={{ width: 100 }}>
            <div className="w-16 h-16 rounded bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {getPlayerAvatar(redPlayer) ? (
                <img
                  src={getPlayerAvatar(redPlayer)!}
                  alt={redPlayer.playerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-gray-400">
                  {redPlayer.playerName.slice(0, 1)}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-white truncate" style={{ maxWidth: 100 }}>{redPlayer.playerName}</span>
          </div>

          {/* 英雄图标 - 调大到56px */}
          <div className="w-[100px] text-center">
            <div
              className="w-14 h-14 rounded border border-[#f44336]/50 bg-[#1a1a2e] flex items-center justify-center overflow-hidden mx-auto"
              title={redPlayer.championName}
            >
              <img
                src={getChampionIconUrl(redPlayer.championName)}
                alt={redPlayer.championName}
                className="w-full h-full object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-xs">{redPlayer.championName.charAt(0)}</span>
            </div>
          </div>

          {/* KDA */}
          <div className="w-[100px] text-center">
            <span className="text-base text-[#f44336] font-mono font-bold">{redPlayer.kda}</span>
          </div>

          {/* 金币 */}
          <div className="w-[60px] text-center">
            <span className="text-base text-[#c49f58] font-mono">{formatGold(redPlayer.gold)}</span>
          </div>

          {/* 补刀 */}
          <div className="w-[50px] text-center">
            <span className="text-base text-gray-400 font-mono">{redPlayer.cs}</span>
          </div>
        </div>

        {/* 中间：位置图标 - 固定宽度64px */}
        <div className="flex items-center justify-center" style={{ width: 64 }}>
          <div className="flex items-center justify-center">
            <PositionIcon position={redPlayer.position} />
          </div>
        </div>

        {/* 右侧：蓝色方 - 列宽与表头完全一致 */}
        <div className="flex items-center gap-2 justify-end" style={{ width: 532 }}>
          {/* 补刀 */}
          <div className="w-[50px] text-center">
            <span className="text-base text-gray-400 font-mono">{bluePlayer.cs}</span>
          </div>

          {/* 金币 */}
          <div className="w-[60px] text-center">
            <span className="text-base text-[#c49f58] font-mono">{formatGold(bluePlayer.gold)}</span>
          </div>

          {/* KDA */}
          <div className="w-[100px] text-center">
            <span className="text-base text-[#00bcd4] font-mono font-bold">{bluePlayer.kda}</span>
          </div>

          {/* 英雄图标 - 调大到56px */}
          <div className="w-[100px] text-center">
            <div
              className="w-14 h-14 rounded border border-[#00bcd4]/50 bg-[#1a1a2e] flex items-center justify-center overflow-hidden mx-auto"
              title={bluePlayer.championName}
            >
              <img
                src={getChampionIconUrl(bluePlayer.championName)}
                alt={bluePlayer.championName}
                className="w-full h-full object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-xs">{bluePlayer.championName.charAt(0)}</span>
            </div>
          </div>

          {/* 选手头像和昵称 - 上下布局 */}
          <div className="flex flex-col items-center gap-1" style={{ width: 100 }}>
            <div className="w-16 h-16 rounded bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {getPlayerAvatar(bluePlayer) ? (
                <img
                  src={getPlayerAvatar(bluePlayer)!}
                  alt={bluePlayer.playerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-gray-400">
                  {bluePlayer.playerName.slice(0, 1)}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-white truncate" style={{ maxWidth: 100 }}>{bluePlayer.playerName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsRow;
