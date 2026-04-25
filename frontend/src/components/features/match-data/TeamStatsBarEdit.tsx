import React from 'react';
import type { TeamGameData, BanData } from '@/types/matchData';
import { getChampionIconByEn } from '@/utils/championUtils';
import { Swords, Coins, Castle, Crown, Flame, Droplets } from 'lucide-react';

interface TeamStatsBarEditProps {
  blueTeam: TeamGameData;
  redTeam: TeamGameData;
  bans?: BanData;
  gameDuration?: string;
  firstBloodTeam?: 'blue' | 'red' | null;
  modifiedFields: Set<string>;
  onFieldChange: (team: 'blue' | 'red', field: string, value: number) => void;
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
const _formatGold = (gold: number): string => {
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
 * 可编辑数据统计项组件
 */
const EditableStatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  redValue: number;
  blueValue: number;
  field: string;
  modifiedFields: Set<string>;
  onFieldChange: (team: 'blue' | 'red', field: string, value: number) => void;
  redColor?: string;
  blueColor?: string;
  formatValue?: (value: number) => string;
}> = ({
  icon,
  label,
  redValue,
  blueValue,
  field,
  modifiedFields,
  onFieldChange,
  redColor = 'text-[#f44336]',
  blueColor = 'text-[#00bcd4]',
  formatValue: _formatValue,
}) => {
  const redFieldKey = `red.${field}`;
  const blueFieldKey = `blue.${field}`;
  const isRedModified = modifiedFields.has(redFieldKey);
  const isBlueModified = modifiedFields.has(blueFieldKey);

  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <div className="flex items-center gap-1 text-gray-400 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-center gap-2 w-full">
        <input
          type="number"
          value={redValue}
          onChange={e => onFieldChange('red', field, parseInt(e.target.value) || 0)}
          className={`w-16 px-1 py-0.5 text-center bg-[#1a1a2e] border-2 rounded text-base font-bold font-mono ${redColor} ${
            isRedModified ? 'border-[#c49f58] animate-pulse' : 'border-transparent'
          } focus:border-[#c49f58] focus:outline-none transition-colors`}
        />
        <span className="text-gray-500">:</span>
        <input
          type="number"
          value={blueValue}
          onChange={e => onFieldChange('blue', field, parseInt(e.target.value) || 0)}
          className={`w-16 px-1 py-0.5 text-center bg-[#1a1a2e] border-2 rounded text-base font-bold font-mono ${blueColor} ${
            isBlueModified ? 'border-[#c49f58] animate-pulse' : 'border-transparent'
          } focus:border-[#c49f58] focus:outline-none transition-colors`}
        />
      </div>
    </div>
  );
};

/**
 * 队伍数据统计栏编辑组件
 * 布局与 TeamStatsBar 保持一致，但数值使用输入框可编辑
 */
const TeamStatsBarEdit: React.FC<TeamStatsBarEditProps> = ({
  blueTeam,
  redTeam,
  bans,
  gameDuration: _gameDuration,
  firstBloodTeam,
  modifiedFields,
  onFieldChange,
}) => {
  const killsFieldKey = 'kills';
  const isRedKillsModified = modifiedFields.has(`red.${killsFieldKey}`);
  const isBlueKillsModified = modifiedFields.has(`blue.${killsFieldKey}`);

  return (
    <div className="bg-[#2d2d2d] rounded-b-xl rounded-t-none p-6 max-w-5xl mx-auto">
      {/* 顶部：队标队名 + 击杀对比 */}
      <div className="grid grid-cols-3 items-center mb-6">
        {/* 左侧：红色方队标队名 - 固定占比，居左 */}
        <div className="flex items-center gap-3 justify-start">
          <TeamLogo logoUrl={redTeam.logoUrl} teamName={redTeam.teamName} size={48} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{redTeam.teamName}</span>
              {redTeam.isWinner && <VictoryIcon />}
            </div>
            {firstBloodTeam === 'red' && <FirstBloodIcon />}
          </div>
        </div>

        {/* 中间：击杀数对比 - 固定居中，使用输入框 */}
        <div className="flex items-center justify-center gap-4">
          <input
            type="number"
            value={redTeam.kills}
            onChange={e => onFieldChange('red', 'kills', parseInt(e.target.value) || 0)}
            className={`w-20 px-2 py-1 text-center bg-[#1a1a2e] border-2 rounded text-4xl font-bold text-[#f44336] font-mono neon-glow-red ${
              isRedKillsModified ? 'border-[#c49f58] animate-pulse' : 'border-transparent'
            } focus:border-[#c49f58] focus:outline-none transition-colors`}
          />
          <Swords className="w-8 h-8 text-gray-500" strokeWidth={1.5} />
          <input
            type="number"
            value={blueTeam.kills}
            onChange={e => onFieldChange('blue', 'kills', parseInt(e.target.value) || 0)}
            className={`w-20 px-2 py-1 text-center bg-[#1a1a2e] border-2 rounded text-4xl font-bold text-[#00bcd4] font-mono neon-glow-blue ${
              isBlueKillsModified ? 'border-[#c49f58] animate-pulse' : 'border-transparent'
            } focus:border-[#c49f58] focus:outline-none transition-colors`}
          />
        </div>

        {/* 右侧：蓝色方队标队名 - 固定占比，居右 */}
        <div className="flex items-center gap-3 justify-end">
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

      {/* 中间：数据指标平铺展示 - 可编辑 */}
      <div className="flex items-center justify-center gap-8 py-4 border-t border-b border-white/10 mb-6">
        <EditableStatItem
          icon={<Crown className="w-4 h-4" />}
          label="大龙数"
          redValue={redTeam.barons}
          blueValue={blueTeam.barons}
          field="barons"
          modifiedFields={modifiedFields}
          onFieldChange={onFieldChange}
        />
        <EditableStatItem
          icon={<Flame className="w-4 h-4" />}
          label="小龙数"
          redValue={redTeam.dragons}
          blueValue={blueTeam.dragons}
          field="dragons"
          modifiedFields={modifiedFields}
          onFieldChange={onFieldChange}
        />
        <EditableStatItem
          icon={<Castle className="w-4 h-4" />}
          label="防御塔"
          redValue={redTeam.towers}
          blueValue={blueTeam.towers}
          field="towers"
          modifiedFields={modifiedFields}
          onFieldChange={onFieldChange}
        />
        <EditableStatItem
          icon={<Coins className="w-4 h-4" />}
          label="金币数"
          redValue={redTeam.gold}
          blueValue={blueTeam.gold}
          field="gold"
          modifiedFields={modifiedFields}
          onFieldChange={onFieldChange}
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

export default TeamStatsBarEdit;
