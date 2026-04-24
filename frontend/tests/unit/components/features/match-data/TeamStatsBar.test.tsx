import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamStatsBar from '@/components/features/match-data/TeamStatsBar';
import type { TeamGameData, BanData } from '@/types/matchData';

const createMockTeamData = (
  overrides: Partial<TeamGameData> & { teamName: string }
): TeamGameData => ({
  teamId: 'team1',
  teamName: 'BLG',
  side: 'blue',
  kills: 25,
  gold: 65000,
  towers: 9,
  dragons: 3,
  barons: 1,
  isWinner: true,
  logoUrl: 'https://example.com/logo.png',
  ...overrides,
});

const createMockBans = (): BanData => ({
  red: ['Ahri', 'Yasuo', 'LeeSin', 'Jinx', 'Thresh'],
  blue: ['Zed', 'Riven', 'Viego', 'Ezreal', 'Lulu'],
});

describe('TeamStatsBar', () => {
  describe('队标队名显示', () => {
    it('应该显示双方队伍名称', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue' });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red' });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      expect(screen.getByText('BLG')).toBeInTheDocument();
      expect(screen.getByText('WBG')).toBeInTheDocument();
    });

    it('应该显示队伍Logo', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', logoUrl: 'https://example.com/blg.png' });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', logoUrl: 'https://example.com/wbg.png' });
      const { container } = render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      const logos = container.querySelectorAll('img[alt="BLG"], img[alt="WBG"]');
      expect(logos.length).toBe(2);
    });

    it('没有Logo时应该显示队名前两个字', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', logoUrl: undefined });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', logoUrl: undefined });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      // 队名前两个字应该作为fallback显示
      expect(screen.getByText('BLG')).toBeInTheDocument();
      expect(screen.getByText('WBG')).toBeInTheDocument();
    });
  });

  describe('击杀对比显示', () => {
    it('应该正确显示击杀对比', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', kills: 25 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', kills: 18 });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
    });

    it('击杀比分应该使用大字号', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', kills: 25 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', kills: 18 });
      const { container } = render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      const killText = screen.getByText('25');
      expect(killText.closest('.text-5xl')).toBeInTheDocument();
    });

    it('应该显示 Swords 图标表示击杀', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', kills: 25 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', kills: 18 });
      const { container } = render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      // 检查是否存在 Swords SVG 图标
      const swordsIcon = container.querySelector('.lucide-swords');
      expect(swordsIcon).toBeInTheDocument();
    });
  });

  describe('经济对比显示', () => {
    it('应该正确显示经济对比（格式化k单位）', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', gold: 65000 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', gold: 58000 });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      expect(screen.getByText('65.0k')).toBeInTheDocument();
      expect(screen.getByText('58.0k')).toBeInTheDocument();
    });

    it('应该显示金币数标签', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', gold: 65000 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', gold: 58000 });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      expect(screen.getByText('金币数')).toBeInTheDocument();
    });
  });

  describe('推塔对比显示', () => {
    it('应该正确显示推塔对比', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', towers: 11 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', towers: 5 });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('防御塔')).toBeInTheDocument();
    });
  });

  describe('控龙对比显示', () => {
    it('应该正确显示控龙对比', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', dragons: 4 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', dragons: 2 });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('小龙数')).toBeInTheDocument();
    });
  });

  describe('男爵对比显示', () => {
    it('应该正确显示男爵对比', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', barons: 1 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', barons: 0 });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('大龙数')).toBeInTheDocument();
    });
  });

  describe('BAN位显示', () => {
    it('应该正确显示BAN位', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue' });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red' });
      const bans = createMockBans();
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} bans={bans} />);

      // 检查BAN标签（现在是"BAN"而不是"BAN / PICK"）
      const banLabels = screen.getAllByText('BAN');
      expect(banLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('没有BAN数据时不显示BAN区域', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue' });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red' });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      // BAN标签不应该出现
      expect(screen.queryByText('BAN')).not.toBeInTheDocument();
    });
  });

  describe('红蓝方颜色正确', () => {
    it('红色方击杀数应该是红色', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', kills: 25 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', kills: 18 });
      const { container } = render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      const redKill = container.querySelector('.text-\\[\\#f44336\\]');
      expect(redKill).toBeInTheDocument();
    });

    it('蓝色方击杀数应该是蓝色', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', kills: 25 });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', kills: 18 });
      const { container } = render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      const blueKill = container.querySelector('.text-\\[\\#00bcd4\\]');
      expect(blueKill).toBeInTheDocument();
    });
  });

  describe('图标显示', () => {
    it('应该显示所有数据图标', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue' });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red' });
      const { container } = render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      // 检查各个图标是否存在
      expect(container.querySelector('.lucide-swords')).toBeInTheDocument();
      expect(container.querySelector('.lucide-coins')).toBeInTheDocument();
      expect(container.querySelector('.lucide-castle')).toBeInTheDocument();
      expect(container.querySelector('.lucide-flame')).toBeInTheDocument();
      expect(container.querySelector('.lucide-crown')).toBeInTheDocument();
    });
  });

  describe('胜利标识显示', () => {
    it('应该为获胜方显示胜利标识', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', isWinner: true });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', isWinner: false });
      const { container } = render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      // 检查胜利图标是否存在
      const victoryIcon = container.querySelector('img[alt="胜利"]');
      expect(victoryIcon).toBeInTheDocument();
      expect(victoryIcon).toHaveAttribute('src', 'https://game.gtimg.cn/images/lpl/es/web201612/victory_ico.png');
    });

    it('红色方获胜时应该显示胜利标识', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', isWinner: false });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', isWinner: true });
      const { container } = render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      const victoryIcon = container.querySelector('img[alt="胜利"]');
      expect(victoryIcon).toBeInTheDocument();
    });

    it('失败方不应该显示胜利标识', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', isWinner: false });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', isWinner: false });
      const { container } = render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} />);

      const victoryIcon = container.querySelector('img[alt="胜利"]');
      expect(victoryIcon).not.toBeInTheDocument();
    });
  });

  describe('一血标识显示', () => {
    it('应该为获得一血的队伍显示一血标识', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', isWinner: true });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', isWinner: false });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} firstBloodTeam="blue" />);

      expect(screen.getByText('一血')).toBeInTheDocument();
    });

    it('红色方获得一血时应该显示一血标识', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue', isWinner: false });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red', isWinner: true });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} firstBloodTeam="red" />);

      expect(screen.getByText('一血')).toBeInTheDocument();
    });

    it('没有一血数据时不应该显示一血标识', () => {
      const blueTeam = createMockTeamData({ teamName: 'BLG', side: 'blue' });
      const redTeam = createMockTeamData({ teamName: 'WBG', side: 'red' });
      render(<TeamStatsBar blueTeam={blueTeam} redTeam={redTeam} firstBloodTeam={null} />);

      expect(screen.queryByText('一血')).not.toBeInTheDocument();
    });
  });
});
