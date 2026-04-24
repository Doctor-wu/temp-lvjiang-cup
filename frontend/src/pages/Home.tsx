import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { StartBox } from '../components/features/StartBox';
import HeroSection from '../components/features/HeroSection';
import ScheduleSection from '../components/features/ScheduleSection';
import TeamSection from '../components/features/TeamSection';
import StreamerSection from '../components/features/StreamerSection';
import { ThanksSection } from '../components/features/ThanksSection';
import { VideoCarousel, VideoItem } from '../components/video-carousel';
import { streamService, teamService, matchService } from '../services';
import * as videoApi from '../api/videos';
import { ZIndexLayers } from '../constants/zIndex';

/**
 * 首页数据加载状态
 */
interface HomeDataState {
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 各模块加载状态 */
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
 * 首页组件
 *
 * 功能：
 * 1. 整合 HeroSection、TeamSection、ScheduleSection 三大模块
 * 2. 全局加载状态和错误处理
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

  const [videos, setVideos] = useState<VideoItem[]>([]);

  const [showError, setShowError] = useState(false);

  /**
   * 更新加载状态
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
   * 加载所有数据
   */
  const loadAllData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      try {
        // 并行加载所有数据
        await Promise.all([
          // 直播信息
          (async () => {
            updateLoadingState('stream', true);
            try {
              await streamService.get();
            } finally {
              updateLoadingState('stream', false);
            }
          })(),
          // 战队数据
          (async () => {
            updateLoadingState('teams', true);
            try {
              await teamService.getAll();
            } finally {
              updateLoadingState('teams', false);
            }
          })(),
          // 比赛数据
          (async () => {
            updateLoadingState('matches', true);
            try {
              await matchService.getAll();
            } finally {
              updateLoadingState('matches', false);
            }
          })(),

          // 视频数据
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

  return (
    <Layout>
      <StartBox />

      {/* 全局错误提示 */}
      {showError && state.error && (
        <GlobalErrorToast message={state.error} onClose={() => setShowError(false)} />
      )}

      {/* 全局加载指示器 */}
      <GlobalLoadingIndicator visible={state.loading} />

      {/* 页面内容 */}
      <HeroSection />
      <section
        id="videos"
        className="h-[calc(100vh-96px)] bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] flex items-center justify-center"
      >
        <div className="container mx-auto px-4 w-full h-full flex flex-col justify-center">
          {videos.length > 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <VideoCarousel videos={videos} />
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg">暂无视频</p>
            </div>
          )}
        </div>
      </section>
      <StreamerSection />
      <TeamSection />
      <ScheduleSection />
      <ThanksSection />
    </Layout>
  );
};

export default Home;
