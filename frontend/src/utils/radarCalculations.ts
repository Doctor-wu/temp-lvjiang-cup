import type { PlayerStat, TeamGameData, PositionType, RadarDimension } from '@/types/matchData';

/**
 * 解析游戏时长字符串 "MM:SS" 为分钟数
 */
export function parseGameDuration(duration: string): number {
  if (!duration || typeof duration !== 'string') return 0;

  const parts = duration.split(':');
  if (parts.length !== 2) return 0;

  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);

  if (isNaN(minutes) || isNaN(seconds)) return 0;

  return minutes + seconds / 60;
}

/**
 * 归一化雷达图数值到 0-1 范围
 */
export function normalizeRadarValue(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return Math.max(0, Math.min(1, value / maxValue));
}

/**
 * 根据位置获取雷达图维度配置
 */
export function getRadarDimensionConfig(position: PositionType): RadarDimension[] {
  switch (position) {
    case 'TOP':
      return [
        { label: '分均补刀', key: 'csPerMin', max: 12 },
        { label: '伤害占比', key: 'damageShare', max: 40 },
        { label: '承伤占比', key: 'damageTakenShare', max: 40 },
        { label: '参团率', key: 'killParticipation', max: 80 },
        { label: '伤转', key: 'damagePerGold', max: 200 },
        { label: 'KDA', key: 'kda', max: 10 },
      ];
    case 'MID':
    case 'ADC':
      return [
        { label: '分均补刀', key: 'csPerMin', max: 12 },
        { label: '伤害占比', key: 'damageShare', max: 40 },
        { label: '分均经济', key: 'goldPerMin', max: 600 },
        { label: '分均伤害', key: 'damagePerMin', max: 1000 },
        { label: '伤转', key: 'damagePerGold', max: 200 },
        { label: 'KDA', key: 'kda', max: 10 },
      ];
    case 'JUNGLE':
      return [
        { label: '分均插眼', key: 'wardsPerMin', max: 2 },
        { label: '伤害占比', key: 'damageShare', max: 40 },
        { label: '承伤占比', key: 'damageTakenShare', max: 40 },
        { label: '参团率', key: 'killParticipation', max: 80 },
        { label: '伤转', key: 'damagePerGold', max: 200 },
        { label: 'KDA', key: 'kda', max: 10 },
      ];
    case 'SUPPORT':
      return [
        { label: '分均插眼', key: 'wardsPerMin', max: 2 },
        { label: '每死承伤', key: 'damageTakenPerDeath', max: 20000 },
        { label: '承伤占比', key: 'damageTakenShare', max: 40 },
        { label: '参团率', key: 'killParticipation', max: 80 },
        { label: '场均助攻', key: 'assists', max: 20 },
        { label: 'KDA', key: 'kda', max: 10 },
      ];
    default:
      // 默认使用 TOP 配置
      return getRadarDimensionConfig('TOP');
  }
}

/**
 * 计算玩家的所有基础指标
 */
function calculateBaseMetrics(
  player: PlayerStat,
  teamStats: TeamGameData,
  gameDurationMinutes: number
) {
  // 基础计算
  const csPerMin = gameDurationMinutes > 0 ? player.cs / gameDurationMinutes : 0;

  // 使用精确的团队总伤害计算伤害占比
  const damageShare =
    teamStats.totalDamage && teamStats.totalDamage > 0
      ? (player.damageDealt / teamStats.totalDamage) * 100
      : 0;

  // 使用精确的团队总承伤计算承伤占比
  const damageTakenShare =
    teamStats.totalDamageTaken && teamStats.totalDamageTaken > 0
      ? (player.damageTaken / teamStats.totalDamageTaken) * 100
      : 0;

  const killParticipation =
    teamStats.kills > 0 ? ((player.kills + player.assists) / teamStats.kills) * 100 : 0;
  const damagePerGold = player.gold > 0 ? (player.damageDealt / player.gold) * 100 : 0;
  const kda =
    player.deaths === 0
      ? player.kills + player.assists
      : (player.kills + player.assists) / player.deaths;
  const goldPerMin = gameDurationMinutes > 0 ? player.gold / gameDurationMinutes : 0;
  const damagePerMin = gameDurationMinutes > 0 ? player.damageDealt / gameDurationMinutes : 0;
  const wardsPerMin = gameDurationMinutes > 0 ? player.wardsPlaced / gameDurationMinutes : 0;
  const damageTakenPerDeath =
    player.deaths === 0 ? player.damageTaken : player.damageTaken / player.deaths;

  return {
    csPerMin,
    damageShare,
    damageTakenShare,
    killParticipation,
    damagePerGold,
    kda,
    goldPerMin,
    damagePerMin,
    wardsPerMin,
    damageTakenPerDeath,
    assists: player.assists,
  };
}

/**
 * 计算雷达图的所有维度值（返回 6 个数值）
 */
export function calculateRadarDimension(
  player: PlayerStat,
  position: PositionType,
  teamStats: TeamGameData,
  gameDuration: string
): number[] {
  const gameDurationMinutes = parseGameDuration(gameDuration);
  const metrics = calculateBaseMetrics(player, teamStats, gameDurationMinutes);
  const config = getRadarDimensionConfig(position);

  return config.map(dimension => {
    const value = metrics[dimension.key as keyof typeof metrics];
    return typeof value === 'number' ? value : 0;
  });
}

/**
 * 格式化维度数值显示
 */
export function formatDimensionValue(value: number, key: string): string {
  if (key === 'kda' || key === 'assists') {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}

/**
 * 获取维度单位
 */
export function getDimensionUnit(key: string): string {
  const unitMap: Record<string, string> = {
    csPerMin: '/min',
    damageShare: '%',
    damageTakenShare: '%',
    killParticipation: '%',
    damagePerGold: '%',
    goldPerMin: '/min',
    damagePerMin: '/min',
    wardsPerMin: '/min',
    damageTakenPerDeath: '',
    assists: '次',
    kda: '',
  };
  return unitMap[key] || '';
}
