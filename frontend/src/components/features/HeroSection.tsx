import React, { useEffect, useState } from 'react';
import { Play, Radio, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { streamService } from '../../services';
import type { Stream } from '../../api/types';

const DEFAULT_GITHUB_CDN_BASE = 'https://cdn.jsdmirror.com/gh/forzenfox/lvjiang-cup@main';
const GITHUB_CDN_BASE = window.APP_CONFIG?.GITHUB_CDN_BASE || DEFAULT_GITHUB_CDN_BASE;

const HERO_IMAGE = {
  cdn: `${GITHUB_CDN_BASE}/frontend/public/assets/hero-bg.webp`,
  local: '/assets/hero-bg.webp',
};

const HeroSection: React.FC = () => {
  const [streamInfo, setStreamInfo] = useState<Stream | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [heroImgSrc, setHeroImgSrc] = useState<string>(HERO_IMAGE.cdn);

  // 处理图片加载错误，降级到本地路径
  const handleHeroImageError = () => {
    console.warn('[HeroSection] CDN图片加载失败，降级到本地路径');
    setHeroImgSrc(HERO_IMAGE.local);
  };

  // 获取直播信息
  const fetchStreamInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const stream = await streamService.get();
      setStreamInfo(stream);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取直播信息失败';
      setError(errorMessage);
      console.error('[HeroSection] 获取直播信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreamInfo();
  }, []);

  const handleWatchLive = () => {
    if (streamInfo?.url) {
      window.open(streamInfo.url, '_blank');
    }
  };

  // 加载状态
  if (loading && !streamInfo) {
    return (
      <section
        id="hero"
        className="relative h-[calc(100vh-96px)] flex items-center justify-center overflow-hidden"
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImgSrc}
            alt="Hero Background"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
            onError={handleHeroImageError}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background"></div>
        </div>

        {/* Loading Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="flex flex-col items-center space-y-6">
            <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
            <p className="text-xl text-gray-300">正在加载直播信息...</p>
          </div>
        </div>
      </section>
    );
  }

  // 错误状态
  if (error && !streamInfo) {
    return (
      <section
        id="hero"
        className="relative h-[calc(100vh-96px)] flex items-center justify-center overflow-hidden"
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImgSrc}
            alt="Hero Background"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
            onError={handleHeroImageError}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background"></div>
        </div>

        {/* Error Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="bg-black/50 backdrop-blur-sm p-8 rounded-xl border border-red-500/30">
            <p className="text-xl text-red-400 mb-4">加载失败</p>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button
              variant="outline"
              onClick={fetchStreamInfo}
              className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/10"
            >
              重试
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="hero"
      className="relative h-[calc(100vh-96px)] flex items-center justify-center overflow-hidden"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImgSrc}
          alt="Hero Background"
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover"
          onError={handleHeroImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 animate-shine mb-6 tracking-tight drop-shadow-lg">
          驴酱杯
        </h1>
        <p className="text-xl md:text-2xl text-gray-200 mb-8 font-light tracking-wide">
          驴酱公会终极对决
        </p>

        {streamInfo?.isLive ? (
          <div className="flex flex-col items-center space-y-4">
            <Button
              variant="cta"
              size="lg"
              className="text-xl px-12 py-8 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:scale-105 transform transition-transform"
              onClick={handleWatchLive}
            >
              <Play className="mr-3 h-6 w-6 fill-current" />
              观看直播
            </Button>
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <p className="text-yellow-400 font-semibold">正在直播：{streamInfo.title}</p>
            </div>
          </div>
        ) : (
          <div className="bg-black/50 backdrop-blur-sm p-6 rounded-xl border border-white/10">
            <p className="text-xl text-gray-300">比赛即将开始</p>
            <p className="text-sm text-gray-400 mt-2">查看下方赛程安排</p>
          </div>
        )}

        {/* 刷新指示器 */}
        {loading && (
          <div className="mt-4 flex items-center justify-center space-x-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">更新中...</span>
          </div>
        )}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-24 md:bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce text-white/50">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
