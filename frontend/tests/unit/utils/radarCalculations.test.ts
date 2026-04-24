import { describe, it, expect } from 'vitest';
import {
  parseGameDuration,
  normalizeRadarValue,
  calculateRadarDimension,
  getRadarDimensionConfig,
} from '@/utils/radarCalculations';
import type { PlayerStat, TeamGameData } from '@/types/matchData';

describe('雷达图计算工具函数', () => {
  const mockPlayer: PlayerStat = {
    id: 1,
    playerId: 'player-1',
    playerName: 'TestPlayer',
    teamId: 'team-1',
    teamName: 'TeamA',
    position: 'TOP',
    championName: 'Garen',
    kills: 5,
    deaths: 2,
    assists: 3,
    kda: '5/2/3',
    cs: 250,
    gold: 12000,
    damageDealt: 20000,
    damageTaken: 30000,
    visionScore: 20,
    wardsPlaced: 8,
    level: 16,
    firstBlood: false,
    mvp: false,
  };

  const mockTeamStats: TeamGameData = {
    teamId: 'team-1',
    teamName: 'TeamA',
    side: 'blue',
    kills: 15,
    gold: 55000,
    towers: 5,
    dragons: 2,
    barons: 1,
    isWinner: true,
  };

  describe('parseGameDuration', () => {
    it('应该正确解析标准格式的游戏时长', () => {
      expect(parseGameDuration('32:45')).toBeCloseTo(32.75, 2);
    });

    it('应该正确解析整分钟数', () => {
      expect(parseGameDuration('30:00')).toBe(30);
    });

    it('应该正确解析短时间游戏', () => {
      expect(parseGameDuration('05:30')).toBeCloseTo(5.5, 2);
    });

    it('应该处理空字符串返回 0', () => {
      expect(parseGameDuration('')).toBe(0);
    });

    it('应该处理无效格式返回 0', () => {
      expect(parseGameDuration('invalid')).toBe(0);
    });

    it('应该处理缺少秒数的格式', () => {
      expect(parseGameDuration('25')).toBe(0);
    });
  });

  describe('normalizeRadarValue', () => {
    it('应该正确归一化到 0-1 范围', () => {
      expect(normalizeRadarValue(50, 100)).toBe(0.5);
    });

    it('应该在值为 0 时返回 0', () => {
      expect(normalizeRadarValue(0, 100)).toBe(0);
    });

    it('应该在值等于最大值时返回 1', () => {
      expect(normalizeRadarValue(100, 100)).toBe(1);
    });

    it('应该在最大值为 0 时返回 0', () => {
      expect(normalizeRadarValue(50, 0)).toBe(0);
    });

    it('应该处理负数最大值', () => {
      expect(normalizeRadarValue(50, -10)).toBe(0);
    });
  });

  describe('getRadarDimensionConfig', () => {
    it('应该返回 TOP 位置的维度配置', () => {
      const config = getRadarDimensionConfig('TOP');
      expect(config).toHaveLength(6);
      expect(config[0].label).toBe('分均补刀');
      expect(config[1].label).toBe('伤害占比');
      expect(config[2].label).toBe('承伤占比');
      expect(config[3].label).toBe('参团率');
      expect(config[4].label).toBe('伤转');
      expect(config[5].label).toBe('KDA');
    });

    it('应该返回 MID 位置的维度配置', () => {
      const config = getRadarDimensionConfig('MID');
      expect(config).toHaveLength(6);
      expect(config[0].label).toBe('分均补刀');
      expect(config[1].label).toBe('伤害占比');
      expect(config[2].label).toBe('分均经济');
      expect(config[3].label).toBe('分均伤害');
      expect(config[4].label).toBe('伤转');
      expect(config[5].label).toBe('KDA');
    });

    it('应该返回 ADC 位置的维度配置', () => {
      const config = getRadarDimensionConfig('ADC');
      expect(config).toHaveLength(6);
      expect(config[2].label).toBe('分均经济');
    });

    it('应该返回 JUNGLE 位置的维度配置', () => {
      const config = getRadarDimensionConfig('JUNGLE');
      expect(config).toHaveLength(6);
      expect(config[0].label).toBe('分均插眼');
    });

    it('应该返回 SUPPORT 位置的维度配置', () => {
      const config = getRadarDimensionConfig('SUPPORT');
      expect(config).toHaveLength(6);
      expect(config[0].label).toBe('分均插眼');
      expect(config[4].label).toBe('场均助攻');
    });
  });

  describe('calculateRadarDimension', () => {
    describe('TOP 位置', () => {
      it('应该正确计算 TOP 位置的雷达维度', () => {
        const dimensions = calculateRadarDimension(mockPlayer, 'TOP', mockTeamStats, '32:45');

        expect(dimensions).toHaveLength(6);

        // 分均补刀 = cs / gameDurationMinutes = 250 / 32.75 ≈ 7.63
        expect(dimensions[0]).toBeCloseTo(7.63, 1);

        // 伤害占比 = damageDealt / teamTotalDamage * 100
        // 由于 teamStats 没有 totalDamage，应该基于已有数据计算
        expect(dimensions[1]).toBeGreaterThanOrEqual(0);

        // KDA = (kills + assists) / deaths = (5 + 3) / 2 = 4
        expect(dimensions[5]).toBeCloseTo(4, 1);
      });

      it('应该在死亡为 0 时正确计算 KDA', () => {
        const playerWithNoDeaths = { ...mockPlayer, deaths: 0, kda: '5/0/3' };
        const dimensions = calculateRadarDimension(
          playerWithNoDeaths,
          'TOP',
          mockTeamStats,
          '30:00'
        );

        // KDA = kills + assists = 5 + 3 = 8
        expect(dimensions[5]).toBeCloseTo(8, 1);
      });
    });

    describe('MID/ADC 位置', () => {
      it('应该正确计算 MID 位置的雷达维度', () => {
        const dimensions = calculateRadarDimension(mockPlayer, 'MID', mockTeamStats, '30:00');

        expect(dimensions).toHaveLength(6);

        // 分均经济 = gold / gameDurationMinutes = 12000 / 30 = 400
        expect(dimensions[2]).toBeCloseTo(400, 1);

        // 分均伤害 = damageDealt / gameDurationMinutes = 20000 / 30 ≈ 666.67
        expect(dimensions[3]).toBeCloseTo(666.67, 1);
      });

      it('应该正确计算 ADC 位置的雷达维度', () => {
        const dimensions = calculateRadarDimension(mockPlayer, 'ADC', mockTeamStats, '30:00');

        expect(dimensions).toHaveLength(6);
        expect(dimensions[2]).toBeCloseTo(400, 1);
      });
    });

    describe('JUNGLE 位置', () => {
      it('应该正确计算 JUNGLE 位置的雷达维度', () => {
        const dimensions = calculateRadarDimension(mockPlayer, 'JUNGLE', mockTeamStats, '30:00');

        expect(dimensions).toHaveLength(6);

        // 分均插眼 = wardsPlaced / gameDurationMinutes = 8 / 30 ≈ 0.267
        expect(dimensions[0]).toBeCloseTo(0.267, 2);

        // KDA = (5 + 3) / 2 = 4
        expect(dimensions[5]).toBeCloseTo(4, 1);
      });
    });

    describe('SUPPORT 位置', () => {
      it('应该正确计算 SUPPORT 位置的雷达维度', () => {
        const dimensions = calculateRadarDimension(mockPlayer, 'SUPPORT', mockTeamStats, '30:00');

        expect(dimensions).toHaveLength(6);

        // 分均插眼 = wardsPlaced / gameDurationMinutes = 8 / 30 ≈ 0.267
        expect(dimensions[0]).toBeCloseTo(0.267, 2);

        // 每死承伤 = damageTaken / deaths = 30000 / 2 = 15000
        expect(dimensions[1]).toBeCloseTo(15000, 1);

        // 场均助攻 = assists = 3
        expect(dimensions[4]).toBe(3);
      });

      it('应该在死亡为 0 时正确处理每死承伤', () => {
        const playerWithNoDeaths = { ...mockPlayer, deaths: 0 };
        const dimensions = calculateRadarDimension(
          playerWithNoDeaths,
          'SUPPORT',
          mockTeamStats,
          '30:00'
        );

        // 每死承伤 = damageTaken (当 deaths === 0)
        expect(dimensions[1]).toBe(30000);
      });
    });

    describe('边界情况', () => {
      it('应该处理游戏时长为 0 的情况', () => {
        const dimensions = calculateRadarDimension(mockPlayer, 'TOP', mockTeamStats, '00:00');

        // 游戏时长为 0 时，分均数据应该为 0
        expect(dimensions[0]).toBe(0);
      });

      it('应该处理无效游戏时长', () => {
        const dimensions = calculateRadarDimension(mockPlayer, 'TOP', mockTeamStats, 'invalid');

        expect(dimensions).toHaveLength(6);
      });
    });

    describe('damageShare 精确计算', () => {
      it('应使用团队总伤害精确计算伤害占比', () => {
        const teamWithDamage = {
          ...mockTeamStats,
          totalDamage: 115000,
          totalDamageTaken: 120000,
        };

        const dimensions = calculateRadarDimension(mockPlayer, 'TOP', teamWithDamage, '32:45');

        // 伤害占比 = 20000 / 115000 * 100 ≈ 17.39%
        expect(dimensions[1]).toBeCloseTo(17.39, 1);
      });

      it('团队总伤害为 0 时伤害占比应为 0', () => {
        const teamWithZeroDamage = {
          ...mockTeamStats,
          totalDamage: 0,
          totalDamageTaken: 0,
        };

        const dimensions = calculateRadarDimension(mockPlayer, 'TOP', teamWithZeroDamage, '30:00');

        expect(dimensions[1]).toBe(0);
      });

      it('团队总伤害未定义时使用 0', () => {
        const teamWithoutDamage = {
          teamId: 'team-1',
          teamName: 'TeamA',
          side: 'blue' as const,
          kills: 15,
          gold: 55000,
          towers: 5,
          dragons: 2,
          barons: 1,
          isWinner: true,
        };

        const dimensions = calculateRadarDimension(mockPlayer, 'TOP', teamWithoutDamage, '30:00');

        expect(dimensions[1]).toBe(0);
      });
    });

    describe('damageTakenShare 精确计算', () => {
      it('应使用团队总承伤精确计算承伤占比', () => {
        const teamWithDamage = {
          ...mockTeamStats,
          totalDamage: 115000,
          totalDamageTaken: 120000,
        };

        const dimensions = calculateRadarDimension(mockPlayer, 'TOP', teamWithDamage, '32:45');

        // 承伤占比 = 30000 / 120000 * 100 = 25%
        expect(dimensions[2]).toBeCloseTo(25, 1);
      });

      it('团队总承伤为 0 时承伤占比应为 0', () => {
        const teamWithZeroDamage = {
          ...mockTeamStats,
          totalDamage: 0,
          totalDamageTaken: 0,
        };

        const dimensions = calculateRadarDimension(mockPlayer, 'TOP', teamWithZeroDamage, '30:00');

        expect(dimensions[2]).toBe(0);
      });
    });

    describe('JUNGLE 位置伤害占比', () => {
      it('应使用团队总伤害计算 JUNGLE 伤害占比', () => {
        const teamWithDamage = {
          ...mockTeamStats,
          totalDamage: 100000,
          totalDamageTaken: 110000,
        };

        const dimensions = calculateRadarDimension(mockPlayer, 'JUNGLE', teamWithDamage, '30:00');

        // 伤害占比 = 20000 / 100000 * 100 = 20%
        expect(dimensions[1]).toBeCloseTo(20, 1);

        // 承伤占比 = 30000 / 110000 * 100 ≈ 27.27%
        expect(dimensions[2]).toBeCloseTo(27.27, 1);
      });
    });

    describe('SUPPORT 位置承伤占比', () => {
      it('应使用团队总承伤计算 SUPPORT 承伤占比', () => {
        const teamWithDamage = {
          ...mockTeamStats,
          totalDamage: 90000,
          totalDamageTaken: 100000,
        };

        const dimensions = calculateRadarDimension(mockPlayer, 'SUPPORT', teamWithDamage, '30:00');

        // 承伤占比 = 30000 / 100000 * 100 = 30%
        expect(dimensions[2]).toBeCloseTo(30, 1);
      });
    });
  });
});
