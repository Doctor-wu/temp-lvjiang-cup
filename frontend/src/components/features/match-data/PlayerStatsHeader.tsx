import React from 'react';

/**
 * 选手数据统计列表表头组件
 * 参考官方UI设计，显示各列标题
 * 列宽与PlayerStatsRow完全对应，确保对齐
 */
const PlayerStatsHeader: React.FC = () => {
  return (
    <div className="bg-[#3c3c3c] py-3 px-4 border-b border-white/10">
      <div className="flex items-center justify-between">
        {/* 左侧：红色方表头 - 列宽与数据行完全一致 */}
        <div className="flex items-center gap-2" style={{ width: 532 }}>
          {/* 选手 */}
          <div className="w-[100px] text-center">
            <span className="text-sm font-bold text-gray-300">选手</span>
          </div>

          {/* 英雄 */}
          <div className="w-[100px] text-center">
            <span className="text-sm font-bold text-gray-300">英雄</span>
          </div>

          {/* KDA */}
          <div className="w-[100px] text-center">
            <span className="text-sm font-bold text-gray-300">KDA</span>
          </div>

          {/* 金币 */}
          <div className="w-[60px] text-center">
            <span className="text-sm font-bold text-gray-300">金币</span>
          </div>

          {/* 补刀 */}
          <div className="w-[50px] text-center">
            <span className="text-sm font-bold text-gray-300">补刀</span>
          </div>
        </div>

        {/* 中间：位置 */}
        <div className="flex items-center justify-center" style={{ width: 64 }}>
          <span className="text-sm font-bold text-gray-300">位置</span>
        </div>

        {/* 右侧：蓝色方表头 - 列宽与数据行完全一致 */}
        <div className="flex items-center gap-2 justify-end" style={{ width: 532 }}>
          {/* 补刀 */}
          <div className="w-[50px] text-center">
            <span className="text-sm font-bold text-gray-300">补刀</span>
          </div>

          {/* 金币 */}
          <div className="w-[60px] text-center">
            <span className="text-sm font-bold text-gray-300">金币</span>
          </div>

          {/* KDA */}
          <div className="w-[100px] text-center">
            <span className="text-sm font-bold text-gray-300">KDA</span>
          </div>

          {/* 英雄 */}
          <div className="w-[100px] text-center">
            <span className="text-sm font-bold text-gray-300">英雄</span>
          </div>

          {/* 选手 */}
          <div className="w-[100px] text-center">
            <span className="text-sm font-bold text-gray-300">选手</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsHeader;
