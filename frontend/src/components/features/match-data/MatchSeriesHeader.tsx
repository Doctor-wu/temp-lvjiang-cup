import React from 'react';
import type { MatchSeriesInfo, MatchGameData } from '@/types/matchData';
import { getUploadUrl } from '@/utils/upload';
import { Play } from 'lucide-react';

interface MatchSeriesHeaderProps {
  seriesInfo: MatchSeriesInfo | null;
  gameData: MatchGameData | null;
}

/**
 * 计算系列赛总比分
 * @param seriesInfo 系列赛信息
 * @param currentGameData 当前对局数据
 * @returns [红色方胜场, 蓝色方胜场]
 */
const calculateSeriesScore = (
  seriesInfo: MatchSeriesInfo | null,
  currentGameData: MatchGameData | null
): [number, number] => {
  if (!seriesInfo || !currentGameData) return [0, 0];

  let redWins = 0;
  let blueWins = 0;

  // 统计已完成对局的胜负
  seriesInfo.games.forEach(game => {
    if (game.winnerTeamId && game.hasData) {
      if (game.winnerTeamId === currentGameData.redTeam.teamId) {
        redWins++;
      } else if (game.winnerTeamId === currentGameData.blueTeam.teamId) {
        blueWins++;
      }
    }
  });

  return [redWins, blueWins];
};

/**
 * 格式化比赛日期时间
 * @param isoTime ISO格式时间字符串
 * @returns 格式化后的字符串 (MM-DD HH:mm)
 */
const formatMatchDateTime = (isoTime: string | null): { date: string; time: string } => {
  if (!isoTime) return { date: '待定', time: '' };

  const date = new Date(isoTime);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return {
    date: `${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
};

/**
 * 获取比赛状态文本
 * @param gameData 对局数据
 * @returns 状态文本
 */
const getMatchStatus = (gameData: MatchGameData | null): string => {
  if (!gameData) return '未开始';
  if (gameData.winnerTeamId) return '已结束';
  if (gameData.gameStartTime) return '进行中';
  return '未开始';
};

/**
 * 系列赛头部组件
 * 展示双方队伍Logo、总比分、比赛日期和状态
 */
const MatchSeriesHeader: React.FC<MatchSeriesHeaderProps> = ({ seriesInfo, gameData }) => {
  const [redScore, blueScore] = calculateSeriesScore(seriesInfo, gameData);
  const { date, time } = formatMatchDateTime(gameData?.gameStartTime || null);
  const status = getMatchStatus(gameData);
  const isFinished = status === '已结束';

  const redTeam = gameData?.redTeam;
  const blueTeam = gameData?.blueTeam;

  if (!redTeam || !blueTeam) {
    return (
      <div className="bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-xl p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-center text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-xl p-8 max-w-5xl mx-auto">
      {/* 主内容区域 - 参考LPL官方布局：三栏布局，中间比分区域占主导 */}
      <div className="flex items-center justify-between px-12">
        {/* 左侧：红色方 - 固定宽度，与中间保持适当间距 */}
        <div className="flex flex-col items-center gap-4 w-[160px]">
          {/* 移除圆框裁剪，使用方形 */}
          <div className="w-24 h-24 bg-[#1a1a2e] flex items-center justify-center overflow-hidden">
            <img
              src={
                getUploadUrl(redTeam.logoUrl) ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${redTeam.teamId}`
              }
              alt={redTeam.teamName}
              className="w-full h-full object-contain"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="hidden text-3xl font-bold text-[#f44336]">
              {redTeam.teamName.charAt(0)}
            </span>
          </div>
          <span className="text-2xl font-bold text-white">{redTeam.teamName}</span>
        </div>

        {/* 中间：比分和比赛信息 - 添加背景色卡片，占据主要空间 */}
        <div className="flex flex-col items-center gap-4 bg-[#2a2a3e] rounded-xl px-16 py-6 min-w-[320px]">
          {/* 总比分 - 放大字体 */}
          <div className="flex items-center gap-8">
            <span className="text-8xl font-bold text-white font-mono">{redScore}</span>
            <span className="text-5xl text-gray-500 font-light">:</span>
            <span className="text-8xl font-bold text-[#0febc1] font-mono">{blueScore}</span>
          </div>

          {/* 日期和状态 */}
          <div className="flex items-center gap-4">
            <span className="text-lg text-gray-400">{date}</span>
            <span className="text-lg text-[#c49f58]">{time}</span>
          </div>
          <span
            className={`text-base px-4 py-1.5 rounded-full ${
              isFinished ? 'bg-gray-700 text-gray-300' : 'bg-[#c49f58]/20 text-[#c49f58]'
            }`}
          >
            {status}
          </span>

          {/* 视频回顾按钮 */}
          {isFinished && (
            <button
              className="flex items-center gap-2 px-8 py-3 bg-[#c49f58] hover:bg-[#b08d4a] text-[#1a1a2e] font-bold rounded-lg transition-all duration-200 mt-2 group"
              onClick={() => {
                // TODO: 实现视频回顾功能
              }}
            >
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              视频回顾
            </button>
          )}
        </div>

        {/* 右侧：蓝色方 - 固定宽度，与中间保持适当间距 */}
        <div className="flex flex-col items-center gap-4 w-[160px]">
          {/* 移除圆框裁剪，使用方形 */}
          <div className="w-24 h-24 bg-[#1a1a2e] flex items-center justify-center overflow-hidden">
            <img
              src={
                getUploadUrl(blueTeam.logoUrl) ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${blueTeam.teamId}`
              }
              alt={blueTeam.teamName}
              className="w-full h-full object-contain"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="hidden text-3xl font-bold text-[#00bcd4]">
              {blueTeam.teamName.charAt(0)}
            </span>
          </div>
          <span className="text-2xl font-bold text-white">{blueTeam.teamName}</span>
        </div>
      </div>
    </div>
  );
};

export default MatchSeriesHeader;
