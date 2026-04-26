import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Home from '@/pages/Home';

const mockFetchStream = vi.fn().mockResolvedValue(undefined);
const mockFetchTeams = vi.fn().mockResolvedValue(undefined);
const mockFetchMatches = vi.fn().mockResolvedValue(undefined);
const mockFetchVideos = vi.fn().mockResolvedValue(undefined);
const mockFetchStreamers = vi.fn().mockResolvedValue(undefined);
const mockRefresh = vi.fn().mockResolvedValue(undefined);

let mockHomeData = baseData();

vi.mock('@/context/HomeDataContext', () => ({
  useHomeData: () => mockHomeData,
  HomeDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Stub each v4 section so we can assert layout composition without their internals.
vi.mock('@/components/features/v4/HeroV4', () => ({
  default: () => <div data-testid="hero-v4">HeroV4</div>,
}));
vi.mock('@/components/features/v4/StatsBarV4', () => ({
  default: () => <div data-testid="stats-v4">StatsBarV4</div>,
}));
vi.mock('@/components/features/v4/VideosV4', () => ({
  default: () => <div data-testid="videos-v4">VideosV4</div>,
}));
vi.mock('@/components/features/v4/StreamersV4', () => ({
  default: () => <div data-testid="streamers-v4">StreamersV4</div>,
}));
vi.mock('@/components/features/v4/TeamsV4', () => ({
  default: () => <div data-testid="teams-v4">TeamsV4</div>,
}));
vi.mock('@/components/features/v4/ScheduleV4', () => ({
  default: () => <div data-testid="schedule-v4">ScheduleV4</div>,
}));
vi.mock('@/components/features/v4/ThanksV4', () => ({
  default: () => <div data-testid="thanks-v4">ThanksV4</div>,
}));
vi.mock('@/components/features/v4/FooterV4', () => ({
  default: () => <div data-testid="footer-v4">FooterV4</div>,
}));

function baseData() {
  return {
    stream: null,
    teams: [] as unknown[],
    matches: [] as unknown[],
    videos: [] as unknown[],
    streamers: [] as unknown[],
    isLoading: { stream: false, teams: false, matches: false, videos: false, streamers: false },
    fetchStream: mockFetchStream,
    fetchTeams: mockFetchTeams,
    fetchMatches: mockFetchMatches,
    fetchVideos: mockFetchVideos,
    fetchStreamers: mockFetchStreamers,
    refresh: mockRefresh,
  };
}

describe('Home (v4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHomeData = baseData();
  });

  it('渲染所有 v4 section', () => {
    render(<Home />);
    expect(screen.getByTestId('hero-v4')).toBeInTheDocument();
    expect(screen.getByTestId('stats-v4')).toBeInTheDocument();
    expect(screen.getByTestId('videos-v4')).toBeInTheDocument();
    expect(screen.getByTestId('streamers-v4')).toBeInTheDocument();
    expect(screen.getByTestId('teams-v4')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-v4')).toBeInTheDocument();
    expect(screen.getByTestId('thanks-v4')).toBeInTheDocument();
    expect(screen.getByTestId('footer-v4')).toBeInTheDocument();
  });

  it('挂载时一次性触发 5 个数据源的 fetch', () => {
    render(<Home />);
    expect(mockFetchStream).toHaveBeenCalledTimes(1);
    expect(mockFetchTeams).toHaveBeenCalledTimes(1);
    expect(mockFetchMatches).toHaveBeenCalledTimes(1);
    expect(mockFetchVideos).toHaveBeenCalledTimes(1);
    expect(mockFetchStreamers).toHaveBeenCalledTimes(1);
  });

  it('section 渲染顺序符合 v4 设计 (hero → stats → videos → streamers → teams → schedule → thanks → footer)', () => {
    render(<Home />);
    const order = [
      'hero-v4',
      'stats-v4',
      'videos-v4',
      'streamers-v4',
      'teams-v4',
      'schedule-v4',
      'thanks-v4',
      'footer-v4',
    ];
    const positions = order.map(id => {
      const el = screen.getByTestId(id);
      return Array.from(el.parentElement?.parentElement?.querySelectorAll('[data-testid]') ?? [])
        .findIndex(n => (n as HTMLElement).dataset.testid === id);
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
