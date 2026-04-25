import { Injectable, Logger, HttpException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  NUMBER_TO_CHINESE,
  calculateSheetCount,
  validateScoreForFormat,
} from '../../utils/match-excel.util';
import {
  MatchNotFinishedException,
  InvalidScoreException,
} from '../errors/match-data-import.errors';
import { DatabaseService } from '../../../database/database.service';

export interface MatchDataImportError {
  row: number;
  nickname: string;
  side: string;
  type: 'player_not_found' | 'team_mismatch' | 'data_validation' | 'parse_error';
  message: string;
}

/**
 * 模板预填充数据接口
 */
interface TemplatePrefilledData {
  /** teamA战队名 */
  teamAName: string;
  /** teamB战队名 */
  teamBName: string;
  /** 局数 */
  gameNumber: number;
  /** 比赛开始时间 */
  matchStartTime?: string;
}

@Injectable()
export class MatchDataImportService {
  private readonly logger = new Logger(MatchDataImportService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 根据对战信息动态生成导入模板
   * Sheet数量 = 双方比分之和（即实际对局数）
   * @param matchId 对战ID
   * @returns Excel文件Buffer
   */
  async generateTemplate(matchId: string): Promise<Buffer> {
    // 1. 查询对战信息
    const match = await (
      this.databaseService.get as <T = any>(sql: string, params: any[]) => Promise<T>
    )(
      `SELECT m.id, m.bo_format, m.score_a, m.score_b, m.status, m.start_time,
              ta.name as team_a_name, tb.name as team_b_name
       FROM matches m
       LEFT JOIN teams ta ON m.team_a_id = ta.id
       LEFT JOIN teams tb ON m.team_b_id = tb.id
       WHERE m.id = ?`,
      [matchId],
    );

    if (!match) {
      throw new HttpException('对战不存在', 404);
    }

    // 2. 校验对战状态
    if (match.status !== 'finished') {
      throw new MatchNotFinishedException();
    }

    // 3. 校验比分
    const scoreResult = validateScoreForFormat(match.score_a, match.score_b, match.bo_format);
    if (!scoreResult.valid) {
      throw new InvalidScoreException(scoreResult.errors);
    }

    // 4. 计算Sheet数量
    const sheetCount = calculateSheetCount(match.score_a, match.score_b);

    // 5. 生成多Sheet的Excel文件
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    workbook.modified = new Date();

    for (let i = 1; i <= sheetCount; i++) {
      const sheetName = `第${NUMBER_TO_CHINESE[i]}局`;
      await this.createMatchDataSheet(workbook, sheetName, {
        teamAName: match.team_a_name,
        teamBName: match.team_b_name,
        gameNumber: i,
        matchStartTime: match.start_time,
      });
    }

    // 6. 生成Buffer返回
    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Template generated for match ${matchId}: ${sheetCount} sheets`);
    return Buffer.from(buffer);
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

  /**
   * 格式化比赛开始时间
   * @param startTime 数据库中的开始时间字符串或Date
   * @returns 格式化后的时间字符串 YYYY-MM-DD HH:mm
   */
  private formatMatchStartTime(startTime: string | Date | null | undefined): string {
    if (!startTime) {
      return '';
    }
    const date = typeof startTime === 'string' ? new Date(startTime) : startTime;
    if (isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * 创建对战数据 Sheet
   * 固定 18 行结构：
   * - 第 1 行：MatchInfo 表头
   * - 第 2 行：MatchInfo 数据（预填充已知字段，未知字段留空）
   * - 第 3 行：TeamStats 表头
   * - 第 4-5 行：TeamStats 数据（红方、蓝方，仅阵营填充）
   * - 第 6 行：PlayerStats 表头
   * - 第 7-16 行：PlayerStats 数据（红方 5 人 + 蓝方 5 人，仅阵营和位置填充）
   * - 第 17 行：BAN 表头
   * - 第 18 行：BAN 数据（全部留空）
   * @param workbook Excel工作簿
   * @param sheetName Sheet名称（如"第一局"）
   * @param prefilledData 预填充数据
   */
  private async createMatchDataSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    prefilledData: TemplatePrefilledData,
  ): Promise<void> {
    const sheet = workbook.addWorksheet(sheetName);

    // 设置列宽
    for (let col = 1; col <= 15; col++) {
      sheet.getColumn(col).width = 12;
    }
    sheet.getColumn(2).width = 15; // 战队名/位置
    sheet.getColumn(3).width = 15; // 选手昵称
    sheet.getColumn(4).width = 12; // 英雄名

    // ========== 第 1-2 行：MatchInfo（对战信息）==========

    // 第 1 行：MatchInfo 表头（8列）
    const matchInfoHeaders = [
      'teamA',
      'teamB',
      '局数',
      '比赛时间',
      '游戏时长',
      '获胜方',
      'MVP',
      '视频BV号',
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

    // 第 2 行：MatchInfo 数据 - 预填充已知字段，未知字段留空
    sheet.getCell('A2').value = prefilledData.teamAName; // teamA - 填充
    sheet.getCell('B2').value = prefilledData.teamBName; // teamB - 填充
    sheet.getCell('C2').value = prefilledData.gameNumber; // 局数 - 填充
    // 比赛时间 - 如果有则预填充，否则留空
    sheet.getCell('D2').value = prefilledData.matchStartTime
      ? this.formatMatchStartTime(prefilledData.matchStartTime)
      : '';
    // 游戏时长 - 留空，格式设置为文本防止Excel自动转换
    const durationCell = sheet.getCell('E2');
    durationCell.value = '';
    durationCell.numFmt = '@';
    sheet.getCell('F2').value = ''; // 获胜方 - 留空
    sheet.getCell('G2').value = ''; // MVP - 留空
    sheet.getCell('H2').value = ''; // 视频BV号 - 留空

    // 为获胜方添加数据验证（下拉列表）
    ['F2'].forEach((cellAddr) => {
      sheet.getCell(cellAddr).dataValidation = {
        type: 'list',
        allowBlank: true,
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

    // 第 4 行：TeamStats 红方数据 - 仅阵营填充，战队名留空
    sheet.getCell('A4').value = 'red';
    sheet.getCell('B4').value = ''; // 战队名 - 留空（红蓝方可能交换）

    // 第 5 行：TeamStats 蓝方数据 - 仅阵营填充，战队名留空
    sheet.getCell('A5').value = 'blue';
    sheet.getCell('B5').value = ''; // 战队名 - 留空

    // 为阵营添加数据验证
    [4, 5].forEach((row) => {
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

    // 红方选手数据（第 7-11 行）- 仅阵营和位置填充
    const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
    for (let i = 0; i < 5; i++) {
      const row = 7 + i;
      sheet.getCell(row, 1).value = 'red'; // 阵营 - 填充
      sheet.getCell(row, 2).value = positions[i]; // 位置 - 填充
      sheet.getCell(row, 3).value = ''; // 选手昵称 - 留空
      sheet.getCell(row, 4).value = ''; // 英雄名 - 留空
    }

    // 蓝方选手数据（第 12-16 行）- 仅阵营和位置填充
    for (let i = 0; i < 5; i++) {
      const row = 12 + i;
      sheet.getCell(row, 1).value = 'blue'; // 阵营 - 填充
      sheet.getCell(row, 2).value = positions[i]; // 位置 - 填充
      sheet.getCell(row, 3).value = ''; // 选手昵称 - 留空
      sheet.getCell(row, 4).value = ''; // 英雄名 - 留空
    }

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

    // ========== 第 17-18 行：BAN 数据 ==========

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
        fgColor: { argb: 'FFFFB3B3' },
      };
      cell.alignment = { horizontal: 'center' };
    });

    // 第 18 行：BAN 数据 - 全部留空
    for (let col = 1; col <= 10; col++) {
      sheet.getCell(18, col).value = '';
    }
  }
}
