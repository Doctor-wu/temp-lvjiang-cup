/**
 * 对战数据测试夹具
 */

export interface MatchDataFixture {
  matchId: string;
  teamAName: string;
  teamBName: string;
  boFormat: 'BO1' | 'BO3' | 'BO5';
  gameNumber: number;
  gameDuration: string;  // 保留兼容
  winner: 'red' | 'blue';
  videoBvid?: string;    // 新增
}

export const matchDataFixture: MatchDataFixture = {
  matchId: 'test-match-001',
  teamAName: 'BLG',
  teamBName: 'WBG',
  boFormat: 'BO3',
  gameNumber: 1,
  gameDuration: '32:45',
  winner: 'red',
  videoBvid: 'BV1Ab4y1X7zK',
};

export const matchDataFixtureBO5: MatchDataFixture = {
  matchId: 'test-match-002',
  teamAName: 'JDG',
  teamBName: 'TES',
  boFormat: 'BO5',
  gameNumber: 3,
  gameDuration: '28:30',
  winner: 'blue',
  videoBvid: 'BV1aB4Y1x7Zk',
};

export const matchDataFixtureBO1: MatchDataFixture = {
  matchId: 'test-match-003',
  teamAName: 'LNG',
  teamBName: 'WBG',
  boFormat: 'BO1',
  gameNumber: 1,
  gameDuration: '25:15',
  winner: 'red',
};
