import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

export interface MatchDataImportError {
  row: number;
  nickname: string;
  side: string;
  type: 'player_not_found' | 'team_mismatch' | 'data_validation' | 'parse_error';
  message: string;
}

@Injectable()
export class MatchDataImportService {
  private readonly logger = new Logger(MatchDataImportService.name);
  private readonly TEMPLATE_DIR = path.join(process.cwd(), 'templates');
  private readonly TEMPLATE_FILE = 'match-data-import-template.xlsx';

  /**
   * 生成对战数据导入模板
   * 如果模板已存在，直接返回缓存的模板路径
   */
  async generateTemplate(): Promise<string> {
    const templatePath = path.join(this.TEMPLATE_DIR, this.TEMPLATE_FILE);

    // 如果模板已存在，直接返回缓存的模板路径
    if (fs.existsSync(templatePath)) {
      this.logger.log(`Using cached template: ${templatePath}`);
      return templatePath;
    }

    // 模板不存在，生成新模板
    this.logger.log(`Generating new template: ${templatePath}`);
    await this.ensureTemplateDir();

    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    workbook.modified = new Date();

    await this.createMatchDataSheet(workbook);

    await workbook.xlsx.writeFile(templatePath);
    this.logger.log(`Template generated successfully: ${templatePath}`);

    return templatePath;
  }

  /**
   * 刷新模板（删除旧模板并重新生成）
   */
  async refreshTemplate(): Promise<string> {
    const templatePath = path.join(this.TEMPLATE_DIR, this.TEMPLATE_FILE);

    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
      this.logger.log(`Old template deleted: ${templatePath}`);
    }

    return this.generateTemplate();
  }

  /**
   * 生成错误报告文件（TXT格式）
   */
  async generateErrorReport(errors: MatchDataImportError[]): Promise<Buffer> {
    const lines: string[] = [];

    // 标题
    lines.push('========================================');
    lines.push('       对战数据导入错误报告');
    lines.push('========================================');
    lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
    lines.push(`错误总数：${errors.length}`);
    lines.push('');

    // 错误类型统计
    const typeCount: Record<string, number> = {};
    errors.forEach((e) => {
      typeCount[e.type] = (typeCount[e.type] || 0) + 1;
    });

    lines.push('------ 错误类型统计 ------');
    lines.push(`选手未找到：${typeCount['player_not_found'] || 0} 条`);
    lines.push(`战队不匹配：${typeCount['team_mismatch'] || 0} 条`);
    lines.push(`数据验证失败：${typeCount['data_validation'] || 0} 条`);
    lines.push(`解析错误：${typeCount['parse_error'] || 0} 条`);
    lines.push('');

    // 错误详情
    lines.push('------ 错误详情 ------');
    lines.push('');

    errors.forEach((error, index) => {
      const sideText = error.side === 'red' ? '红方' : '蓝方';
      const typeText = this.getErrorTypeText(error.type);

      lines.push(`[${index + 1}] 第 ${error.row} 行`);
      lines.push(`    选手昵称：${error.nickname}`);
      lines.push(`    阵营：${sideText}`);
      lines.push(`    错误类型：${typeText}`);
      lines.push(`    错误信息：${error.message}`);
      lines.push('');
    });

    lines.push('========================================');
    lines.push('              报告结束');
    lines.push('========================================');

    const content = lines.join('\n');
    return Buffer.from(content, 'utf-8');
  }

  /**
   * 获取错误类型的中文描述
   */
  private getErrorTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      player_not_found: '选手未找到',
      team_mismatch: '战队不匹配',
      data_validation: '数据验证失败',
      parse_error: '解析错误',
    };
    return typeMap[type] || type;
  }

  private async ensureTemplateDir(): Promise<void> {
    if (!fs.existsSync(this.TEMPLATE_DIR)) {
      fs.mkdirSync(this.TEMPLATE_DIR, { recursive: true });
    }
  }

  /**
   * 创建对战数据 Sheet
   * 固定 18 行结构：
   * - 第 1 行：MatchInfo 表头
   * - 第 2 行：MatchInfo 数据
   * - 第 3 行：TeamStats 表头
   * - 第 4-5 行：TeamStats 数据（红方、蓝方）
   * - 第 6 行：PlayerStats 表头
   * - 第 7-16 行：PlayerStats 数据（红方 5 人 + 蓝方 5 人）
   * - 第 17 行：BAN 表头（新增）
   * - 第 18 行：BAN 数据（红方5个 + 蓝方5个）
   */
  private async createMatchDataSheet(workbook: ExcelJS.Workbook): Promise<void> {
    const sheet = workbook.addWorksheet('MatchData');

    // 设置列宽
    for (let col = 1; col <= 15; col++) {
      sheet.getColumn(col).width = 12;
    }
    sheet.getColumn(2).width = 15; // 战队名/位置
    sheet.getColumn(3).width = 15; // 选手昵称
    sheet.getColumn(4).width = 12; // 英雄名

    // ========== 第 1-2 行：MatchInfo（对战信息）==========

    // 第 1 行：MatchInfo 表头（7列）
    const matchInfoHeaders = [
      '红方战队名',
      '蓝方战队名',
      '局数',
      '比赛时间',
      '获胜方',
      'MVP',
      '视频BV号', // 新增：视频BV号（大小写敏感）
    ];
    matchInfoHeaders.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCE5FF' },
      };
      cell.alignment = { horizontal: 'center' };
    });

    // 第 2 行：MatchInfo 示例数据
    sheet.getCell('A2').value = 'BLG';
    sheet.getCell('B2').value = 'WBG';
    sheet.getCell('C2').value = 1;
    sheet.getCell('D2').value = '2026-04-16 14:00';
    sheet.getCell('E2').value = 'red';  // 获胜方
    sheet.getCell('F2').value = 'Knight';  // MVP
    sheet.getCell('G2').value = 'BV1Ab4y1X7zK';  // 视频BV号

    // 为获胜方添加数据验证（下拉列表）
    ['E2'].forEach((cellAddr) => {
      sheet.getCell(cellAddr).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"red,blue"'],
        showErrorMessage: true,
        errorTitle: '无效值',
        error: '必须是 red 或 blue',
      };
    });

    // ========== 第 3-5 行：TeamStats（战队数据）==========

    // 第 3 行：TeamStats 表头
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
    teamStatsHeaders.forEach((header, index) => {
      const cell = sheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE0B2' },
      };
      cell.alignment = { horizontal: 'center' };
    });

    // 第 4 行：TeamStats 红方数据
    sheet.getCell('A4').value = 'red';
    sheet.getCell('B4').value = 'BLG';
    sheet.getCell('C4').value = 25;
    sheet.getCell('D4').value = 18;
    sheet.getCell('E4').value = 47;
    sheet.getCell('F4').value = 65000;
    sheet.getCell('G4').value = 9;
    sheet.getCell('H4').value = 3;
    sheet.getCell('I4').value = 1;

    // 第 5 行：TeamStats 蓝方数据
    sheet.getCell('A5').value = 'blue';
    sheet.getCell('B5').value = 'WBG';
    sheet.getCell('C5').value = 18;
    sheet.getCell('D5').value = 25;
    sheet.getCell('E5').value = 35;
    sheet.getCell('F5').value = 58000;
    sheet.getCell('G5').value = 3;
    sheet.getCell('H5').value = 1;
    sheet.getCell('I5').value = 0;

    // 为阵营添加数据验证
    [4, 5].forEach((row) => {
      // 阵营下拉列表
      sheet.getCell(row, 1).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"red,blue"'],
        showErrorMessage: true,
        errorTitle: '无效值',
        error: '阵营必须是 red 或 blue',
      };
    });

    // ========== 第 6-16 行：PlayerStats（选手数据）==========

    // 第 6 行：PlayerStats 表头
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
    playerStatsHeaders.forEach((header, index) => {
      const cell = sheet.getCell(6, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4EDDA' },
      };
      cell.alignment = { horizontal: 'center' };
    });

    // 红方选手示例数据（第 7-11 行）
    const redTeamPlayers = [
      {
        position: 'TOP',
        nickname: 'Bin',
        champion: '格温',
        kills: 2,
        deaths: 2,
        assists: 11,
        cs: 349,
        gold: 17315,
        damage: 28500,
        taken: 32000,
        level: 18,
        vision: 45,
        wards: 12,
      },
      {
        position: 'JUNGLE',
        nickname: 'Xun',
        champion: '潘森',
        kills: 4,
        deaths: 7,
        assists: 10,
        cs: 261,
        gold: 14855,
        damage: 22000,
        taken: 28000,
        level: 16,
        vision: 38,
        wards: 8,
      },
      {
        position: 'MID',
        nickname: 'Knight',
        champion: '奎桑提',
        kills: 13,
        deaths: 0,
        assists: 11,
        cs: 339,
        gold: 19592,
        damage: 35000,
        taken: 18000,
        level: 18,
        vision: 42,
        wards: 6,
      },
      {
        position: 'ADC',
        nickname: 'Viper',
        champion: '艾希',
        kills: 7,
        deaths: 3,
        assists: 10,
        cs: 368,
        gold: 19385,
        damage: 32000,
        taken: 21000,
        level: 18,
        vision: 35,
        wards: 4,
      },
      {
        position: 'SUPPORT',
        nickname: 'ON',
        champion: '萨勒芬妮',
        kills: 0,
        deaths: 3,
        assists: 22,
        cs: 47,
        gold: 11580,
        damage: 8500,
        taken: 15000,
        level: 15,
        vision: 78,
        wards: 18,
      },
    ];

    // 蓝方选手示例数据（第 12-16 行）
    const blueTeamPlayers = [
      {
        position: 'TOP',
        nickname: 'TheShy',
        champion: '奎桑提',
        kills: 1,
        deaths: 3,
        assists: 8,
        cs: 289,
        gold: 15200,
        damage: 21000,
        taken: 35000,
        level: 17,
        vision: 42,
        wards: 10,
      },
      {
        position: 'JUNGLE',
        nickname: 'Tian',
        champion: '蔚',
        kills: 3,
        deaths: 5,
        assists: 9,
        cs: 198,
        gold: 12500,
        damage: 18000,
        taken: 26000,
        level: 15,
        vision: 36,
        wards: 9,
      },
      {
        position: 'MID',
        nickname: 'Rookie',
        champion: '阿狸',
        kills: 5,
        deaths: 6,
        assists: 7,
        cs: 312,
        gold: 16800,
        damage: 25000,
        taken: 19000,
        level: 17,
        vision: 38,
        wards: 5,
      },
      {
        position: 'ADC',
        nickname: 'Hope',
        champion: '厄斐琉斯',
        kills: 6,
        deaths: 5,
        assists: 6,
        cs: 352,
        gold: 17500,
        damage: 28000,
        taken: 22000,
        level: 18,
        vision: 32,
        wards: 3,
      },
      {
        position: 'SUPPORT',
        nickname: 'Crisp',
        champion: '烈娜塔',
        kills: 3,
        deaths: 6,
        assists: 5,
        cs: 38,
        gold: 9800,
        damage: 7500,
        taken: 18000,
        level: 14,
        vision: 82,
        wards: 20,
      },
    ];

    // 填充红方选手数据
    redTeamPlayers.forEach((player, index) => {
      const row = 7 + index;
      sheet.getCell(row, 1).value = 'red';
      sheet.getCell(row, 2).value = player.position;
      sheet.getCell(row, 3).value = player.nickname;
      sheet.getCell(row, 4).value = player.champion;
      sheet.getCell(row, 5).value = player.kills;
      sheet.getCell(row, 6).value = player.deaths;
      sheet.getCell(row, 7).value = player.assists;
      sheet.getCell(row, 8).value = player.cs;
      sheet.getCell(row, 9).value = player.gold;
      sheet.getCell(row, 10).value = player.damage;
      sheet.getCell(row, 11).value = player.taken;
      sheet.getCell(row, 12).value = player.level;
      sheet.getCell(row, 13).value = player.vision;
      sheet.getCell(row, 14).value = player.wards;
      sheet.getCell(row, 15).value = player.wards; // 排眼数（示例使用相同值）
    });

    // 填充蓝方选手数据
    blueTeamPlayers.forEach((player, index) => {
      const row = 12 + index;
      sheet.getCell(row, 1).value = 'blue';
      sheet.getCell(row, 2).value = player.position;
      sheet.getCell(row, 3).value = player.nickname;
      sheet.getCell(row, 4).value = player.champion;
      sheet.getCell(row, 5).value = player.kills;
      sheet.getCell(row, 6).value = player.deaths;
      sheet.getCell(row, 7).value = player.assists;
      sheet.getCell(row, 8).value = player.cs;
      sheet.getCell(row, 9).value = player.gold;
      sheet.getCell(row, 10).value = player.damage;
      sheet.getCell(row, 11).value = player.taken;
      sheet.getCell(row, 12).value = player.level;
      sheet.getCell(row, 13).value = player.vision;
      sheet.getCell(row, 14).value = player.wards;
      sheet.getCell(row, 15).value = player.wards;
    });

    // 为选手数据添加数据验证（第 7-16 行）
    for (let row = 7; row <= 16; row++) {
      // 阵营下拉列表
      sheet.getCell(row, 1).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"red,blue"'],
        showErrorMessage: true,
        errorTitle: '无效值',
        error: '阵营必须是 red 或 blue',
      };
      // 位置下拉列表
      sheet.getCell(row, 2).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"TOP,JUNGLE,MID,ADC,SUPPORT"'],
        showErrorMessage: true,
        errorTitle: '无效值',
        error: '位置必须是 TOP/JUNGLE/MID/ADC/SUPPORT 之一',
      };
    }

    // ========== 第 17-18 行：BAN 数据（新增）==========

    // 第 17 行：BAN 表头
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
    banHeaders.forEach((header, index) => {
      const cell = sheet.getCell(17, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFB3B3' }, // 浅红色背景
      };
      cell.alignment = { horizontal: 'center' };
    });

    // 第 18 行：BAN 示例数据（英雄中文名或英文ID）
    const redBans = ['亚托克斯', '格雷福斯', '阿狸', '卡莎', '锤石'];
    const blueBans = ['雷克顿', '李青', '辛德拉', '厄斐琉斯', '蕾欧娜'];

    redBans.forEach((ban, index) => {
      sheet.getCell(18, index + 1).value = ban;
    });
    blueBans.forEach((ban, index) => {
      sheet.getCell(18, index + 5 + 1).value = ban;
    });
  }
}
