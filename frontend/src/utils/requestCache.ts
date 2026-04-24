/**
 * 请求缓存工具类
 *
 * 功能：
 * 1. 内存级缓存，减少重复API请求
 * 2. 支持TTL（Time To Live）过期策略
 * 3. 不同数据类型可配置不同的缓存时间
 *
 * 缓存策略：
 * - 战队数据: 60秒
 * - 比赛数据: 30秒
 * - 直播信息: 15秒
 * - 视频数据: 120秒
 */

const CACHE_TTL = {
  teams: 60_000,
  matches: 30_000,
  stream: 15_000,
  videos: 120_000,
} as const;

interface CacheItem {
  data: unknown;
  timestamp: number;
}

class RequestCache {
  private cache = new Map<string, CacheItem>();

  get<T>(key: string, ttl: number): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() - item.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  set(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  getTTL(key: keyof typeof CACHE_TTL): number {
    return CACHE_TTL[key];
  }
}

export const requestCache = new RequestCache();
export { CACHE_TTL };
export type CacheKey = keyof typeof CACHE_TTL;
