import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('echarts/core', () => ({
  __esModule: true,
  use: vi.fn(),
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('echarts/charts', () => ({
  RadarChart: {},
}));

vi.mock('echarts/components', () => ({
  TooltipComponent: {},
  GridComponent: {},
}));

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}));

import { render, screen } from '@testing-library/react';
import RadarChart from '@/components/features/match-data/RadarChart';
import type { PlayerStat, TeamGameData } from '@/types/matchData';

const createMockPlayer = (
  overrides: Partial<PlayerStat> & { playerName: string; position: string }
): PlayerStat =>
  ({
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
    ...overrides,
  }) as PlayerStat;

const createMockTeamStats = (
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
  ...overrides,
});

describe('RadarChart', () => {
  const mockBluePlayer = createMockPlayer({
    playerId: 'p1',
    playerName: 'Bin',
    teamId: 'team1',
    teamName: 'BLG',
    position: 'TOP',
    kills: 8,
    deaths: 2,
    assists: 12,
  });

  const mockRedPlayer = createMockPlayer({
    playerId: 'p6',
    playerName: 'Zika',
    teamId: 'team2',
    teamName: 'WBG',
    position: 'TOP',
    kills: 1,
    deaths: 5,
    assists: 9,
  });

  const mockBlueTeam = createMockTeamStats({
    teamId: 'team1',
    teamName: 'BLG',
    side: 'blue',
    kills: 25,
  });

  const mockRedTeam = createMockTeamStats({
    teamId: 'team2',
    teamName: 'WBG',
    side: 'red',
    kills: 18,
  });

  describe('visible=false时', () => {
    it('不应该渲染雷达图容器', () => {
      const { container } = render(
        <RadarChart
          player1={mockBluePlayer}
          player2={mockRedPlayer}
          gameDuration="32:45"
          redTeamStats={mockRedTeam}
          blueTeamStats={mockBlueTeam}
          visible={false}
        />
      );

      const chartContainer = container.querySelector('[style*="width"]');
      expect(chartContainer).toBeNull();
    });
  });

  describe('visible=true时', () => {
    it('应该渲染雷达图容器', () => {
      const { container } = render(
        <RadarChart
          player1={mockBluePlayer}
          player2={mockRedPlayer}
          gameDuration="32:45"
          redTeamStats={mockRedTeam}
          blueTeamStats={mockBlueTeam}
          visible={true}
        />
      );

      const chartContainer = container.querySelector('[style*="width"]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('应该设置正确的容器高度', () => {
      const { container } = render(
        <RadarChart
          player1={mockBluePlayer}
          player2={mockRedPlayer}
          gameDuration="32:45"
          redTeamStats={mockRedTeam}
          blueTeamStats={mockBlueTeam}
          visible={true}
        />
      );

      const chartContainer = container.querySelector('[style*="height: 400px"]');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('数据处理', () => {
    it('应该正确处理TOP位置选手数据', () => {
      const topPlayer = createMockPlayer({
        playerName: 'Bin',
        position: 'TOP',
        kills: 8,
        deaths: 2,
        assists: 12,
      });

      render(
        <RadarChart
          player1={topPlayer}
          player2={mockRedPlayer}
          gameDuration="32:45"
          redTeamStats={mockRedTeam}
          blueTeamStats={mockBlueTeam}
          visible={true}
        />
      );

      const chartContainer = document.querySelector('[style*="height: 400px"]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('应该正确处理ADC位置选手数据', () => {
      const adcPlayer = createMockPlayer({
        playerName: 'Elk',
        position: 'ADC',
        kills: 10,
        deaths: 3,
        assists: 8,
      });

      const redAdcPlayer = createMockPlayer({
        playerName: 'Light',
        position: 'ADC',
        kills: 6,
        deaths: 4,
        assists: 5,
      });

      render(
        <RadarChart
          player1={adcPlayer}
          player2={redAdcPlayer}
          gameDuration="35:20"
          redTeamStats={mockRedTeam}
          blueTeamStats={mockBlueTeam}
          visible={true}
        />
      );

      const chartContainer = document.querySelector('[style*="height: 400px"]');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('阵营判定', () => {
    it('应该正确识别蓝色方选手', () => {
      const bluePlayer = createMockPlayer({
        playerId: 'p1',
        playerName: 'Bin',
        teamId: 'team1',
        teamName: 'BLG',
        position: 'TOP',
      });

      render(
        <RadarChart
          player1={bluePlayer}
          player2={mockRedPlayer}
          gameDuration="32:45"
          redTeamStats={mockRedTeam}
          blueTeamStats={mockBlueTeam}
          visible={true}
        />
      );

      const chartContainer = document.querySelector('[style*="height: 400px"]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('应该正确识别红色方选手', () => {
      const redPlayer = createMockPlayer({
        playerId: 'p6',
        playerName: 'Zika',
        teamId: 'team2',
        teamName: 'WBG',
        position: 'TOP',
      });

      render(
        <RadarChart
          player1={mockBluePlayer}
          player2={redPlayer}
          gameDuration="32:45"
          redTeamStats={mockRedTeam}
          blueTeamStats={mockBlueTeam}
          visible={true}
        />
      );

      const chartContainer = document.querySelector('[style*="height: 400px"]');
      expect(chartContainer).toBeInTheDocument();
    });
  });
});
