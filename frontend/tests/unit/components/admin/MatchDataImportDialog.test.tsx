import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MatchDataImportDialog from '@/components/admin/MatchDataImportDialog';
import * as matchDataApi from '@/api/matchData';

// Mock API
vi.mock('@/api/matchData', async () => {
  const actual = await vi.importActual<typeof import('@/api/matchData')>('@/api/matchData');
  return {
    ...actual,
    importMatchData: vi.fn(),
    downloadMatchDataErrorReport: vi.fn(),
  };
});

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock tracking
vi.mock('@/utils/tracking', () => ({
  trackAdminImportStart: vi.fn(),
  trackAdminImportSuccess: vi.fn(),
}));

const mockMatchId = 'test-match-123';

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  matchId: mockMatchId,
};

/**
 * 创建有效的 Excel 文件用于测试
 */
const createValidFile = (name = 'match-data.xlsx') =>
  new File(['test content'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

/**
 * 模拟文件拖拽到上传区域
 */
const dropFile = (file: File) => {
  const dropZone = screen.getByText(/拖拽文件到此处/i).parentElement!;
  fireEvent.drop(dropZone, {
    dataTransfer: {
      files: [file],
      items: [],
      types: ['Files'],
    },
  });
};

describe('MatchDataImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    render(<MatchDataImportDialog {...defaultProps} open={false} />);
    expect(screen.queryByText(/导入比赛数据/i)).not.toBeInTheDocument();
  });

  it('renders dialog when open is true', () => {
    render(<MatchDataImportDialog {...defaultProps} />);
    expect(screen.getByText(/导入比赛数据/i)).toBeInTheDocument();
  });

  it('shows import instructions including template download hint', () => {
    render(<MatchDataImportDialog {...defaultProps} />);
    expect(screen.getByText(/如需模板，请在对战列表中点击对应对战的/i)).toBeInTheDocument();
  });

  it('shows file validation error for invalid file type', () => {
    render(<MatchDataImportDialog {...defaultProps} />);

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.drop(screen.getByText(/拖拽文件到此处/i).parentElement!, {
      dataTransfer: {
        files: [file],
        items: [],
        types: ['Files'],
      },
    });

    expect(screen.getByText(/仅支持 \.xlsx 或 \.xls 格式的 Excel 文件/i)).toBeInTheDocument();
  });

  it('shows file validation error for file size over 10MB', () => {
    render(<MatchDataImportDialog {...defaultProps} />);

    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    fireEvent.drop(screen.getByText(/拖拽文件到此处/i).parentElement!, {
      dataTransfer: {
        files: [largeFile],
        items: [],
        types: ['Files'],
      },
    });

    expect(screen.getByText(/文件大小不能超过 10MB/i)).toBeInTheDocument();
  });

  it('accepts valid xlsx file and shows file info', () => {
    render(<MatchDataImportDialog {...defaultProps} />);

    dropFile(createValidFile());

    expect(screen.getByText('match-data.xlsx')).toBeInTheDocument();
  });

  it('removes selected file when remove button is clicked', () => {
    render(<MatchDataImportDialog {...defaultProps} />);

    dropFile(createValidFile());

    const removeButton = screen.getByLabelText('移除文件');
    fireEvent.click(removeButton);

    expect(screen.getByText(/拖拽文件到此处/i)).toBeInTheDocument();
  });

  /**
   * 改造后的导入流程：先调用 dryRun=true 预检
   */
  it('calls importMatchData API with dryRun=true when upload button is clicked', async () => {
    const mockImportResult = {
      imported: true,
      totalGames: 1,
      results: [
        { gameNumber: 1, imported: true, playerCount: 10, failedCount: 0, overwritten: false },
      ],
    };

    vi.mocked(matchDataApi.importMatchData).mockResolvedValue(mockImportResult);

    render(<MatchDataImportDialog {...defaultProps} />);

    const validFile = createValidFile();
    dropFile(validFile);

    const uploadButton = screen.getByText(/开始导入/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      // 应该先调用 dryRun=true 预检
      expect(matchDataApi.importMatchData).toHaveBeenCalledWith(mockMatchId, validFile, {
        dryRun: true,
      });
    });
  });

  /**
   * 单局导入成功流程（通过多局格式返回单局结果）
   */
  it('calls onSuccess callback after successful import and confirm', async () => {
    const mockImportResult = {
      imported: true,
      totalGames: 1,
      results: [
        { gameNumber: 1, imported: true, playerCount: 10, failedCount: 0, overwritten: false },
      ],
    };

    vi.mocked(matchDataApi.importMatchData).mockResolvedValue(mockImportResult);

    const onSuccess = vi.fn();
    render(<MatchDataImportDialog {...defaultProps} onSuccess={onSuccess} />);

    dropFile(createValidFile());

    const uploadButton = screen.getByText(/开始导入/i);
    fireEvent.click(uploadButton);

    // 多局导入结果展示后，点击完成按钮
    await waitFor(() => {
      expect(screen.getByText(/导入结果/i)).toBeInTheDocument();
      expect(screen.getByText(/第 1 局/i)).toBeInTheDocument();
    });

    const finishButton = screen.getByText(/完成/i);
    fireEvent.click(finishButton);

    await waitFor(() => {
      // onSuccess 会被调用，但参数是构造的 ImportMatchDataResponse 格式
      expect(onSuccess).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          imported: true,
          gameNumber: 1,
          playerCount: 10,
        })
      );
    });
  });

  /**
   * 多局导入成功展示
   */
  it('displays multi-game import results when API returns MultiGameImportResponse', async () => {
    const mockMultiGameResult = {
      imported: true,
      totalGames: 3,
      results: [
        { gameNumber: 1, imported: true, playerCount: 10, failedCount: 0, overwritten: false },
        { gameNumber: 2, imported: true, playerCount: 10, failedCount: 0, overwritten: true },
        { gameNumber: 3, imported: true, playerCount: 10, failedCount: 0, overwritten: false },
      ],
    };

    vi.mocked(matchDataApi.importMatchData).mockResolvedValue(mockMultiGameResult);

    render(<MatchDataImportDialog {...defaultProps} />);

    dropFile(createValidFile());

    const uploadButton = screen.getByText(/开始导入/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/导入结果/i)).toBeInTheDocument();
      expect(screen.getByText(/第 1 局/i)).toBeInTheDocument();
      expect(screen.getByText(/第 2 局/i)).toBeInTheDocument();
      expect(screen.getByText(/第 3 局/i)).toBeInTheDocument();
      // 使用 getAllByText 因为多个局都有 "10 名选手数据"
      expect(screen.getAllByText(/10 名选手数据/).length).toBe(3);
      expect(screen.getByText(/覆盖已有数据/)).toBeInTheDocument();
    });
  });

  /**
   * 多局导入失败展示
   */
  it('displays failed game info in multi-game import results', async () => {
    const mockMultiGameResult = {
      imported: false,
      totalGames: 2,
      results: [
        { gameNumber: 1, imported: true, playerCount: 10, failedCount: 0, overwritten: false },
        {
          gameNumber: 2,
          imported: false,
          playerCount: 0,
          failedCount: 1,
          overwritten: false,
          failedPlayers: [
            {
              row: 5,
              nickname: '测试选手',
              side: 'red',
              type: 'parse_error' as const,
              message: '选手数据不完整',
            },
          ],
        },
      ],
    };

    vi.mocked(matchDataApi.importMatchData).mockResolvedValue(mockMultiGameResult);

    render(<MatchDataImportDialog {...defaultProps} />);

    dropFile(createValidFile());

    const uploadButton = screen.getByText(/开始导入/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/导入结果/i)).toBeInTheDocument();
      expect(screen.getByText(/导入失败：选手数据不完整/i)).toBeInTheDocument();
    });
  });

  /**
   * dryRun 预检发现告警，显示确认对话框
   */
  it('shows warning dialog when dryRun returns warnings', async () => {
    const mockDryRunResult = {
      imported: false,
      totalGames: 2,
      results: [],
      warnings: [
        {
          sheetName: '第一局',
          sheetGameNumber: 1,
          excelGameNumber: 2,
          resolvedGameNumber: 1,
          message: 'Sheet名称解析的局数为1，但表格中填写的局数为2，将以Sheet名称的局数1为准',
        },
      ],
    };

    vi.mocked(matchDataApi.importMatchData).mockResolvedValue(mockDryRunResult as any);

    render(<MatchDataImportDialog {...defaultProps} />);

    dropFile(createValidFile());

    const uploadButton = screen.getByText(/开始导入/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      // 在 ConfirmDialog 的 alertdialog 中查找标题
      const alertDialog = document.querySelector('[role="alertdialog"]');
      expect(alertDialog).toBeTruthy();
      expect(screen.getByText(/局数不一致告警/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Sheet名称解析的局数为1，但表格中填写的局数为2/i)
      ).toBeInTheDocument();
      // 在 alertdialog 中查找继续导入按钮
      const confirmButton = alertDialog!.querySelector('button:last-child');
      expect(confirmButton).toBeTruthy();
    });
  });

  /**
   * 用户确认告警后，调用 confirmWarnings=true 正式导入
   */
  it('calls importMatchData with confirmWarnings=true when user confirms warnings', async () => {
    const mockDryRunResult = {
      imported: false,
      totalGames: 2,
      results: [],
      warnings: [
        {
          sheetName: '第一局',
          sheetGameNumber: 1,
          excelGameNumber: 2,
          resolvedGameNumber: 1,
          message: 'Sheet名称解析的局数为1，但表格中填写的局数为2，将以Sheet名称的局数1为准',
        },
      ],
    };

    const mockFinalResult = {
      imported: true,
      totalGames: 2,
      results: [
        { gameNumber: 1, imported: true, playerCount: 10, failedCount: 0, overwritten: false },
        { gameNumber: 2, imported: true, playerCount: 10, failedCount: 0, overwritten: false },
      ],
    };

    vi.mocked(matchDataApi.importMatchData)
      .mockResolvedValueOnce(mockDryRunResult)
      .mockResolvedValueOnce(mockFinalResult);

    render(<MatchDataImportDialog {...defaultProps} />);

    const validFile = createValidFile();
    dropFile(validFile);

    const uploadButton = screen.getByText(/开始导入/i);
    fireEvent.click(uploadButton);

    // 等待告警对话框出现
    await waitFor(() => {
      expect(screen.getByText(/局数不一致告警/i)).toBeInTheDocument();
    });

    // 点击继续导入（在 alertdialog 中）
    const alertDialog = document.querySelector('[role="alertdialog"]');
    expect(alertDialog).toBeTruthy();
    const confirmButton = alertDialog!.querySelector('button:last-child');
    expect(confirmButton).toBeTruthy();
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(matchDataApi.importMatchData).toHaveBeenCalledTimes(2);
      expect(matchDataApi.importMatchData).toHaveBeenLastCalledWith(mockMatchId, validFile, {
        confirmWarnings: true,
      });
    });
  });

  /**
   * 用户取消告警后，清除文件状态
   */
  it('clears file state when user cancels warning dialog', async () => {
    const mockDryRunResult = {
      imported: false,
      totalGames: 2,
      results: [],
      warnings: [
        {
          sheetName: '第一局',
          sheetGameNumber: 1,
          excelGameNumber: 2,
          resolvedGameNumber: 1,
          message: 'Sheet名称解析的局数为1，但表格中填写的局数为2，将以Sheet名称的局数1为准',
        },
      ],
    };

    vi.mocked(matchDataApi.importMatchData).mockResolvedValue(mockDryRunResult);

    render(<MatchDataImportDialog {...defaultProps} />);

    dropFile(createValidFile());

    const uploadButton = screen.getByText(/开始导入/i);
    fireEvent.click(uploadButton);

    // 等待告警对话框出现
    await waitFor(() => {
      expect(screen.getByText(/局数不一致告警/i)).toBeInTheDocument();
    });

    // 点击取消（告警对话框中的取消按钮）
    const alertDialog = document.querySelector('[role="alertdialog"]');
    expect(alertDialog).toBeTruthy();
    const cancelButton = alertDialog!.querySelector('button:first-child');
    expect(cancelButton).toBeTruthy();
    fireEvent.click(cancelButton!);

    // 文件应该被清除，回到上传区域
    await waitFor(() => {
      expect(screen.getByText(/拖拽文件到此处/i)).toBeInTheDocument();
    });
  });

  it('shows error message when import fails', async () => {
    vi.mocked(matchDataApi.importMatchData).mockRejectedValue(new Error('导入失败'));

    render(<MatchDataImportDialog {...defaultProps} />);

    dropFile(createValidFile());

    const uploadButton = screen.getByText(/开始导入/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('导入失败')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<MatchDataImportDialog {...defaultProps} />);

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('handles drag over and drag leave events', () => {
    render(<MatchDataImportDialog {...defaultProps} />);

    const dropZone = screen.getByText(/拖拽文件到此处/i).parentElement!;

    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('border-blue-500');

    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveClass('border-gray-600');
  });
});
