import { create } from 'zustand';
import type { SwissAdvancementResult } from '@/types';

interface AdvancementStore {
  advancement: SwissAdvancementResult;
  lastUpdated: string;
  setAdvancement: (data: SwissAdvancementResult) => void;
  reset: () => void;
  restoreDefault: () => void;
  getAllTeamIds: () => string[];
}

// 默认晋级名单（空数组，不预设任何数据）
const defaultAdvancement: SwissAdvancementResult = {
  top8: [],
  eliminated: [],
  rankings: [],
};

export const useAdvancementStore = create<AdvancementStore>()((set, get) => ({
  advancement: defaultAdvancement,
  lastUpdated: new Date().toISOString(),

  setAdvancement: data =>
    set({
      advancement: data,
      lastUpdated: new Date().toISOString(),
    }),

  reset: () => {
    set({
      advancement: defaultAdvancement,
      lastUpdated: new Date().toISOString(),
    });
  },

  restoreDefault: () =>
    set({
      advancement: defaultAdvancement,
      lastUpdated: new Date().toISOString(),
    }),

  getAllTeamIds: () => {
    const { advancement } = get();
    return [...advancement.top8, ...advancement.eliminated];
  },
}));

interface TeamRecord {
  teamId: string;
  wins: number;
  losses: number;
}

/**
 * 根据比赛结果自动计算晋级名单
 * 赛制规则：
 * - 达到3胜即晋级（3-0, 3-1, 3-2）
 * - 达到3败即淘汰（0-3, 1-3, 2-3）
 *
 * @param matches - 所有比赛数组
 * @param teams - 所有队伍数组
 * @returns 晋级结果（top8和eliminated）
 */
export function calculateAdvancement(
  matches: {
    stage: string;
    status: string;
    winnerId?: string | null;
    teamAId?: string;
    teamBId?: string;
  }[],
  teams: { id: string }[]
): SwissAdvancementResult {
  const teamRecords = new Map<string, { wins: number; losses: number }>();

  // 初始化所有队伍的战绩
  teams.forEach(team => {
    teamRecords.set(team.id, { wins: 0, losses: 0 });
  });

  // 遍历所有瑞士轮比赛，统计每支队伍的战绩
  matches
    .filter(
      m => m.stage === 'swiss' && m.status === 'finished' && m.winnerId && m.teamAId && m.teamBId
    )
    .forEach(match => {
      const winnerId = match.winnerId!;
      const loserId = match.teamAId === winnerId ? match.teamBId! : match.teamAId!;

      // 更新胜者战绩
      const winnerRecord = teamRecords.get(winnerId);
      if (winnerRecord) {
        teamRecords.set(winnerId, { wins: winnerRecord.wins + 1, losses: winnerRecord.losses });
      }

      // 更新败者战绩
      const loserRecord = teamRecords.get(loserId);
      if (loserRecord) {
        teamRecords.set(loserId, { wins: loserRecord.wins, losses: loserRecord.losses + 1 });
      }
    });

  // 分类：晋级（3胜）和淘汰（3败）
  const advanced: TeamRecord[] = [];
  const eliminated: TeamRecord[] = [];

  teamRecords.forEach((record, teamId) => {
    if (record.wins === 3) {
      advanced.push({ teamId, ...record });
    } else if (record.losses === 3) {
      eliminated.push({ teamId, ...record });
    }
  });

  // 排序晋级区：3-0 > 3-1 > 3-2（败场少的排前面）
  advanced.sort((a, b) => {
    if (a.losses !== b.losses) {
      return a.losses - b.losses; // 败场少的排前面
    }
    return 0;
  });

  // 排序淘汰区：0-3 > 1-3 > 2-3（胜场少的排前面）
  eliminated.sort((a, b) => {
    if (a.wins !== b.wins) {
      return a.wins - b.wins; // 胜场少的排前面
    }
    return 0;
  });

  // 生成排名信息
  const rankings = [
    ...advanced.map((t, index) => ({
      teamId: t.teamId,
      record: `${t.wins}-${t.losses}`,
      rank: index + 1,
    })),
    ...eliminated.map((t, index) => ({
      teamId: t.teamId,
      record: `${t.wins}-${t.losses}`,
      rank: advanced.length + index + 1,
    })),
  ];

  return {
    top8: advanced.map(t => t.teamId),
    eliminated: eliminated.map(t => t.teamId),
    rankings,
  };
}
