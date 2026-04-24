import React, { useRef, useState, useEffect } from 'react';
import { StarBurst } from './DecorativeIcons';
import { useScrollAnimation } from './useScrollAnimation';
import type { SponsorConfig } from '@/data/types';

interface MarqueeBannerProps {
  sponsors: SponsorConfig[];
}

export const MarqueeBanner: React.FC<MarqueeBannerProps> = ({ sponsors }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollDuration, setScrollDuration] = useState(20);
  const [inViewport, setInViewport] = useState(false);
  const { ref: animationRef, isVisible } = useScrollAnimation({ threshold: 0.1 });

  // 视口检测
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), {
      threshold: 0.1,
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 动态计算滚动时长
  useEffect(() => {
    const updateDuration = () => {
      if (contentRef.current && containerRef.current) {
        const contentWidth = contentRef.current.scrollWidth / 2;
        const viewportWidth = containerRef.current.offsetWidth;
        const baseTime = window.innerWidth >= 768 ? 20 : 15;
        const duration = (contentWidth / viewportWidth) * baseTime;
        setScrollDuration(Math.max(duration, 10));
      }
    };

    updateDuration();
    window.addEventListener('resize', updateDuration);
    return () => window.removeEventListener('resize', updateDuration);
  }, [sponsors]);

  // 空状态
  if (sponsors.length === 0) {
    return (
      <div
        data-testid="marquee-empty"
        role="status"
        aria-label="鸣谢信息"
        className="relative h-[52px] md:h-[60px] flex items-center justify-center overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-pink-900/40 via-black/60 to-pink-900/40 backdrop-blur-sm"
      >
        {/* CRT 扫描线效果 */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div
            className="w-full h-full"
            style={{
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(219, 39, 119, 0.03) 2px, rgba(219, 39, 119, 0.03) 4px)',
            }}
          />
        </div>
        <p
          className="relative z-10 text-amber-400 text-sm md:text-lg font-medium tracking-wide flex items-center gap-2"
          style={{ fontFamily: 'Chakra Petch, sans-serif' }}
        >
          <StarBurst size={16} className="text-amber-400" />
          感谢所有支持驴酱杯的朋友们
          <StarBurst size={16} className="text-amber-400" />
        </p>
      </div>
    );
  }

  const marqueeContent = (
    <div ref={contentRef} className="flex items-center gap-12 md:gap-16 px-6 md:px-8">
      {sponsors.map(sponsor => (
        <span
          key={sponsor.id}
          className="text-amber-400 text-sm md:text-lg font-medium whitespace-nowrap tracking-wide drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] hover:text-pink-400 hover:drop-shadow-[0_0_12px_rgba(244,114,182,0.8)] transition-all duration-300 cursor-default flex items-center gap-2"
          style={{ fontFamily: 'Chakra Petch, sans-serif' }}
        >
          <StarBurst size={14} className="text-amber-400 flex-shrink-0" />
          感谢老板
          <span className="text-pink-400 font-semibold">{sponsor.sponsorName}</span>
          赞助的
          <span className="text-amber-300">{sponsor.sponsorContent}</span>，老板大气
          <StarBurst size={14} className="text-amber-400 flex-shrink-0" />
        </span>
      ))}
    </div>
  );

  return (
    <div
      ref={animationRef}
      className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div
        ref={containerRef}
        data-testid="marquee-container"
        role="marquee"
        aria-label="赞助鸣谢滚动展示"
        className="relative h-[52px] md:h-[60px] overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-pink-900/30 via-black/70 to-pink-900/30 backdrop-blur-sm cursor-pointer group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* CRT 扫描线效果 */}
        <div className="absolute inset-0 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity duration-500">
          <div
            className="w-full h-full"
            style={{
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(219, 39, 119, 0.05) 2px, rgba(219, 39, 119, 0.05) 4px)',
            }}
          />
        </div>

        {/* 霓虹光晕边框 */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 20px rgba(251, 191, 36, 0.2), 0 0 30px rgba(219, 39, 119, 0.15)',
          }}
        />

        {/* 从右往左循环滚动的内容容器 */}
        <div
          data-testid="marquee-content"
          className={`flex items-center gap-0 will-change-transform h-full ${inViewport && !isPaused ? 'animate-marquee-rtl' : 'animate-marquee-rtl-paused'}`}
          style={{
            animationDuration: `${scrollDuration}s`,
            width: 'fit-content',
          }}
        >
          {/* 三组内容实现无缝循环：当前组 + 下一组 + 上一组(用于循环衔接) */}
          {marqueeContent}
          {marqueeContent}
        </div>

        {/* 渐变遮罩 - 左右两侧 */}
        <div className="absolute left-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10" />

        <style>{`
        /* 从右往左滚动：0% 时内容在右侧(translateX(0))，100% 时内容向左移动一半宽度(translateX(-50%)) */
        @keyframes marquee-scroll-rtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-rtl {
          animation: marquee-scroll-rtl linear infinite;
        }
        .animate-marquee-rtl-paused {
          animation: marquee-scroll-rtl linear infinite;
          animation-play-state: paused;
        }
      `}</style>
      </div>
    </div>
  );
};
