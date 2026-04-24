import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Match, Team } from '@/types';
import SwissRecordSection from './SwissRecordSection';
import { SWISS_THEME } from '@/constants/swissTheme';
import { SWISS_COLUMNS, type SwissColumnConfig } from '@/constants/swissTreeConfig';

interface SwissRoundTreeProps {
  matches: Match[];
  teams: Team[];
  activeTab: 'bo1' | 'bo3';
  onTabChange: (tab: 'bo1' | 'bo3') => void;
  advancement?: {
    top8: string[];
    eliminated: string[];
    rankings?: { teamId: string; record: string; rank: number }[];
  };
  onMatchClick?: (match: Match) => void;
  className?: string;
  'data-testid'?: string;
}

const SwissRoundTree: React.FC<SwissRoundTreeProps> = ({
  matches,
  teams,
  activeTab,
  onTabChange,
  advancement,
  onMatchClick,
  className = '',
  'data-testid': testId = 'swiss-round-tree',
}) => {
  // 屏幕宽度状态，用于响应式计算
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 滚动容器引用 - 用于计算卡片的相对位置
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // BO1/BO3 战绩分组定义
  const bo1Records = ['0-0', '1-0', '0-1', '1-1'];
  const bo3Records = ['2-0', '0-2', '2-1', '1-2', '2-2'];

  // 按战绩分组比赛
  const matchesByRecord = useMemo(() => {
    const result: Record<string, Match[]> = {};
    for (const match of matches) {
      const record = match.swissRecord || '0-0';
      if (!result[record]) {
        result[record] = [];
      }
      result[record].push(match);
    }
    return result;
  }, [matches]);

  // 晋级队伍
  const promotionTeams = useMemo(() => {
    if (!advancement?.top8) return [];
    return teams.filter(t => advancement.top8.includes(t.id));
  }, [teams, advancement]);

  // 淘汰队伍
  const eliminationTeams = useMemo(() => {
    if (!advancement?.eliminated) return [];
    return teams.filter(t => advancement.eliminated.includes(t.id));
  }, [teams, advancement]);

  // 计算容器宽度和列宽度 - PC端固定4列，通过减小边距来放大列宽
  // 固定4列
  const fixedColumnCount = 4;
  // 基础边距（左右各）
  const basePadding = 40;
  // 可用宽度
  const availableWidth = screenWidth - basePadding * 2;
  // 每列宽度 = 可用宽度 / 4，最小保持原来的230px，最大可放大到原来的1.3倍
  const columnWidth = Math.min(
    Math.floor(availableWidth / fixedColumnCount),
    Math.floor(SWISS_THEME.columnWidth * 1.3)
  );
  // 列间距保持不变
  const columnGap = SWISS_THEME.gap;
  // 容器宽度
  const visibleWidth = fixedColumnCount * columnWidth + (fixedColumnCount - 1) * columnGap;

  // 计算滑动偏移量
  // BO1: 显示第1-4列 (索引0-3)，偏移0
  // BO3: 显示第3-6列 (索引2-5)，需要向左滑动2列的宽度
  const slideOffset = activeTab === 'bo1' ? 0 : -2 * (columnWidth + columnGap);

  // 判断战绩分组是否应该高亮
  const shouldHighlightRecord = (record: string): boolean => {
    if (activeTab === 'bo1') {
      return bo1Records.includes(record);
    }
    return bo3Records.includes(record);
  };

  // 处理比赛卡片位置变化（静态连线不再需要动态位置计算）
  const _handleMatchCardPositionChange = useCallback((_slotId: string, _x: number, _y: number) => {
    // 静态连线使用固定配置，不需要动态计算位置
    // 保留此函数供未来可能的扩展使用
  }, []);

  // 渲染单列
  const renderColumn = (column: SwissColumnConfig) => {
    return (
      <div
        key={column.id}
        className="flex flex-col gap-2 flex-shrink-0 transition-all duration-300"
        style={{
          width: `${columnWidth}px`,
        }}
        data-testid={`${testId}-column-${column.id}`}
      >
        {/* 列标题 */}
        <div
          className="flex items-center justify-center px-3"
          style={{
            backgroundColor: SWISS_THEME.titleBg,
            height: `${SWISS_THEME.headerHeight}px`,
            borderBottom: `4px solid ${SWISS_THEME.titleBorder}`,
          }}
        >
          <span
            style={{
              color: SWISS_THEME.titleText,
              fontSize: `${SWISS_THEME.titleFontSize}px`,
              fontWeight: 'bold',
            }}
          >
            {column.name}
          </span>
        </div>

        {/* 战绩分组 */}
        <div className="flex flex-col gap-2">
          {column.records.map(recordConfig => {
            const isHighlighted = shouldHighlightRecord(recordConfig.record);
            return (
              <SwissRecordSection
                key={recordConfig.record}
                config={recordConfig}
                matches={matchesByRecord[recordConfig.record] || []}
                teams={teams}
                promotionTeams={recordConfig.type === 'promotion' ? promotionTeams : undefined}
                eliminationTeams={
                  recordConfig.type === 'elimination' ? eliminationTeams : undefined
                }
                rankings={advancement?.rankings}
                onMatchClick={onMatchClick}
                onPositionChange={_handleMatchCardPositionChange}
                containerRef={scrollContainerRef}
                isHighlighted={isHighlighted}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={className} data-testid={testId}>
      {/* BO1/BO3 切换标签 - 方案C：模拟官方3:1宽度比例设计 + 下划线效果 */}
      <div
        className="relative mb-2 mx-auto"
        style={{
          width: `${visibleWidth}px`,
        }}
      >
        {/* 标签容器 */}
        <div
          className="flex w-full"
          style={{
            position: 'relative',
            borderBottom: '2px solid rgb(28, 30, 29)', // 官方深色底边
          }}
        >
          <button
            onClick={() => onTabChange('bo1')}
            className="transition-all duration-300"
            style={{
              flex: activeTab === 'bo1' ? '3' : '1',
              padding: '0px',
              fontSize: '36px',
              fontWeight: 700,
              color:
                activeTab === 'bo1'
                  ? 'rgb(169, 144, 120)' // 官方金色（激活）
                  : 'rgb(221, 221, 221)', // 官方灰色（非激活）
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'dinbold, sans-serif',
              lineHeight: '68px',
            }}
          >
            BO1
          </button>
          <button
            onClick={() => onTabChange('bo3')}
            className="transition-all duration-300"
            style={{
              flex: activeTab === 'bo3' ? '3' : '1',
              padding: '0px',
              fontSize: '36px',
              fontWeight: 700,
              color:
                activeTab === 'bo3'
                  ? 'rgb(169, 144, 120)' // 官方金色（激活）
                  : 'rgb(221, 221, 221)', // 官方灰色（非激活）
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'dinbold, sans-serif',
              lineHeight: '68px',
            }}
          >
            BO3
          </button>
        </div>

        {/* 下划线指示器 - 模拟 ::after 伪元素效果 */}
        {/* 官方通过 ::after 实现，我们通过动态宽度的 div 实现 */}
        <div
          className="absolute transition-all duration-300"
          style={{
            height: '2px',
            backgroundColor: 'rgb(169, 144, 120)', // 官方金色下划线
            bottom: '-2px', // 与容器的 borderBottom 重合
            left: activeTab === 'bo1' ? '0%' : '25%', // 激活标签的起始位置
            width: activeTab === 'bo1' ? '75%' : '75%', // 与激活标签同宽
            transitionTimingFunction: 'ease-out',
          }}
        />
      </div>

      {/* 赛程区域 - 6列容器，带滑动动画 */}
      <div
        ref={scrollContainerRef}
        className="overflow-hidden mx-auto relative"
        style={{
          width: `${visibleWidth}px`,
          minHeight: '500px',
        }}
        data-testid={`${testId}-content`}
      >
        {/* 6列容器，通过transform实现滑动 */}
        <div
          className="flex transition-transform relative"
          style={{
            transform: `translateX(${slideOffset}px)`,
            width: `${6 * columnWidth + 5 * columnGap}px`,
            gap: `${columnGap}px`,
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 2,
          }}
        >
          {SWISS_COLUMNS.map(renderColumn)}
        </div>
      </div>
    </div>
  );
};

export default SwissRoundTree;
