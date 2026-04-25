/**
 * API 类型定义
 */
import { PositionType } from '../types/position';
import type { Match as DomainMatch } from '../types';

// 队员实力等级
export type PlayerLevel = 'S' | 'A' | 'B' | 'C' | 'D';

/**
 * 通用响应类型
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

/**
 * 错误响应类型
 */
export interface ApiError {
  /** 错误码 */
  code: number;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: unknown;
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  data: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页大小 */
  pageSize: number;
}

/**
 * 通用请求参数类型
 */
export interface BaseRequestParams {
  /** 页码，默认为 1 */
  page?: number;
  /** 每页数量，默认为 10 */
  pageSize?: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 asc|desc */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 登录相关类型
 */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  /** 用户信息 */
  user?: UserInfo;
  /** 访问令牌 (后端返回 access_token) */
  access_token?: string;
  /** 令牌类型 */
  token_type?: string;
  /** 兼容旧版本 */
  token?: string;
  /** 刷新令牌 */
  refreshToken?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 队员相关类型
 */
// 从API响应接收的队员类型(包含teamId)
export interface Player {
  id: string;
  nickname: string;
  avatarUrl?: string;
  position: PositionType;
  teamId: string;
  gameId?: string;
  bio?: string;
  championPool?: string[];
  rating?: number;
  isCaptain?: boolean;
  liveUrl?: string;
  level?: PlayerLevel;
  auctionPrice?: number;
}

// 发送到 API 的队员类型 (不包含 teamId)
export interface CreatePlayerRequest {
  id: string;
  nickname: string;
  avatarUrl?: string;
  position: PositionType;
}

// 更新队员请求类型
export interface UpdateMemberRequest {
  nickname?: string;
  avatarUrl?: string;
  position?: PositionType;
  bio?: string;
  gameId?: string;
  championPool?: string[];
  rating?: number;
  isCaptain?: boolean;
  liveUrl?: string;
  level?: PlayerLevel;
}

/**
 * 战队相关类型
 */
export interface Team {
  id: string;
  name: string;
  logo?: string;
  logoUrl?: string;
  logoThumbnailUrl?: string;
  battleCry?: string;
  members?: Player[];
  players?: Player[];
  createdAt?: string;
  updatedAt?: string;
}

// 后端期望的创建战队请求格式
// 发送到 API 的队员类型 (用于 members 数组)
export interface CreateMemberRequest {
  id: string;
  nickname: string;
  avatarUrl?: string;
  position: PositionType;
  gameId?: string;
  bio?: string;
  championPool?: string[];
  rating?: number;
  isCaptain?: boolean;
  liveUrl?: string;
  level?: PlayerLevel;
}

export interface CreateTeamRequest {
  id?: string; // 改为可选，不传则由后端生成UUID
  name: string;
  logo?: string;
  battleCry?: string;
  players?: CreatePlayerRequest[];
  members?: CreateMemberRequest[];
}

export interface UpdateTeamRequest extends Partial<CreateTeamRequest> {
  id: string;
}

/**
 * 比赛相关类型
 */
export interface Match extends DomainMatch {
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateMatchRequest {
  id: string;
  teamAId?: string;
  teamBId?: string;
  scoreA?: number;
  scoreB?: number;
  winnerId?: string;
  status?: 'upcoming' | 'ongoing' | 'finished';
  startTime?: string;
  swissRound?: number;
  boFormat?: 'BO1' | 'BO3' | 'BO5';
}

export interface FindMatchesByStageRequest {
  stage: string;
  round?: number;
}

/**
 * 直播相关类型
 */
export interface Stream {
  id: string;
  title: string;
  url: string;
  isLive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateStreamRequest {
  id: string;
  title?: string;
  url?: string;
  isLive?: boolean;
}

/**
 * 晋级相关类型
 */
export interface Advancement {
  top8: string[];
  eliminated: string[];
  rankings?: { teamId: string; record: string; rank: number }[];
}

export interface UpdateAdvancementRequest {
  top8?: string[];
  eliminated?: string[];
}

/**
 * 主播相关类型
 */
export enum StreamerType {
  INTERNAL = 'internal',
  GUEST = 'guest',
}

export interface Streamer {
  id: string;
  nickname: string;
  posterUrl: string;
  bio: string;
  liveUrl: string;
  streamerType: StreamerType;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStreamerRequest {
  nickname: string;
  posterUrl: string;
  bio: string;
  liveUrl: string;
  streamerType: StreamerType;
}

export interface UpdateStreamerRequest {
  nickname?: string;
  posterUrl?: string;
  bio?: string;
  liveUrl?: string;
  streamerType?: StreamerType;
  sortOrder?: number;
}

/**
 * 视频相关类型
 */
export interface VideoItem {
  id: string;
  title: string;
  bvid: string;
  page: number;
  coverUrl?: string;
}

export interface Video {
  id: string;
  title: string;
  bvid: string;
  page: number;
  coverUrl?: string;
  order: number;
  status: 0 | 1;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
