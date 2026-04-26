import React, { useEffect } from 'react';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';
import HeroV4 from '../components/features/v4/HeroV4';
import StatsBarV4 from '../components/features/v4/StatsBarV4';
import VideosV4 from '../components/features/v4/VideosV4';
import StreamersV4 from '../components/features/v4/StreamersV4';
import TeamsV4 from '../components/features/v4/TeamsV4';
import ScheduleV4 from '../components/features/v4/ScheduleV4';
import ThanksV4 from '../components/features/v4/ThanksV4';
import FooterV4 from '../components/features/v4/FooterV4';
import Hairline from '../components/common/v4/Hairline';

/**
 * v4 首页装配。
 * 数据来自 HomeDataProvider (按需加载, 同一数据只请求一次)。
 * Hero / Teams / Schedule 使用 stream + teams + matches; Videos 用 videos;
 * Streamers 用 streamers。本组件只负责触发对应的 fetch, 各 section 自己消费 context。
 */
const HomeBody: React.FC = () => {
  const { fetchStream, fetchTeams, fetchMatches, fetchVideos, fetchStreamers } = useHomeData();

  useEffect(() => {
    fetchStream();
    fetchTeams();
    fetchMatches();
    fetchVideos();
    fetchStreamers();
  }, [fetchStream, fetchTeams, fetchMatches, fetchVideos, fetchStreamers]);

  return (
    <div className="v4-root min-h-screen w-full" style={{ background: '#050508' }}>
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
  );
};

const Home: React.FC = () => (
  <HomeDataProvider>
    <HomeBody />
  </HomeDataProvider>
);

export default Home;
