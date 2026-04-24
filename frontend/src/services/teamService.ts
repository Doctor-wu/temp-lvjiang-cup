import * as teamApi from '@/api/teams';
import type { Team, CreateTeamRequest, UpdateTeamRequest } from '@/api/types';
import { requestCache, CACHE_TTL } from '@/utils/requestCache';

/**
 * 战队服务状态接口
 */
export interface TeamServiceState {
  /** 战队列表 */
  teams: Team[];
  /** 当前选中的战队 */
  currentTeam: Team | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 战队服务接口
 */
interface TeamService {
  /** 获取所有战队 */
  getAll: () => Promise<Team[]>;
  /** 根据 ID 获取战队 */
  getById: (id: string) => Promise<Team>;
  /** 创建战队 */
  create: (data: CreateTeamRequest) => Promise<Team>;
  /** 更新战队 */
  update: (data: UpdateTeamRequest) => Promise<Team>;
  /** 删除战队 */
  remove: (id: string) => Promise<void>;
  /** 获取服务状态 */
  getState: () => TeamServiceState;
  /** 清除错误 */
  clearError: () => void;
  /** 重置状态 */
  resetState: () => void;
}

/**
 * 服务状态（内部状态管理）
 */
let state: TeamServiceState = {
  teams: [],
  currentTeam: null,
  loading: false,
  error: null,
};

/**
 * 状态监听器集合
 */
const listeners: Set<(state: TeamServiceState) => void> = new Set();

/**
 * 更新状态并通知监听器
 */
function setState(newState: Partial<TeamServiceState>): void {
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
 * 战队数据服务
 *
 * 提供完整的战队 CRUD 操作，包含状态管理和错误处理
 *
 * @example
 * ```ts
 * // 获取所有战队
 * const result = await teamService.getAll(1, 20);
 *
 * // 创建战队
 * const newTeam = await teamService.create({
 *   name: '新战队',
 *   logo: 'https://example.com/logo.png',
 *   description: '战队描述'
 * });
 *
 * // 更新战队
 * await teamService.update({ id: 'team1', name: '更新后的名称' });
 *
 * // 删除战队
 * await teamService.remove('team1');
 * ```
 */
export const teamService: TeamService = {
  /**
   * 获取所有战队
   * @returns 战队列表
   */
  async getAll(): Promise<Team[]> {
    const cached = requestCache.get<Team[]>('teams', CACHE_TTL.teams);
    if (cached) {
      setState({ teams: cached, loading: false, error: null });
      return cached;
    }

    setState({ loading: true, error: null });

    try {
      const teams = await teamApi.getAll();

      requestCache.set('teams', teams);
      setState({
        teams,
        loading: false,
      });

      return teams;
    } catch (error) {
      handleError(error, '获取战队列表失败');
    }
  },

  /**
   * 根据 ID 获取战队
   * @param id 战队 ID
   * @returns 战队信息
   */
  async getById(id: string): Promise<Team> {
    setState({ loading: true, error: null });

    try {
      const team = await teamApi.getById(id);

      setState({
        currentTeam: team,
        loading: false,
      });

      return team;
    } catch (error) {
      handleError(error, `获取战队 ${id} 信息失败`);
    }
  },

  /**
   * 创建战队
   * @param data 创建战队数据
   * @returns 创建的战队信息
   */
  async create(data: CreateTeamRequest): Promise<Team> {
    setState({ loading: true, error: null });

    try {
      // 验证必填字段
      if (!data.name || data.name.trim() === '') {
        throw new Error('战队名称不能为空');
      }

      const team = await teamApi.create(data);

      // 更新本地列表
      setState({
        teams: [...state.teams, team],
        loading: false,
      });

      return team;
    } catch (error) {
      handleError(error, '创建战队失败');
    }
  },

  /**
   * 更新战队
   * @param data 更新战队数据
   * @returns 更新后的战队信息
   */
  async update(data: UpdateTeamRequest): Promise<Team> {
    setState({ loading: true, error: null });

    try {
      // 验证 ID
      if (!data.id) {
        throw new Error('战队 ID 不能为空');
      }

      const team = await teamApi.update(data);

      // 更新本地列表中的战队
      setState({
        teams: state.teams.map(t => (t.id === team.id ? team : t)),
        currentTeam: state.currentTeam?.id === team.id ? team : state.currentTeam,
        loading: false,
      });

      return team;
    } catch (error) {
      handleError(error, '更新战队失败');
    }
  },

  /**
   * 删除战队
   * @param id 战队 ID
   */
  async remove(id: string): Promise<void> {
    setState({ loading: true, error: null });

    try {
      await teamApi.remove(id);

      // 从本地列表中移除
      setState({
        teams: state.teams.filter(t => t.id !== id),
        currentTeam: state.currentTeam?.id === id ? null : state.currentTeam,
        loading: false,
      });
    } catch (error) {
      handleError(error, '删除战队失败');
    }
  },

  /**
   * 获取当前服务状态
   * @returns 当前状态
   */
  getState(): TeamServiceState {
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
      teams: [],
      currentTeam: null,
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
export function subscribeToTeamService(callback: (state: TeamServiceState) => void): () => void {
  listeners.add(callback);
  callback(state); // 立即通知当前状态

  return () => {
    listeners.delete(callback);
  };
}

export default teamService;
