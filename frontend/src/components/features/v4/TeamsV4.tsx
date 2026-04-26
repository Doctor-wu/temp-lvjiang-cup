import React, { useMemo, useState } from 'react';
import AmbientGlow from '../../common/v4/AmbientGlow';
import SectionHeader from '../../common/v4/SectionHeader';
import { useHomeData } from '../../../context/HomeDataContext';
import type { Player, Team as ApiTeam, PlayerLevel } from '../../../api/types';
import type { Match } from '../../../types';
import { PositionType } from '../../../types/position';

const POS_ICON: Record<PositionType, string> = {
  TOP: '/top.png',
  JUNGLE: '/jungle.png',
  MID: '/mid.png',
  ADC: '/bot.png',
  SUPPORT: '/support.png',
};

const LV_COLOR: Record<PlayerLevel, string> = {
  S: '#FFD56A',
  A: '#A8E0FF',
  B: '#9DD5B1',
  C: '#C8B8E0',
  D: '#9C9C9C',
};

const POSITION_ORDER: PositionType[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const computeRecord = (matches: Match[], teamId: string) => {
  let w = 0;
  let l = 0;
  for (const m of matches) {
    if (m.stage !== 'swiss') continue;
    if (m.status !== 'finished') continue;
    if (m.teamAId !== teamId && m.teamBId !== teamId) continue;
    if (m.winnerId === teamId) w += 1;
    else if (m.winnerId) l += 1;
  }
  return `${w}-${l}`;
};

const TeamsV4: React.FC = () => {
  const { teams, matches } = useHomeData();
  const allMatches = matches as Match[];
  // touch-friendly: track which card is opened
  const [openId, setOpenId] = useState<string | null>(null);

  const enriched = useMemo(() => {
    return teams.map(t => {
      const players = ((t.players ?? t.members ?? []) as Player[]).slice();
      players.sort((a, b) => {
        const ai = POSITION_ORDER.indexOf(a.position as PositionType);
        const bi = POSITION_ORDER.indexOf(b.position as PositionType);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      const captain = players.find(p => p.isCaptain) ?? players[0];
      return {
        team: t,
        players,
        captain,
        record: computeRecord(allMatches, t.id),
      };
    });
  }, [teams, allMatches]);

  return (
    <section
      id="teams"
      className="v4-root relative pt-8 md:pt-12 pb-7 md:pb-9"
    >
      <div className="relative px-5 md:px-9">
        <AmbientGlow hue="teams" id="teams" height={80} />
        <SectionHeader
          eyebrow="— 04 / TEAMS"
          title="十六支战队"
          right={
            <div className="hidden md:block text-[12px] text-[rgba(245,245,247,0.5)] max-w-[280px] text-right leading-[1.5]">
              悬停查看每位选手个人评级
              <br />
              点击直接进入其直播间
            </div>
          }
          subtitle={
            <span className="md:hidden">点击展开查看队员个人评级与直播间</span>
          }
        />
      </div>
      <div
        id="v4-teams-grid"
        className="relative grid grid-cols-2 md:grid-cols-4 gap-2 px-5 md:px-9 pt-2"
      >
        {enriched.map(({ team, players, captain, record }) => (
          <TeamCard
            key={team.id}
            team={team}
            players={players}
            captainName={captain?.nickname ?? '—'}
            record={record}
            isOpen={openId === team.id}
            onToggle={() => setOpenId(prev => (prev === team.id ? null : team.id))}
          />
        ))}
      </div>
    </section>
  );
};

interface TeamCardProps {
  team: ApiTeam;
  players: Player[];
  captainName: string;
  record: string;
  isOpen: boolean;
  onToggle: () => void;
}

const TeamCard: React.FC<TeamCardProps> = ({
  team,
  players,
  captainName,
  record,
  isOpen,
  onToggle,
}) => (
  <div
    className="v4-team v4-tile flex flex-col gap-2 px-3 py-3 min-h-[92px]"
    data-testid="team-card"
    data-team-id={team.id}
    data-team-name={team.name}
    data-open={isOpen ? 'true' : 'false'}
    style={{
      border: '0.5px solid rgba(255,255,255,0.09)',
      borderRadius: 8,
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%)',
    }}
  >
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start justify-between text-left bg-transparent border-0 p-0 cursor-pointer"
      aria-expanded={isOpen}
    >
      <div className="text-[12.5px] md:text-[13px] font-medium tracking-[-0.01em] text-[#F5F5F7]">
        {team.name}
      </div>
      <span className="v4-mono text-[10px] text-[rgba(245,245,247,0.5)]">{record}</span>
    </button>
    <div className="text-[10px] md:text-[10.5px] text-[rgba(245,245,247,0.45)]">
      队长 · {captainName}
    </div>
    <div className="flex gap-1.5 items-center mt-auto">
      {players.slice(0, 5).map((p, i) => (
        <span
          key={`${p.id}-${i}`}
          aria-label={`${p.nickname} 等级 ${p.level ?? '?'}`}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: LV_COLOR[(p.level as PlayerLevel) ?? 'C'],
            opacity: 0.85,
          }}
        />
      ))}
      <span className="md:hidden ml-auto text-[9.5px] text-[rgba(245,245,247,0.4)]">
        {isOpen ? '收起 ↑' : '展开 →'}
      </span>
    </div>
    <div
      className="v4-team-pop p-2 backdrop-blur-xl"
      style={{
        border: '0.5px solid rgba(255,255,255,0.18)',
        borderRadius: 10,
        background: 'rgba(15,15,22,0.92)',
        boxShadow: '0 14px 40px rgba(0,0,0,0.55)',
      }}
    >
      {players.slice(0, 5).map(p => (
        <MemberRow key={p.id} player={p} />
      ))}
    </div>
  </div>
);

const MemberRow: React.FC<{ player: Player }> = ({ player }) => {
  const lv = (player.level as PlayerLevel) ?? 'C';
  const color = LV_COLOR[lv];
  const hasLive = Boolean(player.liveUrl);
  const handleClick = (e: React.MouseEvent) => {
    if (!hasLive) return;
    e.stopPropagation();
    window.open(player.liveUrl, '_blank', 'noopener');
  };
  return (
    <div
      className="v4-mem grid items-center gap-2 px-[7px] py-[6px]"
      style={{
        gridTemplateColumns: '14px 1fr auto auto',
        borderRadius: 6,
      }}
      role={hasLive ? 'link' : undefined}
      tabIndex={hasLive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={e => {
        if (hasLive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          window.open(player.liveUrl, '_blank', 'noopener');
        }
      }}
    >
      <img
        src={POS_ICON[player.position as PositionType]}
        alt=""
        style={{ width: 14, height: 14, objectFit: 'contain', opacity: 0.8 }}
        onError={e => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
      />
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11.5px] text-[#F5F5F7] truncate whitespace-nowrap">
          {player.nickname}
        </span>
        {player.isCaptain ? (
          <span
            className="text-[9px] tracking-[0.06em] px-1"
            style={{
              color: 'rgba(255,213,106,0.95)',
              border: '0.5px solid rgba(255,213,106,0.5)',
              borderRadius: 3,
            }}
          >
            队长
          </span>
        ) : null}
      </div>
      <span
        className="v4-mono text-[9.5px] font-medium tracking-[0.04em] px-[5px] py-[1px]"
        style={{
          color,
          border: `0.5px solid ${color}40`,
          borderRadius: 3,
        }}
      >
        {lv}
      </span>
      {hasLive ? (
        <svg
          className="v4-arrow"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(245,245,247,0.85)"
          strokeWidth="2"
        >
          <path d="M7 17 17 7" />
          <path d="M7 7h10v10" />
        </svg>
      ) : (
        <span style={{ width: 10 }} />
      )}
    </div>
  );
};

export default TeamsV4;
