import {
  parseMatchDataExcel,
  validatePlayerStats,
  isValidDurationFormat,
  isValidPosition,
  validateMatchInfo,
  PlayerStatsData,
} from '../../src/modules/utils/match-excel.util';
import * as xlsx from 'xlsx';

describe('MatchExcelUtil', () => {
  describe('parseMatchDataExcel', () => {
    it('应正确解析7列新模板格式（teamA/teamB表头，无游戏时长列）', () => {
      const aoa = [
        ['teamA', 'teamB', '局数', '比赛时间', '获胜方', 'MVP', '视频BV号'],
        ['BLG', 'WBG', 1, '2026-04-16 14:00', 'red', 'Knight', 'BV1Ab4y1X7zK'],
        [
          '阵营',
          '战队名',
          '总击杀',
          '总死亡',
          '总助攻',
          '总经济',
          '推塔数',
          '控龙数',
          '控 Baron 数',
        ],
        ['red', 'BLG', 25, 18, 47, 65000, 9, 3, 1],
        ['blue', 'WBG', 18, 25, 35, 58000, 3, 1, 0],
        [
          '阵营',
          '位置',
          '选手昵称',
          '英雄名',
          '击杀',
          '死亡',
          '助攻',
          '补刀',
          '经济',
          '伤害',
          '承伤',
          '等级',
          '视野得分',
          '插眼数',
          '排眼数',
        ],
        ['red', 'TOP', 'Bin', '格温', 2, 2, 11, 349, 17315, 28500, 32000, 18, 45, 12, 5],
        ['red', 'JUNGLE', 'Xun', '潘森', 4, 7, 10, 261, 14855, 22000, 28000, 16, 38, 8, 4],
        ['red', 'MID', 'Knight', '奎桑提', 13, 0, 11, 339, 19592, 35000, 18000, 18, 42, 6, 3],
        ['red', 'ADC', 'Viper', '艾希', 7, 3, 10, 368, 19385, 32000, 21000, 18, 35, 4, 2],
        ['red', 'SUPPORT', 'ON', '萨勒芬妮', 0, 3, 22, 47, 11580, 8500, 15000, 15, 78, 18, 6],
        ['blue', 'TOP', 'TheShy', '奎桑提', 1, 3, 8, 289, 15200, 21000, 35000, 17, 42, 10, 5],
        ['blue', 'JUNGLE', 'Tian', '蔚', 3, 5, 9, 198, 12500, 18000, 26000, 15, 36, 9, 3],
        ['blue', 'MID', 'Rookie', '阿狸', 5, 6, 7, 312, 16800, 25000, 19000, 17, 38, 5, 2],
        ['blue', 'ADC', 'Hope', '厄斐琉斯', 6, 5, 6, 352, 17500, 28000, 22000, 18, 32, 3, 1],
        ['blue', 'SUPPORT', 'Crisp', '烈娜塔', 3, 6, 5, 38, 9800, 7500, 18000, 14, 82, 20, 8],
        [
          '红方BAN1',
          '红方BAN2',
          '红方BAN3',
          '红方BAN4',
          '红方BAN5',
          '蓝方BAN1',
          '蓝方BAN2',
          '蓝方BAN3',
          '蓝方BAN4',
          '蓝方BAN5',
        ],
        [
          'Aatrox',
          'Graves',
          'Ahri',
          'Kaisa',
          'Thresh',
          'Renekton',
          'LeeSin',
          'Syndra',
          'Aphelios',
          'Leona',
        ],
      ];

      const sheet = xlsx.utils.aoa_to_sheet(aoa);
      const workbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: sheet } };
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = parseMatchDataExcel(buffer);

      expect(result.playerStats).toHaveLength(10);
      expect(result.matchInfo.teamAName).toBe('BLG');
      expect(result.matchInfo.teamBName).toBe('WBG');
      expect(result.matchInfo.gameNumber).toBe(1);
      expect(result.matchInfo.gameStartTime).toBe('2026-04-16 14:00');
      expect(result.matchInfo.winner).toBe('red');
      expect(result.matchInfo.mvp).toBe('Knight');
      expect(result.matchInfo.videoBvid).toBe('BV1Ab4y1X7zK');
      expect(result.matchInfo.gameDuration).toBe('');
      expect(result.matchInfo.firstBlood).toBe('');
      expect(result.bans.redBans).toHaveLength(5);
      expect(result.bans.blueBans).toHaveLength(5);
    });

    it('应正确解析8列旧模板格式（兼容红方战队名/蓝方战队名表头）', () => {
      const aoa = [
        ['红方战队名', '蓝方战队名', '局数', '比赛时间', '游戏时长', '获胜方', 'MVP', '视频BV号'],
        ['BLG', 'WBG', 1, '2026-04-16 14:00', '32:45', 'red', 'Knight', ''],
        [
          '阵营',
          '战队名',
          '总击杀',
          '总死亡',
          '总助攻',
          '总经济',
          '推塔数',
          '控龙数',
          '控 Baron 数',
        ],
        ['red', 'BLG', 25, 18, 47, 65000, 9, 3, 1],
        ['blue', 'WBG', 18, 25, 35, 58000, 3, 1, 0],
        [
          '阵营',
          '位置',
          '选手昵称',
          '英雄名',
          '击杀',
          '死亡',
          '助攻',
          '补刀',
          '经济',
          '伤害',
          '承伤',
          '等级',
          '视野得分',
          '插眼数',
          '排眼数',
        ],
        ['red', 'TOP', 'Bin', '格温', 2, 2, 11, 349, 17315, 28500, 32000, 18, 45, 12, 5],
        ['red', 'JUNGLE', 'Xun', '潘森', 4, 7, 10, 261, 14855, 22000, 28000, 16, 38, 8, 4],
        ['red', 'MID', 'Knight', '奎桑提', 13, 0, 11, 339, 19592, 35000, 18000, 18, 42, 6, 3],
        ['red', 'ADC', 'Viper', '艾希', 7, 3, 10, 368, 19385, 32000, 21000, 18, 35, 4, 2],
        ['red', 'SUPPORT', 'ON', '萨勒芬妮', 0, 3, 22, 47, 11580, 8500, 15000, 15, 78, 18, 6],
        ['blue', 'TOP', 'TheShy', '奎桑提', 1, 3, 8, 289, 15200, 21000, 35000, 17, 42, 10, 5],
        ['blue', 'JUNGLE', 'Tian', '蔚', 3, 5, 9, 198, 12500, 18000, 26000, 15, 36, 9, 3],
        ['blue', 'MID', 'Rookie', '阿狸', 5, 6, 7, 312, 16800, 25000, 19000, 17, 38, 5, 2],
        ['blue', 'ADC', 'Hope', '厄斐琉斯', 6, 5, 6, 352, 17500, 28000, 22000, 18, 32, 3, 1],
        ['blue', 'SUPPORT', 'Crisp', '烈娜塔', 3, 6, 5, 38, 9800, 7500, 18000, 14, 82, 20, 8],
        [
          '红方BAN1',
          '红方BAN2',
          '红方BAN3',
          '红方BAN4',
          '红方BAN5',
          '蓝方BAN1',
          '蓝方BAN2',
          '蓝方BAN3',
          '蓝方BAN4',
          '蓝方BAN5',
        ],
        [
          'Aatrox',
          'Graves',
          'Ahri',
          'Kaisa',
          'Thresh',
          'Renekton',
          'LeeSin',
          'Syndra',
          'Aphelios',
          'Leona',
        ],
      ];

      const sheet = xlsx.utils.aoa_to_sheet(aoa);
      const workbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: sheet } };
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = parseMatchDataExcel(buffer);

      expect(result.playerStats).toHaveLength(10);
      expect(result.playerStats[0].wardsCleared).toBe(5);
      expect(result.playerStats[0].side).toBe('red');
      expect(result.playerStats[0].position).toBe('TOP');
      expect(result.playerStats[0].nickname).toBe('Bin');
      expect(result.matchInfo.firstBlood).toBe(''); // firstBlood 已废弃
      expect(result.matchInfo.mvp).toBe('Knight');
      expect(result.bans.redBans).toHaveLength(5);
      expect(result.bans.blueBans).toHaveLength(5);
    });

    it('应正确解析8列新模板格式（teamA/teamB表头，含游戏时长列）', () => {
      const aoa = [
        ['teamA', 'teamB', '局数', '比赛时间', '游戏时长', '获胜方', 'MVP', '视频BV号'],
        ['BLG', 'WBG', 1, '2026-04-16 14:00', '32:45', 'red', 'Knight', ''],
        [
          '阵营',
          '战队名',
          '总击杀',
          '总死亡',
          '总助攻',
          '总经济',
          '推塔数',
          '控龙数',
          '控 Baron 数',
        ],
        ['red', 'BLG', 25, 18, 47, 65000, 9, 3, 1],
        ['blue', 'WBG', 18, 25, 35, 58000, 3, 1, 0],
        [
          '阵营',
          '位置',
          '选手昵称',
          '英雄名',
          '击杀',
          '死亡',
          '助攻',
          '补刀',
          '经济',
          '伤害',
          '承伤',
          '等级',
          '视野得分',
          '插眼数',
          '排眼数',
        ],
        ['red', 'TOP', 'Bin', '格温', 2, 2, 11, 349, 17315, 28500, 32000, 18, 45, 12, 5],
        ['red', 'JUNGLE', 'Xun', '潘森', 4, 7, 10, 261, 14855, 22000, 28000, 16, 38, 8, 4],
        ['red', 'MID', 'Knight', '奎桑提', 13, 0, 11, 339, 19592, 35000, 18000, 18, 42, 6, 3],
        ['red', 'ADC', 'Viper', '艾希', 7, 3, 10, 368, 19385, 32000, 21000, 18, 35, 4, 2],
        ['red', 'SUPPORT', 'ON', '萨勒芬妮', 0, 3, 22, 47, 11580, 8500, 15000, 15, 78, 18, 6],
        ['blue', 'TOP', 'TheShy', '奎桑提', 1, 3, 8, 289, 15200, 21000, 35000, 17, 42, 10, 5],
        ['blue', 'JUNGLE', 'Tian', '蔚', 3, 5, 9, 198, 12500, 18000, 26000, 15, 36, 9, 3],
        ['blue', 'MID', 'Rookie', '阿狸', 5, 6, 7, 312, 16800, 25000, 19000, 17, 38, 5, 2],
        ['blue', 'ADC', 'Hope', '厄斐琉斯', 6, 5, 6, 352, 17500, 28000, 22000, 18, 32, 3, 1],
        ['blue', 'SUPPORT', 'Crisp', '烈娜塔', 3, 6, 5, 38, 9800, 7500, 18000, 14, 82, 20, 8],
        [
          '红方BAN1',
          '红方BAN2',
          '红方BAN3',
          '红方BAN4',
          '红方BAN5',
          '蓝方BAN1',
          '蓝方BAN2',
          '蓝方BAN3',
          '蓝方BAN4',
          '蓝方BAN5',
        ],
        [
          'Aatrox',
          'Graves',
          'Ahri',
          'Kaisa',
          'Thresh',
          'Renekton',
          'LeeSin',
          'Syndra',
          'Aphelios',
          'Leona',
        ],
      ];

      const sheet = xlsx.utils.aoa_to_sheet(aoa);
      const workbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: sheet } };
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = parseMatchDataExcel(buffer);

      expect(result.playerStats).toHaveLength(10);
      expect(result.playerStats[0].wardsCleared).toBe(5);
      expect(result.playerStats[0].side).toBe('red');
      expect(result.playerStats[0].position).toBe('TOP');
      expect(result.playerStats[0].nickname).toBe('Bin');
      expect(result.matchInfo.firstBlood).toBe(''); // firstBlood 已废弃
      expect(result.matchInfo.mvp).toBe('Knight');
      expect(result.bans.redBans).toHaveLength(5);
      expect(result.bans.blueBans).toHaveLength(5);
    });

    it('应正确解析包含10名选手的完整Excel文件', () => {
      const redTeamPlayers = [
        ['red', 'TOP', 'Bin', '格温', 2, 2, 11, 349, 17315, 28500, 32000, 18, 45, 12, 5],
        ['red', 'JUNGLE', 'Xun', '潘森', 4, 7, 10, 261, 14855, 22000, 28000, 16, 38, 8, 4],
        ['red', 'MID', 'Knight', '奎桑提', 13, 0, 11, 339, 19592, 35000, 18000, 18, 42, 6, 3],
        ['red', 'ADC', 'Viper', '艾希', 7, 3, 10, 368, 19385, 32000, 21000, 18, 35, 4, 2],
        ['red', 'SUPPORT', 'ON', '萨勒芬妮', 0, 3, 22, 47, 11580, 8500, 15000, 15, 78, 18, 6],
      ];

      const blueTeamPlayers = [
        ['blue', 'TOP', 'TheShy', '奎桑提', 1, 3, 8, 289, 15200, 21000, 35000, 17, 42, 10, 5],
        ['blue', 'JUNGLE', 'Tian', '蔚', 3, 5, 9, 198, 12500, 18000, 26000, 15, 36, 9, 3],
        ['blue', 'MID', 'Rookie', '阿狸', 5, 6, 7, 312, 16800, 25000, 19000, 17, 38, 5, 2],
        ['blue', 'ADC', 'Hope', '厄斐琉斯', 6, 5, 6, 352, 17500, 28000, 22000, 18, 32, 3, 1],
        ['blue', 'SUPPORT', 'Crisp', '烈娜塔', 3, 6, 5, 38, 9800, 7500, 18000, 14, 82, 20, 8],
      ];

      const aoa = [
        ['红方战队名', '蓝方战队名', '局数', '比赛时间', '游戏时长', '获胜方', 'MVP', '视频BV号'],
        ['BLG', 'WBG', 1, '2026-04-16 14:00', '32:45', 'red', 'Hope', ''],
        [
          '阵营',
          '战队名',
          '总击杀',
          '总死亡',
          '总助攻',
          '总经济',
          '推塔数',
          '控龙数',
          '控 Baron 数',
        ],
        ['red', 'BLG', 25, 18, 47, 65000, 9, 3, 1],
        ['blue', 'WBG', 18, 25, 35, 58000, 3, 1, 0],
        [
          '阵营',
          '位置',
          '选手昵称',
          '英雄名',
          '击杀',
          '死亡',
          '助攻',
          '补刀',
          '经济',
          '伤害',
          '承伤',
          '等级',
          '视野得分',
          '插眼数',
          '排眼数',
        ],
        ...redTeamPlayers,
        ...blueTeamPlayers,
        [
          '红方BAN1',
          '红方BAN2',
          '红方BAN3',
          '红方BAN4',
          '红方BAN5',
          '蓝方BAN1',
          '蓝方BAN2',
          '蓝方BAN3',
          '蓝方BAN4',
          '蓝方BAN5',
        ],
        [
          'Aatrox',
          'Graves',
          'Ahri',
          'Kaisa',
          'Thresh',
          'Renekton',
          'LeeSin',
          'Syndra',
          'Aphelios',
          'Leona',
        ],
      ];

      const sheet = xlsx.utils.aoa_to_sheet(aoa);
      const workbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: sheet } };
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = parseMatchDataExcel(buffer);

      expect(result.playerStats).toHaveLength(10);
      expect(result.playerStats[2].wardsCleared).toBe(3);
      expect(result.matchInfo.firstBlood).toBe(''); // firstBlood 已废弃
      expect(result.matchInfo.mvp).toBe('Hope');
      expect(result.bans.redBans).toHaveLength(5);
      expect(result.bans.blueBans).toHaveLength(5);
    });

    it('应正确解析MatchInfo中的新字段', () => {
      const aoa = [
        ['红方战队名', '蓝方战队名', '局数', '比赛时间', '游戏时长', '获胜方', 'MVP', '视频BV号'],
        ['BLG', 'WBG', 1, '2026-04-16 14:00', '32:45', 'red', 'Viper', ''],
        [
          '阵营',
          '战队名',
          '总击杀',
          '总死亡',
          '总助攻',
          '总经济',
          '推塔数',
          '控龙数',
          '控 Baron 数',
        ],
        ['red', 'BLG', 25, 18, 47, 65000, 9, 3, 1],
        ['blue', 'WBG', 18, 25, 35, 58000, 3, 1, 0],
        [
          '阵营',
          '位置',
          '选手昵称',
          '英雄名',
          '击杀',
          '死亡',
          '助攻',
          '补刀',
          '经济',
          '伤害',
          '承伤',
          '等级',
          '视野得分',
          '插眼数',
          '排眼数',
        ],
        ['red', 'TOP', 'Bin', '格温', 2, 2, 11, 349, 17315, 28500, 32000, 18, 45, 12, 5],
        ['red', 'JUNGLE', 'Xun', '潘森', 4, 7, 10, 261, 14855, 22000, 28000, 16, 38, 8, 4],
        ['red', 'MID', 'Knight', '奎桑提', 13, 0, 11, 339, 19592, 35000, 18000, 18, 42, 6, 3],
        ['red', 'ADC', 'Viper', '艾希', 7, 3, 10, 368, 19385, 32000, 21000, 18, 35, 4, 2],
        ['red', 'SUPPORT', 'ON', '萨勒芬妮', 0, 3, 22, 47, 11580, 8500, 15000, 15, 78, 18, 6],
        ['blue', 'TOP', 'TheShy', '奎桑提', 1, 3, 8, 289, 15200, 21000, 35000, 17, 42, 10, 5],
        ['blue', 'JUNGLE', 'Tian', '蔚', 3, 5, 9, 198, 12500, 18000, 26000, 15, 36, 9, 3],
        ['blue', 'MID', 'Rookie', '阿狸', 5, 6, 7, 312, 16800, 25000, 19000, 17, 38, 5, 2],
        ['blue', 'ADC', 'Hope', '厄斐琉斯', 6, 5, 6, 352, 17500, 28000, 22000, 18, 32, 3, 1],
        ['blue', 'SUPPORT', 'Crisp', '烈娜塔', 3, 6, 5, 38, 9800, 7500, 18000, 14, 82, 20, 8],
        [
          '红方BAN1',
          '红方BAN2',
          '红方BAN3',
          '红方BAN4',
          '红方BAN5',
          '蓝方BAN1',
          '蓝方BAN2',
          '蓝方BAN3',
          '蓝方BAN4',
          '蓝方BAN5',
        ],
        [
          'Aatrox',
          'Graves',
          'Ahri',
          'Kaisa',
          'Thresh',
          'Renekton',
          'LeeSin',
          'Syndra',
          'Aphelios',
          'Leona',
        ],
      ];

      const sheet = xlsx.utils.aoa_to_sheet(aoa);
      const workbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: sheet } };
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const result = parseMatchDataExcel(buffer);

      expect(result.matchInfo.firstBlood).toBe(''); // firstBlood 已废弃
      expect(result.matchInfo.mvp).toBe('Viper');
      expect(result.bans.redBans).toHaveLength(5);
      expect(result.bans.blueBans).toHaveLength(5);
    });
  });

  describe('validatePlayerStats', () => {
    it('应验证有效的选手数据', () => {
      const data: PlayerStatsData = {
        side: 'red',
        position: 'TOP',
        nickname: 'Bin',
        championName: 'Gwen',
        championNameRaw: '格温',
        kills: 2,
        deaths: 2,
        assists: 11,
        cs: 349,
        gold: 17315,
        damageDealt: 28500,
        damageTaken: 32000,
        level: 18,
        visionScore: 45,
        wardsPlaced: 12,
        wardsCleared: 5,
      };

      const result = validatePlayerStats(data, 7);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应验证排眼数为负数的情况', () => {
      const data: PlayerStatsData = {
        side: 'red',
        position: 'TOP',
        nickname: 'Bin',
        championName: 'Gwen',
        championNameRaw: '格温',
        kills: 2,
        deaths: 2,
        assists: 11,
        cs: 349,
        gold: 17315,
        damageDealt: 28500,
        damageTaken: 32000,
        level: 18,
        visionScore: 45,
        wardsPlaced: 12,
        wardsCleared: -1,
      };

      const result = validatePlayerStats(data, 7);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('第7行: 排眼数不能为负数');
    });

    it('应验证位置无效的情况', () => {
      const data: PlayerStatsData = {
        side: 'red',
        position: 'INVALID',
        nickname: 'Bin',
        championName: 'Gwen',
        championNameRaw: '格温',
        kills: 2,
        deaths: 2,
        assists: 11,
        cs: 349,
        gold: 17315,
        damageDealt: 28500,
        damageTaken: 32000,
        level: 18,
        visionScore: 45,
        wardsPlaced: 12,
        wardsCleared: 5,
      };

      const result = validatePlayerStats(data, 7);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('位置必须是 TOP/JUNGLE/MID/ADC/SUPPORT'))).toBe(
        true,
      );
    });
  });

  describe('isValidDurationFormat', () => {
    it('应验证有效的mm:ss时长格式', () => {
      expect(isValidDurationFormat('32:45')).toBe(true);
      expect(isValidDurationFormat('0:00')).toBe(true);
      expect(isValidDurationFormat('59:59')).toBe(true);
      expect(isValidDurationFormat('60:00')).toBe(true);
    });

    it('应验证有效的hh:mm:ss时长格式', () => {
      expect(isValidDurationFormat('01:32:45')).toBe(true);
      expect(isValidDurationFormat('0:00:00')).toBe(true);
      expect(isValidDurationFormat('12:59:59')).toBe(true);
    });

    it('应拒绝无效的时长格式', () => {
      expect(isValidDurationFormat('abc')).toBe(false);
      expect(isValidDurationFormat('')).toBe(false);
      expect(isValidDurationFormat('60:60')).toBe(false);
      expect(isValidDurationFormat('25:00:00')).toBe(false);
    });
  });

  describe('validateMatchInfo - teamA/teamB字段', () => {
    it('应验证teamA和teamB字段', () => {
      const validData = {
        teamAName: 'BLG',
        teamBName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '32:45',
        winner: 'red',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: 'BV1Ab4y1X7zK',
      };

      const result = validateMatchInfo(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('当teamA为空时应返回错误', () => {
      const invalidData = {
        teamAName: '',
        teamBName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '32:45',
        winner: 'red',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: '',
      };

      const result = validateMatchInfo(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('teamA战队名称不能为空');
    });

    it('当teamB为空时应返回错误', () => {
      const invalidData = {
        teamAName: 'BLG',
        teamBName: '',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '32:45',
        winner: 'red',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: '',
      };

      const result = validateMatchInfo(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('teamB战队名称不能为空');
    });
  });

  describe('isValidPosition', () => {
    it('应验证有效的位置', () => {
      expect(isValidPosition('TOP')).toBe(true);
      expect(isValidPosition('JUNGLE')).toBe(true);
      expect(isValidPosition('MID')).toBe(true);
      expect(isValidPosition('ADC')).toBe(true);
      expect(isValidPosition('SUPPORT')).toBe(true);
    });

    it('应接受小写位置', () => {
      expect(isValidPosition('top')).toBe(true);
      expect(isValidPosition('adc')).toBe(true);
    });

    it('应拒绝无效的位置', () => {
      expect(isValidPosition('INVALID')).toBe(false);
      expect(isValidPosition('')).toBe(false);
    });
  });
});
