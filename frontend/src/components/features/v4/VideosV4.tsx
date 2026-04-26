import React, { useState } from 'react';
import AmbientGlow from '../../common/v4/AmbientGlow';
import SectionHeader from '../../common/v4/SectionHeader';
import { useHomeData } from '../../../context/HomeDataContext';
import type { VideoItem } from '../../../api/types';

const FEATURED_FALLBACK = '/assets/驴酱双人组.webp';

const bilibiliPlayerSrc = (bvid: string) =>
  `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&muted=1`;

const bilibiliWatchUrl = (bvid: string) => `https://www.bilibili.com/video/${bvid}`;

const VideosV4: React.FC = () => {
  const { videos } = useHomeData();
  const [playingBvid, setPlayingBvid] = useState<string | null>(null);

  const featured: VideoItem | undefined = videos[0];
  const thumbs = videos.slice(1, 5);

  return (
    <section
      id="videos"
      className="v4-root relative px-5 md:px-9 pt-8 md:pt-12 pb-6 md:pb-10"
    >
      <AmbientGlow hue="videos" id="videos" height={80} />
      <SectionHeader
        eyebrow="— 02 / VIDEOS"
        title="赛事视频"
        right={
          <a
            href="https://space.bilibili.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="v4-link inline-flex items-center gap-1.5 text-[11px] md:text-[12px]"
          >
            前往 B 站
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        }
      />

      {/* Featured */}
      {featured ? (
        <div
          className="v4-tile relative rounded-xl overflow-hidden border border-white/[0.09] aspect-video mb-3 md:mb-4 bg-[#08080C] cursor-pointer"
          onClick={() => setPlayingBvid(featured.bvid)}
        >
          {playingBvid === featured.bvid ? (
            <iframe
              src={bilibiliPlayerSrc(featured.bvid)}
              title={featured.title}
              className="absolute inset-0 w-full h-full border-0"
              allow="fullscreen"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={featured.coverUrl || FEATURED_FALLBACK}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                onError={e => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
              <svg viewBox="0 0 680 380" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <linearGradient id="v4VidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(5,5,8,0.2)" />
                    <stop offset="100%" stopColor="rgba(5,5,8,0.85)" />
                  </linearGradient>
                </defs>
                <rect width="680" height="380" fill="url(#v4VidGrad)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-12 h-12 md:w-[60px] md:h-[60px] rounded-full bg-white/[0.18] border border-white/40 flex items-center justify-center backdrop-blur-md"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(245,245,247,0.95)">
                    <polygon points="6 4 20 12 6 20" />
                  </svg>
                </div>
              </div>
              <div className="v4-pill v4-mono absolute top-3 left-3 text-[10px] px-2 py-[3px] tracking-[0.1em]" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                FEATURED
              </div>
              <div className="absolute left-4 right-4 bottom-4 md:bottom-5 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[13px] md:text-base font-medium leading-[1.3] mb-1 max-w-[440px]">
                    {featured.title}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.09] aspect-video mb-3 md:mb-4 bg-[#0a0a14] flex items-center justify-center text-[rgba(245,245,247,0.5)] text-sm">
          暂无视频
        </div>
      )}

      {/* Thumbnails: desktop 4 columns, mobile horizontal scroll */}
      {thumbs.length > 0 ? (
        <>
          <div className="hidden md:grid grid-cols-4 gap-2">
            {thumbs.map((v, i) => (
              <ThumbCard
                key={v.bvid}
                video={v}
                index={i}
                onClick={() => window.open(bilibiliWatchUrl(v.bvid), '_blank', 'noopener')}
              />
            ))}
          </div>
          <div className="md:hidden v4-scroll-x flex gap-2 -mx-5 px-5 pb-1">
            {thumbs.map((v, i) => (
              <div key={v.bvid} className="flex-[0_0_200px]">
                <ThumbCard
                  video={v}
                  index={i}
                  mobile
                  onClick={() => window.open(bilibiliWatchUrl(v.bvid), '_blank', 'noopener')}
                />
              </div>
            ))}
          </div>
          <div className="flex md:hidden justify-center items-center gap-1.5 mt-2.5 text-[10px] text-[rgba(245,245,247,0.4)]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span>横向滑动查看更多</span>
          </div>
        </>
      ) : null}
    </section>
  );
};

interface ThumbProps {
  video: VideoItem;
  index: number;
  mobile?: boolean;
  onClick: () => void;
}

const TONES = ['#1a1a26', '#22202a', '#1f242c', '#241e22'];

const ThumbCard: React.FC<ThumbProps> = ({ video, index, mobile, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="v4-tile relative w-full aspect-[16/10] overflow-hidden border border-white/[0.08] cursor-pointer text-left p-0"
    style={{ background: TONES[index % TONES.length], borderRadius: 8 }}
  >
    {video.coverUrl ? (
      <img
        src={video.coverUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-70"
      />
    ) : null}
    <svg viewBox="0 0 200 125" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id={`v4Th${index}-${mobile ? 'm' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(5,5,8,0.3)" />
          <stop offset="100%" stopColor="rgba(5,5,8,0.92)" />
        </linearGradient>
      </defs>
      <rect width="200" height="125" fill={`url(#v4Th${index}-${mobile ? 'm' : 'd'})`} />
    </svg>
    <div className="absolute left-2.5 right-2.5 bottom-2.5 text-[10.5px] md:text-[11px] leading-[1.35] text-[rgba(245,245,247,0.92)] line-clamp-2">
      {video.title}
    </div>
  </button>
);

export default VideosV4;
