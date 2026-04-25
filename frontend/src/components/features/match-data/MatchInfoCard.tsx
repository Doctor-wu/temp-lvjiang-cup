import React from 'react';
import type { MatchGameData } from '@/types/matchData';
import { getUploadUrl } from '@/utils/upload';

interface MatchInfoCardProps {
  gameData: MatchGameData;
}

/**
 * 格式化比赛开始时间
 * @param isoTime ISO格式时间字符串
 * @returns 格式化后的字符串 (MM-DD HH:mm)
 */
const formatGameStartTime = (isoTime: string | null): string => {
  if (!isoTime) return '待定';
  const date = new Date(isoTime);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

/**
 * 获取赛制格式文本
 * @param gameNumber 当前局数
 * @returns 格式化文本 (如 "BO3 · 第 1 局")
 */
const getSeriesFormat = (gameNumber: number): string => {
  return `第 ${gameNumber} 局`;
};

/**
 * 对局信息卡片组件
 * 展示单局对局的基本信息：双方队伍、游戏时长、比赛时间等
 */
const MatchInfoCard: React.FC<MatchInfoCardProps> = ({ gameData }) => {
  const { blueTeam, redTeam, gameNumber, gameStartTime, winnerTeamId, videoBvid } = gameData;

  const isBlueWinner = winnerTeamId !== null && winnerTeamId === blueTeam.teamId;
  const isRedWinner = winnerTeamId !== null && winnerTeamId === redTeam.teamId;

  // 构建B站视频链接
  const bilibiliUrl = videoBvid ? `https://www.bilibili.com/video/${videoBvid}` : null;

  return (
    <div className="bg-[rgba(255,255,255,0.03)] border border-white/5 rounded-xl p-6 max-w-5xl mx-auto mt-4">
      <div className="flex items-center justify-between">
        {/* 左侧：红色方 */}
        <div className="flex flex-col items-center gap-3 min-w-[100px]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#f44336] bg-[#1a1a2e] flex items-center justify-center overflow-hidden">
              <img
                src={
                  getUploadUrl(redTeam.logoUrl) ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${redTeam.teamId}`
                }
                alt={redTeam.teamName}
                className="w-full h-full object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-xl font-bold text-[#f44336]">
                {redTeam.teamName.charAt(0)}
              </span>
            </div>
            {/* 胜利标识 */}
            {isRedWinner && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0febc1] rounded-full flex items-center justify-center shadow-lg">
                <span className="text-[#1a1a2e] text-xs font-bold">★</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold text-white">{redTeam.teamName}</span>
            <span className="text-xs text-[#f44336] bg-[#f44336]/20 px-2 py-0.5 rounded-full">
              红色方
            </span>
            {isRedWinner && <span className="text-[#0febc1] text-sm font-bold mt-1">胜利</span>}
          </div>
        </div>

        {/* 中间：对局信息 */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-[#c49f58] font-bold tracking-wider">
            {getSeriesFormat(gameNumber)}
          </span>
          <span className="text-xs text-gray-500">{formatGameStartTime(gameStartTime)}</span>
          {/* 新增视频链接 */}
          {bilibiliUrl && (
            <a
              href={bilibiliUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00bcd4] hover:text-[#00bcd4]/80 transition-colors"
            >
              📺 观看视频
            </a>
          )}
        </div>

        {/* 右侧：蓝色方 */}
        <div className="flex flex-col items-center gap-3 min-w-[100px]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#00bcd4] bg-[#1a1a2e] flex items-center justify-center overflow-hidden">
              <img
                src={
                  getUploadUrl(blueTeam.logoUrl) ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${blueTeam.teamId}`
                }
                alt={blueTeam.teamName}
                className="w-full h-full object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-xl font-bold text-[#00bcd4]">
                {blueTeam.teamName.charAt(0)}
              </span>
            </div>
            {/* 胜利标识 */}
            {isBlueWinner && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0febc1] rounded-full flex items-center justify-center shadow-lg">
                <span className="text-[#1a1a2e] text-xs font-bold">★</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold text-white">{blueTeam.teamName}</span>
            <span className="text-xs text-[#00bcd4] bg-[#00bcd4]/20 px-2 py-0.5 rounded-full">
              蓝色方
            </span>
            {isBlueWinner && <span className="text-[#0febc1] text-sm font-bold mt-1">胜利</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchInfoCard;
