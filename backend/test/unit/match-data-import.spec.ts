import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import {
  parseMatchDataExcel,
  validateMatchInfo,
  validateTeamStats,
  validatePlayerStats,
  validateTeamNamesMatch,
  validateParsedMatchData,
} from '../../src/modules/utils/match-excel.util';

describe('match-excel.util', () => {
  let validExcelBuffer: Buffer;

  beforeAll(() => {
    // 创建一个有效的Excel文件用于测试
    const workbook = xlsx.utils.book_new();

    // MatchInfo 表头和数据（新增视频BV号字段，移除游戏时长和一血）
    const matchInfoHeaders = [
      '红方战队名',
      '蓝方战队名',
      '局数',
      '比赛时间',
      '获胜方',
      'MVP',
      '视频BV号',
    ];
    const matchInfoData = ['BLG', 'WBG', 1, '2026-04-16 14:00', 'red', 'Knight', 'BV1Ab4y1X7zK'];

    // TeamStats 表头和数据（移除一血字段）
    const teamStatsHeaders = [
      '阵营',
      '战队名',
      '总击杀',
      '总死亡',
      '总助攻',
      '总经济',
      '推塔数',
      '控龙数',
      '控 Baron 数',
    ];
    const redTeamStats = ['red', 'BLG', 25, 18, 47, 65000, 9, 3, 1];
    const blueTeamStats = ['blue', 'WBG', 18, 25, 35, 58000, 3, 1, 0];

    // PlayerStats 表头和数据（移除是否MVP字段）
    const playerStatsHeaders = [
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
    ];

    const redPlayers = [
      ['red', 'TOP', 'Bin', '格温', 2, 2, 11, 349, 17315, 28500, 32000, 18, 45, 12, 12],
      ['red', 'JUNGLE', 'Xun', '潘森', 4, 7, 10, 261, 14855, 22000, 28000, 16, 38, 8, 8],
      ['red', 'MID', 'Knight', '奎桑提', 13, 0, 11, 339, 19592, 35000, 18000, 18, 42, 6, 6],
      ['red', 'ADC', 'Viper', '艾希', 7, 3, 10, 368, 19385, 32000, 21000, 18, 35, 4, 4],
      ['red', 'SUPPORT', 'ON', '萨勒芬妮', 0, 3, 22, 47, 11580, 8500, 15000, 15, 78, 18, 18],
    ];

    const bluePlayers = [
      ['blue', 'TOP', 'TheShy', '奎桑提', 1, 3, 8, 289, 15200, 21000, 35000, 17, 42, 10, 10],
      ['blue', 'JUNGLE', 'Tian', '蔚', 3, 5, 9, 198, 12500, 18000, 26000, 15, 36, 9, 9],
      ['blue', 'MID', 'Rookie', '阿狸', 5, 6, 7, 312, 16800, 25000, 19000, 17, 38, 5, 5],
      ['blue', 'ADC', 'Hope', '厄斐琉斯', 6, 5, 6, 352, 17500, 28000, 22000, 18, 32, 3, 3],
      ['blue', 'SUPPORT', 'Crisp', '烈娜塔', 3, 6, 5, 38, 9800, 7500, 18000, 14, 82, 20, 20],
    ];

    // BAN数据
    const banHeaders = [
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
    ];
    const banData = [
      '亚托克斯',
      '格雷福斯',
      '阿狸',
      '卡莎',
      '锤石',
      '雷克顿',
      '李青',
      '辛德拉',
      '厄斐琉斯',
      '蕾欧娜',
    ];

    // 构建完整的数据
    const data = [
      matchInfoHeaders,
      matchInfoData,
      teamStatsHeaders,
      redTeamStats,
      blueTeamStats,
      playerStatsHeaders,
      ...redPlayers,
      ...bluePlayers,
      banHeaders,
      banData,
    ];

    const worksheet = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'MatchData');

    // 生成 buffer
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    validExcelBuffer = excelBuffer as Buffer;
  });

  describe('parseMatchDataExcel', () => {
    it('应该成功解析有效的Excel文件', () => {
      const result = parseMatchDataExcel(validExcelBuffer);

      expect(result).toBeDefined();
      expect(result.matchInfo).toBeDefined();
      expect(result.teamStats).toBeDefined();
      expect(result.playerStats).toBeDefined();
    });

    it('应该正确解析MatchInfo数据', () => {
      const result = parseMatchDataExcel(validExcelBuffer);

      expect(result.matchInfo.redTeamName).toBe('BLG');
      expect(result.matchInfo.blueTeamName).toBe('WBG');
      expect(result.matchInfo.gameNumber).toBe(1);
      expect(result.matchInfo.gameStartTime).toBe('2026-04-16 14:00');
      expect(result.matchInfo.winner).toBe('red');
      expect(result.matchInfo.firstBlood).toBe('');  // 已废弃，返回空
      expect(result.matchInfo.mvp).toBe('Knight');
      expect(result.matchInfo.videoBvid).toBe('BV1Ab4y1X7zK');
    });

    it('应该正确解析TeamStats数据（2行）', () => {
      const result = parseMatchDataExcel(validExcelBuffer);

      expect(result.teamStats).toHaveLength(2);

      // 红方数据
      expect(result.teamStats[0].side).toBe('red');
      expect(result.teamStats[0].teamName).toBe('BLG');
      expect(result.teamStats[0].kills).toBe(25);
      expect(result.teamStats[0].gold).toBe(65000);

      // 蓝方数据
      expect(result.teamStats[1].side).toBe('blue');
      expect(result.teamStats[1].teamName).toBe('WBG');
      expect(result.teamStats[1].kills).toBe(18);
      expect(result.teamStats[1].gold).toBe(58000);
    });

    it('应该正确解析PlayerStats数据（10行）', () => {
      const result = parseMatchDataExcel(validExcelBuffer);

      expect(result.playerStats).toHaveLength(10);

      // 红方选手 - championName现在是英文ID
      expect(result.playerStats[0].side).toBe('red');
      expect(result.playerStats[0].position).toBe('TOP');
      expect(result.playerStats[0].nickname).toBe('Bin');
      expect(result.playerStats[0].championName).toBe('Gwen');
      expect(result.playerStats[0].championNameRaw).toBe('格温');

      // 蓝方选手
      expect(result.playerStats[5].side).toBe('blue');
      expect(result.playerStats[5].position).toBe('TOP');
      expect(result.playerStats[5].nickname).toBe('TheShy');
      expect(result.playerStats[5].championName).toBe('KSante');
      expect(result.playerStats[5].championNameRaw).toBe('奎桑提');
    });

    it('应该将位置转换为大写', () => {
      const result = parseMatchDataExcel(validExcelBuffer);

      result.playerStats.forEach((player) => {
        expect(player.position).toBe(player.position.toUpperCase());
      });
    });

    it('应该正确解析BAN数据并转换为英文ID', () => {
      const result = parseMatchDataExcel(validExcelBuffer);

      expect(result.bans).toBeDefined();
      expect(result.bans.redBans).toHaveLength(5);
      expect(result.bans.blueBans).toHaveLength(5);

      // 验证红方BAN转换为英文ID
      expect(result.bans.redBans).toContain('Aatrox');
      expect(result.bans.redBans).toContain('Ahri');
      expect(result.bans.redBans).toContain('Thresh');

      // 验证蓝方BAN转换为英文ID
      expect(result.bans.blueBans).toContain('Renekton');
      expect(result.bans.blueBans).toContain('Aphelios');
      expect(result.bans.blueBans).toContain('Leona');
    });

    it('当Excel行数不足时应抛出错误', () => {
      // 创建一个只有5行的无效Excel
      const workbook = xlsx.utils.book_new();
      const data = [['表头'], ['数据1'], ['数据2'], ['数据3'], ['数据4']];
      const worksheet = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'MatchData');
      const invalidBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      expect(() => parseMatchDataExcel(invalidBuffer)).toThrow('Excel文件行数不足');
    });

    it('当选手数据不完整时应抛出错误', () => {
      // 创建只有5个选手的Excel（应该有10个）
      const workbook = xlsx.utils.book_new();

      const matchInfoHeaders = [
        '红方战队名',
        '蓝方战队名',
        '局数',
        '比赛时间',
        '获胜方',
        'MVP',
        '视频BV号',
      ];
      const matchInfoData = ['BLG', 'WBG', 1, '2026-04-16 14:00', 'red', 'Knight', 'BV1Ab4y1X7zK'];
      const teamStatsHeaders = [
        '阵营',
        '战队名',
        '总击杀',
        '总死亡',
        '总助攻',
        '总经济',
        '推塔数',
        '控龙数',
        '控 Baron 数',
      ];
      const redTeamStats = ['red', 'BLG', 25, 18, 47, 65000, 9, 3, 1];
      const blueTeamStats = ['blue', 'WBG', 18, 25, 35, 58000, 3, 1, 0];
      const playerStatsHeaders = [
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
      ];

      // 只添加5个选手
      const incompletePlayers = [
        ['red', 'TOP', 'Bin', '格温', 2, 2, 11, 349, 17315, 28500, 32000, 18, 45, 12, 12],
        ['red', 'JUNGLE', 'Xun', '潘森', 4, 7, 10, 261, 14855, 22000, 28000, 16, 38, 8, 8],
        ['red', 'MID', 'Knight', '奎桑提', 13, 0, 11, 339, 19592, 35000, 18000, 18, 42, 6, 6],
        ['blue', 'TOP', 'TheShy', '奎桑提', 1, 3, 8, 289, 15200, 21000, 35000, 17, 42, 10, 10],
        ['blue', 'JUNGLE', 'Tian', '蔚', 3, 5, 9, 198, 12500, 18000, 26000, 15, 36, 9, 9],
      ];

      // 构建16行的数据，用空字符串填充缺失的选手行
      // BAN数据（填充空行）
      const banHeaders = [
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
      ];
      const banData = ['', '', '', '', '', '', '', '', '', ''];

      const data = [
        matchInfoHeaders,
        matchInfoData,
        teamStatsHeaders,
        redTeamStats,
        blueTeamStats,
        playerStatsHeaders,
        ...incompletePlayers,
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        banHeaders,
        banData,
      ];

      const worksheet = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'MatchData');
      const invalidBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      expect(() => parseMatchDataExcel(invalidBuffer)).toThrow('选手数据行');
    });

    it('当战队数据不完整时应抛出错误', () => {
      const workbook = xlsx.utils.book_new();

      const matchInfoHeaders = [
        '红方战队名',
        '蓝方战队名',
        '局数',
        '比赛时间',
        '获胜方',
        'MVP',
        '视频BV号',
      ];
      const matchInfoData = ['BLG', 'WBG', 1, '2026-04-16 14:00', 'red', 'Knight', 'BV1Ab4y1X7zK'];
      const teamStatsHeaders = [
        '阵营',
        '战队名',
        '总击杀',
        '总死亡',
        '总助攻',
        '总经济',
        '推塔数',
        '控龙数',
        '控 Baron 数',
      ];
      const redTeamStats = ['red', 'BLG', 25, 18, 47, 65000, 9, 3, 1];
      const playerStatsHeaders = [
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
      ];

      // 只添加1个战队数据（应该有2个）
      const redPlayers = [
        ['red', 'TOP', 'Bin', '格温', 2, 2, 11, 349, 17315, 28500, 32000, 18, 45, 12, 12],
        ['red', 'JUNGLE', 'Xun', '潘森', 4, 7, 10, 261, 14855, 22000, 28000, 16, 38, 8, 8],
        ['red', 'MID', 'Knight', '奎桑提', 13, 0, 11, 339, 19592, 35000, 18000, 18, 42, 6, 6],
        ['red', 'ADC', 'Viper', '艾希', 7, 3, 10, 368, 19385, 32000, 21000, 18, 35, 4, 4],
        ['red', 'SUPPORT', 'ON', '萨勒芬妮', 0, 3, 22, 47, 11580, 8500, 15000, 15, 78, 18, 18],
        ['blue', 'TOP', 'TheShy', '奎桑提', 1, 3, 8, 289, 15200, 21000, 35000, 17, 42, 10, 10],
        ['blue', 'JUNGLE', 'Tian', '蔚', 3, 5, 9, 198, 12500, 18000, 26000, 15, 36, 9, 9],
        ['blue', 'MID', 'Rookie', '阿狸', 5, 6, 7, 312, 16800, 25000, 19000, 17, 38, 5, 5],
        ['blue', 'ADC', 'Hope', '厄斐琉斯', 6, 5, 6, 352, 17500, 28000, 22000, 18, 32, 3, 3],
        ['blue', 'SUPPORT', 'Crisp', '烈娜塔', 3, 6, 5, 38, 9800, 7500, 18000, 14, 82, 20, 20],
      ];

      // BAN数据（填充空行）
      const banHeaders = [
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
      ];
      const banData = ['', '', '', '', '', '', '', '', '', ''];

      const data = [
        matchInfoHeaders,
        matchInfoData,
        teamStatsHeaders,
        redTeamStats,
        ['', '', '', '', '', '', '', '', ''],
        playerStatsHeaders,
        ...redPlayers,
        banHeaders,
        banData,
      ];

      const worksheet = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'MatchData');
      const invalidBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      expect(() => parseMatchDataExcel(invalidBuffer)).toThrow('战队数据行');
    });
  });

  describe('validateMatchInfo', () => {
    it('应该验证有效的MatchInfo', () => {
      const validData = {
        redTeamName: 'BLG',
        blueTeamName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '',  // 已废弃
        winner: 'red',
        firstBlood: '',  // 已废弃
        mvp: 'Knight',
        videoBvid: 'BV1Ab4y1X7zK',
      };

      const result = validateMatchInfo(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝空的战队名称', () => {
      const invalidData = {
        redTeamName: '',
        blueTeamName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '',
        winner: 'red',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: '',
      };

      const result = validateMatchInfo(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('红方战队名称不能为空');
    });

    it('应该拒绝无效的获胜方', () => {
      const invalidData = {
        redTeamName: 'BLG',
        blueTeamName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '',
        winner: 'invalid',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: '',
      };

      const result = validateMatchInfo(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('获胜方必须是 red 或 blue');
    });

    it('应该支持中文获胜方', () => {
      const validData = {
        redTeamName: 'BLG',
        blueTeamName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '',
        winner: '红方',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: '',
      };

      const result = validateMatchInfo(validData);
      expect(result.valid).toBe(true);
    });

    it('应该验证有效的BV号', () => {
      const validData = {
        redTeamName: 'BLG',
        blueTeamName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '',
        winner: 'red',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: 'BV1Ab4y1X7zK',
      };

      const result = validateMatchInfo(validData);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的BV号', () => {
      const invalidData = {
        redTeamName: 'BLG',
        blueTeamName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '',
        winner: 'red',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: 'invalid-bvid',
      };

      const result = validateMatchInfo(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('视频BV号格式错误');
    });

    it('BV号字段为空时应通过验证', () => {
      const validData = {
        redTeamName: 'BLG',
        blueTeamName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '',
        winner: 'red',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: '',
      };

      const result = validateMatchInfo(validData);
      expect(result.valid).toBe(true);
    });

    it('BV号大小写敏感', () => {
      const validData1 = {
        redTeamName: 'BLG',
        blueTeamName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '',
        winner: 'red',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: 'BV1Ab4y1X7zK',
      };
      const validData2 = {
        redTeamName: 'BLG',
        blueTeamName: 'WBG',
        gameNumber: 1,
        gameStartTime: '2026-04-16 14:00',
        gameDuration: '',
        winner: 'red',
        firstBlood: '',
        mvp: 'Knight',
        videoBvid: 'BV1aB4Y1x7Zk',
      };
      expect(validateMatchInfo(validData1).valid).toBe(true);
      expect(validateMatchInfo(validData2).valid).toBe(true);
      expect(validData1.videoBvid).not.toBe(validData2.videoBvid);
    });
  });

  describe('validateTeamStats', () => {
    it('应该验证有效的TeamStats', () => {
      const validData = {
        side: 'red',
        teamName: 'BLG',
        kills: 25,
        deaths: 18,
        assists: 47,
        gold: 65000,
        towers: 9,
        dragons: 3,
        barons: 1,
      };

      const result = validateTeamStats(validData, 4);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝负数的击杀数', () => {
      const invalidData = {
        side: 'red',
        teamName: 'BLG',
        kills: -1,
        deaths: 18,
        assists: 47,
        gold: 65000,
        towers: 9,
        dragons: 3,
        barons: 1,
      };

      const result = validateTeamStats(invalidData, 4);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('击杀数不能为负数');
    });
  });

  describe('validatePlayerStats', () => {
    it('应该验证有效的PlayerStats', () => {
      const validData = {
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
        wardsCleared: 12,
      };

      const result = validatePlayerStats(validData, 7);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝无效的位置', () => {
      const invalidData = {
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
        wardsCleared: 12,
      };

      const result = validatePlayerStats(invalidData, 7);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('位置必须是 TOP/JUNGLE/MID/ADC/SUPPORT 之一');
    });

    it('应该拒绝超出范围的等级', () => {
      const invalidData = {
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
        level: 20,
        visionScore: 45,
        wardsPlaced: 12,
        wardsCleared: 12,
      };

      const result = validatePlayerStats(invalidData, 7);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('等级必须在1-18之间');
    });
  });

  describe('validateTeamNamesMatch', () => {
    it('应该验证战队名称完全匹配（红方=A，蓝方=B）', () => {
      const result = validateTeamNamesMatch('BLG', 'WBG', 'BLG', 'WBG');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证战队名称完全匹配（红方=B，蓝方=A）', () => {
      const result = validateTeamNamesMatch('WBG', 'BLG', 'BLG', 'WBG');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该支持忽略大小写的匹配', () => {
      const result = validateTeamNamesMatch('blg', 'wbg', 'BLG', 'WBG');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该支持忽略前后空格的匹配', () => {
      const result = validateTeamNamesMatch('  BLG  ', '  WBG  ', 'BLG', 'WBG');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('当红方战队名不匹配时应返回错误', () => {
      const result = validateTeamNamesMatch('T1', 'WBG', 'BLG', 'WBG');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Excel中的红方战队名"T1"与所选对战中的战队名称不匹配。所选对战为：BLG vs WBG',
      );
    });

    it('当蓝方战队名不匹配时应返回错误', () => {
      const result = validateTeamNamesMatch('BLG', 'T1', 'BLG', 'WBG');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Excel中的蓝方战队名"T1"与所选对战中的战队名称不匹配。所选对战为：BLG vs WBG',
      );
    });

    it('当双方战队名都不匹配时应返回两个错误', () => {
      const result = validateTeamNamesMatch('T1', 'GEN', 'BLG', 'WBG');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('红方战队名');
      expect(result.errors[1]).toContain('蓝方战队名');
    });

    it('当红方和蓝方战队名相同时应返回错误', () => {
      const result = validateTeamNamesMatch('BLG', 'BLG', 'BLG', 'WBG');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Excel中的红方战队名和蓝方战队名不能相同');
    });

    it('当红方和蓝方都匹配同一个战队时应返回错误', () => {
      const result = validateTeamNamesMatch('BLG', 'BLG', 'BLG', 'WBG');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('不能同时匹配同一个战队'))).toBe(true);
    });

    it('应该处理中文战队名称', () => {
      const result = validateTeamNamesMatch('驴酱', 'IC', '驴酱', 'IC');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('当导入文件战队与所选对战完全不同时应拒绝', () => {
      const result = validateTeamNamesMatch('BLG', 'WBG', '驴酱', 'IC');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('红方战队名');
      expect(result.errors[0]).toContain('驴酱 vs IC');
    });
  });

  describe('validateParsedMatchData - BAN英雄验证', () => {
    it('当BAN英雄名称有效时应通过验证', () => {
      const parsedData = {
        matchInfo: {} as any,
        teamStats: [],
        playerStats: [],
        bans: {
          redBans: ['Aatrox', 'Graves', 'Ahri', 'Kaisa', 'Thresh'],
          blueBans: ['Renekton', 'LeeSin', 'Syndra', 'Aphelios', 'Leona'],
          errors: [],
        },
      };

      const result = validateParsedMatchData(parsedData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('当BAN英雄名称无效时应返回错误', () => {
      const parsedData = {
        matchInfo: {} as any,
        teamStats: [],
        playerStats: [],
        bans: {
          redBans: ['Aatrox'],
          blueBans: [],
          errors: ['红方BAN2英雄"不存在的英雄"不存在，请检查英雄名称'],
        },
      };

      const result = validateParsedMatchData(parsedData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('红方BAN2英雄"不存在的英雄"不存在，请检查英雄名称');
    });

    it('当多个BAN英雄名称无效时应返回多个错误', () => {
      const parsedData = {
        matchInfo: {} as any,
        teamStats: [],
        playerStats: [],
        bans: {
          redBans: ['Aatrox'],
          blueBans: ['Renekton'],
          errors: [
            '红方BAN2英雄"无效英雄1"不存在，请检查英雄名称',
            '蓝方BAN1英雄"无效英雄2"不存在，请检查英雄名称',
          ],
        },
      };

      const result = validateParsedMatchData(parsedData);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('validateParsedMatchData - 选手使用英雄验证', () => {
    it('当选手使用英雄名称有效时应通过验证', () => {
      const parsedData = {
        matchInfo: {} as any,
        teamStats: [],
        playerStats: [
          {
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
            wardsCleared: 12,
          },
        ],
        bans: {
          redBans: [],
          blueBans: [],
          errors: [],
        },
      };

      const result = validateParsedMatchData(parsedData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('当选手使用英雄名称无效时应返回错误', () => {
      const parsedData = {
        matchInfo: {} as any,
        teamStats: [],
        playerStats: [
          {
            side: 'red',
            position: 'TOP',
            nickname: 'Bin',
            championName: '',
            championNameRaw: '不存在的英雄',
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
            wardsCleared: 12,
          },
        ],
        bans: {
          redBans: [],
          blueBans: [],
          errors: [],
        },
      };

      const result = validateParsedMatchData(parsedData);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('选手"Bin"使用的英雄"不存在的英雄"不存在');
    });

    it('当多个选手使用英雄名称无效时应返回多个错误', () => {
      const parsedData = {
        matchInfo: {} as any,
        teamStats: [],
        playerStats: [
          {
            side: 'red',
            position: 'TOP',
            nickname: 'Player1',
            championName: '',
            championNameRaw: '无效英雄1',
            kills: 0,
            deaths: 0,
            assists: 0,
            cs: 0,
            gold: 0,
            damageDealt: 0,
            damageTaken: 0,
            level: 1,
            visionScore: 0,
            wardsPlaced: 0,
            wardsCleared: 0,
          },
          {
            side: 'red',
            position: 'JUNGLE',
            nickname: 'Player2',
            championName: '',
            championNameRaw: '无效英雄2',
            kills: 0,
            deaths: 0,
            assists: 0,
            cs: 0,
            gold: 0,
            damageDealt: 0,
            damageTaken: 0,
            level: 1,
            visionScore: 0,
            wardsPlaced: 0,
            wardsCleared: 0,
          },
        ],
        bans: {
          redBans: [],
          blueBans: [],
          errors: [],
        },
      };

      const result = validateParsedMatchData(parsedData);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('第7行选手"Player1"使用的英雄"无效英雄1"不存在');
      expect(result.errors[1]).toContain('第8行选手"Player2"使用的英雄"无效英雄2"不存在');
    });
  });

  describe('validateParsedMatchData - 综合验证', () => {
    it('当BAN和选手使用英雄都有错误时应返回所有错误', () => {
      const parsedData = {
        matchInfo: {} as any,
        teamStats: [],
        playerStats: [
          {
            side: 'red',
            position: 'TOP',
            nickname: 'Bin',
            championName: '',
            championNameRaw: '无效英雄',
            kills: 0,
            deaths: 0,
            assists: 0,
            cs: 0,
            gold: 0,
            damageDealt: 0,
            damageTaken: 0,
            level: 1,
            visionScore: 0,
            wardsPlaced: 0,
            wardsCleared: 0,
          },
        ],
        bans: {
          redBans: ['Aatrox'],
          blueBans: [],
          errors: ['红方BAN2英雄"无效BAN"不存在，请检查英雄名称'],
        },
      };

      const result = validateParsedMatchData(parsedData);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('红方BAN2英雄"无效BAN"不存在');
      expect(result.errors[1]).toContain('选手"Bin"使用的英雄"无效英雄"不存在');
    });

    it('当所有英雄都有效时应通过验证', () => {
      const parsedData = {
        matchInfo: {} as any,
        teamStats: [],
        playerStats: [
          {
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
            wardsCleared: 12,
          },
          {
            side: 'red',
            position: 'JUNGLE',
            nickname: 'Xun',
            championName: 'Pantheon',
            championNameRaw: '潘森',
            kills: 4,
            deaths: 7,
            assists: 10,
            cs: 261,
            gold: 14855,
            damageDealt: 22000,
            damageTaken: 28000,
            level: 16,
            visionScore: 38,
            wardsPlaced: 8,
            wardsCleared: 8,
          },
        ],
        bans: {
          redBans: ['Aatrox', 'Graves'],
          blueBans: ['Renekton', 'LeeSin'],
          errors: [],
        },
      };

      const result = validateParsedMatchData(parsedData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
