import React, { useEffect, useState } from 'react';
import AmbientGlow from '../../common/v4/AmbientGlow';

interface StatItem {
  label: string;
  value: React.ReactNode;
}

const TOURNAMENT_DATE = new Date('2026-05-01T00:00:00+08:00');

const padDays = (n: number) => String(Math.max(0, n)).padStart(3, '0');

const StatsBarV4: React.FC = () => {
  const [days, setDays] = useState(() => calcDays());

  useEffect(() => {
    const t = setInterval(() => setDays(calcDays()), 60_000);
    return () => clearInterval(t);
  }, []);

  const stats: StatItem[] = [
    { label: 'TEAMS', value: '16' },
    {
      label: 'STREAMERS',
      value: (
        <>
          8
          <span className="text-[13px] md:text-base text-[rgba(245,245,247,0.45)] ml-1.5">
            + 嘉宾
          </span>
        </>
      ),
    },
    {
      label: 'PRIZE POOL',
      value: (
        <>
          ¥13
          <span className="text-[13px] md:text-base text-[rgba(245,245,247,0.45)] ml-1">
            万+
          </span>
        </>
      ),
    },
    {
      label: 'COUNTDOWN',
      value: (
        <>
          {padDays(days)}
          <span className="text-[13px] md:text-base text-[rgba(245,245,247,0.45)] ml-1.5">
            天
          </span>
        </>
      ),
    },
  ];

  return (
    <section
      id="stats"
      className="v4-root relative px-5 md:px-9 py-7 md:py-7"
    >
      <AmbientGlow hue="stats" id="stats" height={100} />
      {/* Desktop: 4 columns. Mobile: 2x2. */}
      <div className="relative z-10 hidden md:grid grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`px-4 ${i < stats.length - 1 ? 'border-r border-white/[0.07]' : ''} ${i === 0 ? 'pl-0' : ''} ${i === stats.length - 1 ? 'pr-0' : ''}`}
          >
            <div className="v4-mono text-[10px] tracking-[0.16em] text-[rgba(245,245,247,0.45)] mb-2">
              {s.label}
            </div>
            <div className="v4-mono text-[30px] font-medium tracking-[-0.04em]">
              {s.value}
            </div>
          </div>
        ))}
      </div>
      <div className="relative z-10 grid md:hidden grid-cols-2 gap-y-4">
        {stats.map((s, i) => {
          const rightCol = i % 2 === 1;
          const bottomRow = i >= 2;
          return (
            <div
              key={s.label}
              className={[
                rightCol ? 'pl-3.5' : 'pr-3.5 border-r border-white/[0.07]',
                bottomRow ? 'pt-3 border-t border-white/[0.07]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="v4-mono text-[9px] tracking-[0.16em] text-[rgba(245,245,247,0.45)] mb-1.5">
                {s.label}
              </div>
              <div className="v4-mono text-[24px] font-medium tracking-[-0.04em]">
                {s.value}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

function calcDays(): number {
  const now = Date.now();
  const target = TOURNAMENT_DATE.getTime();
  return Math.max(0, Math.ceil((target - now) / (24 * 60 * 60 * 1000)));
}

export default StatsBarV4;
