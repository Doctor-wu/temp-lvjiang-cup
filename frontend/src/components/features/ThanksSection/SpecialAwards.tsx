import React, { useState, useEffect } from 'react';
import { StarBurst, TrophyIcon } from './DecorativeIcons';
import { useStaggeredAnimation } from './useScrollAnimation';
import type { SponsorConfig } from '@/data/types';

interface SpecialAwardsProps {
  sponsors: SponsorConfig[];
}

export const SpecialAwards: React.FC<SpecialAwardsProps> = ({ sponsors }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 筛选有特殊奖项的赞助商
  const awards = sponsors.filter(s => s.specialAward);

  // 移动端默认只显示前3条
  const displayAwards = isMobile && !isExpanded ? awards.slice(0, 3) : awards;
  const hasMoreAwards = awards.length > 3;

  // Hook 必须在条件判断之前调用
  const { containerRef, visibleItems } = useStaggeredAnimation(displayAwards.length, 100);

  // 如果没有特殊奖项，返回 null（在 Hook 调用之后）
  if (awards.length === 0) return null;

  return (
    <div
      data-testid="special-awards-container"
      ref={containerRef}
      className="relative mt-8 md:mt-12 p-5 md:p-6 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-900/20 via-black/50 to-amber-900/20 backdrop-blur-md overflow-hidden group"
    >
      {/* CRT 扫描线效果 */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div
          className="w-full h-full"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(219, 39, 119, 0.03) 2px, rgba(219, 39, 119, 0.03) 4px)',
          }}
        />
      </div>

      {/* 霓虹光晕边框 */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 30px rgba(219, 39, 119, 0.1), 0 0 40px rgba(219, 39, 119, 0.1)',
        }}
      />

      {/* 标题区域 */}
      <div className="relative flex items-center gap-3 mb-4 md:mb-5">
        <div className="w-1 h-6 md:h-7 bg-gradient-to-b from-pink-500 to-amber-500 rounded-full" />
        <h3
          data-testid="special-awards-title"
          className="text-lg md:text-xl font-bold tracking-wide flex items-center gap-2"
          style={{
            fontFamily: 'Chakra Petch, sans-serif',
            background: 'linear-gradient(135deg, #F472B6 0%, #FBBF24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          <StarBurst size={18} className="text-pink-400 flex-shrink-0" style={{ WebkitTextFillColor: 'initial' }} />
          特殊奖项
          <StarBurst size={18} className="text-amber-400 flex-shrink-0" style={{ WebkitTextFillColor: 'initial' }} />
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-pink-500/50 via-amber-500/30 to-transparent" />
      </div>

      {/* 奖项列表 */}
      <div ref={containerRef} className="relative space-y-3">
        {displayAwards.map((award, index) => (
          <li
            key={award.id}
            className={`flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/5 hover:border-pink-500/30 hover:bg-pink-900/10 transition-all duration-300 group/item min-h-[72px] ${
              visibleItems.has(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
            style={{
              transitionDelay: `${index * 100}ms`,
            }}
          >
            <TrophyIcon className="flex-shrink-0 w-6 h-6 text-amber-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <strong
                className="text-pink-400 font-semibold text-sm md:text-base block mb-1"
                style={{ fontFamily: 'Chakra Petch, sans-serif' }}
              >
                {award.sponsorName}
              </strong>
              <p className="text-gray-200 text-xs md:text-sm leading-relaxed">
                {award.specialAward}
              </p>
            </div>
          </li>
        ))}
      </div>

      {/* 展开/收起按钮 */}
      {isMobile && hasMoreAwards && (
        <button
          data-testid="expand-button"
          className="relative mt-4 w-full py-2.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-pink-500/10 text-amber-400 hover:text-amber-300 hover:border-amber-500/50 hover:from-amber-500/20 hover:to-pink-500/20 transition-all duration-300 text-sm font-medium"
          style={{ fontFamily: 'Chakra Petch, sans-serif' }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="flex items-center justify-center gap-2">
            {isExpanded ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
                收起
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                查看更多 ({awards.length - 3} 条)
              </>
            )}
          </span>
        </button>
      )}
    </div>
  );
};
