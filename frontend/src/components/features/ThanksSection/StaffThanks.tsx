import React from 'react';
import { StarBurst } from './DecorativeIcons';
import { useStaggeredAnimation } from './useScrollAnimation';
import type { StaffConfig } from '@/data/types';

interface StaffThanksProps {
  staff: StaffConfig[];
}

export const StaffThanks: React.FC<StaffThanksProps> = ({ staff }) => {
  // 按角色分组
  const grouped = staff.reduce<Record<string, string[]>>((acc, s) => {
    if (!acc[s.role]) acc[s.role] = [];
    acc[s.role].push(s.name);
    return acc;
  }, {});

  // 检查是否所有人员都是占位符
  const hasRealData = staff.some(s => s.name !== '（待补充）');

  const roles = Object.entries(grouped);

  // Hook 必须在条件判断之前调用
  const { containerRef, visibleItems } = useStaggeredAnimation(roles.length, 100);

  if (staff.length === 0) return null;

  return (
    <div
      data-testid="staff-thanks-container"
      className="relative mt-8 md:mt-12 p-5 md:p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-900/20 via-black/50 to-pink-900/20 backdrop-blur-md overflow-hidden group"
    >
      {/* CRT 扫描线效果 */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div
          className="w-full h-full"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(202, 138, 4, 0.03) 2px, rgba(202, 138, 4, 0.03) 4px)',
          }}
        />
      </div>

      {/* 霓虹光晕边框 */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 30px rgba(251, 191, 36, 0.1), 0 0 40px rgba(251, 191, 36, 0.1)',
        }}
      />

      {/* 标题区域 */}
      <div className="relative flex items-center gap-3 mb-4 md:mb-5">
        <div className="w-1 h-6 md:h-7 bg-gradient-to-b from-amber-500 to-pink-500 rounded-full" />
        <h3
          data-testid="staff-thanks-title"
          className="text-lg md:text-xl font-bold tracking-wide flex items-center gap-2"
          style={{
            fontFamily: 'Chakra Petch, sans-serif',
            background: 'linear-gradient(135deg, #FBBF24 0%, #F472B6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          <StarBurst size={18} className="text-amber-400 flex-shrink-0" style={{ WebkitTextFillColor: 'initial' }} />
          幕后工作人员
          <StarBurst size={18} className="text-pink-400 flex-shrink-0" style={{ WebkitTextFillColor: 'initial' }} />
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/50 via-pink-500/30 to-transparent" />
      </div>

      {/* 工作人员列表 */}
      {!hasRealData ? (
        <div className="relative text-center py-8">
          <StarBurst size={32} className="mx-auto mb-3 text-amber-500/50 animate-glow-pulse" />
          <p className="text-gray-500 text-sm md:text-base" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
            幕后工作人员名单即将公布
          </p>
          <p className="text-gray-600 text-xs mt-2">敬请期待</p>
        </div>
      ) : (
        <div ref={containerRef} className="relative space-y-3 md:space-y-4">
          {roles.map(([role, names], groupIndex) => (
            <div
              key={role}
              className={`flex flex-wrap items-center gap-2 p-3 md:p-4 rounded-xl bg-black/30 border border-white/5 hover:border-amber-500/30 hover:bg-amber-900/10 transition-all duration-300 ${
                visibleItems.has(groupIndex) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{
                transitionDelay: `${groupIndex * 100}ms`,
              }}
            >
              <span
                className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-500/30 text-amber-400 text-xs md:text-sm font-semibold whitespace-nowrap"
                style={{ fontFamily: 'Chakra Petch, sans-serif' }}
              >
                {role}
              </span>
              <span className="text-gray-400 text-sm">:</span>
              <div className="flex flex-wrap gap-2">
                {names.map((name, nameIndex) => (
                  <span
                    key={nameIndex}
                    className="text-gray-200 text-sm md:text-base hover:text-pink-400 transition-colors duration-200 cursor-default"
                    style={{ fontFamily: 'Chakra Petch, sans-serif' }}
                  >
                    {name}
                    {nameIndex < names.length - 1 && (
                      <span className="text-amber-500/50 ml-2">·</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部装饰 */}
      <div className="relative mt-5 flex items-center justify-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <span
          className="text-amber-500/40 text-xs tracking-widest"
          style={{ fontFamily: 'Chakra Petch, sans-serif' }}
        >
          THANK YOU
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      </div>
    </div>
  );
};
