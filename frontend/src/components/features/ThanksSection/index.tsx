import React from 'react';
import { motion } from 'framer-motion';
import { MarqueeBanner } from './MarqueeBanner';
import { SpecialAwards } from './SpecialAwards';
import { StaffThanks } from './StaffThanks';
import { StarBurst, HeartIcon } from './DecorativeIcons';
import type { SponsorConfig, StaffConfig, ThanksData } from '@/data/types';

declare global {
  interface Window {
    THANKS_DATA?: ThanksData;
  }
}

const thanksData: ThanksData = window.THANKS_DATA || { sponsors: [], staff: [] };

const sponsors: SponsorConfig[] = thanksData.sponsors || [];
const staff: StaffConfig[] = thanksData.staff || [];

// 动画配置
const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
};

export const ThanksSection: React.FC = () => {
  if (sponsors.length === 0 && staff.length === 0) return null;

  return (
    <motion.section
      id="thanks"
      data-testid="thanks-section"
      className="relative py-16 md:py-24 bg-gradient-to-b from-black via-gray-950 to-black overflow-hidden"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={sectionVariants}
    >
      {/* 背景装饰 - 合并为单一装饰层 */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            linear-gradient(rgba(219, 39, 119, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(219, 39, 119, 0.1) 1px, transparent 1px)
          `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* 背景装饰 - 光晕 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />

      {/* CRT 扫描线效果 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(219, 39, 119, 0.1) 2px, rgba(219, 39, 119, 0.1) 4px)',
          }}
        />
      </div>

      <div className="relative container mx-auto px-4">
        {/* 标题区域 */}
        <motion.div className="text-center mb-10 md:mb-14" variants={itemVariants}>
          {/* 顶部装饰线 */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent via-pink-500 to-amber-500" />
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span
                className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
            <div className="h-px w-16 md:w-24 bg-gradient-to-l from-transparent via-pink-500 to-amber-500" />
          </div>

          <h2
            data-testid="thanks-section-title"
            className="text-2xl md:text-4xl font-bold tracking-wider flex items-center justify-center gap-3"
            style={{
              fontFamily: 'Chakra Petch, sans-serif',
              background: 'linear-gradient(135deg, #F472B6 0%, #FBBF24 50%, #F472B6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 30px rgba(244, 114, 182, 0.3)',
            }}
          >
            <StarBurst size={24} className="text-pink-400 flex-shrink-0" style={{ WebkitTextFillColor: 'initial' }} />
            特别鸣谢
            <StarBurst size={24} className="text-amber-400 flex-shrink-0" style={{ WebkitTextFillColor: 'initial' }} />
          </h2>

          <p
            className="mt-3 text-gray-400 text-sm md:text-base max-w-md mx-auto"
            style={{ fontFamily: 'Chakra Petch, sans-serif' }}
          >
            感谢每一位支持者的信任与陪伴
          </p>

          {/* 底部装饰线 */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-px w-12 md:w-20 bg-gradient-to-r from-transparent to-amber-500/50" />
            <span
              className="text-amber-500/40 text-xs tracking-[0.3em]"
              style={{ fontFamily: 'Chakra Petch, sans-serif' }}
            >
              SPONSORS & STAFF
            </span>
            <div className="h-px w-12 md:w-20 bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
        </motion.div>

        {/* 弹幕区域 */}
        <motion.div className="mb-8 md:mb-10" variants={itemVariants}>
          <MarqueeBanner sponsors={sponsors} />
        </motion.div>

        {/* 特殊奖项和幕后工作人员左右布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* 特殊奖项 - 左侧 */}
          <motion.div variants={itemVariants}>
            <SpecialAwards sponsors={sponsors} />
          </motion.div>

          {/* 幕后工作人员 - 右侧 */}
          <motion.div variants={itemVariants}>
            <StaffThanks staff={staff} />
          </motion.div>
        </div>

        {/* 底部装饰 */}
        <motion.div
          className="mt-16 md:mt-20 flex items-center justify-center"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-pink-500/20 bg-black/40 backdrop-blur-sm">
            <HeartIcon size={20} className="text-pink-400" />
            <span
              className="text-gray-400 text-sm"
              style={{ fontFamily: 'Chakra Petch, sans-serif' }}
            >
              再次感谢所有支持
            </span>
            <HeartIcon size={20} className="text-amber-400" />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};
