import * as matchApi from '@/api/matches';
import type { Match, UpdateMatchRequest, FindMatchesByStageRequest } from '@/api/types';
import { requestCache, CACHE_TTL } from '@/utils/requestCache';

/**
 * 比赛服务状态接口
 */
export interface MatchServiceState {
  /** 比赛列表 */
  matches: Match[];
  /** 当前选中的比赛 */
  currentMatch: Match | null;
  /** 按阶段分组的比赛 */
  matchesByStage: Map<string, Match[]>;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 比赛服务接口
 */
interface MatchService {
  /** 获取所有比赛 */
  getAll: () => Promise<Match[]>;
  /** 根据 ID 获取比赛 */
  getById: (id: string) => Promise<Match>;
  /** 更新比赛 */
  update: (data: UpdateMatchRequest) => Promise<Match>;
  /** 按阶段筛选比赛 */
  findByStage: (params: FindMatchesByStageRequest) => Promise<Match[]>;
  /** 按轮次筛选比赛 */
  findByRound: (round: number) => Promise<Match[]>;
  /** 获取服务状态 */
  getState: () => MatchServiceState;
  /** 清除错误 */
  clearError: () => void;
  /** 重置状态 */
  resetState: () => void;
}

/**
 * 服务状态（内部状态管理）
 */
let state: MatchServiceState = {
  matches: [],
  currentMatch: null,
  matchesByStage: new Map(),
  loading: false,
  error: null,
};

/**
 * 状态监听器集合
 */
const listeners: Set<(state: MatchServiceState) => void> = new Set();

/**
 * 更新状态并通知监听器
 */
function setState(newState: Partial<MatchServiceState>): void {
  state = { ...state, ...newState };
  listeners.forEach(listener => listener(state));
}

/**
 * 处理错误
 */
function handleError(error: unknown, defaultMessage: string): never {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  setState({ error: errorMessage, loading: false });
  throw new Error(errorMessage);
}

/**
 * 比赛数据服务
 *
 * 提供完整的比赛查询和更新操作，包含状态管理和错误处理
 * 支持按阶段、轮次筛选比赛
 *
 * @example
 * ```ts
 * // 获取所有比赛
 * const result = await matchService.getAll(1, 20);
 *
 * // 获取比赛详情
 * const match = await matchService.getById('match1');
 *
 * // 更新比赛比分
 * await matchService.update({
 *   id: 'match1',
 *   scoreA: 2,
 *   scoreB: 1,
 *   winnerId: 'team1',
 *   status: 'finished'
 * });
 *
 * // 按阶段筛选比赛
 * const swissMatches = await matchService.findByStage({ stage: 'swiss', round: 1 });
 *
 * // 按轮次筛选
 * const round1Matches = await matchService.findByRound(1);
 * ```
 */
export const matchService: MatchService = {
  /**
   * 获取所有比赛
   * @returns 比赛列表
   */
  async getAll(): Promise<Match[]> {
    const cached = requestCache.get<Match[]>('matches', CACHE_TTL.matches);
    if (cached) {
      setState({ matches: cached, loading: false, error: null });
      return cached;
    }

    setState({ loading: true, error: null });

    try {
      const matches = await matchApi.getAll();

      requestCache.set('matches', matches);
      setState({
        matches,
        loading: false,
      });

      return matches;
    } catch (error) {
      handleError(error, '获取比赛列表失败');
    }
  },

  /**
   * 根据 ID 获取比赛
   * @param id 比赛 ID
   * @returns 比赛信息
   */
  async getById(id: string): Promise<Match> {
    setState({ loading: true, error: null });

    try {
      const match = await matchApi.getById(id);

      setState({
        currentMatch: match,
        loading: false,
      });

      return match;
    } catch (error) {
      handleError(error, `获取比赛 ${id} 信息失败`);
    }
  },

  /**
   * 更新比赛
   * @param data 更新比赛数据
   * @returns 更新后的比赛信息
   */
  async update(data: UpdateMatchRequest): Promise<Match> {
    setState({ loading: true, error: null });

    try {
      // 验证 ID
      if (!data.id) {
        throw new Error('比赛 ID 不能为空');
      }

      // 验证比分数据
      if (data.scoreA !== undefined && data.scoreA < 0) {
        throw new Error('队伍1比分不能为负数');
      }
      if (data.scoreB !== undefined && data.scoreB < 0) {
        throw new Error('队伍2比分不能为负数');
      }

      // 验证获胜方
      if (data.winnerId && data.scoreA === undefined && data.scoreB === undefined) {
        throw new Error('设置获胜方时必须提供比分');
      }

      const match = await matchApi.update(data);

      // 更新本地列表中的比赛
      const updatedMatches = state.matches.map(m => (m.id === match.id ? match : m));

      // 更新阶段分组缓存
      const updatedMatchesByStage = new Map(state.matchesByStage);
      if (updatedMatchesByStage.has(match.stage)) {
        const stageMatches = updatedMatchesByStage.get(match.stage) || [];
        updatedMatchesByStage.set(
          match.stage,
          stageMatches.map(m => (m.id === match.id ? match : m))
        );
      }

      setState({
        matches: updatedMatches,
        matchesByStage: updatedMatchesByStage,
        currentMatch: state.currentMatch?.id === match.id ? match : state.currentMatch,
        loading: false,
      });

      return match;
    } catch (error) {
      handleError(error, '更新比赛失败');
    }
  },

  /**
   * 按阶段筛选比赛
   * @param params 查询参数（阶段、轮次）
   * @returns 比赛列表
   */
  async findByStage(params: FindMatchesByStageRequest): Promise<Match[]> {
    setState({ loading: true, error: null });

    try {
      // 验证阶段参数
      if (!params.stage) {
        throw new Error('阶段参数不能为空');
      }

      const matches = await matchApi.findByStage(params);

      // 更新阶段分组缓存
      const cacheKey =
        params.round !== undefined ? `${params.stage}_round_${params.round}` : params.stage;

      const updatedMatchesByStage = new Map(state.matchesByStage);
      updatedMatchesByStage.set(cacheKey, matches);

      setState({
        matchesByStage: updatedMatchesByStage,
        loading: false,
      });

      return matches;
    } catch (error) {
      handleError(error, `获取 ${params.stage} 阶段比赛失败`);
    }
  },

  /**
   * 按轮次筛选比赛
   * @param round 轮次
   * @returns 比赛列表
   */
  async findByRound(round: number): Promise<Match[]> {
    setState({ loading: true, error: null });

    try {
      // 验证轮次参数
      if (round < 1) {
        throw new Error('轮次必须大于等于 1');
      }

      const matches = await matchApi.findByRound(round);

      setState({ loading: false });

      return matches;
    } catch (error) {
      handleError(error, `获取第 ${round} 轮比赛失败`);
    }
  },

  /**
   * 获取当前服务状态
   * @returns 当前状态
   */
  getState(): MatchServiceState {
    return { ...state };
  },

  /**
   * 清除错误信息
   */
  clearError(): void {
    setState({ error: null });
  },

  /**
   * 重置状态到初始值
   */
  resetState(): void {
    state = {
      matches: [],
      currentMatch: null,
      matchesByStage: new Map(),
      loading: false,
      error: null,
    };
    listeners.forEach(listener => listener(state));
  },
};

/**
 * 订阅状态变化
 * @param callback 状态变化回调函数
 * @returns 取消订阅函数
 */
export function subscribeToMatchService(callback: (state: MatchServiceState) => void): () => void {
  listeners.add(callback);
  callback(state); // 立即通知当前状态

  return () => {
    listeners.delete(callback);
  };
}

export default matchService;
