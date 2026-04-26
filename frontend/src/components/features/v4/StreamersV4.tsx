import React, { useEffect, useMemo, useState } from 'react';
import AmbientGlow from '../../common/v4/AmbientGlow';
import SectionHeader from '../../common/v4/SectionHeader';
import { streamersApi } from '../../../api/streamers';
import { type Streamer, StreamerType } from '../../../api/types';

const TONES: [string, string][] = [
  ['#3a2a4a', '#5a3a6a'],
  ['#1f3a5a', '#2a4a6a'],
  ['#4a2a2a', '#6a3a3a'],
  ['#2a3a4a', '#3a4a5a'],
  ['#3a3a2a', '#5a4a2a'],
];

const StreamersV4: React.FC = () => {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [tab, setTab] = useState<StreamerType>(StreamerType.INTERNAL);

  useEffect(() => {
    let alive = true;
    streamersApi
      .getAll()
      .then(data => {
        if (alive) setStreamers(data);
      })
      .catch(err => {
        console.error('[StreamersV4] 获取主播数据失败:', err);
      });
    return () => {
      alive = false;
    };
  }, []);

  const internal = useMemo(
    () => streamers.filter(s => s.streamerType === StreamerType.INTERNAL),
    [streamers]
  );
  const guests = useMemo(
    () => streamers.filter(s => s.streamerType === StreamerType.GUEST),
    [streamers]
  );

  const list = tab === StreamerType.INTERNAL ? internal : guests;

  return (
    <section
      id="streamers"
      className="v4-root relative px-5 md:px-9 pt-8 md:pt-12 pb-6 md:pb-10"
    >
      <AmbientGlow hue="streamers" id="streamers" height={80} />
      <SectionHeader
        eyebrow="— 03 / STREAMERS"
        title="参赛主播"
        right={
          <div className="flex gap-1 p-[3px] rounded-full bg-white/[0.04]">
            <button
              type="button"
              onClick={() => setTab(StreamerType.INTERNAL)}
              className={`v4-mono text-[10px] md:text-[11px] px-3 py-[5px] rounded-full ${
                tab === StreamerType.INTERNAL ? 'v4-seg-on' : 'v4-seg-off'
              }`}
            >
              驴酱主播 · {internal.length}
            </button>
            <button
              type="button"
              onClick={() => setTab(StreamerType.GUEST)}
              className={`v4-mono text-[10px] md:text-[11px] px-3 py-[5px] rounded-full ${
                tab === StreamerType.GUEST ? 'v4-seg-on' : 'v4-seg-off'
              }`}
            >
              嘉宾主播 · {guests.length}
            </button>
          </div>
        }
      />

      {/* Desktop: 5 cols. Mobile: horizontal scroll. */}
      <div className="hidden md:grid grid-cols-5 gap-2">
        {list.slice(0, 5).map((s, i) => (
          <StreamerCard key={s.id} streamer={s} tone={TONES[i % TONES.length]} index={i} />
        ))}
        {list.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <PlaceholderCard key={`p-${i}`} tone={TONES[i % TONES.length]} index={i} />
            ))
          : null}
      </div>
      <div className="md:hidden v4-scroll-x flex gap-2 -mx-5 px-5 pb-1">
        {list.slice(0, 8).map((s, i) => (
          <div key={s.id} className="flex-[0_0_130px]">
            <StreamerCard streamer={s} tone={TONES[i % TONES.length]} index={i} mobile />
          </div>
        ))}
        {list.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={`p-${i}`} className="flex-[0_0_130px]">
                <PlaceholderCard tone={TONES[i % TONES.length]} index={i} mobile />
              </div>
            ))
          : null}
      </div>
    </section>
  );
};

interface CardProps {
  streamer: Streamer;
  tone: [string, string];
  index: number;
  mobile?: boolean;
}

const StreamerCard: React.FC<CardProps> = ({ streamer, tone, index, mobile }) => {
  const tag = streamer.streamerType === StreamerType.INTERNAL ? '驴酱' : '嘉宾';
  return (
    <button
      type="button"
      onClick={() =>
        streamer.liveUrl &&
        window.open(streamer.liveUrl, '_blank', 'noopener')
      }
      className="v4-streamer relative w-full aspect-[3/4] overflow-hidden border border-white/[0.09] cursor-pointer text-left p-0"
      style={{
        background: `linear-gradient(160deg, ${tone[0]} 0%, ${tone[1]} 100%)`,
        borderRadius: mobile ? 9 : 10,
      }}
    >
      {streamer.posterUrl ? (
        <img
          src={streamer.posterUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          onError={e => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
        />
      ) : null}
      <svg viewBox="0 0 100 134" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id={`v4St${index}-${mobile ? 'm' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.85)" />
          </linearGradient>
        </defs>
        {!streamer.posterUrl ? (
          <>
            <circle cx="50" cy="46" r="20" fill="rgba(255,255,255,0.1)" />
            <path d="M 22 132 C 22 100, 78 100, 78 132 Z" fill="rgba(255,255,255,0.08)" />
          </>
        ) : null}
        <rect width="100" height="134" fill={`url(#v4St${index}-${mobile ? 'm' : 'd'})`} />
      </svg>
      <div
        className="v4-pill v4-mono absolute top-2 left-2 text-[8px] md:text-[9px] px-[7px] py-[2px] tracking-[0.06em]"
        style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.25)' }}
      >
        {tag}
      </div>
      <div className="absolute left-2.5 right-2.5 bottom-2.5">
        <div className="text-[11px] md:text-[13px] font-medium leading-[1.2] mb-0.5">
          {streamer.nickname}
        </div>
        <div className="text-[9.5px] md:text-[10.5px] text-[rgba(245,245,247,0.6)] mb-2">
          {streamer.bio}
        </div>
        {!mobile ? (
          <div
            className="v4-liveroom inline-flex items-center gap-1.5 text-[10px] px-2 py-[3px] rounded-full backdrop-blur-md"
            style={{
              border: '0.5px solid rgba(255,255,255,0.4)',
              background: 'rgba(0,0,0,0.4)',
              color: 'rgba(245,245,247,0.95)',
            }}
          >
            进入直播间
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </div>
        ) : null}
      </div>
    </button>
  );
};

const PlaceholderCard: React.FC<{ tone: [string, string]; index: number; mobile?: boolean }> = ({
  tone,
  index,
  mobile,
}) => (
  <div
    className="relative w-full aspect-[3/4] overflow-hidden border border-white/[0.09]"
    style={{
      background: `linear-gradient(160deg, ${tone[0]} 0%, ${tone[1]} 100%)`,
      borderRadius: mobile ? 9 : 10,
    }}
  >
    <svg viewBox="0 0 100 134" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id={`v4StPh${index}-${mobile ? 'm' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.85)" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="46" r="20" fill="rgba(255,255,255,0.1)" />
      <path d="M 22 132 C 22 100, 78 100, 78 132 Z" fill="rgba(255,255,255,0.08)" />
      <rect width="100" height="134" fill={`url(#v4StPh${index}-${mobile ? 'm' : 'd'})`} />
    </svg>
    <div className="absolute left-2.5 right-2.5 bottom-2.5 text-[10px] text-[rgba(245,245,247,0.55)]">
      待补
    </div>
  </div>
);

export default StreamersV4;
