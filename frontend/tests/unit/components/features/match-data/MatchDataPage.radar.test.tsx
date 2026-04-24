import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MatchDataPage from '@/components/features/match-data/MatchDataPage';
import * as matchDataApi from '@/api/matchData';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '123' }),
  useSearchParams: () => [new URLSearchParams('game=1'), vi.fn()],
  useNavigate: () => vi.fn(),
}));

// Mock API
vi.mock('@/api/matchData', () => ({
  getMatchSeries: vi.fn(),
  getMatchGameData: vi.fn(),
}));

// Mock tracking
vi.mock('@/utils/tracking', () => ({
  trackMatchDataPageView: vi.fn(),
  trackGameSwitch: vi.fn(),
  trackRadarChartExpand: vi.fn(),
  trackRadarChartCollapse: vi.fn(),
}));

// Mock champion utils
vi.mock('@/utils/championUtils', () => ({
  initChampionMap: vi.fn(),
  getChampionIconByEn: vi.fn(() => '/mock-icon.png'),
  getChampionTitleByEn: vi.fn(name => name),
  getChampionNameToEn: vi.fn(() => ({})),
}));

// Mock upload utils
vi.mock('@/utils/upload', () => ({
  getUploadUrl: vi.fn(url => url),
}));

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
  ArrowLeft: () => <div data-testid="arrow-left" />,
}));

describe('MatchDataPage - 雷达图展开逻辑', () => {
  const mockSeriesData = {
    matchId: '123',
    teamA: { id: '1', name: '战队A' },
    teamB: { id: '2', name: '战队B' },
    format: 'BO3' as const,
    games: [
      { gameNumber: 1, winnerTeamId: '1', gameDuration: '32:45', hasData: true },
      { gameNumber: 2, winnerTeamId: '2', gameDuration: '28:30', hasData: true },
      { gameNumber: 3, winnerTeamId: null, gameDuration: null, hasData: false },
    ],
  };

  const mockGameData = {
    id: 1,
    matchId: '123',
    gameNumber: 1,
    winnerTeamId: '1',
    gameDuration: '32:45',
    gameStartTime: '2026-04-16T14:00:00Z',
    blueTeam: {
      teamId: '1',
      teamName: '战队A',
      side: 'blue' as const,
      kills: 25,
      gold: 65000,
      towers: 9,
      dragons: 3,
      barons: 1,
      isWinner: true,
    },
    redTeam: {
      teamId: '2',
      teamName: '战队B',
      side: 'red' as const,
      kills: 18,
      gold: 58000,
      towers: 3,
      dragons: 1,
      barons: 0,
      isWinner: false,
    },
    playerStats: [
      {
        id: 1,
        playerId: '1',
        playerName: '选手A1',
        teamId: '1',
        teamName: '战队A',
        position: 'TOP' as const,
        championName: '英雄1',
        kills: 5,
        deaths: 2,
        assists: 10,
        kda: '5/2/10',
        cs: 256,
        gold: 15800,
        damageDealt: 28500,
        damageTaken: 32000,
        wardsPlaced: 10,
        visionScore: 32,
        level: 18,
        firstBlood: true,
        mvp: true,
        playerAvatarUrl: null,
      },
      {
        id: 2,
        playerId: '2',
        playerName: '选手A2',
        teamId: '1',
        teamName: '战队A',
        position: 'JUNGLE' as const,
        championName: '英雄2',
        kills: 3,
        deaths: 1,
        assists: 15,
        kda: '3/1/15',
        cs: 180,
        gold: 12000,
        damageDealt: 15000,
        damageTaken: 25000,
        wardsPlaced: 25,
        visionScore: 45,
        level: 16,
        firstBlood: false,
        mvp: false,
        playerAvatarUrl: null,
      },
      {
        id: 3,
        playerId: '3',
        playerName: '选手A3',
        teamId: '1',
        teamName: '战队A',
        position: 'MID' as const,
        championName: '英雄3',
        kills: 10,
        deaths: 3,
        assists: 8,
        kda: '10/3/8',
        cs: 280,
        gold: 18000,
        damageDealt: 35000,
        damageTaken: 20000,
        wardsPlaced: 15,
        visionScore: 28,
        level: 18,
        firstBlood: false,
        mvp: false,
        playerAvatarUrl: null,
      },
      {
        id: 4,
        playerId: '4',
        playerName: '选手A4',
        teamId: '1',
        teamName: '战队A',
        position: 'ADC' as const,
        championName: '英雄4',
        kills: 6,
        deaths: 2,
        assists: 12,
        kda: '6/2/12',
        cs: 300,
        gold: 19000,
        damageDealt: 40000,
        damageTaken: 18000,
        wardsPlaced: 8,
        visionScore: 22,
        level: 18,
        firstBlood: false,
        mvp: false,
        playerAvatarUrl: null,
      },
      {
        id: 5,
        playerId: '5',
        playerName: '选手A5',
        teamId: '1',
        teamName: '战队A',
        position: 'SUPPORT' as const,
        championName: '英雄5',
        kills: 1,
        deaths: 4,
        assists: 20,
        kda: '1/4/20',
        cs: 50,
        gold: 8000,
        damageDealt: 8000,
        damageTaken: 35000,
        wardsPlaced: 45,
        visionScore: 65,
        level: 14,
        firstBlood: false,
        mvp: false,
        playerAvatarUrl: null,
      },
      {
        id: 6,
        playerId: '6',
        playerName: '选手B1',
        teamId: '2',
        teamName: '战队B',
        position: 'TOP' as const,
        championName: '英雄6',
        kills: 4,
        deaths: 5,
        assists: 8,
        kda: '4/5/8',
        cs: 230,
        gold: 13000,
        damageDealt: 22000,
        damageTaken: 40000,
        wardsPlaced: 8,
        visionScore: 25,
        level: 17,
        firstBlood: false,
        mvp: false,
        playerAvatarUrl: null,
      },
      {
        id: 7,
        playerId: '7',
        playerName: '选手B2',
        teamId: '2',
        teamName: '战队B',
        position: 'JUNGLE' as const,
        championName: '英雄7',
        kills: 2,
        deaths: 4,
        assists: 10,
        kda: '2/4/10',
        cs: 150,
        gold: 10000,
        damageDealt: 12000,
        damageTaken: 30000,
        wardsPlaced: 30,
        visionScore: 50,
        level: 15,
        firstBlood: false,
        mvp: false,
        playerAvatarUrl: null,
      },
      {
        id: 8,
        playerId: '8',
        playerName: '选手B3',
        teamId: '2',
        teamName: '战队B',
        position: 'MID' as const,
        championName: '英雄8',
        kills: 7,
        deaths: 6,
        assists: 5,
        kda: '7/6/5',
        cs: 260,
        gold: 16000,
        damageDealt: 30000,
        damageTaken: 22000,
        wardsPlaced: 12,
        visionScore: 24,
        level: 17,
        firstBlood: false,
        mvp: false,
        playerAvatarUrl: null,
      },
      {
        id: 9,
        playerId: '9',
        playerName: '选手B4',
        teamId: '2',
        teamName: '战队B',
        position: 'ADC' as const,
        championName: '英雄9',
        kills: 4,
        deaths: 5,
        assists: 9,
        kda: '4/5/9',
        cs: 270,
        gold: 17000,
        damageDealt: 32000,
        damageTaken: 19000,
        wardsPlaced: 6,
        visionScore: 18,
        level: 17,
        firstBlood: false,
        mvp: false,
        playerAvatarUrl: null,
      },
      {
        id: 10,
        playerId: '10',
        playerName: '选手B5',
        teamId: '2',
        teamName: '战队B',
        position: 'SUPPORT' as const,
        championName: '英雄10',
        kills: 1,
        deaths: 3,
        assists: 15,
        kda: '1/3/15',
        cs: 40,
        gold: 7000,
        damageDealt: 6000,
        damageTaken: 28000,
        wardsPlaced: 50,
        visionScore: 70,
        level: 13,
        firstBlood: false,
        mvp: false,
        playerAvatarUrl: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (matchDataApi.getMatchSeries as any).mockResolvedValue(mockSeriesData);
    (matchDataApi.getMatchGameData as any).mockResolvedValue(mockGameData);
  });

  it('点击TOP位置选手行应展开TOP位置雷达图', async () => {
    render(<MatchDataPage />);

    // 等待数据加载
    await screen.findByText('选手A1');

    // 找到TOP位置的选手行并点击
    const topPlayerRow = screen.getByTestId('player-row-TOP');
    expect(topPlayerRow).toBeTruthy();
    fireEvent.click(topPlayerRow);

    // 验证雷达图组件被渲染，且显示TOP位置的6个维度
    // TOP维度: 分均补刀、伤害占比、承伤占比、参团率、伤转、KDA
    await screen.findByText('分均补刀');
    await screen.findByText('伤害占比');
    await screen.findByText('承伤占比');
    await screen.findByText('参团率');
    await screen.findByText('伤转');
    await screen.findByText('KDA');
  });

  it('点击JUNGLE位置选手行应展开JUNGLE位置雷达图', async () => {
    render(<MatchDataPage />);

    await screen.findByText('选手A2');

    const junglePlayerRow = screen.getByTestId('player-row-JUNGLE');
    expect(junglePlayerRow).toBeTruthy();
    fireEvent.click(junglePlayerRow);

    // JUNGLE维度: 分均插眼、伤害占比、承伤占比、参团率、伤转、KDA
    await screen.findByText('分均插眼');
    await screen.findByText('伤害占比');
    await screen.findByText('承伤占比');
    await screen.findByText('参团率');
    await screen.findByText('伤转');
    await screen.findByText('KDA');
  });

  it('点击MID位置选手行应展开MID位置雷达图', async () => {
    render(<MatchDataPage />);

    await screen.findByText('选手A3');

    const midPlayerRow = screen.getByTestId('player-row-MID');
    expect(midPlayerRow).toBeTruthy();
    fireEvent.click(midPlayerRow);

    // MID维度: 分均补刀、伤害占比、分均经济、分均伤害、伤转、KDA
    await screen.findByText('分均补刀');
    await screen.findByText('伤害占比');
    await screen.findByText('分均经济');
    await screen.findByText('分均伤害');
    await screen.findByText('伤转');
    await screen.findByText('KDA');
  });

  it('点击ADC位置选手行应展开ADC位置雷达图', async () => {
    render(<MatchDataPage />);

    await screen.findByText('选手A4');

    const adcPlayerRow = screen.getByTestId('player-row-ADC');
    expect(adcPlayerRow).toBeTruthy();
    fireEvent.click(adcPlayerRow);

    // ADC维度: 分均补刀、伤害占比、分均经济、分均伤害、伤转、KDA
    await screen.findByText('分均补刀');
    await screen.findByText('伤害占比');
    await screen.findByText('分均经济');
    await screen.findByText('分均伤害');
    await screen.findByText('伤转');
    await screen.findByText('KDA');
  });

  it('点击SUPPORT位置选手行应展开SUPPORT位置雷达图', async () => {
    render(<MatchDataPage />);

    await screen.findByText('选手A5');

    const supportPlayerRow = screen.getByTestId('player-row-SUPPORT');
    expect(supportPlayerRow).toBeTruthy();
    fireEvent.click(supportPlayerRow);

    // SUPPORT维度: 分均插眼、每死承伤、承伤占比、参团率、场均助攻、KDA
    await screen.findByText('分均插眼');
    await screen.findByText('每死承伤');
    await screen.findByText('承伤占比');
    await screen.findByText('参团率');
    await screen.findByText('场均助攻');
    await screen.findByText('KDA');
  });

  it('点击同一选手行应收起雷达图', async () => {
    render(<MatchDataPage />);

    await screen.findByText('选手A1');

    const topPlayerRow = screen.getByTestId('player-row-TOP');
    expect(topPlayerRow).toBeTruthy();

    // 第一次点击展开
    fireEvent.click(topPlayerRow);

    // 验证雷达图显示
    await screen.findByText('分均补刀');

    // 第二次点击收起
    fireEvent.click(topPlayerRow);

    // 验证雷达图收起 - 维度文本应该消失
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(screen.queryByText('分均补刀')).toBeNull();
  });

  it('点击不同位置选手行应切换雷达图显示对应位置维度', async () => {
    render(<MatchDataPage />);

    await screen.findByText('选手A1');

    // 先点击TOP位置
    const topPlayerRow = screen.getByTestId('player-row-TOP');
    expect(topPlayerRow).toBeTruthy();
    fireEvent.click(topPlayerRow);

    // 验证显示TOP维度
    await screen.findByText('承伤占比');

    // 再点击JUNGLE位置
    const junglePlayerRow = screen.getByTestId('player-row-JUNGLE');
    expect(junglePlayerRow).toBeTruthy();
    fireEvent.click(junglePlayerRow);

    // 验证切换为JUNGLE维度
    await screen.findByText('分均插眼');
    // TOP维度特有的"承伤占比"应该还在（JUNGLE也有），但维度组合不同
  });
});
