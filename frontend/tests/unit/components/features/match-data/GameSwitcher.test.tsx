import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameSwitcher from '@/components/features/match-data/GameSwitcher';
import type { GameSummary } from '@/types/matchData';

const createMockGameSummary = (
  overrides: Partial<GameSummary> & { gameNumber: number }
): GameSummary => ({
  gameNumber: 1,
  winnerTeamId: null,
  gameDuration: null,
  hasData: false,
  ...overrides,
});

describe('GameSwitcher', () => {
  describe('BO1显示单场标签', () => {
    it('BO1赛制应该显示"第一场"标签', () => {
      const games: GameSummary[] = [createMockGameSummary({ gameNumber: 1 })];

      render(<GameSwitcher games={games} currentGame={1} onChange={vi.fn()} format="BO1" />);

      expect(screen.getByText('第一场')).toBeInTheDocument();
    });
  });

  describe('BO3显示3个按钮', () => {
    it('BO3赛制应该显示3个按钮', () => {
      const games: GameSummary[] = [
        createMockGameSummary({ gameNumber: 1 }),
        createMockGameSummary({ gameNumber: 2 }),
        createMockGameSummary({ gameNumber: 3 }),
      ];

      render(<GameSwitcher games={games} currentGame={1} onChange={vi.fn()} format="BO3" />);

      expect(screen.getByText('第一场')).toBeInTheDocument();
      expect(screen.getByText('第二场')).toBeInTheDocument();
      expect(screen.getByText('第三场')).toBeInTheDocument();
    });
  });

  describe('BO5显示5个按钮', () => {
    it('BO5赛制应该显示5个按钮', () => {
      const games: GameSummary[] = [
        createMockGameSummary({ gameNumber: 1 }),
        createMockGameSummary({ gameNumber: 2 }),
        createMockGameSummary({ gameNumber: 3 }),
        createMockGameSummary({ gameNumber: 4 }),
        createMockGameSummary({ gameNumber: 5 }),
      ];

      render(<GameSwitcher games={games} currentGame={1} onChange={vi.fn()} format="BO5" />);

      expect(screen.getByText('第一场')).toBeInTheDocument();
      expect(screen.getByText('第二场')).toBeInTheDocument();
      expect(screen.getByText('第三场')).toBeInTheDocument();
      expect(screen.getByText('第四场')).toBeInTheDocument();
      expect(screen.getByText('第五场')).toBeInTheDocument();
    });
  });

  describe('当前局高亮样式', () => {
    it('当前局应该有金色高亮', () => {
      const games: GameSummary[] = [
        createMockGameSummary({ gameNumber: 1 }),
        createMockGameSummary({ gameNumber: 2 }),
      ];

      const { container } = render(
        <GameSwitcher games={games} currentGame={2} onChange={vi.fn()} format="BO3" />
      );

      const activeButton = container.querySelector('.text-\\[\\#c49f58\\]');
      expect(activeButton).toBeInTheDocument();
    });

    it('当前局按钮应该有顶部高亮条', () => {
      const games: GameSummary[] = [
        createMockGameSummary({ gameNumber: 1 }),
        createMockGameSummary({ gameNumber: 2 }),
      ];

      const { container } = render(
        <GameSwitcher games={games} currentGame={2} onChange={vi.fn()} format="BO3" />
      );

      // 检查是否有顶部边框元素
      const activeIndicator = container.querySelector('.bg-\\[\\#c49f58\\]');
      expect(activeIndicator).toBeInTheDocument();
    });
  });

  describe('未上传数据局禁用', () => {
    it('未上传数据的局应该有禁用样式', () => {
      const games: GameSummary[] = [
        createMockGameSummary({ gameNumber: 1, hasData: true }),
        createMockGameSummary({ gameNumber: 2, hasData: false }),
      ];

      const { container } = render(
        <GameSwitcher games={games} currentGame={1} onChange={vi.fn()} format="BO3" />
      );

      const disabledButton = container.querySelector('.opacity-40');
      expect(disabledButton).toBeInTheDocument();
    });
  });

  describe('点击切换', () => {
    it('点击按钮应该调用onChange', () => {
      const handleChange = vi.fn();
      const games: GameSummary[] = [
        createMockGameSummary({ gameNumber: 1, hasData: true }),
        createMockGameSummary({ gameNumber: 2, hasData: true }),
      ];

      render(<GameSwitcher games={games} currentGame={1} onChange={handleChange} format="BO3" />);

      fireEvent.click(screen.getByText('第二场'));
      expect(handleChange).toHaveBeenCalledWith(2);
    });
  });
});
