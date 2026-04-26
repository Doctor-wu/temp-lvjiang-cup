import React, { useEffect, useState } from 'react';
import { useHomeData } from '../../../context/HomeDataContext';

const COVERS = [
  '/assets/cover_01.webp',
  '/assets/cover_02.webp',
  '/assets/cover_03.webp',
  '/assets/cover_04.webp',
];

const MOBILE_COVER = '/assets/mobile_cover_01.webp';

const NAV_ITEMS = [
  { id: 'hero', label: '总览' },
  { id: 'videos', label: '视频' },
  { id: 'streamers', label: '主播' },
  { id: 'teams', label: '战队' },
  { id: 'schedule', label: '赛程' },
  { id: 'thanks', label: '鸣谢' },
];

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const HeroV4: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const home = useHomeData();
  const stream = home.stream;
  const isLive = stream?.isLive ?? false;
  const liveTitle = stream?.title ?? '驴酱杯 · 主舞台';

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % COVERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      id="hero"
      className="v4-root relative w-full bg-[#050508] overflow-hidden"
    >
      {/* Desktop carousel */}
      <div className="relative hidden md:block w-full" style={{ height: '78vh', minHeight: 540 }}>
        {COVERS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden={i !== idx}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ease-in-out"
            style={{ opacity: i === idx ? 1 : 0 }}
          />
        ))}
        <HeroOverlay
          isLive={isLive}
          liveTitle={liveTitle}
          onNav={scrollTo}
          onLiveOpen={() => stream?.url && window.open(stream.url, '_blank', 'noopener')}
        />
        <Dots count={COVERS.length} active={idx} onSelect={setIdx} className="left-9 bottom-3.5" />
      </div>

      {/* Mobile single hero */}
      <div className="relative md:hidden w-full" style={{ height: 540 }}>
        <img
          src={MOBILE_COVER}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <HeroOverlay
          isLive={isLive}
          liveTitle={liveTitle}
          mobile
          navOpen={navOpen}
          onToggleNav={() => setNavOpen(o => !o)}
          onNav={scrollTo}
          onLiveOpen={() => stream?.url && window.open(stream.url, '_blank', 'noopener')}
        />
      </div>
    </section>
  );
};

interface OverlayProps {
  isLive: boolean;
  liveTitle: string;
  mobile?: boolean;
  navOpen?: boolean;
  onToggleNav?: () => void;
  onNav: (id: string) => void;
  onLiveOpen: () => void;
}

const HeroOverlay: React.FC<OverlayProps> = ({
  isLive,
  liveTitle,
  mobile,
  navOpen,
  onToggleNav,
  onNav,
  onLiveOpen,
}) => (
  <>
    {/* gradient masks */}
    <svg
      viewBox="0 0 680 540"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <defs>
        <linearGradient id="v4HeroTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(5,5,8,0.7)" />
          <stop offset="55%" stopColor="rgba(5,5,8,0.05)" />
          <stop offset="100%" stopColor="rgba(5,5,8,0)" />
        </linearGradient>
        <linearGradient id="v4HeroBtm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(5,5,8,0)" />
          <stop offset="55%" stopColor="rgba(5,5,8,0.6)" />
          <stop offset="100%" stopColor="rgba(5,5,8,1)" />
        </linearGradient>
        <linearGradient id="v4HeroLft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(5,5,8,0.55)" />
          <stop offset="50%" stopColor="rgba(5,5,8,0.05)" />
          <stop offset="100%" stopColor="rgba(5,5,8,0)" />
        </linearGradient>
      </defs>
      <rect width="680" height="160" fill="url(#v4HeroTop)" />
      <rect y="240" width="680" height="300" fill="url(#v4HeroBtm)" />
      {!mobile ? <rect width="380" height="540" fill="url(#v4HeroLft)" /> : null}
    </svg>

    {/* top bar */}
    <div
      className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 md:px-9 py-4 md:py-4"
      style={{
        background: 'linear-gradient(180deg, rgba(5,5,8,0.55) 0%, rgba(5,5,8,0) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-baseline gap-2 md:gap-2.5">
        <span className="text-[15px] md:text-base font-medium tracking-[-0.02em]">驴酱杯</span>
        <span className="v4-mono text-[9px] md:text-[10px] text-[rgba(245,245,247,0.4)]">
          S2 · 2026
        </span>
      </div>
      {!mobile ? (
        <nav className="hidden md:flex gap-[22px] text-[12.5px]">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNav(item.id)}
              className="v4-link bg-transparent border-0 p-0 cursor-pointer"
              style={{ color: item.id === 'hero' ? '#F5F5F7' : undefined }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isLive ? onLiveOpen : undefined}
          className="v4-pill flex items-center gap-2 px-2.5 md:px-3 py-1 md:py-[5px] cursor-pointer"
          style={{
            borderColor: 'rgba(255,59,48,0.5)',
            background: 'rgba(255,59,48,0.08)',
          }}
        >
          <span
            className={`inline-block w-[5px] h-[5px] rounded-full bg-[#FF3B30] ${isLive ? 'v4-pulse' : ''}`}
          />
          <span className="text-[10px] md:text-[11px]">{isLive ? '直播中' : '未开播'}</span>
        </button>
        {mobile ? (
          <button
            type="button"
            onClick={onToggleNav}
            aria-label="打开菜单"
            className="bg-black/40 border border-white/[0.18] p-[7px] rounded-lg backdrop-blur-md flex items-center justify-center cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,247,0.95)" strokeWidth="1.6">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="13" x2="20" y2="13" />
              <line x1="4" y1="19" x2="14" y2="19" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>

    {/* mobile nav drawer */}
    {mobile && navOpen ? (
      <div
        className="absolute top-[60px] right-5 z-30 v4-pill px-4 py-3 backdrop-blur-xl"
        style={{ background: 'rgba(15,15,22,0.92)', borderRadius: 14 }}
      >
        <ul className="flex flex-col gap-2 list-none m-0 p-0 text-[13px]">
          {NAV_ITEMS.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onNav(item.id);
                  onToggleNav?.();
                }}
                className="v4-link text-left bg-transparent border-0 p-0 cursor-pointer"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {/* bottom-left poster */}
    <div
      className="absolute z-10 grid items-end gap-7"
      style={{
        left: mobile ? 20 : 36,
        right: mobile ? 20 : 36,
        bottom: mobile ? 28 : 38,
        gridTemplateColumns: mobile ? '1fr' : '1fr auto',
      }}
    >
      <div>
        <div className="flex items-center gap-2.5 mb-3 md:mb-4">
          <span className="block w-[18px] md:w-[22px] h-[0.5px] bg-[rgba(245,245,247,0.4)]" />
          <span className="v4-mono text-[9px] md:text-[10px] text-[rgba(245,245,247,0.7)] tracking-[0.18em]">
            DRIVING GUILD · SEASON 02
          </span>
        </div>
        <div className="flex items-baseline gap-3 md:gap-4 mb-3 md:mb-3.5">
          <h1
            className="m-0 font-medium text-white"
            style={{
              fontSize: mobile ? 48 : 64,
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
            }}
          >
            驴酱杯
          </h1>
          <span className="v4-mono text-[10px] md:text-[12px] text-[rgba(245,245,247,0.5)] pb-1.5">
            / ULTIMATE
          </span>
        </div>
        <p className="m-0 mb-1.5 text-[13px] md:text-[15px] leading-[1.45] md:leading-[1.5] max-w-[380px] text-[rgba(245,245,247,0.78)]">
          十六支战队 · 五轮瑞士 · 一夜决出归属
        </p>
        <p className="v4-mono m-0 mb-4 md:mb-[22px] text-[10px] md:text-[11px] text-[rgba(245,245,247,0.5)] tracking-[0.04em]">
          May 1, 2026 · powered by 斗鱼
        </p>
        <div className="flex gap-2 md:gap-[9px]">
          <button
            type="button"
            onClick={onLiveOpen}
            className="v4-cta-fill v4-pill px-5 py-[11px] inline-flex items-center justify-center gap-[7px] cursor-pointer text-[12.5px] md:text-[13px] font-medium"
            style={{ flex: mobile ? 1 : undefined, fontFamily: 'inherit' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#08080B">
              <polygon points="6 4 20 12 6 20" />
            </svg>
            观看直播
          </button>
          <button
            type="button"
            onClick={() => onNav('schedule')}
            className="v4-cta-line v4-pill px-5 py-[11px] cursor-pointer text-[12.5px] md:text-[13px]"
            style={{ flex: mobile ? 1 : undefined, fontFamily: 'inherit' }}
          >
            查看赛程
          </button>
        </div>
      </div>
      {!mobile ? (
        <div className="flex flex-col items-end gap-2.5">
          <div
            className="px-3.5 py-2.5 v4-pill flex flex-col gap-1 min-w-[180px] backdrop-blur-md"
            style={{
              border: '0.5px solid rgba(255,255,255,0.18)',
              borderRadius: 10,
              background: 'rgba(0,0,0,0.35)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block w-[5px] h-[5px] rounded-full bg-[#FF3B30] ${isLive ? 'v4-pulse' : ''}`}
              />
              <span className="v4-mono text-[10px] text-[rgba(245,245,247,0.55)] tracking-[0.18em]">
                {isLive ? 'NOW STREAMING' : 'OFF AIR'}
              </span>
            </div>
            <div className="text-[13px] font-medium">{liveTitle}</div>
            <div className="text-[11px] text-[rgba(245,245,247,0.55)]">
              {isLive ? '驴酱队 vs IC 队 · 第三轮' : '准备直播中'}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  </>
);

interface DotsProps {
  count: number;
  active: number;
  onSelect: (i: number) => void;
  className?: string;
}

const Dots: React.FC<DotsProps> = ({ count, active, onSelect, className }) => (
  <div
    className={`absolute z-20 flex gap-1.5 ${className ?? ''}`}
    role="tablist"
    aria-label="封面切换"
  >
    {Array.from({ length: count }, (_, i) => (
      <button
        key={i}
        role="tab"
        aria-selected={i === active}
        aria-label={`切换到第 ${i + 1} 张封面`}
        onClick={() => onSelect(i)}
        className="border-0 cursor-pointer p-0"
        style={{
          width: i === active ? 22 : 8,
          height: 2,
          borderRadius: 2,
          background:
            i === active ? 'rgba(245,245,247,0.95)' : 'rgba(245,245,247,0.3)',
          transition: 'all 0.4s ease',
        }}
      />
    ))}
  </div>
);

export default HeroV4;
