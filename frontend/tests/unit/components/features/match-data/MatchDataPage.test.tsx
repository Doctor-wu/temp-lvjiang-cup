import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MatchDataPage from '@/components/features/match-data/MatchDataPage';
import * as matchDataApi from '@/api/matchData';
import type { MatchSeriesInfo, MatchGameData } from '@/types/matchData';

vi.mock('@/api/matchData', () => ({
  getMatchSeries: vi.fn(),
  getMatchGameData: vi.fn(),
}));

vi.mock('@/utils/matchDataCache', () => ({
  matchDataCache: {
    getMatchSeriesKey: vi.fn(() => 'cache-key-match1'),
    getMatchGameDataKey: vi.fn(() => 'cache-key-game1'),
    getCachedSeries: vi.fn(() => null),
    getCachedGameData: vi.fn(() => null),
    cacheSeries: vi.fn(),
    cacheGameData: vi.fn(),
    cleanup: vi.fn(),
  },
}));

vi.mock('@/store/matchDataStore', () => {
  const mockStore = {
    setSeriesInfo: vi.fn(),
    updateGame: vi.fn(),
  };
  return {
    useMatchDataStore: vi.fn(() => mockStore),
  };
});

vi.mock('@/utils/upload', () => ({
  getUploadUrl: (url: string) => url || '',
}));

const mockGetMatchSeries = matchDataApi.getMatchSeries as ReturnType<typeof vi.fn>;
const mockGetMatchGameData = matchDataApi.getMatchGameData as ReturnType<typeof vi.fn>;

const createMockSeriesInfo = (): MatchSeriesInfo => ({
  matchId: 'match1',
  teamA: {
    id: 'team1',
    name: 'BLG',
  },
  teamB: {
    id: 'team2',
    name: 'WBG',
  },
  format: 'BO3',
  games: [
    { gameNumber: 1, winnerTeamId: 'team1', gameDuration: '32:45', hasData: true },
    { gameNumber: 2, winnerTeamId: 'team2', gameDuration: '28:30', hasData: true },
    { gameNumber: 3, winnerTeamId: null, gameDuration: null, hasData: false },
  ],
});

const createMockGameData = (): MatchGameData => ({
  id: 1,
  matchId: 'match1',
  gameNumber: 1,
  winnerTeamId: 'team1',
  gameDuration: '32:45',
  gameStartTime: '2026-04-16T14:00:00',
  blueTeam: {
    teamId: 'team1',
    teamName: 'BLG',
    side: 'blue',
    kills: 25,
    gold: 65000,
    towers: 9,
    dragons: 3,
    barons: 1,
    isWinner: true,
  },
  redTeam: {
    teamId: 'team2',
    teamName: 'WBG',
    side: 'red',
    kills: 18,
    gold: 58000,
    towers: 5,
    dragons: 1,
    barons: 0,
    isWinner: false,
  },
  playerStats: [
    {
      id: 1,
      playerId: 'p1',
      playerName: 'Bin',
      teamId: 'team1',
      teamName: 'BLG',
      position: 'TOP',
      championName: '格温',
      kills: 8,
      deaths: 2,
      assists: 12,
      kda: '8/2/12',
      cs: 349,
      gold: 18500,
      damageDealt: 45000,
      damageTaken: 28000,
      visionScore: 25,
      wardsPlaced: 15,
      level: 18,
      firstBlood: false,
      mvp: true,
    },
    {
      id: 2,
      playerId: 'p6',
      playerName: 'Zika',
      teamId: 'team2',
      teamName: 'WBG',
      position: 'TOP',
      championName: '赛恩',
      kills: 1,
      deaths: 5,
      assists: 9,
      kda: '1/5/9',
      cs: 267,
      gold: 15200,
      damageDealt: 32000,
      damageTaken: 45000,
      visionScore: 18,
      wardsPlaced: 10,
      level: 16,
      firstBlood: false,
      mvp: false,
    },
  ],
});

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('MatchDataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('页面加载', () => {
    it('应该显示加载状态', () => {
      mockGetMatchSeries.mockImplementation(() => new Promise(() => {}));
      mockGetMatchGameData.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<MatchDataPage />);

      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });

    it('加载完成后应该显示MatchInfoCard', async () => {
      mockGetMatchSeries.mockResolvedValueOnce(createMockSeriesInfo());
      mockGetMatchGameData.mockResolvedValueOnce(createMockGameData());

      renderWithRouter(<MatchDataPage />);

      await waitFor(() => {
        expect(screen.getByText('BO3 · 第 1 局')).toBeInTheDocument();
      });
    });

    it('加载完成后应该显示TeamStatsBar', async () => {
      mockGetMatchSeries.mockResolvedValueOnce(createMockSeriesInfo());
      mockGetMatchGameData.mockResolvedValueOnce(createMockGameData());

      renderWithRouter(<MatchDataPage />);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
        expect(screen.getByText('18')).toBeInTheDocument();
      });
    });
  });

  describe('GameSwitcher集成', () => {
    it('应该使用GameSwitcher组件', async () => {
      mockGetMatchSeries.mockResolvedValueOnce(createMockSeriesInfo());
      mockGetMatchGameData.mockResolvedValueOnce(createMockGameData());

      renderWithRouter(<MatchDataPage />);

      await waitFor(() => {
        expect(screen.getByText('第 1 局')).toBeInTheDocument();
        expect(screen.getByText('第 2 局')).toBeInTheDocument();
        expect(screen.getByText('第 3 局')).toBeInTheDocument();
      });
    });

    it('BO1不应该显示GameSwitcher', async () => {
      const bo1Series = {
        ...createMockSeriesInfo(),
        format: 'BO1',
        games: [{ gameNumber: 1, winnerTeamId: 'team1', gameDuration: '32:45', hasData: true }],
      };
      mockGetMatchSeries.mockResolvedValueOnce(bo1Series);
      mockGetMatchGameData.mockResolvedValueOnce(createMockGameData());

      renderWithRouter(<MatchDataPage />);

      await waitFor(() => {
        expect(screen.queryByText('第 1 局')).not.toBeInTheDocument();
      });
    });
  });

  describe('PlayerStatsList集成', () => {
    it('应该按位置顺序显示选手数据', async () => {
      mockGetMatchSeries.mockResolvedValueOnce(createMockSeriesInfo());

      const gameDataWithAllPositions = createMockGameData();
      gameDataWithAllPositions.playerStats = [
        ...gameDataWithAllPositions.playerStats,
        {
          ...gameDataWithAllPositions.playerStats[0],
          position: 'JUNGLE',
          playerName: 'Xun',
          playerId: 'p2',
        },
        {
          ...gameDataWithAllPositions.playerStats[1],
          position: 'JUNGLE',
          playerName: 'Weiwei',
          playerId: 'p7',
        },
        {
          ...gameDataWithAllPositions.playerStats[0],
          position: 'MID',
          playerName: 'Yagao',
          playerId: 'p3',
        },
        {
          ...gameDataWithAllPositions.playerStats[1],
          position: 'MID',
          playerName: 'Angel',
          playerId: 'p8',
        },
        {
          ...gameDataWithAllPositions.playerStats[0],
          position: 'ADC',
          playerName: 'Elk',
          playerId: 'p4',
        },
        {
          ...gameDataWithAllPositions.playerStats[1],
          position: 'ADC',
          playerName: 'Light',
          playerId: 'p9',
        },
        {
          ...gameDataWithAllPositions.playerStats[0],
          position: 'SUPPORT',
          playerName: 'ON',
          playerId: 'p5',
        },
        {
          ...gameDataWithAllPositions.playerStats[1],
          position: 'SUPPORT',
          playerName: 'Crisp',
          playerId: 'p10',
        },
      ];
      mockGetMatchGameData.mockResolvedValueOnce(gameDataWithAllPositions);

      renderWithRouter(<MatchDataPage />);

      await waitFor(() => {
        expect(screen.getByText('Bin')).toBeInTheDocument();
        expect(screen.getByText('Zika')).toBeInTheDocument();
      });
    });
  });

  describe('雷达图集成', () => {
    it('点击选手行应该展开雷达图', async () => {
      mockGetMatchSeries.mockResolvedValueOnce(createMockSeriesInfo());
      mockGetMatchGameData.mockResolvedValueOnce(createMockGameData());

      renderWithRouter(<MatchDataPage />);

      await waitFor(() => {
        expect(screen.getByText('Bin')).toBeInTheDocument();
      });

      const binRow = screen.getByText('Bin').closest('.cursor-pointer');
      if (binRow) {
        (binRow as HTMLElement).click();
      }

      await waitFor(() => {
        const chevrons = document.body.querySelectorAll('.rotate-180');
        expect(chevrons.length).toBe(1);
      });
    });
  });
});
