import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, AlertCircle, Loader2, Download } from 'lucide-react';
import { Button } from '../ui/button';
import Modal from '../ui/Modal';
import { importMatchData, downloadMatchDataErrorReport } from '@/api/matchData';
import type { ImportMatchDataResponse } from '@/types/matchData';
import { toast } from 'sonner';
import { trackAdminImportStart, trackAdminImportSuccess } from '@/utils/tracking';

interface MatchDataImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: ImportMatchDataResponse) => void;
  matchId: string;
}

interface ImportErrorDetail {
  row: number;
  nickname: string;
  side: string;
  type: string;
  message: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['xlsx', 'xls'];

const MatchDataImportDialog: React.FC<MatchDataImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
  matchId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ImportErrorDetail[]>([]);
  const [preview, setPreview] = useState<ImportMatchDataResponse | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return '仅支持 .xlsx 或 .xls 格式的 Excel 文件';
    }
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小不能超过 10MB';
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setErrorDetails([]);
        return;
      }
      setFile(selectedFile);
      setPreview(null);
      setError(null);
      setErrorDetails([]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        setErrorDetails([]);
        return;
      }
      setFile(droppedFile);
      setPreview(null);
      setError(null);
      setErrorDetails([]);
    }
  }, []);

  const parseErrorDetails = (err: any): ImportErrorDetail[] => {
    // Try to extract error details from different response formats
    const details = err.details?.failedPlayers || err.failedPlayers || [];
    return details.map((d: any) => ({
      row: d.row || 0,
      nickname: d.nickname || '未知选手',
      side: d.side || 'unknown',
      type: d.type || 'parse_error',
      message: d.message || d.reason || '未知错误',
    }));
  };

  const handleImport = async () => {
    if (!file) return;

    // 跟踪导入开始事件
    trackAdminImportStart(matchId, file.name);

    setUploading(true);
    setError(null);
    setErrorDetails([]);
    const toastId = toast.loading('正在解析并导入比赛数据...');

    try {
      const result = await importMatchData(matchId, file);
      setPreview(result);

      // 检查是否为覆盖导入
      if (result.overwritten) {
        toast.warning(`数据已导入并覆盖第 ${result.gameNumber} 局的原有数据，请预览确认`, {
          id: toastId,
          duration: 5000,
        });
      } else if (result.failedCount && result.failedCount > 0) {
        const errors = parseErrorDetails(result);
        setErrorDetails(errors);
        toast.warning(`数据已导入，但 ${result.failedCount} 个选手匹配失败，请查看详情`, {
          id: toastId,
          duration: 5000,
        });
      } else {
        toast.success('数据导入成功，请预览确认', { id: toastId });
      }

      // 跟踪导入成功事件
      trackAdminImportSuccess(matchId, result.gameNumber, result.playerCount);
    } catch (err: any) {
      // Try to extract error details from the response
      const responseDetails = err.response?.data;
      let errorMessage = err.message || '导入失败，请重试';

      if (responseDetails) {
        const details = parseErrorDetails(responseDetails);
        if (details.length > 0) {
          setErrorDetails(details);
          errorMessage = responseDetails.message || `导入失败：${details.length} 个错误`;
        } else if (responseDetails.message) {
          errorMessage = responseDetails.message;
        }
      }

      setError(errorMessage);
      toast.error('数据导入失败', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadErrorReport = async () => {
    if (errorDetails.length === 0) return;

    setDownloadingReport(true);
    try {
      const blob = await downloadMatchDataErrorReport(errorDetails);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `对战数据导入错误报告_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('错误报告已下载');
    } catch {
      toast.error('下载错误报告失败');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onSuccess(preview);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setErrorDetails([]);
    setDragging(false);
    setPreview(null);
    onClose();
  };

  const hasErrors = errorDetails.length > 0;

  return (
    <Modal visible={open} onClose={handleClose} title="导入比赛数据" className="max-w-2xl">
      <div className="space-y-4">
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <p className="font-medium mb-1">导入说明</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-300/80">
                <li>支持 .xlsx 和 .xls 格式的 Excel 文件</li>
                <li>文件大小不超过 10MB</li>
                <li>导入后将覆盖该局的现有数据</li>
                <li>请确保 Excel 格式符合模板要求</li>
              </ul>
            </div>
          </div>
        </div>

        {!preview && !hasErrors && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-blue-400" />
                <div className="text-left">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setErrorDetails([]);
                  }}
                  className="p-1 hover:bg-white/10 rounded"
                  aria-label="移除文件"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-300 mb-2">
                  拖拽文件到此处，或
                  <label className="text-blue-400 hover:text-blue-300 cursor-pointer mx-1">
                    点击选择
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="text-gray-500 text-sm">支持 .xlsx/.xls 格式，大小不超过 10MB</p>
              </>
            )}
          </div>
        )}

        {preview && (
          <div
            className={`p-4 border rounded-lg ${
              preview.overwritten
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-green-500/10 border-green-500/20'
            }`}
          >
            <div className="flex items-start gap-3 mb-2">
              {preview.overwritten && (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <h4
                className={`font-medium ${
                  preview.overwritten ? 'text-amber-400' : 'text-green-400'
                }`}
              >
                {preview.overwritten ? '覆盖导入预览' : '导入预览'}
              </h4>
            </div>
            {preview.overwritten && (
              <p className="text-sm text-amber-300 mb-3 ml-8">
                检测到第 {preview.gameNumber} 局已有数据，本次导入已覆盖原有数据
              </p>
            )}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">导入局数:</span>
                <span className="text-white ml-2">第 {preview.gameNumber} 局</span>
              </div>
              <div>
                <span className="text-gray-400">选手数据:</span>
                <span className="text-white ml-2">{preview.playerCount} 条</span>
              </div>
              <div>
                <span className="text-gray-400">失败数:</span>
                <span
                  className={preview.failedCount ? 'text-yellow-400 ml-2' : 'text-green-400 ml-2'}
                >
                  {preview.failedCount || 0} 条
                </span>
              </div>
            </div>
          </div>
        )}

        {hasErrors && (
          <div className="border border-red-500/30 rounded-lg">
            <div className="p-4 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-medium">
                  导入失败：{errorDetails.length} 个错误
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadErrorReport}
                disabled={downloadingReport}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                {downloadingReport ? '下载中...' : '下载错误报告'}
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto p-4">
              <table className="w-full text-sm">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="text-left py-2 px-2">行号</th>
                    <th className="text-left py-2 px-2">选手昵称</th>
                    <th className="text-left py-2 px-2">阵营</th>
                    <th className="text-left py-2 px-2">错误类型</th>
                    <th className="text-left py-2 px-2">错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  {errorDetails.map((err, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-white/5">
                      <td className="py-2 px-2 text-gray-400">{err.row}</td>
                      <td className="py-2 px-2 text-white">{err.nickname}</td>
                      <td className="py-2 px-2">
                        <span className={err.side === 'red' ? 'text-red-400' : 'text-blue-400'}>
                          {err.side === 'red' ? '红方' : '蓝方'}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-yellow-400">
                          {err.type === 'player_not_found' && '选手未找到'}
                          {err.type === 'team_mismatch' && '战队不匹配'}
                          {err.type === 'data_validation' && '数据验证失败'}
                          {err.type === 'parse_error' && '解析错误'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-300">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && !hasErrors && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>
            取消
          </Button>
          {hasErrors ? (
            <Button
              onClick={handleClose}
              className="bg-gradient-to-r from-gray-600 to-gray-700 text-white"
            >
              关闭
            </Button>
          ) : preview ? (
            <Button
              onClick={handleConfirm}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white"
            >
              确认导入
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={!file || uploading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导入中...
                </>
              ) : (
                '开始导入'
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default MatchDataImportDialog;
