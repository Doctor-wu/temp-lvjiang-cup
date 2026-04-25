import * as xlsx from 'xlsx';
import { findChampionId } from '../teams/utils/champion-map.util';

// ============= 接口定义 =============

export interface MatchInfoData {
  teamAName: string;
  teamBName: string;
  gameNumber: number;
  gameStartTime: string;
  gameDuration: string; // 保留（向后兼容，标记废弃）
  winner: string;
  firstBlood: string; // 保留（向后兼容，标记废弃）
  mvp: string;
  videoBvid?: string; // 新增：视频BV号（大小写敏感）
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

  if (!data.teamAName) {
    errors.push('teamA战队名称不能为空');
  }
  if (!data.teamBName) {
    errors.push('teamB战队名称不能为空');
  }
  if (data.gameNumber < 1 || data.gameNumber > 5) {
    errors.push('局数必须在1-5之间');
  }
  if (!data.gameStartTime) {
    errors.push('游戏开始时间不能为空');
  }
  // 恢复游戏时长验证（用于雷达图维度计算）
  if (!data.gameDuration) {
    errors.push('游戏时长不能为空');
  } else if (!isValidDurationFormat(data.gameDuration)) {
    errors.push('游戏时长格式错误，应为 MM:SS 或 HH:MM:SS 格式');
  }
  if (!data.winner) {
    errors.push('获胜方不能为空');
  } else if (!['red', 'blue', 'Red', 'Blue', '红方', '蓝方'].includes(data.winner)) {
    errors.push('获胜方必须是 red 或 blue');
  }
  // BV号格式验证（如果填写）
  if (data.videoBvid && !isValidBVId(data.videoBvid)) {
    errors.push('视频BV号格式错误，应为 BVxxxxxxxxxx 格式');
  }
  return { valid: errors.length === 0, errors };
}

// ============= Sheet名称解析与校验工具函数 =============

/**
 * 中文数字映射表
 * 将中文数字字符转换为对应的阿拉伯数字
 */
const CHINESE_NUMBER_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
};

/**
 * 数字转中文映射表
 * 将阿拉伯数字转换为对应的中文数字
 */
export const NUMBER_TO_CHINESE: Record<number, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
};

/**
 * Sheet名称正则表达式
 * 匹配"第X局"格式，X可以是中文数字（一至五）或阿拉伯数字（1-5）
 */
const SHEET_NAME_REGEX = /^第([一二三四五1-5])局$/;

/**
 * 赛制最大局数映射
 * 不同赛制允许的最大对局数
 */
export const BO_FORMAT_MAX_GAMES: Record<string, number> = {
  BO1: 1,
  BO3: 3,
  BO5: 5,
};

/**
 * 赛制胜出分数映射
 * 不同赛制中胜方需要达到的最低分数
 */
export const BO_FORMAT_WIN_SCORE: Record<string, number> = {
  BO1: 1,
  BO3: 2,
  BO5: 3,
};

/**
 * Sheet校验结果接口
 */
export interface SheetValidationResult {
  /** 是否校验通过 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
}

/**
 * 有效Sheet信息接口
 */
export interface ValidSheetInfo {
  /** Sheet名称 */
  sheetName: string;
  /** 解析出的局数 */
  gameNumber: number;
}

/**
 * 局数不一致告警接口
 */
export interface GameNumberWarning {
  /** Sheet名称 */
  sheetName: string;
  /** Sheet名称解析的局数 */
  sheetGameNumber: number;
  /** Excel中填写的局数 */
  excelGameNumber: number;
  /** 最终使用的局数（以Sheet名称为准） */
  resolvedGameNumber: number;
  /** 告警描述信息 */
  message: string;
}

/**
 * 导入选项接口
 */
export interface ImportOptions {
  /** 预检模式：仅校验不导入 */
  dryRun?: boolean;
  /** 确认告警后继续导入 */
  confirmWarnings?: boolean;
}

/**
 * 单局导入结果接口
 */
export interface SingleGameImportResult {
  /** 局数 */
  gameNumber: number;
  /** 是否导入成功 */
  imported: boolean;
  /** 导入的选手数据条数 */
  playerCount: number;
  /** 失败的选手数量 */
  failedCount: number;
  /** 是否为覆盖导入 */
  overwritten: boolean;
  /** 失败的选手详情 */
  failedPlayers?: any[];
  /** 错误信息（导入失败时） */
  error?: string;
}

/**
 * 多局导入响应接口
 */
export interface MultiGameImportResponse {
  /** 是否全部导入成功 */
  imported: boolean;
  /** 总导入局数 */
  totalGames: number;
  /** 各局导入结果 */
  results: SingleGameImportResult[];
  /** 局数不一致告警 */
  warnings?: GameNumberWarning[];
}

/**
 * 解析Sheet名称，提取局数
 * 支持"第X局"格式，X可以是中文数字（一至五）或阿拉伯数字（1-5）
 * 自动去除前后空格
 * @param sheetName Sheet名称
 * @returns 局数（1-5），不匹配返回null
 */
export function parseSheetGameNumber(sheetName: string): number | null {
  const trimmed = sheetName.trim();
  const match = trimmed.match(SHEET_NAME_REGEX);
  if (!match) return null;

  const numStr = match[1];
  if (CHINESE_NUMBER_MAP[numStr] !== undefined) {
    return CHINESE_NUMBER_MAP[numStr];
  }
  return parseInt(numStr, 10);
}

/**
 * 校验多个Sheet的局数唯一性
 * 确保没有两个Sheet解析出相同的局数
 * @param sheets Sheet名称与解析局数的映射列表
 * @returns 校验结果
 */
export function validateGameNumberUniqueness(sheets: ValidSheetInfo[]): SheetValidationResult {
  const errors: string[] = [];
  const numberMap = new Map<number, string[]>();

  for (const item of sheets) {
    if (!numberMap.has(item.gameNumber)) {
      numberMap.set(item.gameNumber, []);
    }
    numberMap.get(item.gameNumber)!.push(item.sheetName);
  }

  for (const [gameNumber, sheetNames] of numberMap) {
    if (sheetNames.length > 1) {
      errors.push(
        `Sheet「${sheetNames.join('」和Sheet「')}」解析的局数均为${gameNumber}，局数不能重复`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验局数是否在赛制允许范围内
 * @param gameNumber 局数
 * @param boFormat 赛制（BO1/BO3/BO5）
 * @returns 是否有效
 */
export function validateGameNumberForFormat(gameNumber: number, boFormat: string): boolean {
  const maxGames = BO_FORMAT_MAX_GAMES[boFormat] || 1;
  return gameNumber >= 1 && gameNumber <= maxGames;
}

/**
 * 批量校验多个Sheet的赛制合法性
 * @param sheets 有效Sheet信息列表
 * @param boFormat 赛制（BO1/BO3/BO5）
 * @returns 校验结果
 */
export function validateSheetsForFormat(
  sheets: ValidSheetInfo[],
  boFormat: string,
): SheetValidationResult {
  const errors: string[] = [];
  const maxGames = BO_FORMAT_MAX_GAMES[boFormat] || 1;

  for (const sheet of sheets) {
    if (!validateGameNumberForFormat(sheet.gameNumber, boFormat)) {
      errors.push(
        `Sheet「${sheet.sheetName}」解析的局数为${sheet.gameNumber}，但当前对战的赛制为${boFormat}，最多允许${maxGames}局`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 根据比分计算模板Sheet数量
 * Sheet数量 = 双方比分之和（即实际对局数）
 * @param scoreA 战队A得分
 * @param scoreB 战队B得分
 * @returns Sheet数量
 */
export function calculateSheetCount(scoreA: number, scoreB: number): number {
  return scoreA + scoreB;
}

/**
 * 校验比分是否满足赛制约束
 * @param scoreA 战队A得分
 * @param scoreB 战队B得分
 * @param boFormat 赛制（BO1/BO3/BO5）
 * @returns 校验结果
 */
export function validateScoreForFormat(
  scoreA: number,
  scoreB: number,
  boFormat: string,
): SheetValidationResult {
  const errors: string[] = [];
  const maxGames = BO_FORMAT_MAX_GAMES[boFormat] || 1;
  const winScore = BO_FORMAT_WIN_SCORE[boFormat] || 1;

  const totalGames = scoreA + scoreB;
  const maxScore = Math.max(scoreA, scoreB);
  const minScore = Math.min(scoreA, scoreB);

  if (totalGames < 1 || totalGames > maxGames) {
    errors.push(`比分 ${scoreA}:${scoreB} 的总场数不在1-${maxGames}范围内`);
  }

  if (maxScore < winScore) {
    errors.push(`${boFormat}赛制中胜方至少需要${winScore}分，当前最高分为${maxScore}`);
  }

  if (minScore >= winScore) {
    errors.push(`双方得分均达到${winScore}，比分不合法`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验Sheet局数与MatchInfo局数的一致性
 * @param sheetGameNumber Sheet名称解析的局数
 * @param excelGameNumber Excel中MatchInfo填写的局数
 * @returns 一致性校验结果和告警信息
 */
export function validateGameNumberConsistency(
  sheetGameNumber: number,
  excelGameNumber: number,
): { consistent: boolean; warning: GameNumberWarning | null } {
  // MatchInfo局数为空或0，以Sheet局数为准，不告警
  if (!excelGameNumber || excelGameNumber === 0) {
    return { consistent: true, warning: null };
  }

  // 一致
  if (sheetGameNumber === excelGameNumber) {
    return { consistent: true, warning: null };
  }

  // 不一致，生成告警
  return {
    consistent: false,
    warning: {
      sheetName: '',
      sheetGameNumber,
      excelGameNumber,
      resolvedGameNumber: sheetGameNumber,
      message: `Sheet名称解析的局数为${sheetGameNumber}，但表格中填写的局数为${excelGameNumber}，将以Sheet名称的局数${sheetGameNumber}为准`,
    },
  };
}

// 新增BV号验证函数
function isValidBVId(bvid: string): boolean {
  // BV号格式：以BV开头，后接10位大小写字母和数字
  return /^BV[a-zA-Z0-9]{10}$/.test(bvid);
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
  // 支持 MM:SS 格式
  const mmssMatch = duration.match(/^(\d{1,2}):(\d{2})$/);
  if (mmssMatch) {
    const minutes = parseInt(mmssMatch[1], 10);
    const seconds = parseInt(mmssMatch[2], 10);
    return minutes >= 0 && seconds >= 0 && seconds < 60;
  }
  // 支持 HH:MM:SS 格式
  const hhmmssMatch = duration.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hhmmssMatch) {
    const hours = parseInt(hhmmssMatch[1], 10);
    const minutes = parseInt(hhmmssMatch[2], 10);
    const seconds = parseInt(hhmmssMatch[3], 10);
    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60;
  }
  return false;
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
 * @param excelTeamAName Excel中的teamA战队名
 * @param excelTeamBName Excel中的teamB战队名
 * @param matchTeamNameA 对战中战队A的名称
 * @param matchTeamNameB 对战中战队B的名称
 * @returns 验证结果
 */
export function validateTeamNamesMatch(
  excelTeamAName: string,
  excelTeamBName: string,
  matchTeamNameA: string,
  matchTeamNameB: string,
): ValidationResult {
  const errors: string[] = [];

  // 标准化战队名称（去除空格，统一大小写）
  const normalize = (name: string) => name.trim().toLowerCase();

  const excelA = normalize(excelTeamAName);
  const excelB = normalize(excelTeamBName);
  const matchA = normalize(matchTeamNameA);
  const matchB = normalize(matchTeamNameB);

  // 验证Excel中的teamA战队名是否匹配对战中的某个战队
  const aMatchesA = excelA === matchA;
  const aMatchesB = excelA === matchB;

  if (!aMatchesA && !aMatchesB) {
    errors.push(
      `Excel中的teamA战队名"${excelTeamAName}"与所选对战中的战队名称不匹配。所选对战为：${matchTeamNameA} vs ${matchTeamNameB}`,
    );
  }

  // 验证Excel中的teamB战队名是否匹配对战中的某个战队
  const bMatchesA = excelB === matchA;
  const bMatchesB = excelB === matchB;

  if (!bMatchesA && !bMatchesB) {
    errors.push(
      `Excel中的teamB战队名"${excelTeamBName}"与所选对战中的战队名称不匹配。所选对战为：${matchTeamNameA} vs ${matchTeamNameB}`,
    );
  }

  // 验证teamA和teamB不能是同一个战队
  if (excelA === excelB) {
    errors.push('Excel中的teamA战队名和teamB战队名不能相同');
  }

  // 验证teamA和teamB必须分别匹配对战中的两个不同战队
  const aValid = aMatchesA || aMatchesB;
  const bValid = bMatchesA || bMatchesB;

  if (aValid && bValid) {
    // 检查是否teamA和teamB匹配了同一个战队
    const bothMatchA = aMatchesA && bMatchesA;
    const bothMatchB = aMatchesB && bMatchesB;

    if (bothMatchA || bothMatchB) {
      errors.push(
        `Excel中的teamA战队名"${excelTeamAName}"和teamB战队名"${excelTeamBName}"不能同时匹配同一个战队。所选对战为：${matchTeamNameA} vs ${matchTeamNameB}`,
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
  // 检测格式：
  // 7列新模板（无游戏时长）: [teamA, teamB, 局数, 比赛时间, 获胜方, MVP, 视频BV号]
  // 8列新模板（含游戏时长）: [teamA, teamB, 局数, 比赛时间, 游戏时长, 获胜方, MVP, 视频BV号]
  // 8列旧模板（含游戏时长）: [红方战队名, 蓝方战队名, 局数, 比赛时间, 游戏时长, 获胜方, MVP, 视频BV号]
  // 7列旧模板（无游戏时长）: [红方战队名, 蓝方战队名, 局数, 比赛时间, 获胜方, MVP, 视频BV号]
  // 判断依据：
  //   1. 8列格式: row[4]是时长格式(含":"), row[5]是获胜方("red"/"blue")
  //   2. 7列格式: row[4]直接是获胜方("red"/"blue")
  const row4 = extractCellValue(row[4]);
  const row5 = extractCellValue(row[5]);

  const is8ColumnFormat =
    row4.includes(':') &&
    ['red', 'blue', '红方', '蓝方'].some((v) => row5.toLowerCase().includes(v));

  if (is8ColumnFormat) {
    // 8列格式（含游戏时长，用于雷达图维度计算）
    return {
      teamAName: extractCellValue(row[0]),
      teamBName: extractCellValue(row[1]),
      gameNumber: extractNumericValue(row[2]),
      gameStartTime: extractCellValue(row[3]),
      gameDuration: row4, // E列: 游戏时长
      winner: row5, // F列: 获胜方
      firstBlood: '', // 废弃
      mvp: extractCellValue(row[6]), // G列: MVP
      videoBvid: extractCellValue(row[7]), // H列: 视频BV号
    };
  } else {
    // 7列格式（无游戏时长）
    return {
      teamAName: extractCellValue(row[0]),
      teamBName: extractCellValue(row[1]),
      gameNumber: extractNumericValue(row[2]),
      gameStartTime: extractCellValue(row[3]),
      gameDuration: '', // 新格式无游戏时长（验证会失败）
      winner: row4, // E列: 获胜方
      firstBlood: '', // 废弃
      mvp: row5, // F列: MVP
      videoBvid: extractCellValue(row[6]), // G列: 视频BV号
    };
  }
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
    championName: championId || '', // 转换为英文ID，找不到则为空字符串
    championNameRaw: rawChampionName, // 保留原始值用于错误提示
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
        `第${index + 7}行选手"${ps.nickname}"使用的英雄"${ps.championNameRaw}"不存在，请检查英雄名称`,
      );
    }
  });

  return { valid: errors.length === 0, errors };
}
