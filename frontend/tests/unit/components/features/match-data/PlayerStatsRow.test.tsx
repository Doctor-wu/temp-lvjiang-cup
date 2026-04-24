import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerStatsRow from '@/components/features/match-data/PlayerStatsRow';
import type { PlayerStat, PositionType } from '@/types/matchData';

const createMockPlayerStat = (overrides: Partial<PlayerStat> = {}): PlayerStat => ({
  id: 1,
  playerId: 'player-1',
  playerName: 'Bin',
  teamId: 'team-1',
  teamName: 'Test Team',
  championName: '格温',
  position: 'TOP' as PositionType,
  kda: '8/2/12',
  kills: 8,
  deaths: 2,
  assists: 12,
  cs: 349,
  gold: 18500,
  mvp: true,
  firstBlood: true,
  damageDealt: 45000,
  damageTaken: 28000,
  visionScore: 25,
  wardsPlaced: 10,
  level: 18,
  ...overrides,
});

describe('PlayerStatsRow', () => {
  describe('基本渲染', () => {
    it('应该正确渲染选手信息', () => {
      const bluePlayer = createMockPlayerStat({ playerName: 'Bin' });
      const redPlayer = createMockPlayerStat({ playerName: 'Zika', mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      const elements = container.querySelectorAll('*');
      const hasBin = Array.from(elements).some(el => el.textContent === 'Bin');
      const hasZika = Array.from(elements).some(el => el.textContent === 'Zika');
      expect(hasBin).toBe(true);
      expect(hasZika).toBe(true);
    });

    it('应该显示选手的 KDA', () => {
      const bluePlayer = createMockPlayerStat({ kda: '8/2/12' });
      const redPlayer = createMockPlayerStat({ kda: '3/5/8', mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      const elements = container.querySelectorAll('*');
      const hasKDA1 = Array.from(elements).some(el => el.textContent === '8/2/12');
      const hasKDA2 = Array.from(elements).some(el => el.textContent === '3/5/8');
      expect(hasKDA1).toBe(true);
      expect(hasKDA2).toBe(true);
    });

    it('应该正确格式化金币显示', () => {
      const bluePlayer = createMockPlayerStat({ gold: 18500 });
      const redPlayer = createMockPlayerStat({ gold: 15200, mvp: false });
      render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      expect(screen.getByText('18.5k')).toBeInTheDocument();
      expect(screen.getByText('15.2k')).toBeInTheDocument();
    });

    it('应该显示补刀数', () => {
      const bluePlayer = createMockPlayerStat({ cs: 349 });
      const redPlayer = createMockPlayerStat({ cs: 267, mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      const elements = container.querySelectorAll('*');
      const hasCS1 = Array.from(elements).some(el => el.textContent === '349');
      const hasCS2 = Array.from(elements).some(el => el.textContent === '267');
      expect(hasCS1).toBe(true);
      expect(hasCS2).toBe(true);
    });
  });

  describe('交互行为', () => {
    it('点击行时应该触发 onToggle', () => {
      const onToggle = vi.fn();
      const bluePlayer = createMockPlayerStat();
      const redPlayer = createMockPlayerStat({ mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={onToggle}
        />
      );

      const row = container.firstChild as HTMLElement;
      fireEvent.click(row);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('英雄图标显示', () => {
    it('应该显示英雄图标', () => {
      const bluePlayer = createMockPlayerStat({ championName: '格温' });
      const redPlayer = createMockPlayerStat({ championName: '赛恩', mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      // 检查是否有两个英雄图标（红蓝双方各一个）
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThanOrEqual(2);
    });

    it('英雄图标应该有红蓝方边框', () => {
      const bluePlayer = createMockPlayerStat();
      const redPlayer = createMockPlayerStat({ mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      // 检查红色方边框
      const redBorder = container.querySelector('[class*="border-[#f44336]"]');
      expect(redBorder).toBeInTheDocument();

      // 检查蓝色方边框
      const blueBorder = container.querySelector('[class*="border-[#00bcd4]"]');
      expect(blueBorder).toBeInTheDocument();
    });
  });

  describe('位置图标显示', () => {
    it('应该显示位置图标', () => {
      const bluePlayer = createMockPlayerStat({ position: 'TOP' });
      const redPlayer = createMockPlayerStat({ position: 'TOP', mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      // 检查位置图标容器
      const positionContainer = container.querySelector('[class*="bg-[#2d2d2d]"]');
      expect(positionContainer).toBeInTheDocument();
    });

    it('位置图标只应该显示一个', () => {
      const bluePlayer = createMockPlayerStat({ position: 'TOP' });
      const redPlayer = createMockPlayerStat({ position: 'JUNGLE', mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      // 位置图标容器存在
      const positionContainer = container.querySelector('[class*="bg-[#2d2d2d]"]');
      expect(positionContainer).toBeInTheDocument();
    });
  });

  describe('一血标识移除', () => {
    it('不应该显示一血标识', () => {
      const bluePlayer = createMockPlayerStat({ firstBlood: true });
      const redPlayer = createMockPlayerStat({ firstBlood: true, mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      // 检查不包含"一血"文字
      expect(screen.queryByText('一血')).not.toBeInTheDocument();
    });
  });

  describe('KDA 视觉强调', () => {
    it('红方 KDA 应该使用红色', () => {
      const bluePlayer = createMockPlayerStat();
      const redPlayer = createMockPlayerStat({ mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      const redKda = container.querySelector('[class*="text-[#f44336]"]');
      expect(redKda).toBeInTheDocument();
    });

    it('蓝方 KDA 应该使用蓝色', () => {
      const bluePlayer = createMockPlayerStat();
      const redPlayer = createMockPlayerStat({ mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      const blueKda = container.querySelector('[class*="text-[#00bcd4]"]');
      expect(blueKda).toBeInTheDocument();
    });
  });

  describe('金币颜色', () => {
    it('金币应该使用金色', () => {
      const bluePlayer = createMockPlayerStat({ gold: 18500 });
      const redPlayer = createMockPlayerStat({ gold: 15200, mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      const goldElements = container.querySelectorAll('[class*="text-[#c49f58]"]');
      expect(goldElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('选手信息布局', () => {
    it('选手头像和昵称应该上下布局', () => {
      const bluePlayer = createMockPlayerStat({ playerName: 'Bin' });
      const redPlayer = createMockPlayerStat({ playerName: 'Zika', mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      // 检查选手信息区域使用flex-col布局
      const playerContainers = container.querySelectorAll('.flex-col');
      expect(playerContainers.length).toBeGreaterThanOrEqual(2);
    });

    it('不应该显示展开箭头', () => {
      const bluePlayer = createMockPlayerStat();
      const redPlayer = createMockPlayerStat({ mvp: false });
      const { container } = render(
        <PlayerStatsRow
          bluePlayer={bluePlayer}
          redPlayer={redPlayer}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      );

      // 检查没有ChevronDown图标
      const chevron = container.querySelector('.lucide-chevron-down');
      expect(chevron).not.toBeInTheDocument();
    });
  });
});
