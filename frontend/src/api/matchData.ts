import apiClient, { get, post, put, del } from './axios';
import type { ApiResponse } from './types';
import type {
  MatchGameData,
  MatchSeriesInfo,
  MatchDataCheckResponse,
  ImportMatchDataResponse,
  UpdateMatchDataResponse,
  ImportOptions,
  MultiGameImportResponse,
} from '../types/matchData';

/**
 * 对战数据 API
 */

/**
 * 检查对战数据是否存在
 * @param matchId 比赛 ID
 * @returns 数据存在性检查结果
 */
export async function checkMatchDataExists(matchId: string): Promise<MatchDataCheckResponse> {
  const responseData = await get<ApiResponse<MatchDataCheckResponse>>(
    `/matches/${matchId}/games/check`
  );

  if (!responseData.success || !responseData.data) {
    throw new Error(responseData.message || '检查对战数据失败');
  }

  return responseData.data;
}

/**
 * 获取对战系列信息
 * @param matchId 比赛 ID
 * @returns 系列赛信息（含各局概要）
 */
export async function getMatchSeries(matchId: string): Promise<MatchSeriesInfo> {
  const responseData = await get<ApiResponse<MatchSeriesInfo>>(`/matches/${matchId}/series`);

  if (!responseData.success || !responseData.data) {
    throw new Error(responseData.message || '获取对战系列信息失败');
  }

  return responseData.data;
}

/**
 * 获取单局对战数据详情
 * @param matchId 比赛 ID
 * @param gameNumber 局数 (1-5)
 * @param silent 是否静默模式（不显示错误提示），默认 false
 * @returns 单局完整对战数据，如果该局未导入数据则返回 null
 */
export async function getMatchGameData(
  matchId: string,
  gameNumber: number,
  silent: boolean = false
): Promise<MatchGameData | null> {
  const responseData = await get<ApiResponse<MatchGameData>>(
    `/matches/${matchId}/games/${gameNumber}`,
    undefined,
    { showToast: !silent }
  );

  // 请求失败时抛出错误
  if (!responseData.success) {
    throw new Error(responseData.message || '获取对战数据失败');
  }

  // data 为 null 表示该局尚未导入数据，返回 null 而非抛错
  return responseData.data || null;
}

/**
 * 导入对战数据（Excel 文件，支持多 Sheet）
 * @param matchId 比赛 ID
 * @param file Excel 文件
 * @param options 导入选项（dryRun, confirmWarnings）
 * @returns 导入结果
 */
export async function importMatchData(
  matchId: string,
  file: File,
  options?: ImportOptions
): Promise<ImportMatchDataResponse | MultiGameImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  // 将导入选项追加到表单数据
  if (options?.dryRun) {
    formData.append('dryRun', 'true');
  }
  if (options?.confirmWarnings) {
    formData.append('confirmWarnings', 'true');
  }

  const responseData = await post<ApiResponse<ImportMatchDataResponse | MultiGameImportResponse>>(
    `/admin/matches/${matchId}/games/import`,
    formData
  );

  if (!responseData.success || !responseData.data) {
    throw new Error(responseData.message || '导入对战数据失败');
  }

  return responseData.data;
}

/**
 * 更新对战数据
 * @param matchId 比赛 ID
 * @param gameId 对战记录 ID
 * @param data 更新的对战数据
 * @returns 更新结果
 */
export async function updateMatchGameData(
  matchId: string,
  gameId: number,
  data: unknown
): Promise<UpdateMatchDataResponse> {
  const responseData = await put<ApiResponse<UpdateMatchDataResponse>>(
    `/admin/matches/${matchId}/games/${gameId}`,
    data
  );

  if (!responseData.success || !responseData.data) {
    throw new Error(responseData.message || '更新对战数据失败');
  }

  return responseData.data;
}

/**
 * 删除对战数据（整局）
 * @param matchId 比赛 ID
 * @param gameNumber 局数 (1-5)
 * @returns 删除结果
 */
export async function deleteMatchGameData(
  matchId: string,
  gameNumber: number
): Promise<{ deleted: boolean; gameNumber: number }> {
  const responseData = await del<ApiResponse<{ deleted: boolean; gameNumber: number }>>(
    `/admin/matches/${matchId}/games/${gameNumber}`
  );

  if (!responseData.success || !responseData.data) {
    throw new Error(responseData.message || '删除对战数据失败');
  }

  return responseData.data;
}

/**
 * 下载对战数据导入模板
 * @param matchId 比赛 ID
 * @returns 模板文件 Blob 和文件名
 */
export async function downloadMatchDataTemplate(
  matchId: string
): Promise<{ blob: Blob; fileName: string | null }> {
  const response = await apiClient.get<Blob>(`/admin/matches/${matchId}/import/template`, {
    responseType: 'blob',
  });

  // 从 Content-Disposition 响应头中提取文件名
  const contentDisposition = response.headers['content-disposition'];
  let fileName: string | null = null;
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (fileNameMatch && fileNameMatch[1]) {
      fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
    }
  }

  return { blob: response.data, fileName };
}

/**
 * 下载对战数据导入错误报告
 * @param errors 错误列表
 * @returns 错误报告文件 Blob
 */
export async function downloadMatchDataErrorReport(errors: any[]): Promise<Blob> {
  const response = await apiClient.post<Blob>(
    '/admin/matches/import/error-report',
    { errors },
    {
      responseType: 'blob',
    }
  );
  return response.data;
}

export default {
  checkMatchDataExists,
  getMatchSeries,
  getMatchGameData,
  importMatchData,
  updateMatchGameData,
  deleteMatchGameData,
  downloadMatchDataTemplate,
  downloadMatchDataErrorReport,
};
