import React from 'react';
import type { GameSummary } from '@/types/matchData';

interface GameSwitcherProps {
  games: GameSummary[];
  currentGame: number;
  onChange: (gameNumber: number) => void;
  format?: string;
}

/**
 * 对局切换器组件
 * 参考LPL官方页面设计，与TeamStatsBar视觉上连在一起
 * BO1: 显示"第一场"标签（不可切换）
 * BO3/BO5: 显示"第一场"、"第二场"等，支持点击切换
 */
const GameSwitcher: React.FC<GameSwitcherProps> = ({
  games,
  currentGame,
  onChange,
  format = 'BO3',
}) => {
  // 获取要显示的场次列表
  const getDisplayGames = (): GameSummary[] => {
    // 对于BO1，只显示第一场
    if (format === 'BO1') {
      return games.filter(g => g.gameNumber === 1);
    }
    // 对于BO3/BO5，显示所有场次
    return games;
  };

  const displayGames = getDisplayGames();
  const isBO1 = format === 'BO1';

  // BO1不显示切换器（或只显示不可点击的标签）
  if (isBO1) {
    return (
      <div className="bg-[#181818] border-b-0 max-w-5xl mx-auto mt-4 rounded-t-xl overflow-hidden">
        <div className="flex">
          <div className="relative px-8 py-3 text-base font-medium text-[#c49f58] bg-[#2d2d2d]">
            <span className="absolute top-0 left-0 right-0 h-[2px] bg-[#c49f58]" />
            第一场
          </div>
        </div>
      </div>
    );
  }

  // 多局比赛显示可切换的tab
  return (
    <div className="bg-[#181818] border-b-0 max-w-5xl mx-auto mt-4 rounded-t-xl overflow-hidden">
      <div className="flex">
        {displayGames.map(game => {
          const isActive = game.gameNumber === currentGame;
          const isDisabled = !game.hasData;
          // 中文数字映射
          const chineseNumbers = ['一', '二', '三', '四', '五'];
          const gameLabel = `第${chineseNumbers[game.gameNumber - 1] || game.gameNumber}场`;

          return (
            <button
              key={game.gameNumber}
              onClick={() => !isDisabled && onChange(game.gameNumber)}
              disabled={isDisabled}
              className={`
                relative px-8 py-3 text-base font-medium transition-all duration-200
                ${
                  isActive
                    ? 'text-[#c49f58] bg-[#2d2d2d]'
                    : 'text-gray-400 hover:text-white hover:bg-[#2d2d2d]/50'
                }
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* 顶部高亮条 */}
              <span
                className={`
                  absolute top-0 left-0 right-0 h-[2px] transition-all duration-200
                  ${isActive ? 'bg-[#c49f58]' : 'bg-transparent'}
                `}
              />
              {gameLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GameSwitcher;
