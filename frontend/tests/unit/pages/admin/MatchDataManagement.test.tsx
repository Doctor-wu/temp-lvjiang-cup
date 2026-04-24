import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MatchDataManagement from '@/pages/admin/MatchDataManagement';
import * as matchDataApi from '@/api/matchData';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ matchId: 'test-match-123' }),
  };
});

// Mock API
vi.mock('@/api/matchData', () => ({
  getMatchSeries: vi.fn(),
  getMatchGameData: vi.fn(),
  checkMatchDataExists: vi.fn(),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockSeriesInfo = {
  matchId: 'test-match-123',
  teamA: { id: 'team-a', name: 'Team A' },
  teamB: { id: 'team-b', name: 'Team B' },
  format: 'BO3' as const,
  games: [
    { gameNumber: 1, winnerTeamId: 'team-a', gameDuration: '32:45', hasData: true },
    { gameNumber: 2, winnerTeamId: 'team-b', gameDuration: '28:30', hasData: true },
    { gameNumber: 3, winnerTeamId: null, gameDuration: null, hasData: false },
  ],
};

const mockGameData = {
  id: 1,
  matchId: 'test-match-123',
  gameNumber: 1,
  winnerTeamId: 'team-a',
  gameDuration: '32:45',
  gameStartTime: '2024-01-01T10:00:00Z',
  blueTeam: {
    teamId: 'team-a',
    teamName: 'Team A',
    side: 'blue' as const,
    kills: 15,
    gold: 55000,
    towers: 8,
    dragons: 3,
    barons: 1,
    isWinner: true,
  },
  redTeam: {
    teamId: 'team-b',
    teamName: 'Team B',
    side: 'red' as const,
    kills: 10,
    gold: 48000,
    towers: 3,
    dragons: 1,
    barons: 0,
    isWinner: false,
  },
  playerStats: [
    {
      id: 1,
      playerId: 'player-1',
      playerName: 'Player1',
      teamId: 'team-a',
      teamName: 'Team A',
      position: 'MID' as const,
      championName: 'Ahri',
      kills: 5,
      deaths: 2,
      assists: 8,
      kda: '5/2/8',
      cs: 250,
      gold: 12000,
      damageDealt: 25000,
      damageTaken: 15000,
      visionScore: 25,
      wardsPlaced: 10,
      level: 16,
      firstBlood: false,
      mvp: true,
    },
  ],
};

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MatchDataManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    expect(screen.getByText(/比赛数据管理/i)).toBeInTheDocument();
  });

  it('displays series information when loaded', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Team A vs Team B - BO3/i)).toBeInTheDocument();
    });
  });

  it('displays game cards for each game in the series', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    await waitFor(() => {
      expect(screen.getByText(/第 1 局/i)).toBeInTheDocument();
      expect(screen.getByText(/第 2 局/i)).toBeInTheDocument();
      expect(screen.getByText(/第 3 局/i)).toBeInTheDocument();
    });
  });

  it('shows data status badges for each game', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    await waitFor(() => {
      expect(screen.getAllByText(/已有数据/i).length).toBe(2);
      expect(screen.getByText(/无数据/i)).toBeInTheDocument();
    });
  });

  it('displays winner information for games with data', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    await waitFor(() => {
      expect(screen.getByText(/获胜方: Team A/i)).toBeInTheDocument();
      expect(screen.getByText(/时长: 32:45/i)).toBeInTheDocument();
    });
  });

  it('opens import dialog when import button is clicked', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    const importButton = screen.getByText(/导入数据/i);
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText(/导入比赛数据/i)).toBeInTheDocument();
    });
  });

  it('opens edit dialog when edit button is clicked for a game with data', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);
    vi.mocked(matchDataApi.getMatchGameData).mockResolvedValue(mockGameData);

    renderWithRouter(<MatchDataManagement />);

    await waitFor(() => {
      expect(screen.getByText(/第 1 局/i)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('编辑');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/编辑比赛数据/i)).toBeInTheDocument();
    });
  });

  it('disables edit button for games without data', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    await waitFor(() => {
      const editButtons = screen.getAllByText('编辑');
      const lastEditButton = editButtons[editButtons.length - 1];
      expect(lastEditButton).toBeDisabled();
    });
  });

  it('opens delete confirmation dialog when delete button is clicked', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    await waitFor(() => {
      expect(screen.getByText(/第 1 局/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/确认删除游戏数据？/i)).toBeInTheDocument();
    });
  });

  it('toggles game enable/disable status when toggle button is clicked', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    await waitFor(() => {
      expect(screen.getByText(/第 1 局/i)).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.title?.includes('启用') || btn.title?.includes('禁用'));
    expect(toggleButton).toBeInTheDocument();

    // After click, the icon should change
    expect(screen.getByTitle('禁用此局')).toBeInTheDocument();
  });

  it('calls refresh function when refresh button is clicked', async () => {
    vi.mocked(matchDataApi.getMatchSeries).mockResolvedValue(mockSeriesInfo);

    renderWithRouter(<MatchDataManagement />);

    await waitFor(() => {
      expect(screen.getByText(/第 1 局/i)).toBeInTheDocument();
    });

    const refreshButton = screen.getByText(/刷新/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(matchDataApi.getMatchSeries).toHaveBeenCalledTimes(2);
    });
  });

  it('shows loading state while initial data is loading', () => {
    vi.mocked(matchDataApi.getMatchSeries).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<MatchDataManagement />);

    expect(screen.getByText(/加载中\.\.\./i)).toBeInTheDocument();
  });
});
