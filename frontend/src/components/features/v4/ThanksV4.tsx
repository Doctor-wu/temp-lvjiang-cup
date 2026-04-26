import React from 'react';
import AmbientGlow from '../../common/v4/AmbientGlow';
import SectionHeader from '../../common/v4/SectionHeader';
import type { SponsorConfig, StaffConfig, ThanksData } from '../../../data/types';

declare global {
  interface Window {
    THANKS_DATA?: ThanksData;
  }
}

const data: ThanksData = (typeof window !== 'undefined' && window.THANKS_DATA) || {
  sponsors: [],
  staff: [],
};

const sponsors: SponsorConfig[] = data.sponsors ?? [];
const staff: StaffConfig[] = data.staff ?? [];
const awards = sponsors.filter(s => s.specialAward);

const ThanksV4: React.FC = () => (
  <section
    id="thanks"
    className="v4-root relative px-5 md:px-9 pt-8 md:pt-12 pb-7"
  >
    <AmbientGlow hue="thanks" id="thanks" height={80} />
    <SectionHeader
      eyebrow="— 06 / THANKS"
      title="特别鸣谢"
      subtitle="感谢每一位支持者的信任与陪伴"
      right={
        <span className="v4-mono hidden md:inline text-[10px] tracking-[0.32em] text-[rgba(245,245,247,0.45)]">
          SPONSORS · STAFF
        </span>
      }
    />

    <Marquee items={sponsors} />

    <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-3 md:gap-3.5 mt-4 md:mt-6">
      <Card icon="trophy" title="特殊奖项" countLabel={`${awards.length} 项`} accentRgb="220,180,90">
        {awards.length === 0 ? (
          <Empty>暂未公布</Empty>
        ) : (
          awards.map(a => (
            <div
              key={a.id}
              className="grid items-start gap-2.5 px-1 py-[7px]"
              style={{
                gridTemplateColumns: '1fr auto',
                borderBottom: '0.5px solid rgba(255,255,255,0.04)',
              }}
            >
              <div className="text-[11px] md:text-[11.5px] leading-[1.4] text-[rgba(245,245,247,0.85)]">
                {a.specialAward}
              </div>
              <div
                className="v4-mono text-[9px] md:text-[9.5px] tracking-[0.04em] text-right whitespace-nowrap"
                style={{ color: 'rgba(255,213,106,0.85)' }}
              >
                — {a.sponsorName}
              </div>
            </div>
          ))
        )}
      </Card>
      <Card
        icon="users"
        title="幕后工作人员"
        countLabel={staff.length === 0 ? '名单待补' : `${staff.length} 位`}
        accentRgb="120,140,200"
      >
        {staff.length === 0 ? (
          <Empty>名单待补</Empty>
        ) : (
          staff.map(s => (
            <div
              key={s.id}
              className="grid items-center gap-3 px-1 py-[7px]"
              style={{
                gridTemplateColumns: 'auto 1fr',
                borderBottom: '0.5px solid rgba(255,255,255,0.04)',
              }}
            >
              <span
                className="v4-mono text-[9px] md:text-[9.5px] tracking-[0.06em]"
                style={{ color: 'rgba(168,224,255,0.85)', minWidth: 64 }}
              >
                {s.role}
              </span>
              <span className="text-[11px] md:text-[11.5px] text-[rgba(245,245,247,0.7)]">
                {s.name}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>

    <div className="flex justify-center mt-6">
      <div
        className="v4-pill inline-flex items-center gap-2 px-4 py-2 text-[12px] text-[rgba(245,245,247,0.85)]"
        style={{ background: 'rgba(255,255,255,0.025)' }}
      >
        <Heart fill="rgba(255,124,168,0.95)" />
        再次感谢所有支持
        <Heart fill="rgba(255,213,106,0.95)" />
      </div>
    </div>
  </section>
);

const Marquee: React.FC<{ items: SponsorConfig[] }> = ({ items }) => {
  const visible = items.length > 0 ? items : [];
  const doubled = [...visible, ...visible];
  return (
    <div
      className="relative h-9 md:h-[38px] overflow-hidden v4-pill mb-4"
      style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <svg
        viewBox="0 0 680 38"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      >
        <defs>
          <linearGradient id="v4MqL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#050508" />
            <stop offset="100%" stopColor="rgba(5,5,8,0)" />
          </linearGradient>
          <linearGradient id="v4MqR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(5,5,8,0)" />
            <stop offset="100%" stopColor="#050508" />
          </linearGradient>
        </defs>
        <rect width="60" height="38" fill="url(#v4MqL)" />
        <rect x="620" width="60" height="38" fill="url(#v4MqR)" />
      </svg>
      {visible.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[rgba(245,245,247,0.4)]">
          鸣谢名单加载中…
        </div>
      ) : (
        <div className="v4-marquee-track absolute top-0 left-0 h-full flex items-center whitespace-nowrap gap-6 md:gap-8 px-4 z-0">
          {doubled.map((s, i) => (
            <div
              key={`${s.id}-${i}`}
              className="inline-flex items-center gap-2 text-[10.5px] md:text-[11.5px] text-[rgba(245,245,247,0.7)]"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="rgba(255,213,106,0.85)">
                <polygon points="12 2 14.5 9 22 9 16 13.5 18 21 12 16.5 6 21 8 13.5 2 9 9.5 9" />
              </svg>
              <span>{s.sponsorName}</span>
              <span className="v4-mono" style={{ color: 'rgba(255,213,106,0.85)', fontSize: '0.95em' }}>
                ¥{s.sponsorContent}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface CardProps {
  icon: 'trophy' | 'users';
  title: string;
  countLabel: string;
  accentRgb: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ icon, title, countLabel, accentRgb, children }) => (
  <div
    className="rounded-xl px-4 md:px-[18px] py-4"
    style={{
      border: '0.5px solid rgba(255,255,255,0.09)',
      background: `linear-gradient(180deg, rgba(${accentRgb},0.045) 0%, rgba(${accentRgb},0) 100%)`,
    }}
  >
    <div className="flex items-center gap-2 mb-3.5">
      {icon === 'trophy' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,213,106,0.95)" strokeWidth="1.6">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(168,224,255,0.95)" strokeWidth="1.6">
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        </svg>
      )}
      <span className="text-[12px] md:text-[13px] font-medium tracking-[-0.005em]">{title}</span>
      <span className="v4-mono ml-auto text-[9px] md:text-[10px] text-[rgba(245,245,247,0.4)]">
        {countLabel}
      </span>
    </div>
    <div className="flex flex-col">{children}</div>
  </div>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] text-[rgba(245,245,247,0.45)] py-2">{children}</div>
);

const Heart: React.FC<{ fill: string }> = ({ fill }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill={fill}>
    <path d="M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10z" />
  </svg>
);

export default ThanksV4;
