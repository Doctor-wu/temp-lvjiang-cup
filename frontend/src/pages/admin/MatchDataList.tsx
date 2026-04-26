import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { matchService } from '@/services/matchService';
import { teamService } from '@/services/teamService';
import type { Match } from '@/types';
import type { Team } from '@/api/types';
import { Trophy, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { checkMatchDataExists, downloadMatchDataTemplate } from '@/api/matchData';
import MatchDataImportDialog from '@/components/admin/MatchDataImportDialog';
import { adminPath } from '@/constants/routes';

interface MatchWithTeams extends Match {
  teamAName?: string;
  teamBName?: string;
  hasMatchData?: boolean;
  checkingMatchData?: boolean;
}

const MatchDataList: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  // 管理每行下载模板按钮的 loading 状态，存储当前正在下载的比赛 ID
  const [downloadingMatchId, setDownloadingMatchId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [backendMatches, teamsResult] = await Promise.all([
        matchService.getAll(),
        teamService.getAll(),
      ]);

      const teamsMap: Record<string, Team> = {};
      teamsResult.forEach(t => {
        teamsMap[t.id] = t;
      });

      const mappedMatches: MatchWithTeams[] = backendMatches.map(m => ({
        id: m.id,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        teamAName: teamsMap[m.teamAId]?.name || m.teamAId,
        teamBName: teamsMap[m.teamBId]?.name || m.teamBId,
        scoreA: m.scoreA || 0,
        scoreB: m.scoreB || 0,
        winnerId: m.winnerId || null,
        round: m.round,
        status: m.status,
        startTime: m.startTime || '',
        stage: m.stage as 'swiss' | 'elimination',
        swissRecord: m.swissRecord,
        swissRound: m.swissRound,
        boFormat: m.boFormat,
        eliminationBracket: m.eliminationBracket,
        hasMatchData: false,
        checkingMatchData: true,
      }));

      const finishedMatches = mappedMatches.filter(m => m.status === 'finished');

      setMatches(finishedMatches);

      finishedMatches.forEach(async match => {
        try {
          const result = await checkMatchDataExists(match.id);
          setMatches(prev =>
            prev.map(m =>
              m.id === match.id
                ? { ...m, hasMatchData: result.hasData, checkingMatchData: false }
                : m
            )
          );
        } catch {
          setMatches(prev =>
            prev.map(m =>
              m.id === match.id ? { ...m, hasMatchData: false, checkingMatchData: false } : m
            )
          );
        }
      });
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(match => {
    const searchLower = searchTerm.toLowerCase();
    return (
      match.teamAName?.toLowerCase().includes(searchLower) ||
      false ||
      match.teamBName?.toLowerCase().includes(searchLower) ||
      false ||
      match.id.toLowerCase().includes(searchLower)
    );
  });

  const getBoFormatBadge = (boFormat: string) => {
    const boMap: Record<string, string> = {
      BO1: 'BO1',
      BO3: 'BO3',
      BO5: 'BO5',
    };
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-secondary/20 text-secondary">
        {boMap[boFormat] || boFormat}
      </span>
    );
  };

  const handleManageMatchData = (matchId: string) => {
    navigate(adminPath(`matches/${matchId}/games`));
  };

  /**
   * 处理下载对战数据导入模板
   * @param matchId 比赛 ID
   */
  const handleDownloadTemplate = async (matchId: string) => {
    // 检查比赛是否已结束
    const match = matches.find(m => m.id === matchId);
    if (!match) {
      toast.error('未找到对战记录');
      return;
    }
    if (match.status !== 'finished') {
      toast.error('对战未结束，无法下载模板');
      return;
    }
    // 检查比分是否有效（避免 0:0 等无效比分）
    if (match.scoreA === undefined || match.scoreB === undefined) {
      toast.error('比分无效，无法下载模板');
      return;
    }

    setDownloadingMatchId(matchId);
    try {
      const result = await downloadMatchDataTemplate(matchId);
      const blob = result.blob;

      // 尝试从响应头获取文件名
      let fileName = result.fileName;
      if (!fileName) {
        // 如果无法从响应头获取，使用默认命名规则构造文件名
        const teamA = match.teamAName || '未知';
        const teamB = match.teamBName || '未知';
        const boFormat = match.boFormat || 'BO3';
        fileName = `驴酱杯对战信息_${teamA}_vs_${teamB}_${boFormat}.xlsx`;
      }

      // 创建临时链接触发下载
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('模板下载成功');
    } catch (error: unknown) {
      console.error('模板下载失败:', error);
      // 根据错误信息给出更精确的提示
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || '模板下载失败';
      toast.error(message);
    } finally {
      setDownloadingMatchId(null);
    }
  };

  const handleImportClick = (matchId: string) => {
    setCurrentMatchId(matchId);
    setImportDialogOpen(true);
  };

  const handleImportSuccess = async () => {
    toast.success('数据导入成功');
    setImportDialogOpen(false);

    const importedMatchId = currentMatchId;
    setCurrentMatchId(null);

    if (importedMatchId) {
      setMatches(prev =>
        prev.map(m =>
          m.id === importedMatchId ? { ...m, checkingMatchData: true } : m
        )
      );

      try {
        const result = await checkMatchDataExists(importedMatchId);
        setMatches(prev =>
          prev.map(m =>
            m.id === importedMatchId
              ? { ...m, hasMatchData: result.hasData, checkingMatchData: false }
              : m
          )
        );
      } catch {
        setMatches(prev =>
          prev.map(m =>
            m.id === importedMatchId ? { ...m, hasMatchData: false, checkingMatchData: false } : m
          )
        );
      }
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">加载中...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">对战数据管理</h1>
            <p className="text-gray-400 mt-1">仅显示已结束的对战记录</p>
          </div>
        </div>

        {/* 搜索栏：仅保留搜索输入框，移除下载模板按钮 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索战队名称..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 w-full max-w-md"
          />
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">比赛</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">赛制</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">比赛时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">比分</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    暂无已结束的比赛数据
                  </td>
                </tr>
              ) : (
                filteredMatches.map(match => (
                  <tr key={match.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-secondary" />
                        <div>
                          <div className="font-medium text-white">
                            {match.teamAName} vs {match.teamBName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getBoFormatBadge(match.boFormat)}</td>
                    <td className="px-4 py-4">
                      <span className="text-gray-400 text-sm">
                        {match.startTime ? new Date(match.startTime).toLocaleString('zh-CN') : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-white font-medium">
                        {match.scoreA} - {match.scoreB}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!match.checkingMatchData && match.hasMatchData && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-secondary text-secondary hover:bg-secondary/20"
                            onClick={() => handleManageMatchData(match.id)}
                          >
                            管理数据
                          </Button>
                        )}
                        {/* 下载模板按钮：位于管理数据之后，样式与导入数据一致 */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
                          onClick={() => handleDownloadTemplate(match.id)}
                          disabled={downloadingMatchId === match.id}
                        >
                          <Download
                            className={`w-4 h-4 mr-1 ${downloadingMatchId === match.id ? 'animate-spin' : ''}`}
                          />
                          {downloadingMatchId === match.id ? '下载中...' : '下载模板'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
                          onClick={() => handleImportClick(match.id)}
                        >
                          导入数据
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {currentMatchId && (
        <MatchDataImportDialog
          open={importDialogOpen}
          onClose={() => {
            setImportDialogOpen(false);
            setCurrentMatchId(null);
          }}
          onSuccess={handleImportSuccess}
          matchId={currentMatchId}
        />
      )}
    </AdminLayout>
  );
};

export default MatchDataList;
