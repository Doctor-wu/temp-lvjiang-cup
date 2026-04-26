import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { streamService, teamService, matchService } from '../services';
import * as videoApi from '../api/videos';
import { ZIndexLayers } from '../constants/zIndex';
import { HomeDataProvider } from '../context/HomeDataContext';
import type { VideoItem } from '../components/video-carousel';
import type { Stream, Team as ApiTeam } from '../api/types';
import HeroV4 from '../components/features/v4/HeroV4';
import StatsBarV4 from '../components/features/v4/StatsBarV4';
import VideosV4 from '../components/features/v4/VideosV4';
import StreamersV4 from '../components/features/v4/StreamersV4';
import TeamsV4 from '../components/features/v4/TeamsV4';
import ScheduleV4 from '../components/features/v4/ScheduleV4';
import ThanksV4 from '../components/features/v4/ThanksV4';
import FooterV4 from '../components/features/v4/FooterV4';
import Hairline from '../components/common/v4/Hairline';

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

const GlobalErrorToast: React.FC<{ message: string; onClose: () => void }> = ({
  message,
  onClose,
}) => (
  <div
    className="fixed top-4 right-4 bg-red-500/90 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3"
    style={{ zIndex: ZIndexLayers.TOAST }}
  >
    <AlertCircle className="w-5 h-5" />
    <span>{message}</span>
    <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">
      ×
    </button>
  </div>
);

const Home: React.FC = () => {
  const [state, setState] = useState<HomeDataState>({
    loading: true,
    error: null,
    modules: { stream: true, teams: true, matches: true, videos: true },
  });
  const [streamData, setStreamData] = useState<Stream | null>(null);
  const [teamsData, setTeamsData] = useState<ApiTeam[]>([]);
  const [matchesData, setMatchesData] = useState<unknown[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [showError, setShowError] = useState(false);

  const updateLoadingState = useCallback(
    (module: keyof HomeDataState['modules'], loading: boolean) => {
      setState(prev => ({
        ...prev,
        modules: { ...prev.modules, [module]: loading },
      }));
    },
    []
  );

  const loadAllData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      updateLoadingState('stream', true);
      try {
        const stream = await streamService.get();
        setStreamData(stream);
      } catch (err) {
        console.error('[Home] 直播信息加载失败:', err);
      } finally {
        updateLoadingState('stream', false);
      }

      updateLoadingState('teams', true);
      try {
        const teams = await teamService.getAll();
        setTeamsData(teams);
      } catch (err) {
        console.error('[Home] 战队数据加载失败:', err);
      } finally {
        updateLoadingState('teams', false);
      }

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
            setVideos(
              videoList.map(v => ({
                bvid: v.bvid,
                title: v.title,
                cover: v.coverUrl || undefined,
              }))
            );
          } catch (err) {
            console.error('[Home] 视频数据加载失败:', err);
          } finally {
            updateLoadingState('videos', false);
          }
        })(),
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '数据加载失败';
      setState(prev => ({ ...prev, error: errorMessage }));
      setShowError(true);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [updateLoadingState]);

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
              videoList.map(v => ({
                bvid: v.bvid,
                title: v.title,
                cover: v.coverUrl || undefined,
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
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (showError) {
      const t = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(t);
    }
  }, [showError]);

  const isLoadingModules = useMemo(
    () => ({
      stream: state.modules.stream,
      teams: state.modules.teams,
      matches: state.modules.matches,
      videos: state.modules.videos,
    }),
    [state.modules]
  );

  const contextData = useMemo(
    () => ({ stream: streamData, teams: teamsData, matches: matchesData, videos }),
    [streamData, teamsData, matchesData, videos]
  );

  return (
    <HomeDataProvider
      initialData={contextData}
      isLoading={isLoadingModules}
      onRefresh={handleRefresh}
    >
      <div className="v4-root min-h-screen w-full" style={{ background: '#050508' }}>
        {showError && state.error ? (
          <GlobalErrorToast message={state.error} onClose={() => setShowError(false)} />
        ) : null}
        <main className="w-full">
          <HeroV4 />
          <StatsBarV4 />
          <Hairline />
          <VideosV4 />
          <Hairline />
          <StreamersV4 />
          <Hairline />
          <TeamsV4 />
          <Hairline />
          <ScheduleV4 />
          <Hairline />
          <ThanksV4 />
          <Hairline />
          <FooterV4 />
        </main>
      </div>
    </HomeDataProvider>
  );
};

export default Home;
