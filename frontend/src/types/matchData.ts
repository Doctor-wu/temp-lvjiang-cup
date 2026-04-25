/**
 * 对战数据相关类型定义
 */
export type { PositionType } from './position';
import type { PositionType } from './position';

/**
 * 错误码定义
 */
export enum MatchDataErrorCode {
  /** 成功 */
  SUCCESS = 0,
  /** 参数校验失败 */
  VALIDATION_FAILED = 40001,
  /** 局数超出赛制限制 */
  GAME_NUMBER_EXCEEDED = 40002,
  /** 对战数据不存在 */
  MATCH_DATA_NOT_FOUND = 40003,
  /** 权限不足 */
  INSUFFICIENT_PERMISSIONS = 40004,
  /** 未登录或 token 过期 */
  UNAUTHORIZED = 40100,
  /** 服务器内部错误 */
  INTERNAL_SERVER_ERROR = 50000,
}

/**
 * 战队游戏统计数据
 */
export interface TeamGameData {
  /** 战队 ID */
  teamId: string;
  /** 战队名称 */
  teamName: string;
  /** 战队 Logo URL */
  logoUrl?: string;
  /** 红蓝方标识 */
  side: 'blue' | 'red';
  /** 总击杀 */
  kills: number;
  /** 总经济 */
  gold: number;
  /** 推塔数 */
  towers: number;
  /** 控龙数 */
  dragons: number;
  /** 控 Baron 数 */
  barons: number;
  /** 是否为获胜方 */
  isWinner: boolean;
  /** 团队总伤害（用于计算伤害占比） */
  totalDamage?: number;
  /** 团队总承伤（用于计算承伤占比） */
  totalDamageTaken?: number;
}

/**
 * 选手对战统计数据
 */
export interface PlayerStat {
  /** 记录 ID */
  id: number;
  /** 选手 ID */
  playerId: string;
  /** 选手昵称 */
  playerName: string;
  /** 战队 ID */
  teamId: string;
  /** 战队名称 */
  teamName: string;
  /** 位置 */
  position: PositionType;
  /** 使用英雄 */
  championName: string;
  /** 击杀数 */
  kills: number;
  /** 死亡数 */
  deaths: number;
  /** 助攻数 */
  assists: number;
  /** KDA 字符串 (格式: K/D/A) */
  kda: string;
  /** 补刀数 */
  cs: number;
  /** 总经济 */
  gold: number;
  /** 造成伤害 */
  damageDealt: number;
  /** 承受伤害 */
  damageTaken: number;
  /** 视野得分 */
  visionScore: number;
  /** 插眼数 */
  wardsPlaced: number;
  /** 最终等级 */
  level: number;
  /** 是否一血 */
  firstBlood: boolean;
  /** 是否 MVP */
  mvp: boolean;
  /** 选手头像 URL（从 team_members.avatar_url 联表查询获取） */
  playerAvatarUrl?: string;
}

/**
 * BAN数据
 */
export interface BanData {
  /** 红色方BAN列表（英雄英文ID） */
  red: string[];
  /** 蓝色方BAN列表（英雄英文ID） */
  blue: string[];
}

/**
 * 单局对战完整数据
 */
export interface MatchGameData {
  /** 对战记录 ID */
  id: number;
  /** 比赛 ID */
  matchId: string;
  /** 局数 (1-5) */
  gameNumber: number;
  /** 获胜方战队 ID */
  winnerTeamId: string | null;
  /** 游戏时长 (格式 MM:SS) */
  gameDuration: string;
  /** 本局开始时间 (ISO 8601) */
  gameStartTime: string | null;
  /** 视频BV号 */
  videoBvid?: string | null;
  /** 蓝色方战队数据 */
  blueTeam: TeamGameData;
  /** 红色方战队数据 */
  redTeam: TeamGameData;
  /** BAN数据 */
  bans?: BanData;
  /** 选手统计数据列表 */
  playerStats: PlayerStat[];
}

/**
 * 对局概要信息（用于系列赛列表）
 */
export interface GameSummary {
  /** 局数 */
  gameNumber: number;
  /** 获胜方战队 ID */
  winnerTeamId: string | null;
  /** 游戏时长 */
  gameDuration: string | null;
  /** 是否有数据 */
  hasData: boolean;
}

/**
 * 对战系列信息
 */
export interface MatchSeriesInfo {
  /** 比赛 ID */
  matchId: string;
  /** 战队 A 信息 */
  teamA: {
    id: string;
    name: string;
  };
  /** 战队 B 信息 */
  teamB: {
    id: string;
    name: string;
  };
  /** 赛制 (BO1/BO3/BO5) */
  format: 'BO1' | 'BO3' | 'BO5';
  /** 各局概要列表 */
  games: GameSummary[];
}

/**
 * 检查对战数据存在性响应
 */
export interface MatchDataCheckResponse {
  /** 是否存在对战数据 */
  hasData: boolean;
  /** 数据局数 */
  gameCount: number;
}

/**
 * 导入对战数据错误项
 */
export interface MatchDataImportError {
  /** 错误行号 */
  row: number;
  /** 选手昵称 */
  nickname: string;
  /** 阵营（红方/蓝方） */
  side: string;
  /** 错误类型 */
  type: 'player_not_found' | 'team_mismatch' | 'data_validation' | 'parse_error';
  /** 错误信息 */
  message: string;
}

/**
 * 导入对战数据响应
 */
export interface ImportMatchDataResponse {
  /** 是否导入成功 */
  imported: boolean;
  /** 导入的局数 */
  gameNumber: number;
  /** 导入的选手数据条数 */
  playerCount: number;
  /** 失败的选手数量 */
  failedCount?: number;
  /** 是否为覆盖导入（同一局已有数据） */
  overwritten?: boolean;
  /** 失败详情列表 */
  failedPlayers?: MatchDataImportError[];
}

/**
 * 更新对战数据响应
 */
export interface UpdateMatchDataResponse {
  /** 是否更新成功 */
  updated: boolean;
  /** 对战记录 ID */
  gameId: number;
}

/**
 * 雷达图维度配置
 */
export interface RadarDimension {
  /** 维度标签（中文） */
  label: string;
  /** 维度键名 */
  key: string;
  /** 最大值（用于归一化） */
  max: number;
}

/**
 * 雷达图数据点
 */
export interface RadarData {
  /** 战队名称 */
  name: string;
  /** 各维度数值 */
  value: number[];
}

/**
 * 通用 API 响应类型（沿用项目现有格式）
 */
export interface ApiResponse<T = unknown> {
  /** 响应状态码 */
  code: number;
  /** 响应数据 */
  data?: T;
  /** 响应消息 */
  message?: string;
  /** 是否成功 */
  success: boolean;
}
