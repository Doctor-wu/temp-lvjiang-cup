import React, { useRef } from 'react';
import { useVideoLoad } from './hooks/useVideoLoad';

export type VideoItem = {
  bvid: string;
  title: string;
  cover?: string;
};

interface VideoPlayerProps {
  video: VideoItem;
  autoplay?: boolean;
  muted?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  autoplay = false,
  muted = false,
}) => {
  const { isLoading, isError, retry } = useVideoLoad(video.bvid);
  const containerRef = useRef<HTMLDivElement>(null);

  const src = `https://player.bilibili.com/player.html?bvid=${video.bvid}&autoplay=${autoplay ? '1' : '0'}${muted ? '&muted=1' : ''}`;

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400">视频加载失败</div>
        <button
          onClick={retry}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          data-testid="retry-button"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <iframe
        key={video.bvid}
        src={src}
        title="bilibili-player"
        className="w-full h-full border-0"
        allow="fullscreen"
        allowFullScreen
      />
    </div>
  );
};
