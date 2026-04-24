import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from '../../src/modules/teams/teams.service';
import { MatchesService } from '../../src/modules/matches/matches.service';
import { StreamsService } from '../../src/modules/streams/streams.service';
import { DatabaseService } from '../../src/database/database.service';
import { CacheService } from '../../src/cache/cache.service';
import { ConfigService } from '@nestjs/config';

describe('Cross-Module Integration Tests', () => {
  let teamsService: TeamsService;
  let matchesService: MatchesService;
  let streamsService: StreamsService;
  let databaseService: DatabaseService;
  let cacheService: CacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        TeamsService,
        MatchesService,
        StreamsService,
        DatabaseService,
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'database.path') return ':memory:';
              if (key === 'cache.ttl') return 60;
              return null;
            },
          },
        },
      ],
    }).compile();

    teamsService = module.get<TeamsService>(TeamsService);
    matchesService = module.get<MatchesService>(MatchesService);
    streamsService = module.get<StreamsService>(StreamsService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    cacheService = module.get<CacheService>(CacheService);

    await databaseService.onModuleInit();
    await createTables();
  });

  afterAll(async () => {
    await databaseService.onModuleDestroy();
    await module.close();
  });

  beforeEach(async () => {
    await cleanupTables();
    cacheService.flush();
  });

  async function createTables() {
    await databaseService.run(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logo TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await databaseService.run(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        position TEXT CHECK(position IN ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT')),
        team_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);

    await databaseService.run(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        team_a_id TEXT,
        team_b_id TEXT,
        score_a INTEGER DEFAULT 0,
        score_b INTEGER DEFAULT 0,
        winner_id TEXT,
        round TEXT,
        status TEXT DEFAULT 'upcoming',
        start_time TEXT,
        stage TEXT NOT NULL,
        swiss_record TEXT,
        swiss_round INTEGER,
        bo_format TEXT,
        elimination_bracket TEXT CHECK(elimination_bracket IN ('quarterfinals', 'semifinals', 'finals')),
        elimination_game_number INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await databaseService.run(`
      CREATE TABLE IF NOT EXISTS stream_info (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        title TEXT,
        url TEXT,
        is_live INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 初始化默认数据
    await databaseService.run(`
      INSERT OR IGNORE INTO stream_info (id, title, url, is_live)
      VALUES (1, '', '', 0)
    `);
  }

  async function cleanupTables() {
    await databaseService.run('DELETE FROM matches');
    await databaseService.run('DELETE FROM players');
    await databaseService.run('DELETE FROM teams');
    await databaseService.run(
      `UPDATE stream_info SET title = '', url = '', is_live = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    );
  }

  describe('Team-Match Data Flow', () => {
    it('should create teams and matches with correct relationships', async () => {
      // 创建两个战队
      const team1 = await teamsService.create({
        id: 'team-1',
        name: 'Team Alpha',
        logo: 'alpha.png',
        battleCry: 'First team',
        players: [],
      });

      const team2 = await teamsService.create({
        id: 'team-2',
        name: 'Team Beta',
        logo: 'beta.png',
        battleCry: 'Second team',
        players: [],
      });

      // 创建比赛
      await databaseService.run(
        `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['match-1', team1.id, team2.id, 'swiss', '第一轮', 'upcoming'],
      );

      // 验证战队存在
      const foundTeam1 = await teamsService.findOne(team1.id);
      const foundTeam2 = await teamsService.findOne(team2.id);
      expect(foundTeam1.name).toBe('Team Alpha');
      expect(foundTeam2.name).toBe('Team Beta');

      // 验证比赛存在
      const match = await matchesService.findOne('match-1');
      expect(match.teamAId).toBe(team1.id);
      expect(match.teamBId).toBe(team2.id);
    });

    it('should update match results and reflect in data', async () => {
      // 创建战队
      const team1 = await teamsService.create({
        id: 'team-1',
        name: 'Team Alpha',
        logo: 'alpha.png',
        battleCry: 'First team',
        players: [],
      });

      const team2 = await teamsService.create({
        id: 'team-2',
        name: 'Team Beta',
        logo: 'beta.png',
        battleCry: 'Second team',
        players: [],
      });

      // 创建比赛
      await databaseService.run(
        `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['match-1', team1.id, team2.id, 'swiss', '第一轮', 'upcoming'],
      );

      // 更新比赛结果
      const updated = await matchesService.update('match-1', {
        scoreA: 2,
        scoreB: 1,
        winnerId: team1.id,
        status: 'finished' as const as any,
      });

      expect(updated.winnerId).toBe(team1.id);
      expect(updated.status).toBe('finished');

      // 验证战队数据不受影响
      const foundTeam1 = await teamsService.findOne(team1.id);
      expect(foundTeam1.name).toBe('Team Alpha');
    });

    it('should handle team deletion with matches', async () => {
      // 创建战队
      const team1 = await teamsService.create({
        id: 'team-1',
        name: 'Team Alpha',
        logo: 'alpha.png',
        battleCry: 'First team',
        players: [],
      });

      const team2 = await teamsService.create({
        id: 'team-2',
        name: 'Team Beta',
        logo: 'beta.png',
        battleCry: 'Second team',
        players: [],
      });

      // 创建比赛
      await databaseService.run(
        `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['match-1', team1.id, team2.id, 'swiss', '第一轮', 'upcoming'],
      );

      // 删除战队
      await teamsService.remove(team1.id);

      // 验证比赛仍然存在（外键约束为 ON DELETE SET NULL 或类似）
      const match = await matchesService.findOne('match-1');
      expect(match).toBeDefined();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency after multiple operations', async () => {
      // 创建多个战队
      const teams = [];
      for (let i = 1; i <= 4; i++) {
        const team = await teamsService.create({
          id: `team-${i}`,
          name: `Team ${i}`,
          logo: `logo${i}.png`,
          battleCry: `Description ${i}`,
          players: [],
        });
        teams.push(team);
      }

      // 创建多场比赛
      for (let i = 0; i < 2; i++) {
        await databaseService.run(
          `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `match-${i + 1}`,
            teams[i * 2].id,
            teams[i * 2 + 1].id,
            'swiss',
            `第${i + 1}轮`,
            'upcoming',
          ],
        );
      }

      // 验证数据一致性
      const allTeams = await teamsService.findAll();
      const allMatches = await matchesService.findAll();

      expect(allTeams).toHaveLength(4);
      expect(allMatches).toHaveLength(2);

      // 更新一场比赛
      await matchesService.update('match-1', {
        scoreA: 2,
        scoreB: 1,
        winnerId: teams[0].id,
        status: 'finished' as const as any,
      });

      // 验证更新后的数据
      const updatedMatch = await matchesService.findOne('match-1');
      expect(updatedMatch.winnerId).toBe(teams[0].id);

      // 删除一个战队
      await teamsService.remove(teams[3].id);

      // 验证删除后的数据
      const remainingTeams = await teamsService.findAll();
      expect(remainingTeams).toHaveLength(3);
    });

    it('should handle cache invalidation across modules', async () => {
      // 创建战队
      const team = await teamsService.create({
        id: 'team-1',
        name: 'Team Alpha',
        logo: 'alpha.png',
        battleCry: 'First team',
        players: [],
      });

      // 创建比赛
      await databaseService.run(
        `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['match-1', team.id, 'team-2', 'swiss', '第一轮', 'upcoming'],
      );

      // 查询战队和比赛，写入缓存
      await teamsService.findOne(team.id);
      await matchesService.findOne('match-1');

      // 更新战队
      await teamsService.update(team.id, { name: 'Updated Team' });

      // 验证战队缓存已清除
      const updatedTeam = await teamsService.findOne(team.id);
      expect(updatedTeam.name).toBe('Updated Team');

      // 更新比赛
      await matchesService.update('match-1', { scoreA: 2 });

      // 验证比赛缓存已清除
      const updatedMatch = await matchesService.findOne('match-1');
      expect(updatedMatch.scoreA).toBe(2);
    });
  });

  describe('直播状态 → 前端显示同步', () => {
    it('should update stream info and reflect in queries', async () => {
      // 更新直播信息
      await streamsService.update('1', {
        title: '驴酱杯总决赛',
        url: 'https://live.example.com/stream',
        isLive: true,
      });

      // 验证直播信息
      const streamInfo = await streamsService.findOne();
      expect(streamInfo.title).toBe('驴酱杯总决赛');
      expect(streamInfo.url).toBe('https://live.example.com/stream');
      expect(streamInfo.isLive).toBe(true);
    });

    it('should handle stream status changes', async () => {
      // 初始状态
      let streamInfo = await streamsService.findOne();
      expect(streamInfo.isLive).toBe(false);

      // 开始直播
      await streamsService.update('1', {
        title: '比赛开始',
        url: 'https://live.example.com/stream1',
        isLive: true,
      });

      streamInfo = await streamsService.findOne();
      expect(streamInfo.isLive).toBe(true);
      expect(streamInfo.title).toBe('比赛开始');

      // 结束直播
      await streamsService.update('1', {
        isLive: false,
      });

      streamInfo = await streamsService.findOne();
      expect(streamInfo.isLive).toBe(false);
    });

    it('should cache stream info correctly', async () => {
      // 更新直播信息
      await streamsService.update('1', {
        title: 'Cached Stream',
        url: 'https://example.com',
        isLive: true,
      });

      // 第一次查询（从数据库）
      const stream1 = await streamsService.findOne();
      expect(stream1.title).toBe('Cached Stream');

      // 第二次查询（从缓存）
      const stream2 = await streamsService.findOne();
      expect(stream2.title).toBe('Cached Stream');
    });
  });

  describe('多模块数据一致性', () => {
    it('should maintain consistency across all modules', async () => {
      // 1. 创建战队
      const team = await teamsService.create({
        id: 'team-1',
        name: 'Consistent Team',
        logo: 'logo.png',
        battleCry: 'Test',
        players: [{ id: 'p1', nickname: 'Player1', position: 'TOP' as const }],
      });

      // 2. 创建比赛
      await databaseService.run(
        `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['match-1', team.id, 'team-2', 'swiss', 'Round 1', 'upcoming'],
      );

      // 3. 更新直播信息
      await streamsService.update('1', {
        title: 'Live Match',
        isLive: true,
      });

      // 验证所有模块数据一致性
      const foundTeam = await teamsService.findOne(team.id);
      const match = await matchesService.findOne('match-1');
      const stream = await streamsService.findOne();

      expect(foundTeam.id).toBe(team.id);
      expect(match.teamAId).toBe(team.id);
      expect(stream.title).toBe('Live Match');
    });

    it('should handle data updates across modules', async () => {
      // 创建初始数据
      const team = await teamsService.create({
        id: 'team-1',
        name: 'Original Name',
        logo: 'logo.png',
        battleCry: 'Original',
        players: [],
      });

      await databaseService.run(
        `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['match-1', team.id, 'team-2', 'swiss', 'Round 1', 'upcoming'],
      );

      // 更新战队名称
      await teamsService.update(team.id, { name: 'Updated Name' });

      // 验证比赛中的战队引用仍然有效
      const match = await matchesService.findOne('match-1');
      expect(match.teamAId).toBe(team.id);

      // 验证战队更新成功
      const updatedTeam = await teamsService.findOne(team.id);
      expect(updatedTeam.name).toBe('Updated Name');
    });
  });

  describe('完整业务流程测试', () => {
    it('should handle complete tournament lifecycle', async () => {
      // 1. 初始化：创建战队
      const teams = [];
      for (let i = 1; i <= 8; i++) {
        const team = await teamsService.create({
          id: `team-${i}`,
          name: `Team ${i}`,
          logo: `logo${i}.png`,
          battleCry: `Team ${i} description`,
          members: [
            { id: `p${i}-1`, nickname: `Player${i}-1`, position: 'TOP' as const },
            { id: `p${i}-2`, nickname: `Player${i}-2`, position: 'JUNGLE' as const },
          ],
        });
        teams.push(team);
      }

      // 2. 创建比赛槽位
      for (let i = 0; i < 4; i++) {
        await databaseService.run(
          `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status, swiss_record, swiss_round) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `swiss-${i}`,
            teams[i * 2].id,
            teams[i * 2 + 1].id,
            'swiss',
            'Round 1',
            'upcoming',
            '0-0',
            1,
          ],
        );
      }

      // 3. 设置直播
      await streamsService.update('1', {
        title: '驴酱杯瑞士轮第一轮',
        url: 'https://live.example.com',
        isLive: true,
      });

      // 4. 进行比赛并更新结果
      for (let i = 0; i < 4; i++) {
        await matchesService.update(`swiss-${i}`, {
          scoreA: 2,
          scoreB: 1,
          winnerId: teams[i * 2].id,
          status: 'finished' as any,
        });
      }

      // 5. 验证所有数据
      const allTeams = await teamsService.findAll();
      const allMatches = await matchesService.findAll();
      const stream = await streamsService.findOne();

      expect(allTeams).toHaveLength(8);
      expect(allMatches).toHaveLength(4);
      expect(stream.isLive).toBe(true);
    });

    it('should handle tournament reset', async () => {
      // 创建测试数据
      const team = await teamsService.create({
        id: 'team-1',
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test',
        players: [],
      });

      await databaseService.run(
        `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status, winner_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['match-1', team.id, 'team-2', 'swiss', 'Round 1', 'finished', team.id],
      );

      // 重置比赛数据
      await databaseService.resetMatchSlots();

      // 验证比赛被重置
      const match = await matchesService.findOne('match-1');
      expect(match.scoreA).toBe(0);
      expect(match.scoreB).toBe(0);
      expect(match.winnerId).toBeNull();
      expect(match.status).toBe('upcoming');
    });
  });

  describe('错误传播测试', () => {
    it('should handle errors in one module without affecting others', async () => {
      // 创建有效的战队
      const team = await teamsService.create({
        id: 'team-1',
        name: 'Valid Team',
        logo: 'logo.png',
        battleCry: 'Valid',
        players: [],
      });

      // 尝试对不存在的比赛进行操作（应该失败）
      await expect(matchesService.update('non-existent', { scoreA: 1 })).rejects.toThrow();

      // 验证战队服务仍然正常工作
      const foundTeam = await teamsService.findOne(team.id);
      expect(foundTeam.name).toBe('Valid Team');
    });

    it('should handle database errors gracefully', async () => {
      // 创建战队
      const team = await teamsService.create({
        id: 'team-1',
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test',
        players: [],
      });

      // 尝试插入无效数据（违反约束）
      await expect(
        databaseService.run(
          `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            'match-1',
            'invalid-team-id',
            'another-invalid',
            'invalid_stage',
            'Round 1',
            'invalid_status',
          ],
        ),
      ).rejects.toThrow();

      // 验证战队数据不受影响
      const foundTeam = await teamsService.findOne(team.id);
      expect(foundTeam).toBeDefined();
    });
  });

  describe('缓存跨模块一致性', () => {
    it('should invalidate cache correctly across modules', async () => {
      // 创建战队
      const team = await teamsService.create({
        id: 'team-1',
        name: 'Cache Test Team',
        logo: 'logo.png',
        battleCry: 'Test',
        players: [],
      });

      // 查询并缓存
      await teamsService.findOne(team.id);

      // 更新战队
      await teamsService.update(team.id, { name: 'Updated Name' });

      // 验证缓存已更新
      const updatedTeam = await teamsService.findOne(team.id);
      expect(updatedTeam.name).toBe('Updated Name');
    });

    it('should handle cache for multiple modules', async () => {
      // 更新直播信息并缓存
      await streamsService.update('1', {
        title: 'Test Stream',
        isLive: true,
      });

      // 查询所有缓存数据
      const stream = await streamsService.findOne();

      expect(stream.title).toBe('Test Stream');
    });
  });

  describe('数据库连接池测试', () => {
    it('should handle multiple concurrent database operations', async () => {
      // 创建多个并发操作
      const promises = [];

      // 并发创建战队
      for (let i = 0; i < 10; i++) {
        promises.push(
          teamsService.create({
            id: `concurrent-team-${i}`,
            name: `Team ${i}`,
            logo: `logo${i}.png`,
            battleCry: `Description ${i}`,
            players: [],
          }),
        );
      }

      // 并发创建比赛
      for (let i = 0; i < 5; i++) {
        promises.push(
          databaseService.run(
            `INSERT INTO matches (id, team_a_id, team_b_id, stage, round, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [`match-${i}`, `team-a-${i}`, `team-b-${i}`, 'swiss', `Round ${i}`, 'upcoming'],
          ),
        );
      }

      await Promise.all(promises);

      // 验证所有数据已创建
      const allTeams = await teamsService.findAll();
      const allMatches = await matchesService.findAll();

      expect(allTeams).toHaveLength(10);
      expect(allMatches).toHaveLength(5);
    });

    it('should handle database connection reuse', async () => {
      // 执行多次查询，验证连接可以复用
      for (let i = 0; i < 20; i++) {
        await teamsService.findAll();
        await matchesService.findAll();
        await streamsService.findOne();
      }

      // 如果连接有问题，上面的循环会抛出异常
      expect(true).toBe(true);
    });
  });
});
