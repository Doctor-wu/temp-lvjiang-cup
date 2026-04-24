import React, { useMemo } from 'react';
import { Team } from '@/types';
import SwissTeamLogo from './SwissTeamLogo';
import { SWISS_THEME } from '@/constants/swissTheme';

interface SwissRecordGroupProps {
  type: 'qualified' | 'eliminated';
  title: string;
  teams: Team[];
  /** 排名数据，用于过滤对应战绩的队伍并显示积分 */
  rankings?: { teamId: string; record: string; rank: number }[];
  /** 当前组件对应的战绩（如 3-2, 2-3），用于过滤队伍 */
  record?: string;
  className?: string;
  'data-testid'?: string;
}

const SwissRecordGroup: React.FC<SwissRecordGroupProps> = ({
  type,
  title,
  teams,
  rankings,
  record,
  className = '',
  'data-testid': testId = 'swiss-record-group',
}) => {
  const config = type === 'qualified' ? SWISS_THEME.qualified : SWISS_THEME.eliminated;

  // 根据战绩过滤队伍，并按排名排序
  const filteredTeams = useMemo(() => {
    if (!teams || teams.length === 0) return [];

    let result = [...teams];

    // 如果提供了 rankings 和 record，按战绩过滤
    if (rankings && record) {
      const teamIdsWithRecord = new Set(
        rankings
          .filter(r => r.record === record)
          .map(r => r.teamId)
      );
      result = result.filter(team => teamIdsWithRecord.has(team.id));
    }

    // 按排名排序
    if (rankings) {
      result.sort((a, b) => {
        const rankA = rankings.find(r => r.teamId === a.id)?.rank ?? 999;
        const rankB = rankings.find(r => r.teamId === b.id)?.rank ?? 999;
        return rankA - rankB;
      });
    }

    return result;
  }, [teams, rankings, record]);

  // 将战绩字符串转换为 3:0 格式
  const formatRecord = (recordStr: string): string => {
    if (!recordStr) return '';
    const parts = recordStr.split('-');
    return `${parts[0]}:${parts[1]}`;
  };

  return (
    <div
      className={`flex flex-col overflow-hidden flex-shrink-0 ${className}`}
      style={{
        width: `${SWISS_THEME.columnWidth}px`,
        minWidth: `${SWISS_THEME.columnWidth}px`,
        border: `2px solid ${config.border}`,
      }}
      data-testid={testId}
      data-type={type}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center justify-center px-3"
        style={{
          backgroundColor: config.bg,
          height: `${SWISS_THEME.headerHeight}px`,
          borderBottom:
            type === 'qualified' ? '2px solid rgb(131, 133, 139)' : '2px solid rgb(18, 19, 18)',
        }}
        data-testid={`${testId}-title`}
      >
        <span
          className="font-bold text-center"
          style={{
            color: SWISS_THEME.textDefault,
            fontSize: `${SWISS_THEME.titleFontSize}px`,
          }}
        >
          {title}
        </span>
      </div>

      {/* 队伍列表 - 列表形式 */}
      <div
        className="flex flex-col"
        style={{
          backgroundColor: config.contentBg,
          minHeight: '80px',
        }}
        data-testid={`${testId}-teams`}
      >
        {filteredTeams.map((team, index) => (
          <div
            key={team.id}
            className="flex items-center gap-3 px-4 py-2.5"
            style={{
              borderBottom:
                index < filteredTeams.length - 1
                  ? '1px solid rgba(255,255,255,0.08)'
                  : 'none',
            }}
            data-testid={`${testId}-team-${index}`}
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
            {record && (
              <span
                style={{
                  color: type === 'qualified' ? '#4ade80' : '#f87171',
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
            )}
          </div>
        ))}
        {filteredTeams.length === 0 && (
          <div
            className="flex flex-col items-center justify-center gap-2 w-full py-4"
            style={{
              border:
                type === 'qualified' ? '2px dashed #3d8f5e' : '2px dashed #a05050',
              borderRadius: '8px',
              backgroundColor: 'rgba(45, 46, 48, 0.5)',
            }}
          >
            <span style={{ color: SWISS_THEME.textMuted, fontSize: '13px' }}>暂无可展示的队伍</span>
            <span style={{ color: SWISS_THEME.textMuted, fontSize: '11px', opacity: 0.7 }}>
              当前轮次暂无{type === 'qualified' ? '晋级' : '淘汰'}队伍
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwissRecordGroup;

