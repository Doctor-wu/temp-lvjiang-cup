import React, { useState, useCallback, useEffect } from 'react';
import { VideoPlayer, type VideoItem } from './VideoPlayer';
import { VideoThumbnail } from './VideoThumbnail';
import { ControlArrows } from './ControlArrows';
import { Indicator } from './Indicator';
import { useSwipe } from './hooks/useSwipe';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import './styles.css';

export type { VideoItem } from './VideoPlayer';

interface VideoCarouselProps {
  videos: VideoItem[];
}

export const VideoCarousel: React.FC<VideoCarouselProps> = ({ videos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % videos.length);
  }, [videos.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + videos.length) % videos.length);
  }, [videos.length]);

  const { onTouchStart, onTouchEnd } = useSwipe({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
    threshold: 50,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    const carouselElement = document.querySelector('[data-testid="video-carousel"]');
    if (carouselElement) {
      carouselElement.addEventListener('keydown', handleKeyDown);
      return () => carouselElement.removeEventListener('keydown', handleKeyDown);
    }
  }, [goToNext, goToPrev]);

  if (videos.length === 0) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <span className="text-gray-400">暂无视频</span>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  const showThumbnails = videos.length > 2;
  const showControls = videos.length > 1;
  const isSmallVideoCount = videos.length <= 2;

  const getPrevIndex = () => (currentIndex - 1 + videos.length) % videos.length;
  const getNextIndex = () => (currentIndex + 1) % videos.length;

  return (
    <div
      className="video-carousel w-full h-full flex flex-col"
      data-testid="video-carousel"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {isMobile ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-gray-900 min-h-0">
            <VideoPlayer video={currentVideo} autoplay />
          </div>
          {showControls && (
            <Indicator videos={videos} currentIndex={currentIndex} onSelect={setCurrentIndex} />
          )}
        </div>
      ) : (
        <div
          className={`flex-1 flex items-center min-h-0 ${showThumbnails ? 'gap-4' : 'justify-center'}`}
        >
          {showThumbnails && (
            <div className="w-[20%] h-full flex items-center">
              <VideoThumbnail
                video={videos[getPrevIndex()]}
                isActive={false}
                onClick={() => setCurrentIndex(getPrevIndex())}
                index={getPrevIndex()}
              />
            </div>
          )}

          <div
            className={`relative h-full flex flex-col justify-center ${showThumbnails ? 'flex-1 max-w-[60%]' : isSmallVideoCount ? 'w-full max-w-5xl mx-auto' : 'w-full max-w-full'}`}
          >
            <div
              className={`w-full bg-gray-900 mx-auto ${isSmallVideoCount ? 'max-h-[70vh] aspect-video' : 'aspect-video'}`}
            >
              <VideoPlayer video={currentVideo} autoplay />
            </div>
            {showControls && (
              <ControlArrows
                onPrev={goToPrev}
                onNext={goToNext}
                canPrev={videos.length > 1}
                canNext={videos.length > 1}
              />
            )}
            {showControls && (
              <div className="mt-1">
                <Indicator videos={videos} currentIndex={currentIndex} onSelect={setCurrentIndex} />
              </div>
            )}
          </div>

          {showThumbnails && (
            <div className="w-[20%] h-full flex items-center">
              <VideoThumbnail
                video={videos[getNextIndex()]}
                isActive={false}
                onClick={() => setCurrentIndex(getNextIndex())}
                index={getNextIndex()}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
