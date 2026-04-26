import React, { useMemo, useState } from 'react';
import AmbientGlow from '../../common/v4/AmbientGlow';
import SectionHeader from '../../common/v4/SectionHeader';
import { useHomeData } from '../../../context/HomeDataContext';
import type { Match } from '../../../types';
import type { Team as ApiTeam } from '../../../api/types';

const ROUND_TITLES = ['第一轮', '第二轮', '第三轮', '第四轮', '第五轮'];

interface RoundGroup {
  rec: string;
  matches: Match[];
}

interface RoundData {
  round: number;
  title: string;
  meta: string;
  groups: RoundGroup[];
  /** Whether the round is the active "current" round (live or first not-finished). */
  active: boolean;
  /** Concise summary used by collapsed mobile rows. */
  summary: string;
  stat: string;
}

const ScheduleV4: React.FC = () => {
  const { teams, matches } = useHomeData();
  const allMatches = matches as Match[];

  const [tab, setTab] = useState<'swiss' | 'elimination'>('swiss');

  const teamName = useMemo(() => {
    const map = new Map<string, string>();
    (teams as ApiTeam[]).forEach(t => map.set(t.id, t.name));
    return map;
  }, [teams]);

  const swissRounds = useMemo<RoundData[]>(() => {
    const swiss = allMatches.filter(m => m.stage === 'swiss');
    const byRound = new Map<number, Match[]>();
    swiss.forEach(m => {
      const r = m.swissRound ?? 0;
      if (!byRound.has(r)) byRound.set(r, []);
      byRound.get(r)!.push(m);
    });

    return Array.from({ length: 5 }, (_, i) => {
      const round = i + 1;
      const list = (byRound.get(round) ?? []).slice();
      const groups = groupByRecord(list);
      const allFinished = list.length > 0 && list.every(m => m.status === 'finished');
      const anyOngoing = list.some(m => m.status === 'ongoing');
      const liveCount = list.filter(m => m.status === 'ongoing').length;
      const meta = `${round <= 3 ? 'BO1' : 'BO3'} · ${
        list.length === 0 ? '待赛' : anyOngoing ? '进行中' : allFinished ? '完赛' : '待赛'
      }`;
      const winnersByRound = list
        .filter(m => m.status === 'finished' && m.winnerId)
        .map(m => teamName.get(m.winnerId!) ?? '')
        .filter(Boolean)
        .slice(0, 8);
      const summary =
        list.length === 0
          ? '该轮赛程待公布'
          : allFinished
            ? `胜出: ${winnersByRound.join(' / ')}`
            : anyOngoing
              ? `${list.length} 场, ${liveCount} 场直播中`
              : `${list.length} 场待开`;
      const stat =
        list.length === 0
          ? '待赛'
          : allFinished
            ? `${list.length} 场结束`
            : `${list.length} 场${anyOngoing ? `, ${liveCount} 直播中` : ''}`;
      return {
        round,
        title: ROUND_TITLES[i],
        meta,
        groups,
        active: anyOngoing || (!allFinished && list.length > 0),
        summary,
        stat,
      };
    });
  }, [allMatches, teamName]);

  const totalMatches = allMatches.filter(m => m.stage === 'swiss').length;

  // Mobile accordion: default open the active round.
  const [openRound, setOpenRound] = useState<number>(() => {
    const active = swissRounds.find(r => r.active);
    return active?.round ?? 3;
  });

  return (
    <section
      id="schedule"
      className="v4-root relative px-5 md:px-9 pt-8 md:pt-12 pb-7 md:pb-9"
    >
      <AmbientGlow hue="schedule" id="schedule" height={80} />
      <SectionHeader
        eyebrow="— 05 / SCHEDULE"
        title="赛程"
        right={
          <div className="flex gap-1 p-[3px] rounded-full bg-white/[0.04]">
            <button
              type="button"
              data-testid="home-swiss-tab"
              onClick={() => setTab('swiss')}
              className={`v4-mono text-[10px] md:text-[11px] px-3 py-[5px] rounded-full ${
                tab === 'swiss' ? 'v4-seg-on' : 'v4-seg-off'
              }`}
            >
              瑞士轮
            </button>
            <button
              type="button"
              data-testid="home-elimination-tab"
              onClick={() => setTab('elimination')}
              className={`v4-mono text-[10px] md:text-[11px] px-3 py-[5px] rounded-full ${
                tab === 'elimination' ? 'v4-seg-on' : 'v4-seg-off'
              }`}
            >
              淘汰赛
            </button>
          </div>
        }
      />

      {tab === 'swiss' ? (
        <>
          {/* Desktop: 5 columns */}
          <div className="relative hidden md:grid grid-cols-5 gap-2">
            {swissRounds.map(r => (
              <RoundColumn key={r.round} data={r} teamName={teamName} />
            ))}
          </div>
          {/* Mobile: accordion */}
          <div className="relative md:hidden flex flex-col gap-1.5">
            {swissRounds.map(r => (
              <RoundAccordionItem
                key={r.round}
                data={r}
                teamName={teamName}
                isOpen={openRound === r.round}
                onToggle={() =>
                  setOpenRound(prev => (prev === r.round ? 0 : r.round))
                }
              />
            ))}
          </div>

          <div className="relative mt-4 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-3 md:gap-4 text-[rgba(245,245,247,0.55)] flex-wrap">
              <Legend dotClassName="rounded-sm" color="rgba(60,210,140,0.85)" label="晋级" />
              <Legend dotClassName="rounded-sm" color="rgba(255,59,48,0.7)" label="淘汰" />
              <Legend
                dotClassName="rounded-full v4-pulse"
                color="#FF3B30"
                label="正在直播"
              />
            </div>
            <span className="v4-mono text-[rgba(245,245,247,0.45)] tracking-[0.06em]">
              BO1 → BO3 · 总 {totalMatches} 场
            </span>
          </div>
        </>
      ) : (
        <div className="relative rounded-lg border border-white/[0.08] p-6 text-center text-[rgba(245,245,247,0.55)]">
          <div className="v4-mono text-[10px] tracking-[0.18em] text-[rgba(245,245,247,0.4)] mb-2">
            ELIMINATION BRACKET
          </div>
          <div className="text-[14px]">瑞士轮结束后揭晓 8 进 4 进 2 对阵</div>
        </div>
      )}
    </section>
  );
};

const Legend: React.FC<{ color: string; label: string; dotClassName?: string }> = ({
  color,
  label,
  dotClassName = '',
}) => (
  <span className="inline-flex items-center gap-1.5">
    <span
      className={dotClassName}
      style={{ width: 7, height: 7, background: color, display: 'inline-block' }}
    />
    {label}
  </span>
);

interface ColumnProps {
  data: RoundData;
  teamName: Map<string, string>;
}

const RoundColumn: React.FC<ColumnProps> = ({ data, teamName }) => (
  <div
    className="flex flex-col gap-2 px-2.5 py-3 min-h-[200px]"
    style={{
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0) 100%)',
    }}
  >
    <div
      className="flex items-center justify-between pb-1 px-0.5"
      style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}
    >
      <span className="text-[11.5px] font-medium">{data.title}</span>
      <span className="v4-mono text-[9px] text-[rgba(245,245,247,0.4)] tracking-[0.04em]">
        {data.meta}
      </span>
    </div>
    {data.groups.length === 0 ? (
      <div className="text-[10px] text-[rgba(245,245,247,0.4)] py-3">该轮赛程待公布</div>
    ) : (
      data.groups.map(g => <RoundGroupCell key={g.rec} group={g} teamName={teamName} />)
    )}
  </div>
);

interface AccordionProps extends ColumnProps {
  isOpen: boolean;
  onToggle: () => void;
}

const RoundAccordionItem: React.FC<AccordionProps> = ({ data, teamName, isOpen, onToggle }) => (
  <div
    className="v4-acc-item overflow-hidden"
    data-open={isOpen ? 'true' : 'false'}
    style={{
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 9,
      background: isOpen ? 'rgba(255,255,255,0.025)' : 'transparent',
    }}
  >
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-3 w-full text-left bg-transparent border-0 cursor-pointer"
      aria-expanded={isOpen}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-[12px] font-medium">{data.title}</span>
        <span className="v4-mono text-[9px] text-[rgba(245,245,247,0.4)] tracking-[0.06em]">
          {data.meta}
        </span>
      </div>
      <span className="v4-mono text-[9.5px] text-[rgba(245,245,247,0.5)] mr-2">
        {data.stat}
      </span>
      <svg
        className="v4-acc-arrow"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(245,245,247,0.5)"
        strokeWidth="1.5"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    {isOpen ? (
      data.groups.length > 0 ? (
        <div
          className="px-3 pb-3 flex flex-col gap-2.5"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          {data.groups.map(g => (
            <RoundGroupCell key={g.rec} group={g} teamName={teamName} mobile />
          ))}
        </div>
      ) : (
        <div
          className="px-3 pb-3 pt-2.5 text-[11px] text-[rgba(245,245,247,0.55)] leading-[1.5]"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          {data.summary}
        </div>
      )
    ) : (
      <div
        className="px-3 pb-3 text-[11px] text-[rgba(245,245,247,0.45)] leading-[1.5]"
        style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 10 }}
      >
        {data.summary}
      </div>
    )}
  </div>
);

interface GroupProps {
  group: RoundGroup;
  teamName: Map<string, string>;
  mobile?: boolean;
}

const RoundGroupCell: React.FC<GroupProps> = ({ group, teamName, mobile }) => {
  const advance = isAdvanceRecord(group.rec);
  const elim = isEliminationRecord(group.rec);
  const barColor = advance
    ? 'rgba(60,210,140,0.6)'
    : elim
      ? 'rgba(255,59,48,0.55)'
      : 'rgba(255,255,255,0.18)';
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pt-1.5 pb-1 px-1">
        <span className="v4-mono text-[9.5px] tracking-[0.06em] text-[rgba(245,245,247,0.55)]">
          {group.rec}
          {group.rec === '2-2' ? ' · 生死战' : ''}
        </span>
        {advance ? (
          <span className="v4-mono text-[8.5px] text-[rgba(60,210,140,0.85)]">→ 晋级</span>
        ) : elim ? (
          <span className="v4-mono text-[8.5px] text-[rgba(255,59,48,0.85)]">→ 淘汰</span>
        ) : null}
      </div>
      <div style={{ height: 0.5, background: barColor }} />
      {group.matches.map(m => (
        <MatchRow key={m.id} match={m} teamName={teamName} mobile={mobile} />
      ))}
    </div>
  );
};

const MatchRow: React.FC<{ match: Match; teamName: Map<string, string>; mobile?: boolean }> = ({
  match,
  teamName,
  mobile,
}) => {
  const a = teamName.get(match.teamAId ?? '') ?? '待定';
  const b = teamName.get(match.teamBId ?? '') ?? '待定';
  const live = match.status === 'ongoing';
  const wA = match.winnerId === match.teamAId;
  const wB = match.winnerId === match.teamBId;
  const aColor = live ? '#F5F5F7' : wA ? '#F5F5F7' : 'rgba(245,245,247,0.45)';
  const bColor = live ? '#F5F5F7' : wB ? '#F5F5F7' : 'rgba(245,245,247,0.45)';
  return (
    <div
      className="grid items-center px-1 py-[5px]"
      style={{
        gridTemplateColumns: '1fr auto 1fr',
        gap: 5,
        fontSize: mobile ? 11 : 10.5,
      }}
    >
      <div
        className="text-right truncate"
        style={{ color: aColor, fontWeight: wA ? 500 : 400 }}
      >
        {a}
      </div>
      <div
        className="v4-mono inline-flex items-center justify-center"
        style={{
          minWidth: 42,
          fontSize: 10,
          color: 'rgba(245,245,247,0.85)',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 3,
          padding: '2px 0',
        }}
      >
        {live ? (
          <span
            className="v4-pulse"
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#FF3B30',
              marginRight: 5,
            }}
          />
        ) : null}
        {match.scoreA} : {match.scoreB}
      </div>
      <div className="truncate" style={{ color: bColor, fontWeight: wB ? 500 : 400 }}>
        {b}
      </div>
    </div>
  );
};

function groupByRecord(matches: Match[]): RoundGroup[] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const rec = m.swissRecord ?? '0-0';
    if (!map.has(rec)) map.set(rec, []);
    map.get(rec)!.push(m);
  }
  // Sort: better records first within a round.
  return Array.from(map.entries())
    .sort((a, b) => recordSortKey(b[0]) - recordSortKey(a[0]))
    .map(([rec, list]) => ({ rec, matches: list }));
}

function recordSortKey(rec: string) {
  const [w] = rec.split('-').map(n => Number(n) || 0);
  return w;
}

function isAdvanceRecord(rec: string) {
  return rec === '2-1' || rec === '2-0';
}

function isEliminationRecord(rec: string) {
  return rec === '1-2' || rec === '0-2';
}

export default ScheduleV4;
