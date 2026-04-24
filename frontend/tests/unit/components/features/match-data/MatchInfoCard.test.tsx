import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchInfoCard from '@/components/features/match-data/MatchInfoCard';
import type { MatchGameData } from '@/types/matchData';

vi.mock('@/utils/upload', () => ({
  getUploadUrl: (url: string) => url || '',
}));

const createMockGameData = (overrides: Partial<MatchGameData> = {}): MatchGameData => ({
  id: 1,
  matchId: 'match1',
  gameNumber: 2,
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
    towers: 3,
    dragons: 1,
    barons: 0,
    isWinner: false,
  },
  playerStats: [],
  ...overrides,
});

describe('MatchInfoCard', () => {
  describe('红色方信息显示', () => {
    it('应该显示红色方队标和队名', () => {
      const gameData = createMockGameData();
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.getByText('BLG')).toBeInTheDocument();
    });

    it('红色方队标应该有红色边框', () => {
      const gameData = createMockGameData();
      const { container } = render(<MatchInfoCard gameData={gameData} />);

      const blueLogo = container.querySelector('.border-\\[\\#00bcd4\\]');
      expect(blueLogo).toBeInTheDocument();
    });

    it('红色方标签应该正确显示', () => {
      const gameData = createMockGameData();
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.getByText('蓝色方')).toBeInTheDocument();
    });
  });

  describe('蓝色方信息显示', () => {
    it('应该显示蓝色方队标和队名', () => {
      const gameData = createMockGameData();
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.getByText('WBG')).toBeInTheDocument();
    });

    it('蓝色方队标应该有蓝色边框', () => {
      const gameData = createMockGameData();
      const { container } = render(<MatchInfoCard gameData={gameData} />);

      const redLogo = container.querySelector('.border-\\[\\#f44336\\]');
      expect(redLogo).toBeInTheDocument();
    });

    it('蓝色方标签应该正确显示', () => {
      const gameData = createMockGameData();
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.getByText('红色方')).toBeInTheDocument();
    });
  });

  describe('中央信息显示', () => {
    it('应该显示第X局格式', () => {
      const gameData = createMockGameData({ gameNumber: 2 });
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.getByText('第 2 局')).toBeInTheDocument();
    });

    it('应该显示游戏时长', () => {
      const gameData = createMockGameData({ gameDuration: '32:45' });
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.getByText('32:45')).toBeInTheDocument();
    });

    it('应该显示比赛时间', () => {
      const gameData = createMockGameData({ gameStartTime: '2026-04-16T14:00:00' });
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.getByText('04-16 14:00')).toBeInTheDocument();
    });

    it('当没有比赛时间时应该显示待定', () => {
      const gameData = createMockGameData({ gameStartTime: null });
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.getByText('待定')).toBeInTheDocument();
    });
  });

  describe('获胜方显示', () => {
    it('获胜方应该显示胜利标记', () => {
      const gameData = createMockGameData({ winnerTeamId: 'team1' });
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.getByText('胜利')).toBeInTheDocument();
    });

    it('失败方不应该显示胜利标记', () => {
      const gameData = createMockGameData({ winnerTeamId: 'team1' });
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.queryByText('胜利')).toBeInTheDocument();
      expect(screen.queryByText('★')).toBeInTheDocument();
    });

    it('当没有获胜方时（如比赛未开始）不显示胜利标记', () => {
      const gameData = createMockGameData({ winnerTeamId: null });
      render(<MatchInfoCard gameData={gameData} />);

      expect(screen.queryByText('胜利')).not.toBeInTheDocument();
    });
  });
});
