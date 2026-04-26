import React, { createContext, useContext, useCallback, useMemo } from 'react';
import type { Stream, Team as ApiTeam } from '@/api/types';
import type { VideoItem } from '@/components/video-carousel';

/**
 * 首页统一数据 Context
 *
 * 功能：
 * 1. 在 Home.tsx 统一加载数据，避免子组件重复请求
 * 2. 提供数据刷新能力
 * 3. 子组件通过 useContext 读取数据，不再自行调用 service
 */

interface HomeDataContextValue {
  stream: Stream | null;
  teams: ApiTeam[];
  matches: unknown[];
  videos: VideoItem[];
  isLoading: Record<string, boolean>;
  refresh: (module: string) => Promise<void>;
}

const HomeDataContext = createContext<HomeDataContextValue | null>(null);

export const useHomeData = () => {
  const context = useContext(HomeDataContext);
  if (!context) {
    throw new Error('useHomeData must be used within HomeDataProvider');
  }
  return context;
};

interface HomeDataProviderProps {
  children: React.ReactNode;
  initialData: {
    stream: Stream | null;
    teams: ApiTeam[];
    matches: unknown[];
    videos: VideoItem[];
  };
  isLoading: Record<string, boolean>;
  onRefresh: (module: string) => Promise<void>;
}

export const HomeDataProvider: React.FC<HomeDataProviderProps> = ({
  children,
  initialData,
  isLoading,
  onRefresh,
}) => {
  const refresh = useCallback((module: string) => onRefresh(module), [onRefresh]);

  const value = useMemo(
    () => ({
      stream: initialData.stream,
      teams: initialData.teams,
      matches: initialData.matches,
      videos: initialData.videos,
      isLoading,
      refresh,
    }),
    [initialData, isLoading, refresh]
  );

  return <HomeDataContext.Provider value={value}>{children}</HomeDataContext.Provider>;
};

export default HomeDataContext;
