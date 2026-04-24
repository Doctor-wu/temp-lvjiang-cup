import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts/core';
import { RadarChart as EChartsRadar } from 'echarts/charts';
import { TooltipComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsType } from 'echarts/core';
import { motion, AnimatePresence } from 'framer-motion';

import type { PlayerStat, TeamGameData, RadarDimension } from '@/types/matchData';
import type { PositionType } from '@/types/position';
import {
  normalizeRadarValue,
  calculateRadarDimension,
  getRadarDimensionConfig,
  formatDimensionValue,
  getDimensionUnit,
} from '@/utils/radarCalculations';

echarts.use([EChartsRadar, TooltipComponent, GridComponent, CanvasRenderer]);

const COLORS = {
  redTeam: '#f44336',
  redTeamFill: 'rgba(244, 67, 54, 0.3)',
  blueTeam: '#00bcd4',
  blueTeamFill: 'rgba(0, 188, 212, 0.3)',
  gridLines: 'rgba(255, 255, 255, 0.1)',
  axisLines: 'rgba(255, 255, 255, 0.15)',
  labels: '#b0b0b0',
} as const;

interface RadarChartProps {
  player1: PlayerStat;
  player2: PlayerStat;
  gameDuration: string;
  redTeamStats: TeamGameData;
  blueTeamStats: TeamGameData;
  visible: boolean;
}

interface NormalizedPlayerData {
  name: string;
  teamName: string;
  side: 'red' | 'blue';
  values: number[];
  rawValues: number[];
}

interface TooltipPosition {
  x: number;
  y: number;
}

const RadarChartInner: React.FC<RadarChartProps> = ({
  player1,
  player2,
  gameDuration,
  redTeamStats,
  blueTeamStats,
  visible,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<EChartsType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<RadarDimension[]>([]);
  const [normalizedData, setNormalizedData] = useState<NormalizedPlayerData[]>([]);
  const [hoveredDimensionIndex, setHoveredDimensionIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ x: 0, y: 0 });

  const getPlayerSide = useCallback(
    (player: PlayerStat): 'red' | 'blue' => {
      return player.teamId === redTeamStats.teamId ? 'red' : 'blue';
    },
    [redTeamStats.teamId]
  );

  const getTeamStats = useCallback(
    (player: PlayerStat): TeamGameData => {
      return player.teamId === redTeamStats.teamId ? redTeamStats : blueTeamStats;
    },
    [redTeamStats, blueTeamStats]
  );

  useEffect(() => {
    const position = player1.position as PositionType;
    const config = getRadarDimensionConfig(position);
    setDimensions(config);

    const player1Side = getPlayerSide(player1);
    const player2Side = getPlayerSide(player2);
    const teamStats1 = getTeamStats(player1);
    const teamStats2 = getTeamStats(player2);

    const rawValues1 = calculateRadarDimension(player1, position, teamStats1, gameDuration);
    const rawValues2 = calculateRadarDimension(player2, position, teamStats2, gameDuration);

    const maxValues = config.map((_, index) => Math.max(rawValues1[index], rawValues2[index]));

    const normalized1: NormalizedPlayerData = {
      name: player1.playerName,
      teamName: player1.teamName,
      side: player1Side,
      values: rawValues1.map((v, i) => normalizeRadarValue(v, maxValues[i])),
      rawValues: rawValues1,
    };

    const normalized2: NormalizedPlayerData = {
      name: player2.playerName,
      teamName: player2.teamName,
      side: player2Side,
      values: rawValues2.map((v, i) => normalizeRadarValue(v, maxValues[i])),
      rawValues: rawValues2,
    };

    setNormalizedData([normalized1, normalized2]);
  }, [player1, player2, gameDuration, redTeamStats, blueTeamStats, getPlayerSide, getTeamStats]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current, undefined, {
      renderer: 'canvas',
    });
    chartInstanceRef.current = chart;

    return () => {
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!chartInstanceRef.current || dimensions.length === 0 || normalizedData.length === 0) {
      return;
    }

    const indicator = dimensions.map(dim => ({
      name: dim.label,
      max: 1,
    }));

    const seriesData = normalizedData.map(player => ({
      name: `${player.name} (${player.teamName})`,
      value: player.values,
      lineStyle: {
        color: player.side === 'red' ? COLORS.redTeam : COLORS.blueTeam,
        width: 2,
      },
      areaStyle: {
        color: player.side === 'red' ? COLORS.redTeamFill : COLORS.blueTeamFill,
      },
      itemStyle: {
        color: player.side === 'red' ? COLORS.redTeam : COLORS.blueTeam,
      },
    }));

    const option = {
      tooltip: {
        show: false,
      },
      radar: {
        indicator,
        shape: 'polygon',
        splitNumber: 5,
        axisName: {
          color: COLORS.labels,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: COLORS.gridLines,
          },
        },
        axisLine: {
          lineStyle: {
            color: COLORS.axisLines,
          },
        },
        splitArea: {
          show: false,
        },
      },
      series: [
        {
          type: 'radar',
          data: seriesData,
          symbol: 'circle',
          symbolSize: 4,
          animationDuration: 300,
          animationEasing: 'cubicOut' as const,
        },
      ],
      animation: false,
    };

    chartInstanceRef.current.setOption(option, true);
  }, [dimensions, normalizedData]);

  const handleDimensionHover = useCallback(
    (index: number, event: React.MouseEvent<HTMLDivElement>) => {
      setHoveredDimensionIndex(index);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setTooltipPos({ x, y });
      }
    },
    []
  );

  const handleDimensionLeave = useCallback(() => {
    setHoveredDimensionIndex(null);
  }, []);

  const renderLeftPanel = () => {
    const playerData = normalizedData.find(p => p.side === 'red') || normalizedData[0];
    if (!playerData) return null;

    return (
      <div className="hidden md:flex flex-col justify-center gap-2 w-[140px] lg:w-[160px]">
        {dimensions.map((dim, index) => (
          <div
            key={dim.key}
            className="flex items-center justify-end gap-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={e => handleDimensionHover(index, e)}
            onMouseLeave={handleDimensionLeave}
          >
            <span className="text-red-400 font-mono font-medium">
              {formatDimensionValue(playerData.rawValues[index], dim.key)}
            </span>
            <span className="text-gray-500 text-xs">
              {dim.label}
              {getDimensionUnit(dim.key)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderRightPanel = () => {
    const playerData = normalizedData.find(p => p.side === 'blue') || normalizedData[1];
    if (!playerData) return null;

    return (
      <div className="hidden md:flex flex-col justify-center gap-2 w-[140px] lg:w-[160px]">
        {dimensions.map((dim, index) => (
          <div
            key={dim.key}
            className="flex items-center gap-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={e => handleDimensionHover(index, e)}
            onMouseLeave={handleDimensionLeave}
          >
            <span className="text-gray-500 text-xs">
              {dim.label}
              {getDimensionUnit(dim.key)}
            </span>
            <span className="text-cyan-400 font-mono font-medium">
              {formatDimensionValue(playerData.rawValues[index], dim.key)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderMobilePanel = () => {
    const redPlayer = normalizedData.find(p => p.side === 'red') || normalizedData[0];
    const bluePlayer = normalizedData.find(p => p.side === 'blue') || normalizedData[1];
    if (!redPlayer || !bluePlayer) return null;

    return (
      <div className="md:hidden grid grid-cols-2 gap-1 text-xs mt-3">
        {dimensions.map((dim, index) => (
          <React.Fragment key={dim.key}>
            <div className="text-right pr-2">
              <span className="text-red-400 font-mono">
                {formatDimensionValue(redPlayer.rawValues[index], dim.key)}
              </span>
              <span className="text-gray-500 ml-1">
                {dim.label}
                {getDimensionUnit(dim.key)}
              </span>
            </div>
            <div className="text-left pl-2 border-l border-white/10">
              <span className="text-gray-500 mr-1">
                {dim.label}
                {getDimensionUnit(dim.key)}
              </span>
              <span className="text-cyan-400 font-mono">
                {formatDimensionValue(bluePlayer.rawValues[index], dim.key)}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderTooltip = () => {
    if (hoveredDimensionIndex === null || !dimensions[hoveredDimensionIndex]) return null;

    const dim = dimensions[hoveredDimensionIndex];
    const redPlayer = normalizedData.find(p => p.side === 'red') || normalizedData[0];
    const bluePlayer = normalizedData.find(p => p.side === 'blue') || normalizedData[1];

    if (!redPlayer || !bluePlayer) return null;

    return (
      <div
        className="fixed z-[100] pointer-events-none"
        style={{
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: 'translate(-50%, -120%)',
        }}
      >
        <div className="bg-gray-900/95 backdrop-blur border border-white/10 rounded-lg p-3 shadow-xl min-w-[160px]">
          <div className="text-white font-medium text-sm mb-2">{dim.label}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-red-400 text-xs">{redPlayer.name}</span>
              <span className="text-red-400 font-mono font-medium text-xs">
                {formatDimensionValue(redPlayer.rawValues[hoveredDimensionIndex], dim.key)}
                {getDimensionUnit(dim.key)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-cyan-400 text-xs">{bluePlayer.name}</span>
              <span className="text-cyan-400 font-mono font-medium text-xs">
                {formatDimensionValue(bluePlayer.rawValues[hoveredDimensionIndex], dim.key)}
                {getDimensionUnit(dim.key)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
          className="bg-[#1a1a2e] border-t border-white/10"
        >
          <div ref={containerRef} className="flex items-center justify-center relative px-4 py-3">
            {/* 左侧数据面板 - 红方 */}
            {renderLeftPanel()}

            {/* 雷达图 */}
            <div
              ref={chartRef}
              className="w-[280px] sm:w-[300px] h-[280px] sm:h-[300px] flex-shrink-0"
            />

            {/* 右侧数据面板 - 蓝方 */}
            {renderRightPanel()}

            {/* 移动端数据面板 */}
            {renderMobilePanel()}

            {/* 自定义 Tooltip */}
            {renderTooltip()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const RadarChartComponent = React.memo(RadarChartInner);

export default RadarChartComponent;
