import React, { useMemo } from 'react';
import { Match, Team } from '@/types';
import SwissMatchCard from './SwissMatchCard';
import SwissTeamLogo from './SwissTeamLogo';
import { SWISS_THEME } from '@/constants/swissTheme';
import { type SwissRecordConfig } from '@/constants/swissTreeConfig';

interface SwissRecordSectionProps {
  config: SwissRecordConfig;
  matches: Match[];
  teams: Team[];
  promotionTeams?: Team[];
  eliminationTeams?: Team[];
  rankings?: { teamId: string; record: string; rank: number }[];
  onMatchClick?: (match: Match) => void;
  onPositionChange?: (slotId: string, x: number, y: number) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
  _baseX?: number;
  _baseY?: number;
  className?: string;
  'data-testid'?: string;
  isHighlighted?: boolean;
}

const SwissRecordSection: React.FC<SwissRecordSectionProps> = ({
  config,
  matches,
  teams,
  promotionTeams,
  eliminationTeams,
  rankings,
  onMatchClick,
  onPositionChange,
  containerRef,
  _baseX = 0,
  _baseY = 0,
  className = '',
  'data-testid': testId = 'swiss-record-section',
  isHighlighted = true,
}) => {
  const { record, label, type } = config;

  // 将战绩字符串转换为 3:0 格式
  const formatRecord = (recordStr: string): string => {
    const parts = recordStr.split('-');
    return `${parts[0]}:${parts[1]}`;
  };

  // 根据战绩过滤晋级队伍，并按排名排序
  const filteredPromotionTeams = useMemo(() => {
    if (!promotionTeams || promotionTeams.length === 0 || !rankings) return [];
    // 根据当前列的战绩筛选队伍
    const teamIdsWithRecord = new Set(rankings.filter(r => r.record === record).map(r => r.teamId));
    return promotionTeams
      .filter(team => teamIdsWithRecord.has(team.id))
      .sort((a, b) => {
        const rankA = rankings.find(r => r.teamId === a.id)?.rank ?? 999;
        const rankB = rankings.find(r => r.teamId === b.id)?.rank ?? 999;
        return rankA - rankB;
      });
  }, [promotionTeams, rankings, record]);

  // 根据战绩过滤淘汰队伍，并按排名排序
  const filteredEliminationTeams = useMemo(() => {
    if (!eliminationTeams || eliminationTeams.length === 0 || !rankings) return [];
    // 根据当前列的战绩筛选队伍
    const teamIdsWithRecord = new Set(rankings.filter(r => r.record === record).map(r => r.teamId));
    return eliminationTeams
      .filter(team => teamIdsWithRecord.has(team.id))
      .sort((a, b) => {
        const rankA = rankings.find(r => r.teamId === a.id)?.rank ?? 999;
        const rankB = rankings.find(r => r.teamId === b.id)?.rank ?? 999;
        return rankA - rankB;
      });
  }, [eliminationTeams, rankings, record]);

  // 晋级名单区域 - 列表形式
  if (type === 'promotion') {
    return (
      <div
        className={`flex flex-col overflow-hidden ${className}`}
        style={{
          border: `2px solid ${SWISS_THEME.qualified.border}`,
        }}
        data-testid={testId}
        data-record={record}
        data-type="promotion"
      >
        {/* 标题栏 */}
        <div
          className="flex items-center justify-center px-3"
          style={{
            background: SWISS_THEME.qualified.bg,
            height: `${SWISS_THEME.headerHeight}px`,
            borderBottom: '2px solid rgb(131, 133, 139)',
          }}
        >
          <span
            className="font-bold text-center"
            style={{
              color: SWISS_THEME.textDefault,
              fontSize: `${SWISS_THEME.titleFontSize}px`,
            }}
          >
            晋级
          </span>
        </div>

        {/* 队伍列表 - 左图标+队名 右侧积分 */}
        <div
          className="flex flex-col"
          style={{
            backgroundColor: SWISS_THEME.qualified.contentBg,
            minHeight: '60px',
          }}
        >
          {filteredPromotionTeams.map(team => (
            <div
              key={team.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderBottom:
                  filteredPromotionTeams.indexOf(team) < filteredPromotionTeams.length - 1
                    ? '1px solid rgba(255,255,255,0.08)'
                    : 'none',
              }}
            >
              {/* 队标 */}
              <SwissTeamLogo team={team} size={30} />

              {/* 队名 */}
              <span
                className="truncate flex-1"
                style={{
                  color: SWISS_THEME.textDefault,
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {team.name}
              </span>

              {/* 积分 */}
              <span
                style={{
                  color: '#4ade80',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                  minWidth: '36px',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatRecord(record)}
              </span>
            </div>
          ))}
          {filteredPromotionTeams.length === 0 && (
            <div
              className="flex flex-col items-center justify-center gap-2 w-full py-4"
              style={{
                border: '2px dashed #3d8f5e',
                borderRadius: '8px',
                backgroundColor: 'rgba(45, 46, 48, 0.5)',
              }}
            >
              <span style={{ color: '#8ba48f', fontSize: '13px' }}>暂无可展示的队伍</span>
              <span style={{ color: '#7a8a7f', fontSize: '11px' }}>当前轮次暂无晋级队伍</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 淘汰名单区域 - 列表形式
  if (type === 'elimination') {
    return (
      <div
        className={`flex flex-col overflow-hidden ${className}`}
        style={{
          border: `2px solid ${SWISS_THEME.eliminated.border}`,
        }}
        data-testid={testId}
        data-record={record}
        data-type="elimination"
      >
        {/* 标题栏 */}
        <div
          className="flex items-center justify-center px-3"
          style={{
            background: SWISS_THEME.eliminated.bg,
            height: `${SWISS_THEME.headerHeight}px`,
            borderBottom: '2px solid rgb(18, 19, 18)',
          }}
        >
          <span
            className="font-bold text-center"
            style={{
              color: SWISS_THEME.textDefault,
              fontSize: `${SWISS_THEME.titleFontSize}px`,
            }}
          >
            淘汰
          </span>
        </div>

        {/* 队伍列表 - 左图标+队名 右侧积分 */}
        <div
          className="flex flex-col"
          style={{
            backgroundColor: SWISS_THEME.eliminated.contentBg,
            minHeight: '60px',
          }}
        >
          {filteredEliminationTeams.map(team => (
            <div
              key={team.id}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                borderBottom:
                  filteredEliminationTeams.indexOf(team) < filteredEliminationTeams.length - 1
                    ? '1px solid rgba(255,255,255,0.08)'
                    : 'none',
              }}
            >
              {/* 队标 */}
              <SwissTeamLogo team={team} size={30} />
              {/* 队名 - 占据剩余空间 */}
              <span
                className="truncate flex-1"
                style={{
                  color: SWISS_THEME.textDefault,
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {team.name}
              </span>
              {/* 积分 - 固定宽度靠右 */}
              <span
                style={{
                  color: '#f87171',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                  minWidth: '40px',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatRecord(record)}
              </span>
            </div>
          ))}
          {filteredEliminationTeams.length === 0 && (
            <div
              className="flex flex-col items-center justify-center gap-2 w-full py-4"
              style={{
                border: '2px dashed #a05050',
                borderRadius: '8px',
                backgroundColor: 'rgba(45, 46, 48, 0.5)',
              }}
            >
              <span style={{ color: '#b08080', fontSize: '13px' }}>暂无可展示的队伍</span>
              <span style={{ color: '#8a7a7a', fontSize: '11px' }}>当前轮次暂无淘汰队伍</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 比赛区域
  return (
    <div
      className={`flex flex-col ${className}`}
      data-testid={testId}
      data-record={record}
      data-type="matches"
      style={{
        opacity: isHighlighted ? 1 : 0.4,
        transition: 'opacity 300ms ease',
      }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-4"
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
          }}
        >
          {label}
        </span>
      </div>

      {/* 比赛列表 */}
      <div className="flex flex-col">
        {matches.map((match, index) => (
          <SwissMatchCard
            key={match.id}
            match={match}
            teams={teams}
            onClick={onMatchClick ? () => onMatchClick(match) : undefined}
            slotId={config.slotIds[index]}
            onPositionChange={onPositionChange}
            containerRef={containerRef}
          />
        ))}
      </div>
    </div>
  );
};

export default SwissRecordSection;
