import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { StartBox } from '../components/features/StartBox';
import HeroSection from '../components/features/HeroSection';
import { streamService, teamService, matchService } from '../services';
import * as videoApi from '../api/videos';
import { ZIndexLayers } from '../constants/zIndex';
import { HomeDataProvider } from '../context/HomeDataContext';
import type { VideoItem } from '../components/video-carousel';
import type { Stream, Team as ApiTeam } from '../api/types';

/**
 * 首页数据状态
 */
interface HomeDataState {
  loading: boolean;
  error: string | null;
  modules: {
    stream: boolean;
    teams: boolean;
    matches: boolean;
    videos: boolean;
  };
}

/**
 * 全局错误提示组件
 */
const GlobalErrorToast: React.FC<{ message: string; onClose: () => void }> = ({
  message,
  onClose,
}) => (
  <div
    className="fixed top-4 right-4 bg-red-500/90 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-in slide-in-from-top-2"
    style={{ zIndex: ZIndexLayers.TOAST }}
  >
    <AlertCircle className="w-5 h-5" />
    <span>{message}</span>
    <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">
      ×
    </button>
  </div>
);

/**
 * 全局加载指示器
 */
const GlobalLoadingIndicator: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div
      className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
      style={{ zIndex: ZIndexLayers.TOAST }}
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">数据更新中...</span>
    </div>
  );
};

/**
 * 懒加载非首屏组件
 * 使用 React.lazy 实现代码分割和按需加载
 */
const ScheduleSection = lazy(() => import('../components/features/ScheduleSection'));
const TeamSection = lazy(() => import('../components/features/TeamSection'));
const StreamerSection = lazy(() => import('../components/features/StreamerSection'));
const ThanksSection = lazy(() =>
  import('../components/features/ThanksSection').then(m => ({ default: m.ThanksSection }))
);
const LazyVideoCarousel = lazy(() =>
  import('../components/video-carousel').then(m => ({ default: m.VideoCarousel }))
);

/**
 * 骨架屏占位符
 */
const SectionSkeleton: React.FC = () => (
  <div className="h-[calc(100vh-96px)] flex items-center justify-center bg-black">
    <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
  </div>
);

/**
 * 首页组件
 *
 * 性能优化：
 * 1. 优先级加载：先加载首屏需要的数据（直播、战队），后台加载非首屏数据（比赛、视频）
 * 2. Context 共享数据：避免子组件重复请求
 * 3. 懒加载非首屏组件：使用 React.lazy 延迟渲染 ScheduleSection、TeamSection 等
 */
const Home: React.FC = () => {
  const [state, setState] = useState<HomeDataState>({
    loading: true,
    error: null,
    modules: {
      stream: true,
      teams: true,
      matches: true,
      videos: true,
    },
  });

  const [streamData, setStreamData] = useState<Stream | null>(null);
  const [teamsData, setTeamsData] = useState<ApiTeam[]>([]);
  const [matchesData, setMatchesData] = useState<unknown[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [showError, setShowError] = useState(false);

  /**
   * 更新模块加载状态
   */
  const updateLoadingState = useCallback(
    (module: keyof HomeDataState['modules'], loading: boolean) => {
      setState(prev => ({
        ...prev,
        modules: {
          ...prev.modules,
          [module]: loading,
        },
        loading:
          loading || Object.entries(prev.modules).some(([key, value]) => key !== module && value),
      }));
    },
    []
  );

  /**
   * 优先级加载策略
   * 优先级1: 直播信息（Hero区域需要）
   * 优先级2: 战队数据（用户可见区域）
   * 优先级3: 比赛数据（需滚动才能看到）
   * 优先级4: 视频数据（需滚动才能看到）
   */
  const loadAllData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      try {
        // 优先级1: 直播信息（首屏Hero区域需要）
        updateLoadingState('stream', true);
        try {
          const stream = await streamService.get();
          setStreamData(stream);
        } catch (err) {
          console.error('[Home] 直播信息加载失败:', err);
        } finally {
          updateLoadingState('stream', false);
        }

        // 优先级2: 战队数据（首屏可见区域）
        updateLoadingState('teams', true);
        try {
          const teams = await teamService.getAll();
          setTeamsData(teams);
        } catch (err) {
          console.error('[Home] 战队数据加载失败:', err);
        } finally {
          updateLoadingState('teams', false);
        }

        // 优先级3和4: 比赛和视频数据（后台并行加载，非首屏）
        await Promise.all([
          (async () => {
            updateLoadingState('matches', true);
            try {
              const matches = await matchService.getAll();
              setMatchesData(matches);
            } catch (err) {
              console.error('[Home] 比赛数据加载失败:', err);
            } finally {
              updateLoadingState('matches', false);
            }
          })(),
          (async () => {
            updateLoadingState('videos', true);
            try {
              const result = await videoApi.getVideos({ isEnabled: true, pageSize: 100 });
              const videoList = Array.isArray(result) ? result : result.list || [];
              const videoItems: VideoItem[] = videoList.map(video => ({
                bvid: video.bvid,
                title: video.title,
                cover: video.coverUrl || undefined,
              }));
              setVideos(videoItems);
            } catch (err) {
              console.error('[Home] 视频数据加载失败:', err);
            } finally {
              updateLoadingState('videos', false);
            }
          })(),
        ]);

        setState(prev => ({ ...prev, error: null }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '数据加载失败';
        setState(prev => ({ ...prev, error: errorMessage }));
        setShowError(true);
        console.error('[Home] 数据加载失败:', err);
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    },
    [updateLoadingState]
  );

  /**
   * 单模块刷新函数，供 Context 使用
   */
  const handleRefresh = useCallback(
    async (module: string) => {
      switch (module) {
        case 'stream':
          updateLoadingState('stream', true);
          try {
            const stream = await streamService.get();
            setStreamData(stream);
          } finally {
            updateLoadingState('stream', false);
          }
          break;
        case 'teams':
          updateLoadingState('teams', true);
          try {
            const teams = await teamService.getAll();
            setTeamsData(teams);
          } finally {
            updateLoadingState('teams', false);
          }
          break;
        case 'matches':
          updateLoadingState('matches', true);
          try {
            const matches = await matchService.getAll();
            setMatchesData(matches);
          } finally {
            updateLoadingState('matches', false);
          }
          break;
        case 'videos':
          updateLoadingState('videos', true);
          try {
            const result = await videoApi.getVideos({ isEnabled: true, pageSize: 100 });
            const videoList = Array.isArray(result) ? result : result.list || [];
            setVideos(
              videoList.map(video => ({
                bvid: video.bvid,
                title: video.title,
                cover: video.coverUrl || undefined,
              }))
            );
          } finally {
            updateLoadingState('videos', false);
          }
          break;
      }
    },
    [updateLoadingState]
  );

  useEffect(() => {
    loadAllData(false);
  }, [loadAllData]);

  // 自动隐藏错误提示
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => {
        setShowError(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  // 计算加载状态供 Context 使用
  const isLoadingModules = useMemo(
    () => ({
      stream: state.modules.stream,
      teams: state.modules.teams,
      matches: state.modules.matches,
      videos: state.modules.videos,
    }),
    [state.modules]
  );

  // 统一数据供 Context 共享
  const contextData = useMemo(
    () => ({
      stream: streamData,
      teams: teamsData,
      matches: matchesData,
      videos,
    }),
    [streamData, teamsData, matchesData, videos]
  );

  return (
    <HomeDataProvider
      initialData={contextData}
      isLoading={isLoadingModules}
      onRefresh={handleRefresh}
    >
      <Layout>
        <StartBox />

        {/* 全局错误提示 */}
        {showError && state.error && (
          <GlobalErrorToast message={state.error} onClose={() => setShowError(false)} />
        )}

        {/* 全局加载指示器 */}
        <GlobalLoadingIndicator visible={state.loading} />

        {/* 首屏组件：立即渲染 */}
        <HeroSection />

        {/* 视频区域：次优先渲染 */}
        <section
          id="videos"
          className="h-[calc(100vh-96px)] bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] flex items-center justify-center"
        >
          <div className="container mx-auto px-4 w-full h-full flex flex-col justify-center">
            {videos.length > 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-0">
                <Suspense fallback={<SectionSkeleton />}>
                  <LazyVideoCarousel videos={videos} />
                </Suspense>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg">暂无视频</p>
              </div>
            )}
          </div>
        </section>

        {/* 非首屏组件：使用 Suspense + lazy 延迟渲染 */}
        <Suspense fallback={<SectionSkeleton />}>
          <StreamerSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <TeamSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ScheduleSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ThanksSection />
        </Suspense>
      </Layout>
    </HomeDataProvider>
  );
};

export default Home;
