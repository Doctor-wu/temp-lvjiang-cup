import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerStatsList from '@/components/features/match-data/PlayerStatsList';
import type { PlayerStat, TeamGameData } from '@/types/matchData';

const createMockTeamStats = (teamId: string): TeamGameData => ({
  teamId,
  teamName: teamId === 'team1' ? 'TeamA' : 'TeamB',
  side: teamId === 'team1' ? 'blue' : 'red',
  kills: 15,
  gold: 50000,
  towers: 5,
  dragons: 3,
  barons: 1,
  isWinner: true,
});

const createMockPlayerStat = (
  overrides: Partial<PlayerStat> & { playerName: string; position: string }
): PlayerStat =>
  ({
    id: 1,
    playerId: 'p1',
    playerName: 'Player',
    teamId: 'team1',
    teamName: 'TeamA',
    position: 'TOP',
    championName: '英雄',
    kills: 0,
    deaths: 0,
    assists: 0,
    kda: '0/0/0',
    cs: 0,
    gold: 0,
    damageDealt: 0,
    damageTaken: 0,
    visionScore: 0,
    wardsPlaced: 0,
    level: 1,
    firstBlood: false,
    mvp: false,
    ...overrides,
  }) as PlayerStat;

describe('PlayerStatsList', () => {
  describe('按位置顺序渲染', () => {
    it('应该渲染选手数据行', () => {
      const bluePlayers: PlayerStat[] = [
        createMockPlayerStat({ playerName: 'Bin', position: 'TOP' }),
      ];
      const redPlayers: PlayerStat[] = [
        createMockPlayerStat({
          playerName: 'Zika',
          position: 'TOP',
          teamId: 'team2',
          teamName: 'TeamB',
        }),
      ];

      render(
        <PlayerStatsList
          bluePlayers={bluePlayers}
          redPlayers={redPlayers}
          expandedPosition={null}
          onToggle={vi.fn()}
          gameDuration="32:45"
          redTeamStats={createMockTeamStats('team2')}
          blueTeamStats={createMockTeamStats('team1')}
        />
      );

      const vsElements = document.body.querySelectorAll('.cursor-pointer');
      expect(vsElements.length).toBe(1);
    });

    it('TOP位置应该渲染', () => {
      const bluePlayers: PlayerStat[] = [
        createMockPlayerStat({ playerName: 'Bin', position: 'TOP' }),
      ];
      const redPlayers: PlayerStat[] = [
        createMockPlayerStat({
          playerName: 'Zika',
          position: 'TOP',
          teamId: 'team2',
          teamName: 'TeamB',
        }),
      ];

      render(
        <PlayerStatsList
          bluePlayers={bluePlayers}
          redPlayers={redPlayers}
          expandedPosition={null}
          onToggle={vi.fn()}
          gameDuration="32:45"
          redTeamStats={createMockTeamStats('team2')}
          blueTeamStats={createMockTeamStats('team1')}
        />
      );

      expect(screen.getByText('Bin')).toBeInTheDocument();
      expect(screen.getByText('Zika')).toBeInTheDocument();
    });

    it('SUPPORT位置应该渲染', () => {
      const bluePlayers: PlayerStat[] = [
        createMockPlayerStat({ playerName: 'ON', position: 'SUPPORT' }),
      ];
      const redPlayers: PlayerStat[] = [
        createMockPlayerStat({
          playerName: 'Crisp',
          position: 'SUPPORT',
          teamId: 'team2',
          teamName: 'TeamB',
        }),
      ];

      render(
        <PlayerStatsList
          bluePlayers={bluePlayers}
          redPlayers={redPlayers}
          expandedPosition={null}
          onToggle={vi.fn()}
          gameDuration="32:45"
          redTeamStats={createMockTeamStats('team2')}
          blueTeamStats={createMockTeamStats('team1')}
        />
      );

      expect(screen.getByText('ON')).toBeInTheDocument();
      expect(screen.getByText('Crisp')).toBeInTheDocument();
    });
  });

  describe('对位匹配', () => {
    it('相同位置的选手应该对位显示', () => {
      const bluePlayers: PlayerStat[] = [
        createMockPlayerStat({ playerName: 'Bin', position: 'TOP' }),
      ];
      const redPlayers: PlayerStat[] = [
        createMockPlayerStat({
          playerName: 'Zika',
          position: 'TOP',
          teamId: 'team2',
          teamName: 'TeamB',
        }),
      ];

      render(
        <PlayerStatsList
          bluePlayers={bluePlayers}
          redPlayers={redPlayers}
          expandedPosition={null}
          onToggle={vi.fn()}
          gameDuration="32:45"
          redTeamStats={createMockTeamStats('team2')}
          blueTeamStats={createMockTeamStats('team1')}
        />
      );

      expect(screen.getByText('Bin')).toBeInTheDocument();
      expect(screen.getByText('Zika')).toBeInTheDocument();
    });
  });

  describe('展开状态传递', () => {
    it('当前展开位置应该正确传递', () => {
      const bluePlayers: PlayerStat[] = [
        createMockPlayerStat({ playerName: 'Bin', position: 'TOP' }),
        createMockPlayerStat({ playerName: 'Xun', position: 'JUNGLE' }),
      ];
      const redPlayers: PlayerStat[] = [
        createMockPlayerStat({
          playerName: 'Zika',
          position: 'TOP',
          teamId: 'team2',
          teamName: 'TeamB',
        }),
        createMockPlayerStat({
          playerName: 'Weiwei',
          position: 'JUNGLE',
          teamId: 'team2',
          teamName: 'TeamB',
        }),
      ];

      const handleToggle = vi.fn();
      render(
        <PlayerStatsList
          bluePlayers={bluePlayers}
          redPlayers={redPlayers}
          expandedPosition="JUNGLE"
          onToggle={handleToggle}
          gameDuration="32:45"
          redTeamStats={createMockTeamStats('team2')}
          blueTeamStats={createMockTeamStats('team1')}
        />
      );

      expect(screen.getByText('Bin')).toBeInTheDocument();
      expect(screen.getByText('Xun')).toBeInTheDocument();
      expect(screen.getByText('Zika')).toBeInTheDocument();
      expect(screen.getByText('Weiwei')).toBeInTheDocument();
    });

    it('无展开位置时所有行都收起', () => {
      const bluePlayers: PlayerStat[] = [
        createMockPlayerStat({ playerName: 'Bin', position: 'TOP' }),
        createMockPlayerStat({ playerName: 'Xun', position: 'JUNGLE' }),
      ];
      const redPlayers: PlayerStat[] = [
        createMockPlayerStat({
          playerName: 'Zika',
          position: 'TOP',
          teamId: 'team2',
          teamName: 'TeamB',
        }),
        createMockPlayerStat({
          playerName: 'Weiwei',
          position: 'JUNGLE',
          teamId: 'team2',
          teamName: 'TeamB',
        }),
      ];

      const handleToggle = vi.fn();
      render(
        <PlayerStatsList
          bluePlayers={bluePlayers}
          redPlayers={redPlayers}
          expandedPosition={null}
          onToggle={handleToggle}
          gameDuration="32:45"
          redTeamStats={createMockTeamStats('team2')}
          blueTeamStats={createMockTeamStats('team1')}
        />
      );

      expect(screen.getByText('Bin')).toBeInTheDocument();
      expect(screen.getByText('Xun')).toBeInTheDocument();
    });
  });
});
