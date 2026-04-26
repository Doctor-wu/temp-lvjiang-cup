import React from 'react';

type Hue =
  | 'stats'
  | 'videos'
  | 'streamers'
  | 'teams'
  | 'schedule'
  | 'thanks';

interface Props {
  hue: Hue;
  /** unique id for the SVG gradient (avoids collisions when multiple glows render). */
  id: string;
  /** override default height when needed. */
  height?: number;
  className?: string;
}

const STOPS: Record<Hue, string> = {
  stats: 'rgba(80,90,140,0.18)',
  videos: 'rgba(70,140,180,0.13)',
  streamers: 'rgba(150,90,160,0.14)',
  teams: 'rgba(120,90,180,0.13)',
  schedule: 'rgba(80,160,140,0.13)',
  thanks: 'rgba(220,180,90,0.12)',
};

const TRANSPARENT: Record<Hue, string> = {
  stats: 'rgba(80,90,140,0)',
  videos: 'rgba(70,140,180,0)',
  streamers: 'rgba(150,90,160,0)',
  teams: 'rgba(120,90,180,0)',
  schedule: 'rgba(80,160,140,0)',
  thanks: 'rgba(220,180,90,0)',
};

const AmbientGlow: React.FC<Props> = ({ hue, id, height = 80, className }) => {
  const gradId = `v4-amb-${id}`;
  return (
    <svg
      viewBox={`0 0 680 ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        width: '100%',
        height,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="0%" r="55%">
          <stop offset="0%" stopColor={STOPS[hue]} />
          <stop offset="100%" stopColor={TRANSPARENT[hue]} />
        </radialGradient>
      </defs>
      <rect width="680" height={height} fill={`url(#${gradId})`} />
    </svg>
  );
};

export default AmbientGlow;
