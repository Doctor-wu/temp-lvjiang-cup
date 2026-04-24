import { describe, it, expect, beforeEach } from 'vitest';
import { useAdvancementStore, calculateAdvancement } from '@/store/advancementStore';

const cleanup = () => {
  localStorage.clear();
  const store = useAdvancementStore.getState();
  store.restoreDefault();
};

describe('advancementStore', () => {
  beforeEach(() => {
    cleanup();
  });

  describe('初始状态', () => {
    it('应该有正确的初始 advancement 数据', () => {
      const state = useAdvancementStore.getState();

      expect(state.advancement.top8).toEqual([]);
      expect(state.advancement.eliminated).toEqual([]);
      expect(state.advancement.rankings).toEqual([]);
    });

    it('应该有 lastUpdated 时间戳', () => {
      const state = useAdvancementStore.getState();
      expect(state.lastUpdated).toBeDefined();
      expect(typeof state.lastUpdated).toBe('string');
    });
  });

  describe('setAdvancement', () => {
    it('应该能设置新的 advancement 数据', () => {
      const store = useAdvancementStore.getState();

      const newAdvancement = {
        top8: ['team1', 'team2', 'team3', 'team4', 'team5', 'team6', 'team7', 'team8'],
        eliminated: ['team9', 'team10', 'team11', 'team12', 'team13', 'team14', 'team15', 'team16'],
        rankings: [
          { teamId: 'team1', record: '3-0', rank: 1 },
          { teamId: 'team2', record: '3-0', rank: 2 },
        ],
      };

      store.setAdvancement(newAdvancement);

      const state = useAdvancementStore.getState();
      expect(state.advancement).toEqual(newAdvancement);
      expect(state.lastUpdated).toBeDefined();
    });
  });

  describe('getAllTeamIds', () => {
    it('应该返回所有队伍ID（top8 + eliminated）', () => {
      const store = useAdvancementStore.getState();

      const newAdvancement = {
        top8: ['team1', 'team2', 'team3', 'team4'],
        eliminated: ['team5', 'team6', 'team7', 'team8'],
        rankings: [],
      };
      store.setAdvancement(newAdvancement);

      const allIds = store.getAllTeamIds();

      expect(allIds).toContain('team1');
      expect(allIds).toContain('team4');
      expect(allIds).toContain('team5');
      expect(allIds).toContain('team8');
      expect(allIds.length).toBe(8);
    });

    it('空数据时应该返回空数组', () => {
      const store = useAdvancementStore.getState();
      const allIds = store.getAllTeamIds();
      expect(allIds).toEqual([]);
    });
  });

  describe('restoreDefault', () => {
    it('应该恢复到默认数据（空数组）', () => {
      const store = useAdvancementStore.getState();

      const newAdvancement = {
        top8: ['team1', 'team2'],
        eliminated: ['team3', 'team4'],
        rankings: [],
      };
      store.setAdvancement(newAdvancement);

      store.restoreDefault();

      const state = useAdvancementStore.getState();
      expect(state.advancement.top8).toEqual([]);
      expect(state.advancement.eliminated).toEqual([]);
      expect(state.advancement.rankings).toEqual([]);
    });
  });
});

describe('calculateAdvancement', () => {
  describe('赛制规则验证 - 3胜晋级，3败淘汰', () => {
    it('3-0 战绩的队伍应该进入晋级名单', () => {
      const matches = [
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team2' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team3' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team4' },
      ];

      const teams = [{ id: 'team1' }, { id: 'team2' }, { id: 'team3' }, { id: 'team4' }];

      const result = calculateAdvancement(matches, teams);

      expect(result.top8).toContain('team1');
      expect(result.rankings[0]).toEqual({ teamId: 'team1', record: '3-0', rank: 1 });
    });

    it('0-3 战绩的队伍应该进入淘汰名单', () => {
      const matches = [
        { stage: 'swiss', status: 'finished', winnerId: 'team2', teamAId: 'team1', teamBId: 'team2' },
        { stage: 'swiss', status: 'finished', winnerId: 'team3', teamAId: 'team1', teamBId: 'team3' },
        { stage: 'swiss', status: 'finished', winnerId: 'team4', teamAId: 'team1', teamBId: 'team4' },
      ];

      const teams = [{ id: 'team1' }, { id: 'team2' }, { id: 'team3' }, { id: 'team4' }];

      const result = calculateAdvancement(matches, teams);

      expect(result.eliminated).toContain('team1');
      expect(result.rankings[0]).toEqual({ teamId: 'team1', record: '0-3', rank: 1 });
    });

    it('3-1 战绩的队伍应该进入晋级名单', () => {
      const matches = [
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team2' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team3' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team5', teamAId: 'team1', teamBId: 'team5' },
      ];

      const teams = [
        { id: 'team1' }, { id: 'team2' }, { id: 'team3' },
        { id: 'team4' }, { id: 'team5' }
      ];

      const result = calculateAdvancement(matches, teams);

      expect(result.top8).toContain('team1');
      expect(result.rankings.find(r => r.teamId === 'team1')?.record).toBe('3-1');
    });

    it('1-3 战绩的队伍应该进入淘汰名单', () => {
      const matches = [
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team2' },
        { stage: 'swiss', status: 'finished', winnerId: 'team3', teamAId: 'team1', teamBId: 'team3' },
        { stage: 'swiss', status: 'finished', winnerId: 'team4', teamAId: 'team1', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team5', teamAId: 'team1', teamBId: 'team5' },
      ];

      const teams = [
        { id: 'team1' }, { id: 'team2' }, { id: 'team3' },
        { id: 'team4' }, { id: 'team5' }
      ];

      const result = calculateAdvancement(matches, teams);

      expect(result.eliminated).toContain('team1');
      expect(result.rankings.find(r => r.teamId === 'team1')?.record).toBe('1-3');
    });

    it('3-2 战绩的队伍应该进入晋级名单', () => {
      const matches = [
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team2' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team3' },
        { stage: 'swiss', status: 'finished', winnerId: 'team4', teamAId: 'team1', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team5', teamAId: 'team1', teamBId: 'team5' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team6' },
      ];

      const teams = [
        { id: 'team1' }, { id: 'team2' }, { id: 'team3' },
        { id: 'team4' }, { id: 'team5' }, { id: 'team6' }
      ];

      const result = calculateAdvancement(matches, teams);

      expect(result.top8).toContain('team1');
      expect(result.rankings.find(r => r.teamId === 'team1')?.record).toBe('3-2');
    });

    it('2-3 战绩的队伍应该进入淘汰名单', () => {
      const matches = [
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team2' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team3' },
        { stage: 'swiss', status: 'finished', winnerId: 'team4', teamAId: 'team1', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team5', teamAId: 'team1', teamBId: 'team5' },
        { stage: 'swiss', status: 'finished', winnerId: 'team6', teamAId: 'team1', teamBId: 'team6' },
      ];

      const teams = [
        { id: 'team1' }, { id: 'team2' }, { id: 'team3' },
        { id: 'team4' }, { id: 'team5' }, { id: 'team6' }
      ];

      const result = calculateAdvancement(matches, teams);

      expect(result.eliminated).toContain('team1');
      expect(result.rankings.find(r => r.teamId === 'team1')?.record).toBe('2-3');
    });
  });

  describe('排序规则', () => {
    it('晋级区应该按 3-0 > 3-1 > 3-2 排序', () => {
      const matches = [
        // team1: 3-2
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team5' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team6' },
        { stage: 'swiss', status: 'finished', winnerId: 'team7', teamAId: 'team1', teamBId: 'team7' },
        { stage: 'swiss', status: 'finished', winnerId: 'team8', teamAId: 'team1', teamBId: 'team8' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team9' },
        // team2: 3-1
        { stage: 'swiss', status: 'finished', winnerId: 'team2', teamAId: 'team2', teamBId: 'team5' },
        { stage: 'swiss', status: 'finished', winnerId: 'team2', teamAId: 'team2', teamBId: 'team6' },
        { stage: 'swiss', status: 'finished', winnerId: 'team2', teamAId: 'team2', teamBId: 'team7' },
        { stage: 'swiss', status: 'finished', winnerId: 'team8', teamAId: 'team2', teamBId: 'team8' },
        // team3: 3-0
        { stage: 'swiss', status: 'finished', winnerId: 'team3', teamAId: 'team3', teamBId: 'team5' },
        { stage: 'swiss', status: 'finished', winnerId: 'team3', teamAId: 'team3', teamBId: 'team6' },
        { stage: 'swiss', status: 'finished', winnerId: 'team3', teamAId: 'team3', teamBId: 'team7' },
      ];

      const teams = Array.from({ length: 9 }, (_, i) => ({ id: `team${i + 1}` }));

      const result = calculateAdvancement(matches, teams);

      const rankings = result.rankings.filter(r => result.top8.includes(r.teamId));
      expect(rankings[0].record).toBe('3-0');
      expect(rankings[0].teamId).toBe('team3');
      expect(rankings[1].record).toBe('3-1');
      expect(rankings[1].teamId).toBe('team2');
      expect(rankings[2].record).toBe('3-2');
      expect(rankings[2].teamId).toBe('team1');
    });

    it('淘汰区应该按 0-3 > 1-3 > 2-3 排序', () => {
      const matches = [
        // team1: 0-3
        { stage: 'swiss', status: 'finished', winnerId: 'team4', teamAId: 'team1', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team5', teamAId: 'team1', teamBId: 'team5' },
        { stage: 'swiss', status: 'finished', winnerId: 'team6', teamAId: 'team1', teamBId: 'team6' },
        // team2: 1-3
        { stage: 'swiss', status: 'finished', winnerId: 'team2', teamAId: 'team2', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team5', teamAId: 'team2', teamBId: 'team5' },
        { stage: 'swiss', status: 'finished', winnerId: 'team6', teamAId: 'team2', teamBId: 'team6' },
        { stage: 'swiss', status: 'finished', winnerId: 'team7', teamAId: 'team2', teamBId: 'team7' },
        // team3: 2-3
        { stage: 'swiss', status: 'finished', winnerId: 'team3', teamAId: 'team3', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team3', teamAId: 'team3', teamBId: 'team5' },
        { stage: 'swiss', status: 'finished', winnerId: 'team6', teamAId: 'team3', teamBId: 'team6' },
        { stage: 'swiss', status: 'finished', winnerId: 'team7', teamAId: 'team3', teamBId: 'team7' },
        { stage: 'swiss', status: 'finished', winnerId: 'team8', teamAId: 'team3', teamBId: 'team8' },
      ];

      const teams = Array.from({ length: 8 }, (_, i) => ({ id: `team${i + 1}` }));

      const result = calculateAdvancement(matches, teams);

      const eliminatedRankings = result.rankings.filter(r => result.eliminated.includes(r.teamId));
      expect(eliminatedRankings[0].record).toBe('0-3');
      expect(eliminatedRankings[0].teamId).toBe('team1');
      expect(eliminatedRankings[1].record).toBe('1-3');
      expect(eliminatedRankings[1].teamId).toBe('team2');
      expect(eliminatedRankings[2].record).toBe('2-3');
      expect(eliminatedRankings[2].teamId).toBe('team3');
    });
  });

  describe('边界情况', () => {
    it('应该忽略非瑞士轮比赛', () => {
      const matches = [
        { stage: 'elimination', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team2' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team3' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team5' },
      ];

      const teams = [{ id: 'team1' }, { id: 'team2' }, { id: 'team3' }, { id: 'team4' }, { id: 'team5' }];

      const result = calculateAdvancement(matches, teams);

      expect(result.top8).toContain('team1');
      const team1Record = result.rankings.find(r => r.teamId === 'team1');
      expect(team1Record?.record).toBe('3-0');
    });

    it('应该忽略未结束的比赛', () => {
      const matches = [
        { stage: 'swiss', status: 'ongoing', winnerId: null, teamAId: 'team1', teamBId: 'team2' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team3' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team5' },
      ];

      const teams = [{ id: 'team1' }, { id: 'team2' }, { id: 'team3' }, { id: 'team4' }, { id: 'team5' }];

      const result = calculateAdvancement(matches, teams);

      const team1Record = result.rankings.find(r => r.teamId === 'team1');
      expect(team1Record?.record).toBe('3-0');
    });

    it('战绩为 2-2 的队伍不应该出现在晋级或淘汰名单中', () => {
      const matches = [
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team2' },
        { stage: 'swiss', status: 'finished', winnerId: 'team1', teamAId: 'team1', teamBId: 'team3' },
        { stage: 'swiss', status: 'finished', winnerId: 'team4', teamAId: 'team1', teamBId: 'team4' },
        { stage: 'swiss', status: 'finished', winnerId: 'team5', teamAId: 'team1', teamBId: 'team5' },
      ];

      const teams = [{ id: 'team1' }, { id: 'team2' }, { id: 'team3' }, { id: 'team4' }, { id: 'team5' }];

      const result = calculateAdvancement(matches, teams);

      expect(result.top8).not.toContain('team1');
      expect(result.eliminated).not.toContain('team1');
    });

    it('无比赛时所有队伍都不在晋级或淘汰名单中', () => {
      const matches: any[] = [];
      const teams = [{ id: 'team1' }, { id: 'team2' }];

      const result = calculateAdvancement(matches, teams);

      expect(result.top8).toEqual([]);
      expect(result.eliminated).toEqual([]);
      expect(result.rankings).toEqual([]);
    });
  });
});
