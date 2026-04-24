import * as xlsx from 'xlsx';
import { findChampionId } from '../teams/utils/champion-map.util';

// ============= 接口定义 =============

export interface MatchInfoData {
  redTeamName: string;
  blueTeamName: string;
  gameNumber: number;
  gameStartTime: string;
  gameDuration: string;
  winner: string;
  firstBlood: string;
  mvp: string;
}

export interface TeamStatsData {
  side: string;
  teamName: string;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  towers: number;
  dragons: number;
  barons: number;
}

export interface PlayerStatsData {
  side: string;
  position: string;
  nickname: string;
  championName: string;
  championNameRaw: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damageDealt: number;
  damageTaken: number;
  level: number;
  visionScore: number;
  wardsPlaced: number;
  wardsCleared: number;
}

export interface BanData {
  redBans: string[];
  blueBans: string[];
  errors: string[];
}

export interface ParsedMatchData {
  matchInfo: MatchInfoData;
  teamStats: TeamStatsData[];
  playerStats: PlayerStatsData[];
  bans: BanData;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface MatchResultData {
  matchInfo: MatchInfoData;
  teamStats: TeamStatsData[];
  playerStats: PlayerStatsData[];
  validations: ValidationResult;
}

// ============= 辅助函数 =============

function extractCellValue(cellValue: any): string {
  if (cellValue === null || cellValue === undefined) {
    return '';
  }
  if (typeof cellValue === 'string') {
    return cellValue.trim();
  }
  return String(cellValue).trim();
}

function extractNumericValue(cellValue: any): number {
  if (cellValue === null || cellValue === undefined || cellValue === '') {
    return 0;
  }
  const num = Number(cellValue);
  return isNaN(num) ? 0 : num;
}

// ============= 数据验证函数 =============

export function validateMatchInfo(data: MatchInfoData): ValidationResult {
  const errors: string[] = [];

  if (!data.redTeamName) {
    errors.push('红方战队名称不能为空');
  }
  if (!data.blueTeamName) {
    errors.push('蓝方战队名称不能为空');
  }
  if (data.gameNumber < 1 || data.gameNumber > 5) {
    errors.push('局数必须在1-5之间');
  }
  if (!data.gameStartTime) {
    errors.push('游戏开始时间不能为空');
  }
  if (!data.gameDuration) {
    errors.push('游戏时长不能为空');
  } else if (!isValidDurationFormat(data.gameDuration)) {
    errors.push('游戏时长格式错误，应为 MM:SS 格式');
  }
  if (!data.winner) {
    errors.push('获胜方不能为空');
  } else if (!['red', 'blue', 'Red', 'Blue', '红方', '蓝方'].includes(data.winner)) {
    errors.push('获胜方必须是 red 或 blue');
  }

  return { valid: errors.length === 0, errors };
}

export function validateTeamStats(data: TeamStatsData, rowIndex: number): ValidationResult {
  const errors: string[] = [];

  if (!data.side) {
    errors.push(`第${rowIndex}行: 阵营不能为空`);
  } else if (!['red', 'blue', 'Red', 'Blue', '红方', '蓝方'].includes(data.side)) {
    errors.push(`第${rowIndex}行: 阵营必须是 red 或 blue`);
  }
  if (!data.teamName) {
    errors.push(`第${rowIndex}行: 战队名称不能为空`);
  }
  if (data.kills < 0) {
    errors.push(`第${rowIndex}行: 击杀数不能为负数`);
  }
  if (data.deaths < 0) {
    errors.push(`第${rowIndex}行: 死亡数不能为负数`);
  }
  if (data.assists < 0) {
    errors.push(`第${rowIndex}行: 助攻数不能为负数`);
  }
  if (data.gold < 0) {
    errors.push(`第${rowIndex}行: 经济不能为负数`);
  }
  if (data.towers < 0) {
    errors.push(`第${rowIndex}行: 推塔数不能为负数`);
  }
  if (data.dragons < 0) {
    errors.push(`第${rowIndex}行: 控龙数不能为负数`);
  }
  if (data.barons < 0) {
    errors.push(`第${rowIndex}行: 控Baron数不能为负数`);
  }

  return { valid: errors.length === 0, errors };
}

export function validatePlayerStats(data: PlayerStatsData, rowIndex: number): ValidationResult {
  const errors: string[] = [];

  if (!data.side) {
    errors.push(`第${rowIndex}行: 阵营不能为空`);
  } else if (!['red', 'blue', 'Red', 'Blue', '红方', '蓝方'].includes(data.side)) {
    errors.push(`第${rowIndex}行: 阵营必须是 red 或 blue`);
  }
  if (!data.position) {
    errors.push(`第${rowIndex}行: 位置不能为空`);
  } else if (!isValidPosition(data.position)) {
    errors.push(`第${rowIndex}行: 位置必须是 TOP/JUNGLE/MID/ADC/SUPPORT 之一`);
  }
  if (!data.nickname) {
    errors.push(`第${rowIndex}行: 选手昵称不能为空`);
  }
  if (!data.championName) {
    errors.push(`第${rowIndex}行: 使用英雄不能为空`);
  }
  if (data.kills < 0) {
    errors.push(`第${rowIndex}行: 击杀数不能为负数`);
  }
  if (data.deaths < 0) {
    errors.push(`第${rowIndex}行: 死亡数不能为负数`);
  }
  if (data.assists < 0) {
    errors.push(`第${rowIndex}行: 助攻数不能为负数`);
  }
  if (data.cs < 0) {
    errors.push(`第${rowIndex}行: 补刀数不能为负数`);
  }
  if (data.gold < 0) {
    errors.push(`第${rowIndex}行: 经济不能为负数`);
  }
  if (data.damageDealt < 0) {
    errors.push(`第${rowIndex}行: 伤害不能为负数`);
  }
  if (data.damageTaken < 0) {
    errors.push(`第${rowIndex}行: 承伤不能为负数`);
  }
  if (data.level < 1 || data.level > 18) {
    errors.push(`第${rowIndex}行: 等级必须在1-18之间`);
  }
  if (data.visionScore < 0) {
    errors.push(`第${rowIndex}行: 视野得分不能为负数`);
  }
  if (data.wardsPlaced < 0) {
    errors.push(`第${rowIndex}行: 插眼数不能为负数`);
  }
  if (data.wardsCleared < 0) {
    errors.push(`第${rowIndex}行: 排眼数不能为负数`);
  }

  return { valid: errors.length === 0, errors };
}

export function isValidDurationFormat(duration: string): boolean {
  if (!duration) return false;
  const match = duration.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes >= 0 && seconds >= 0 && seconds < 60;
}

export function isValidPosition(position: string): boolean {
  const validPositions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  return validPositions.includes(position.toUpperCase());
}

// ============= 匹配函数 =============

export function matchTeamName(teamName: string, existingTeamNames: string[]): string | null {
  if (!teamName || !existingTeamNames.length) {
    return null;
  }
  const normalizedInput = teamName.trim();
  for (const name of existingTeamNames) {
    if (name.trim() === normalizedInput) {
      return name;
    }
  }
  return null;
}

export function matchPlayerNickname(nickname: string, existingNicknames: string[]): string | null {
  if (!nickname || !existingNicknames.length) {
    return null;
  }
  const normalizedInput = nickname.trim().toLowerCase();
  for (const nick of existingNicknames) {
    if (nick.trim().toLowerCase() === normalizedInput) {
      return nick;
    }
  }
  return null;
}

export function matchChampionName(championName: string): string | null {
  if (!championName) {
    return null;
  }
  const championId = findChampionId(championName);
  return championId;
}

/**
 * 验证Excel中的战队名称是否与所选对战中的战队名称一致
 * @param excelRedTeamName Excel中的红方战队名
 * @param excelBlueTeamName Excel中的蓝方战队名
 * @param matchTeamNameA 对战中战队A的名称
 * @param matchTeamNameB 对战中战队B的名称
 * @returns 验证结果
 */
export function validateTeamNamesMatch(
  excelRedTeamName: string,
  excelBlueTeamName: string,
  matchTeamNameA: string,
  matchTeamNameB: string,
): ValidationResult {
  const errors: string[] = [];

  // 标准化战队名称（去除空格，统一大小写）
  const normalize = (name: string) => name.trim().toLowerCase();

  const excelRed = normalize(excelRedTeamName);
  const excelBlue = normalize(excelBlueTeamName);
  const matchA = normalize(matchTeamNameA);
  const matchB = normalize(matchTeamNameB);

  // 验证Excel中的红方战队名是否匹配对战中的某个战队
  const redMatchesA = excelRed === matchA;
  const redMatchesB = excelRed === matchB;

  if (!redMatchesA && !redMatchesB) {
    errors.push(
      `Excel中的红方战队名"${excelRedTeamName}"与所选对战中的战队名称不匹配。所选对战为：${matchTeamNameA} vs ${matchTeamNameB}`,
    );
  }

  // 验证Excel中的蓝方战队名是否匹配对战中的某个战队
  const blueMatchesA = excelBlue === matchA;
  const blueMatchesB = excelBlue === matchB;

  if (!blueMatchesA && !blueMatchesB) {
    errors.push(
      `Excel中的蓝方战队名"${excelBlueTeamName}"与所选对战中的战队名称不匹配。所选对战为：${matchTeamNameA} vs ${matchTeamNameB}`,
    );
  }

  // 验证红方和蓝方不能是同一个战队
  if (excelRed === excelBlue) {
    errors.push('Excel中的红方战队名和蓝方战队名不能相同');
  }

  // 验证红方和蓝方必须分别匹配对战中的两个不同战队
  const redValid = redMatchesA || redMatchesB;
  const blueValid = blueMatchesA || blueMatchesB;

  if (redValid && blueValid) {
    // 检查是否红方和蓝方匹配了同一个战队
    const bothMatchA = redMatchesA && blueMatchesA;
    const bothMatchB = redMatchesB && blueMatchesB;

    if (bothMatchA || bothMatchB) {
      errors.push(
        `Excel中的红方战队名"${excelRedTeamName}"和蓝方战队名"${excelBlueTeamName}"不能同时匹配同一个战队。所选对战为：${matchTeamNameA} vs ${matchTeamNameB}`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============= Excel解析核心函数 =============

export function parseMatchDataExcel(buffer: Buffer): ParsedMatchData {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    if (workbook.SheetNames.length === 0) {
      throw new Error('Excel文件中没有工作表');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });

    if (jsonData.length < 18) {
      throw new Error(`Excel文件行数不足，当前${jsonData.length}行，应为18行（包含BAN数据）`);
    }

    // 解析第2行: MatchInfo数据
    const matchInfoRow = jsonData[1];
    if (!matchInfoRow || matchInfoRow.length === 0) {
      throw new Error('第2行（对战信息数据行）为空或格式错误');
    }
    const matchInfo = parseMatchInfoRow(matchInfoRow);

    // 解析第4-5行: TeamStats数据
    const teamStats: TeamStatsData[] = [];
    for (let i = 3; i <= 4; i++) {
      if (
        jsonData[i] &&
        jsonData[i].some((cell) => cell !== null && cell !== undefined && cell !== '')
      ) {
        teamStats.push(parseTeamStatsRow(jsonData[i], i + 1));
      } else {
        throw new Error(`第${i + 1}行（战队数据行）为空或格式错误`);
      }
    }

    if (teamStats.length !== 2) {
      throw new Error(`战队数据不完整，应为2行，实际${teamStats.length}行`);
    }

    // 解析第7-16行: PlayerStats数据
    const playerStats: PlayerStatsData[] = [];
    for (let i = 6; i <= 15; i++) {
      if (
        jsonData[i] &&
        jsonData[i].some((cell) => cell !== null && cell !== undefined && cell !== '')
      ) {
        playerStats.push(parsePlayerStatsRow(jsonData[i], i + 1));
      } else {
        throw new Error(`第${i + 1}行（选手数据行）为空或格式错误`);
      }
    }

    if (playerStats.length !== 10) {
      throw new Error(`选手数据不完整，应为10行，实际${playerStats.length}行`);
    }

    // 解析第17-18行: BAN数据（新增）
    const bans = parseBansRow(jsonData[16], jsonData[17]);

    return { matchInfo, teamStats, playerStats, bans };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('解析Excel文件时发生未知错误');
  }
}

function parseMatchInfoRow(row: any[]): MatchInfoData {
  return {
    redTeamName: extractCellValue(row[0]),
    blueTeamName: extractCellValue(row[1]),
    gameNumber: extractNumericValue(row[2]),
    gameStartTime: extractCellValue(row[3]),
    gameDuration: extractCellValue(row[4]),
    winner: extractCellValue(row[5]),
    firstBlood: extractCellValue(row[6]),
    mvp: extractCellValue(row[7]),
  };
}

function parseTeamStatsRow(row: any[], _rowIndex: number): TeamStatsData {
  return {
    side: extractCellValue(row[0]),
    teamName: extractCellValue(row[1]),
    kills: extractNumericValue(row[2]),
    deaths: extractNumericValue(row[3]),
    assists: extractNumericValue(row[4]),
    gold: extractNumericValue(row[5]),
    towers: extractNumericValue(row[6]),
    dragons: extractNumericValue(row[7]),
    barons: extractNumericValue(row[8]),
  };
}

function parsePlayerStatsRow(row: any[], _rowIndex: number): PlayerStatsData {
  const rawChampionName = extractCellValue(row[3]);
  // 将中文英雄名转换为英文ID
  const championId = findChampionId(rawChampionName);
  
  return {
    side: extractCellValue(row[0]),
    position: extractCellValue(row[1]).toUpperCase(),
    nickname: extractCellValue(row[2]),
    championName: championId || '',  // 转换为英文ID，找不到则为空字符串
    championNameRaw: rawChampionName,  // 保留原始值用于错误提示
    kills: extractNumericValue(row[4]),
    deaths: extractNumericValue(row[5]),
    assists: extractNumericValue(row[6]),
    cs: extractNumericValue(row[7]),
    gold: extractNumericValue(row[8]),
    damageDealt: extractNumericValue(row[9]),
    damageTaken: extractNumericValue(row[10]),
    level: extractNumericValue(row[11]),
    visionScore: extractNumericValue(row[12]),
    wardsPlaced: extractNumericValue(row[13]),
    wardsCleared: extractNumericValue(row[14]),
  };
}

// ============= BAN数据解析函数 =============

/**
 * 解析BAN数据行
 * @param headerRow 第17行（表头）
 * @param dataRow 第18行（数据）
 * @returns BanData对象
 */
function parseBansRow(headerRow: any[] | undefined, dataRow: any[] | undefined): BanData {
  // 如果没有BAN数据行，返回空数组
  if (!dataRow || dataRow.length === 0) {
    return { redBans: [], blueBans: [], errors: [] };
  }

  const redBans: string[] = [];
  const blueBans: string[] = [];
  const errors: string[] = [];

  // 解析前5列为红方BAN
  for (let i = 0; i < 5; i++) {
    const ban = extractCellValue(dataRow[i]);
    if (ban) {
      // 将中文英雄名转换为英文ID
      const championId = findChampionId(ban);
      if (championId) {
        redBans.push(championId);
      } else {
        // 收集错误，不再直接存储原始值
        errors.push(`红方BAN${i + 1}英雄"${ban}"不存在，请检查英雄名称`);
      }
    }
  }

  // 解析后5列为蓝方BAN
  for (let i = 5; i < 10; i++) {
    const ban = extractCellValue(dataRow[i]);
    if (ban) {
      // 将中文英雄名转换为英文ID
      const championId = findChampionId(ban);
      if (championId) {
        blueBans.push(championId);
      } else {
        // 收集错误，不再直接存储原始值
        errors.push(`蓝方BAN${i - 4}英雄"${ban}"不存在，请检查英雄名称`);
      }
    }
  }

  return { redBans, blueBans, errors };
}

/**
 * 验证解析后的对战数据中的英雄名称
 * @param parsedData 解析后的对战数据
 * @returns 验证结果
 */
export function validateParsedMatchData(parsedData: ParsedMatchData): ValidationResult {
  const errors: string[] = [];

  // 验证BAN英雄
  if (parsedData.bans.errors && parsedData.bans.errors.length > 0) {
    errors.push(...parsedData.bans.errors);
  }

  // 验证选手使用英雄
  parsedData.playerStats.forEach((ps, index) => {
    if (!ps.championName && ps.championNameRaw) {
      errors.push(
        `第${index + 7}行选手"${ps.nickname}"使用的英雄"${ps.championNameRaw}"不存在，请检查英雄名称`
      );
    }
  });

  return { valid: errors.length === 0, errors };
}
