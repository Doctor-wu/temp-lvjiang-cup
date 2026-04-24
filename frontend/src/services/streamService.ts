import * as streamApi from '@/api/streams';
import type { Stream, UpdateStreamRequest } from '@/api/types';
import { requestCache, CACHE_TTL } from '@/utils/requestCache';

/**
 * 直播服务状态接口
 */
export interface StreamServiceState {
  /** 当前直播信息 */
  currentStream: Stream | null;
  /** 所有直播列表 */
  streams: Stream[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 直播服务接口
 */
interface StreamService {
  /** 获取直播信息 */
  get: (id?: string) => Promise<Stream>;
  /** 获取所有直播 */
  getAll: () => Promise<Stream[]>;
  /** 更新直播信息 */
  update: (data: UpdateStreamRequest) => Promise<Stream>;
  /** 获取服务状态 */
  getState: () => StreamServiceState;
  /** 清除错误 */
  clearError: () => void;
  /** 重置状态 */
  resetState: () => void;
}

/**
 * 服务状态（内部状态管理）
 */
let state: StreamServiceState = {
  currentStream: null,
  streams: [],
  loading: false,
  error: null,
};

/**
 * 状态监听器集合
 */
const listeners: Set<(state: StreamServiceState) => void> = new Set();

/**
 * 更新状态并通知监听器
 */
function setState(newState: Partial<StreamServiceState>): void {
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
 * 直播数据服务
 *
 * 提供直播信息的获取和更新操作，包含状态管理和错误处理
 *
 * @example
 * ```ts
 * // 获取当前活跃直播
 * const stream = await streamService.get();
 *
 * // 获取指定直播
 * const stream = await streamService.get('stream1');
 *
 * // 获取所有直播
 * const streams = await streamService.getAll();
 *
 * // 更新直播信息
 * await streamService.update({
 *   id: 'stream1',
 *   title: '新标题',
 *   url: 'https://new-url.com',
 *   isLive: true
 * });
 * ```
 */
export const streamService: StreamService = {
  /**
   * 获取直播信息
   * @param id 直播 ID，如果不传则获取当前活跃的直播
   * @returns 直播信息
   */
  async get(id?: string): Promise<Stream> {
    const cacheKey = id ? `stream_${id}` : 'stream_current';
    const cached = requestCache.get<Stream>(cacheKey, CACHE_TTL.stream);
    if (cached) {
      setState({ currentStream: cached, loading: false, error: null });
      return cached;
    }

    setState({ loading: true, error: null });

    try {
      const stream = await streamApi.get(id);

      requestCache.set(cacheKey, stream);
      setState({
        currentStream: stream,
        loading: false,
      });

      return stream;
    } catch (error) {
      handleError(error, id ? `获取直播 ${id} 信息失败` : '获取当前直播信息失败');
    }
  },

  /**
   * 获取所有直播
   * @returns 直播列表
   */
  async getAll(): Promise<Stream[]> {
    setState({ loading: true, error: null });

    try {
      const streams = await streamApi.getAll();

      setState({
        streams,
        loading: false,
      });

      return streams;
    } catch (error) {
      handleError(error, '获取直播列表失败');
    }
  },

  /**
   * 更新直播信息
   * @param data 更新直播数据
   * @returns 更新后的直播信息
   */
  async update(data: UpdateStreamRequest): Promise<Stream> {
    setState({ loading: true, error: null });

    try {
      // 验证 ID
      if (!data.id) {
        throw new Error('直播 ID 不能为空');
      }

      // 验证 URL 格式（如果提供了 URL）
      if (data.url) {
        try {
          new URL(data.url);
        } catch {
          throw new Error('直播地址格式不正确');
        }
      }

      const stream = await streamApi.update(data);

      // 更新本地列表中的直播
      setState({
        streams: state.streams.map(s => (s.id === stream.id ? stream : s)),
        currentStream: state.currentStream?.id === stream.id ? stream : state.currentStream,
        loading: false,
      });

      return stream;
    } catch (error) {
      handleError(error, '更新直播信息失败');
    }
  },

  /**
   * 获取当前服务状态
   * @returns 当前状态
   */
  getState(): StreamServiceState {
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
      currentStream: null,
      streams: [],
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
export function subscribeToStreamService(
  callback: (state: StreamServiceState) => void
): () => void {
  listeners.add(callback);
  callback(state); // 立即通知当前状态

  return () => {
    listeners.delete(callback);
  };
}

export default streamService;
