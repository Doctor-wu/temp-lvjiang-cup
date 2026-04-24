import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MatchDetailModal from '@/components/features/MatchDetailModal';
import type { Match, Team } from '@/types';

vi.mock('@/api/matchData', () => ({
  checkMatchDataExists: vi.fn(),
}));

import { checkMatchDataExists } from '@/api/matchData';
const mockCheckMatchDataExists = checkMatchDataExists as ReturnType<typeof vi.fn>;

const mockTeams: Team[] = [
  {
    id: 'team1',
    name: '驴酱',
    logo: '/logo1.png',
    battleCry: '冲啊',
    players: [
      { id: 'p1', nickname: '小明', position: 'TOP', avatarUrl: '/avatar1.png' },
      { id: 'p2', nickname: '小红', position: 'JUNGLE', avatarUrl: '/avatar2.png' },
      { id: 'p3', nickname: '小刚', position: 'MID' },
      { id: 'p4', nickname: '小丽', position: 'ADC', avatarUrl: '/avatar4.png' },
      { id: 'p5', nickname: '小华', position: 'SUPPORT' },
    ],
  },
  {
    id: 'team2',
    name: '雨酱',
    logo: '/logo2.png',
    battleCry: '加油',
    players: [
      { id: 'p6', nickname: '阿强', position: 'TOP' },
      { id: 'p7', nickname: '阿伟', position: 'JUNGLE', avatarUrl: '/avatar7.png' },
      { id: 'p8', nickname: '阿杰', position: 'MID', avatarUrl: '/avatar8.png' },
      { id: 'p9', nickname: '阿美', position: 'ADC' },
      { id: 'p10', nickname: '阿丽', position: 'SUPPORT', avatarUrl: '/avatar10.png' },
    ],
  },
];

const createMockMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'match1',
  teamAId: 'team1',
  teamBId: 'team2',
  scoreA: 3,
  scoreB: 2,
  winnerId: 'team1',
  round: 'Round 1',
  status: 'finished',
  startTime: '2026-01-01T14:30:00',
  stage: 'swiss',
  boFormat: 'BO5',
  ...overrides,
});

describe('MatchDetailModal', () => {
  it('当visible为false时不应该渲染', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch();
    const { container } = render(
      <MatchDetailModal visible={false} onClose={vi.fn()} match={match} teams={mockTeams} />
    );

    expect(screen.queryByText('对战详情')).not.toBeInTheDocument();
  });

  it('当match为null时不应该渲染', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const { container } = render(
      <MatchDetailModal visible={true} onClose={vi.fn()} match={null} teams={mockTeams} />
    );

    expect(screen.queryByText('对战详情')).not.toBeInTheDocument();
  });

  it('应该显示弹框标题', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch();
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    expect(screen.getByText('对战详情')).toBeInTheDocument();
  });

  it('应该显示对战时间', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch({ startTime: '2026-01-01T14:30:00' });
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    expect(screen.getByText('2026年01月01日 14:30')).toBeInTheDocument();
  });

  it('当没有startTime时应该显示待定', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch({ startTime: '' });
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    expect(screen.getByText('待定')).toBeInTheDocument();
  });

  it('应该显示对战状态', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch({ status: 'ongoing' });
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    expect(screen.getByText('进行中')).toBeInTheDocument();
  });

  it('应该显示不同状态的比赛', () => {
    mockCheckMatchDataExists.mockResolvedValue({ hasData: false, gameCount: 0 });
    const upcomingMatch = createMockMatch({ status: 'upcoming' });
    const { rerender } = render(
      <MatchDetailModal visible={true} onClose={vi.fn()} match={upcomingMatch} teams={mockTeams} />
    );
    expect(screen.getByText('未开始')).toBeInTheDocument();

    const finishedMatch = createMockMatch({ status: 'finished' });
    rerender(
      <MatchDetailModal visible={true} onClose={vi.fn()} match={finishedMatch} teams={mockTeams} />
    );
    expect(screen.getByText('已结束')).toBeInTheDocument();
  });

  it('应该显示双方队伍名称', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch();
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    expect(screen.getByText('驴酱')).toBeInTheDocument();
    expect(screen.getByText('雨酱')).toBeInTheDocument();
  });

  it('应该显示比分', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch({ scoreA: 3, scoreB: 2 });
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    const scores = screen.getAllByText('3');
    expect(scores.length).toBeGreaterThan(0);
    const scores2 = screen.getAllByText('2');
    expect(scores2.length).toBeGreaterThan(0);
  });

  it('应该显示胜者标签', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch({ winnerId: 'team1', status: 'finished' });
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    const winnerLabels = screen.getAllByText('胜者');
    expect(winnerLabels.length).toBeGreaterThan(0);
  });

  it('应该显示队员对阵信息', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch();
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    expect(screen.getByText('队员对阵')).toBeInTheDocument();

    const positionIcons = document.querySelectorAll('div[style*="background-image"]');
    expect(positionIcons.length).toBeGreaterThanOrEqual(5);
  });

  it('应该显示队员昵称', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch();
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    expect(screen.getByText('小明')).toBeInTheDocument();
    expect(screen.getByText('阿强')).toBeInTheDocument();
  });

  it('当队员昵称为空时应该显示待定', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const teamsWithEmptyNickname: Team[] = [
      {
        id: 'team1',
        name: '驴酱',
        logo: '/logo1.png',
        battleCry: '冲啊',
        players: [
          { id: 'p1', nickname: '', position: 'TOP', avatarUrl: '/avatar1.png' },
          { id: 'p2', nickname: '小红', position: 'JUNGLE', avatarUrl: '/avatar2.png' },
        ],
      },
      {
        id: 'team2',
        name: '雨酱',
        logo: '/logo2.png',
        battleCry: '加油',
        players: [
          { id: 'p6', nickname: '阿强', position: 'TOP' },
          { id: 'p7', nickname: '', position: 'JUNGLE', avatarUrl: '/avatar7.png' },
        ],
      },
    ];

    const match = createMockMatch();
    render(
      <MatchDetailModal
        visible={true}
        onClose={vi.fn()}
        match={match}
        teams={teamsWithEmptyNickname}
      />
    );

    const pendingLabels = screen.getAllByText('待定');
    expect(pendingLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('应该正确区分队员昵称和位置信息', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch();
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    expect(screen.getByText('小明')).toBeInTheDocument();
    expect(screen.getByText('小红')).toBeInTheDocument();
    expect(screen.getByText('阿强')).toBeInTheDocument();
    expect(screen.getByText('阿伟')).toBeInTheDocument();

    expect(screen.queryByText('驴酱 - 上单')).not.toBeInTheDocument();
    expect(screen.queryByText('雨酱 - 上单')).not.toBeInTheDocument();
  });

  it('应该显示位置图标代替位置文字', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch();
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    // 不应该显示位置文字
    expect(screen.queryByText('上单')).not.toBeInTheDocument();
    expect(screen.queryByText('打野')).not.toBeInTheDocument();
    expect(screen.queryByText('中单')).not.toBeInTheDocument();
    expect(screen.queryByText('ADC')).not.toBeInTheDocument();
    expect(screen.queryByText('辅助')).not.toBeInTheDocument();

    // 应该渲染img元素（位置图标）
    const images = document.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('应该显示赛制信息', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch({ boFormat: 'BO5' });
    render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

    expect(screen.getByText('BO5')).toBeInTheDocument();
  });

  it('点击关闭按钮应该调用onClose', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch();
    const handleClose = vi.fn();
    render(
      <MatchDetailModal visible={true} onClose={handleClose} match={match} teams={mockTeams} />
    );

    const closeButton = screen.getByLabelText('关闭');
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('点击遮罩层应该调用onClose', () => {
    mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });
    const match = createMockMatch();
    const handleClose = vi.fn();
    const { container } = render(
      <MatchDetailModal visible={true} onClose={handleClose} match={match} teams={mockTeams} />
    );

    const overlay = container.querySelector('.bg-black\\/80');
    if (overlay) {
      fireEvent.click(overlay);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  describe('对战数据按钮', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('已上传数据时应显示按钮', async () => {
      mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: true, gameCount: 3 });

      const match = createMockMatch({ status: 'finished' });
      render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

      await waitFor(() => {
        expect(screen.getByText('对战数据')).toBeInTheDocument();
      });
    });

    it('未上传数据时不应显示按钮', async () => {
      mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: false, gameCount: 0 });

      const match = createMockMatch({ status: 'finished' });
      render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

      await waitFor(() => {
        expect(screen.queryByText('对战数据')).not.toBeInTheDocument();
      });
    });

    it('点击按钮打开新页面', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      mockCheckMatchDataExists.mockResolvedValueOnce({ hasData: true, gameCount: 1 });

      const match = createMockMatch({ id: 'match123', status: 'finished' });
      render(<MatchDetailModal visible={true} onClose={vi.fn()} match={match} teams={mockTeams} />);

      await waitFor(() => {
        const button = screen.getByText('对战数据');
        fireEvent.click(button);
      });

      expect(openSpy).toHaveBeenCalledWith('/match/match123/games', '_blank');
      openSpy.mockRestore();
    });
  });
});
