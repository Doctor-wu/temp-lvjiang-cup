import React from 'react';
import type { TeamGameData, BanData } from '@/types/matchData';
import { getChampionIconByEn } from '@/utils/championUtils';
import { Swords, Coins, Castle, Crown, Flame, Droplets } from 'lucide-react';

interface TeamStatsBarProps {
  blueTeam: TeamGameData;
  redTeam: TeamGameData;
  bans?: BanData;
  gameDuration?: string;
  firstBloodTeam?: 'blue' | 'red' | null;
}

/**
 * 胜利标识组件
 */
const VictoryIcon: React.FC = () => (
  <img
    src="https://game.gtimg.cn/images/lpl/es/web201612/victory_ico.png"
    alt="胜利"
    className="w-10 h-10 object-contain"
  />
);

/**
 * 一血标识组件
 */
const FirstBloodIcon: React.FC = () => (
  <div className="flex items-center gap-1 text-red-500">
    <Droplets className="w-4 h-4 fill-red-500" />
    <span className="text-xs font-bold">一血</span>
  </div>
);

/**
 * 格式化金币显示
 * @param gold 金币数量
 * @returns 格式化后的字符串 (如 "69.7k")
 */
const formatGold = (gold: number): string => {
  return `${(gold / 1000).toFixed(1)}k`;
};

/**
 * 队伍Logo组件
 */
const TeamLogo: React.FC<{ logoUrl?: string; teamName: string; size?: number }> = ({
  logoUrl,
  teamName,
  size = 40,
}) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={teamName}
        className="rounded object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded bg-gray-700 flex items-center justify-center text-gray-400 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {teamName.slice(0, 2)}
    </div>
  );
};

/**
 * BAN展示组件
 */
const BanDisplay: React.FC<{ bans: string[]; side: 'red' | 'blue' }> = ({ bans, side }) => {
  const borderColor = side === 'red' ? 'border-[#f44336]/30' : 'border-[#00bcd4]/30';

  return (
    <div className="flex gap-1">
      {bans.map((championId, index) => (
        <div
          key={`${side}-${index}`}
          className={`w-9 h-9 rounded border ${borderColor} bg-gray-800 overflow-hidden opacity-80 grayscale hover:grayscale-0 transition-all duration-200`}
          title={`BAN: ${championId}`}
        >
          <img
            src={getChampionIconByEn(championId)}
            alt={championId}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ))}
      {/* 补齐空位到5个 */}
      {Array.from({ length: 5 - bans.length }).map((_, index) => (
        <div
          key={`${side}-empty-${index}`}
          className={`w-9 h-9 rounded border ${borderColor} bg-gray-800/30 opacity-30`}
        />
      ))}
    </div>
  );
};

/**
 * 数据统计项组件
 */
const StatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  redValue: number | string;
  blueValue: number | string;
  redColor?: string;
  blueColor?: string;
}> = ({ icon, label, redValue, blueValue, redColor = 'text-[#f44336]', blueColor = 'text-[#00bcd4]' }) => (
  <div className="flex flex-col items-center gap-1 min-w-[80px]">
    <div className="flex items-center gap-1 text-gray-400 text-xs">
      {icon}
      <span>{label}</span>
    </div>
    <div className="flex items-center justify-center gap-4 w-full">
      <span className={`text-base font-bold ${redColor} font-mono`}>{redValue}</span>
      <span className={`text-base font-bold ${blueColor} font-mono`}>{blueValue}</span>
    </div>
  </div>
);

/**
 * 队伍数据统计栏组件
 * 展示双方队伍的对局数据对比：队标队名、击杀、经济、推塔、龙、男爵、BAN位
 */
const TeamStatsBar: React.FC<TeamStatsBarProps> = ({
  blueTeam,
  redTeam,
  bans,
  gameDuration,
  firstBloodTeam,
}) => {
  return (
    <div className="bg-[#2d2d2d] rounded-b-xl rounded-t-none p-6 max-w-5xl mx-auto">
      {/* 顶部：队标队名 + 击杀对比 */}
      <div className="flex items-center justify-between mb-6">
        {/* 左侧：红色方队标队名 */}
        <div className="flex items-center gap-3">
          <TeamLogo logoUrl={redTeam.logoUrl} teamName={redTeam.teamName} size={48} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{redTeam.teamName}</span>
              {redTeam.isWinner && <VictoryIcon />}
            </div>
            {firstBloodTeam === 'red' && <FirstBloodIcon />}
          </div>
        </div>

        {/* 中间：击杀数对比 */}
        <div className="flex items-center gap-4">
          <span className="text-5xl font-bold text-[#f44336] font-mono neon-glow-red">
            {redTeam.kills}
          </span>
          <Swords className="w-8 h-8 text-gray-500" strokeWidth={1.5} />
          <span className="text-5xl font-bold text-[#00bcd4] font-mono neon-glow-blue">
            {blueTeam.kills}
          </span>
        </div>

        {/* 右侧：蓝色方队标队名 */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              {blueTeam.isWinner && <VictoryIcon />}
              <span className="text-2xl font-bold text-white">{blueTeam.teamName}</span>
            </div>
            {firstBloodTeam === 'blue' && <FirstBloodIcon />}
          </div>
          <TeamLogo logoUrl={blueTeam.logoUrl} teamName={blueTeam.teamName} size={48} />
        </div>
      </div>

      {/* 中间：数据指标平铺展示 */}
      <div className="flex items-center justify-center gap-8 py-4 border-t border-b border-white/10 mb-6">
        <StatItem
          icon={<Crown className="w-4 h-4" />}
          label="大龙数"
          redValue={redTeam.barons}
          blueValue={blueTeam.barons}
        />
        <StatItem
          icon={<Flame className="w-4 h-4" />}
          label="小龙数"
          redValue={redTeam.dragons}
          blueValue={blueTeam.dragons}
        />
        <StatItem
          icon={<Castle className="w-4 h-4" />}
          label="防御塔"
          redValue={redTeam.towers}
          blueValue={blueTeam.towers}
        />
        <StatItem
          icon={<Coins className="w-4 h-4" />}
          label="金币数"
          redValue={formatGold(redTeam.gold)}
          blueValue={formatGold(blueTeam.gold)}
        />
      </div>

      {/* 底部：BAN位展示 */}
      {bans && (bans.red.length > 0 || bans.blue.length > 0) && (
        <div className="flex items-center justify-between">
          <BanDisplay bans={bans.red} side="red" />
          <span className="text-sm text-gray-400 font-bold tracking-wider">BAN</span>
          <BanDisplay bans={bans.blue} side="blue" />
        </div>
      )}
    </div>
  );
};

export default TeamStatsBar;
