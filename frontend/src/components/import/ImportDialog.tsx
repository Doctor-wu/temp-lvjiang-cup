import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import Modal from '../ui/Modal';
import { importTeams, type ImportResult } from '@/api/teams-import';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: ImportResult) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx') {
      return '仅支持 .xlsx 格式的 Excel 文件';
    }
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小不能超过 5MB';
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(selectedFile);
      setError(null);
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
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  }, []);

  const handleImport = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const result = await importTeams(file);
      onSuccess(result);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setDragging(false);
    onClose();
  };

  return (
    <Modal visible={open} onClose={handleClose} title="批量导入战队">
      <div className="space-y-4">
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <p className="font-medium mb-1">导入说明</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-300/80">
                <li>覆盖模式：同名战队将整体覆盖，保留原ID</li>
                <li>外链URL（队标、头像）需手动上传到图床</li>
                <li>导入后战队总数不超过16支</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-200">
              <p className="font-medium mb-1">⚠️ 重要警告</p>
              <p className="text-red-300/80">
                重新导入战队数据会导致队员ID重新生成，已导入的对战数据中的选手统计信息将无法关联显示。
                重新导入战队数据后，需要重新导入被覆盖战队的对战数据，否则将显示异常。
              </p>
            </div>
          </div>
        </div>

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
              <button onClick={() => setFile(null)} className="p-1 hover:bg-white/10 rounded">
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
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-gray-500 text-sm">支持 .xlsx 格式，大小不超过 5MB</p>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || uploading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
          >
            {uploading ? '导入中...' : '开始导入'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
