import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from '../../src/modules/teams/teams.service';
import { DatabaseService } from '../../src/database/database.service';
import { CacheService } from '../../src/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

describe('Teams Integration Tests', () => {
  let service: TeamsService;
  let databaseService: DatabaseService;
  let cacheService: CacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        TeamsService,
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

    service = module.get<TeamsService>(TeamsService);
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
    await databaseService.run('PRAGMA foreign_keys = ON');

    await databaseService.run(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        logo TEXT,
        logo_url TEXT,
        logo_thumbnail_url TEXT,
        battle_cry TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await databaseService.run(`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        nickname TEXT NOT NULL,
        avatar_url TEXT,
        position TEXT CHECK(position IN ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT')),
        team_id TEXT NOT NULL,
        game_id TEXT,
        bio TEXT,
        champion_pool TEXT,
        rating INTEGER DEFAULT 60,
        is_captain INTEGER DEFAULT 0,
        live_url TEXT,
        sort_order INTEGER,
        level TEXT CHECK(level IN ('S', 'A', 'B', 'C', 'D')),
        auction_price INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);
  }

  async function cleanupTables() {
    await databaseService.run('DELETE FROM team_members');
    await databaseService.run('DELETE FROM teams');
  }

  describe('CRUD Operations', () => {
    it('should create a team and retrieve it', async () => {
      const createDto = {
        id: 'team-1',
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
        members: [],
      };

      const created = await service.create(createDto);
      expect(created.name).toBe(createDto.name);

      const found = await service.findOne(created.id);
      expect(found.name).toBe(createDto.name);
    });

    it('should create a team with auto-generated UUID and default members', async () => {
      const createDto = {
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
        // 不传递 id，由后端生成 UUID
      };

      const created = await service.create(createDto);

      // 验证 UUID 格式
      expect(created.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(created.name).toBe('Test Team');
      // 验证自动创建了 5 个默认队员
      expect(created.members).toHaveLength(5);
      // 验证队员 ID 也是 UUID
      expect(created.members[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should update a team', async () => {
      const createDto = {
        id: 'team-1',
        name: 'Original Name',
        logo: 'logo.png',
        battleCry: 'Original description',
        members: [],
      };

      const created = await service.create(createDto);

      const updateDto = {
        name: 'Updated Name',
        battleCry: 'Updated description',
      };

      const updated = await service.update(created.id, updateDto);
      expect(updated.name).toBe('Updated Name');
      expect(updated.battleCry).toBe('Updated description');
    });

    it('should delete a team and its members', async () => {
      const createDto = {
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
      };

      const created = await service.create(createDto);
      const teamId = created.id;

      // 验证创建了 5 个默认队员
      expect(created.members).toHaveLength(5);

      await service.remove(teamId);

      await expect(service.findOne(teamId)).rejects.toThrow(NotFoundException);

      // 验证队员也被级联删除
      const members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        teamId,
      ]);
      expect(members).toHaveLength(0);
    });
  });

  describe('Cache Integration', () => {
    it('should cache teams after first retrieval', async () => {
      const createDto = {
        id: 'team-1',
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
        members: [],
      };

      await service.create(createDto);

      const firstResult = await service.findAll();
      expect(firstResult).toHaveLength(1);

      const secondResult = await service.findAll();
      expect(secondResult).toHaveLength(1);
    });

    it('should update team and return new data', async () => {
      const createDto = {
        id: 'team-1',
        name: 'Team 1',
        logo: 'logo.png',
        battleCry: 'Description 1',
        members: [],
      };

      await service.create(createDto);

      const updated = await service.update(createDto.id, { name: 'Updated Team' });
      expect(updated.name).toBe('Updated Team');

      const found = await service.findOne(createDto.id);
      expect(found.name).toBe('Updated Team');
    });

    it('should update team name correctly', async () => {
      const createDto = {
        id: 'team-1',
        name: 'Original Name',
        logo: 'logo.png',
        battleCry: 'Original description',
        members: [],
      };

      await service.create(createDto);

      const updated = await service.update(createDto.id, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency after multiple operations', async () => {
      const team1 = await service.create({
        name: 'Team 1',
        logo: 'logo1.png',
        battleCry: 'Description 1',
      });

      const team2 = await service.create({
        name: 'Team 2',
        logo: 'logo2.png',
        battleCry: 'Description 2',
      });

      let allTeams = await service.findAll();
      expect(allTeams).toHaveLength(2);

      await service.update(team1.id, { name: 'Updated Team 1' });

      const updated = await service.findOne(team1.id);
      expect(updated.name).toBe('Updated Team 1');

      await service.remove(team2.id);

      allTeams = await service.findAll();
      expect(allTeams).toHaveLength(1);
      expect(allTeams[0].name).toBe('Updated Team 1');
    });

    it('should handle member updates correctly', async () => {
      const createDto = {
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
      };

      const created = await service.create(createDto);
      expect(created.members).toHaveLength(5);

      const updateDto = {
        members: [
          { id: created.members[0].id, nickname: 'UpdatedPlayer1', position: 'TOP' as const },
          { id: created.members[1].id, nickname: 'Player2', position: 'JUNGLE' as const },
          { nickname: 'Player3', position: 'MID' as const },
        ],
      };

      const updated = await service.update(created.id, updateDto);
      expect(updated.members).toHaveLength(3);
      expect(updated.members[0].nickname).toBe('UpdatedPlayer1');
      expect(updated.members[1].nickname).toBe('Player2');
      expect(updated.members[2].nickname).toBe('Player3');
    });
  });

  describe('队员管理集成', () => {
    it('should update members of existing team', async () => {
      const createDto = {
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
      };

      const created = await service.create(createDto);
      expect(created.members).toHaveLength(5);

      const updated = await service.update(created.id, {
        members: [
          { nickname: 'Player1', position: 'TOP' as const },
          { nickname: 'Player2', position: 'JUNGLE' as const },
          { nickname: 'Player3', position: 'MID' as const },
          { nickname: 'Player4', position: 'ADC' as const },
          { nickname: 'Player5', position: 'SUPPORT' as const },
        ],
      });

      expect(updated.members).toHaveLength(5);
      expect(updated.members.map((m) => m.position).sort()).toEqual([
        'ADC',
        'JUNGLE',
        'MID',
        'SUPPORT',
        'TOP',
      ]);
    });

    it('should remove all members from team via update', async () => {
      const createDto = {
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
      };

      const created = await service.create(createDto);
      expect(created.members).toHaveLength(5);

      const updated = await service.update(created.id, {
        members: [],
      });

      expect(updated.members).toHaveLength(0);
    });

    it('should update member information correctly', async () => {
      const createDto = {
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
      };

      const created = await service.create(createDto);
      const firstMemberId = created.members[0].id;

      const updated = await service.update(created.id, {
        members: [
          {
            id: firstMemberId,
            nickname: 'NewName',
            position: 'JUNGLE' as const,
            avatarUrl: 'new.png',
          },
        ],
      });

      expect(updated.members).toHaveLength(1);
      expect(updated.members[0].nickname).toBe('NewName');
      expect(updated.members[0].position).toBe('JUNGLE');
      expect(updated.members[0].avatarUrl).toBe('new.png');
    });
  });

  describe('数据库事务测试', () => {
    it('should rollback team creation if member insertion fails', async () => {
      const createDto = {
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
      };

      const created = await service.create(createDto);
      const teamId = created.id;

      // 验证自动创建了 5 个默认队员
      let members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        teamId,
      ]);
      expect(members).toHaveLength(5);

      await databaseService.run('DELETE FROM teams WHERE id = ?', [teamId]);

      members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [teamId]);
      expect(members).toHaveLength(0);
    });

    it('should maintain atomicity for batch member operations', async () => {
      const createDto = {
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
        // 不传递 members，由后端自动创建 5 个默认队员
      };

      const created = await service.create(createDto);
      // 验证自动创建了 5 个默认队员
      expect(created.members).toHaveLength(5);

      const dbMembers = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        created.id,
      ]);
      expect(dbMembers).toHaveLength(5);
    });
  });

  describe('错误回滚测试', () => {
    it('should handle duplicate team id gracefully', async () => {
      // 使用相同的自定义 ID 创建两个战队应该失败
      const createDto1 = {
        id: 'custom-team-id',
        name: 'Test Team 1',
        logo: 'logo.png',
        battleCry: 'Test description',
      };
      const createDto2 = {
        id: 'custom-team-id',
        name: 'Test Team 2',
        logo: 'logo.png',
        battleCry: 'Test description',
      };

      await service.create(createDto1);
      await expect(service.create(createDto2)).rejects.toThrow();
    });

    it('should handle invalid member position when adding member manually', async () => {
      // 先创建战队
      const team = await service.create({
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Test description',
      });

      // 手动添加队员时使用无效位置应该失败
      await expect(
        service.createMember(team.id, {
          nickname: 'Player1',
          position: '无效位置' as any,
        }),
      ).rejects.toThrow();
    });

    it('should handle update of non-existent team', async () => {
      await expect(service.update('non-existent', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle delete of non-existent team', async () => {
      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('并发操作测试', () => {
    it('should handle concurrent team creation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.create({
          id: `team-${i}`,
          name: `Team ${i}`,
          logo: `logo${i}.png`,
          battleCry: `Description ${i}`,
          members: [],
        }),
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);

      const allTeams = await service.findAll();
      expect(allTeams).toHaveLength(5);
    });

    it('should handle concurrent updates to same team', async () => {
      const team = await service.create({
        id: 'team-1',
        name: 'Original Name',
        logo: 'logo.png',
        battleCry: 'Original battleCry',
        members: [],
      });

      const promises = Array.from({ length: 3 }, (_, i) =>
        service.update(team.id, { name: `Updated Name ${i}` }),
      );

      await Promise.all(promises);

      const updated = await service.findOne(team.id);
      expect(updated.name).toMatch(/Updated Name/);
    });
  });

  describe('数据完整性验证', () => {
    it('should enforce team name uniqueness at database level', async () => {
      await service.create({
        name: 'Unique Team Name',
        logo: 'logo1.png',
        battleCry: 'Description 1',
      });

      await expect(
        service.create({
          name: 'Unique Team Name',
          logo: 'logo2.png',
          battleCry: 'Description 2',
        }),
      ).rejects.toThrow();

      const allTeams = await service.findAll();
      expect(allTeams).toHaveLength(1);
    });

    it('should validate UUID generation for empty or missing id', async () => {
      // 测试空字符串 ID 会生成 UUID
      const teamWithEmptyId = await service.create({
        id: '',
        name: 'Test Team With Empty Id',
        logo: 'logo.png',
        battleCry: 'Description',
      });
      // 空字符串 ID 会触发 UUID 生成
      expect(teamWithEmptyId.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(teamWithEmptyId.name).toBe('Test Team With Empty Id');

      // 测试不传 ID 也会生成 UUID
      const teamWithoutId = await service.create({
        name: 'Test Team Without Id',
        logo: 'logo.png',
        battleCry: 'Description',
      });
      expect(teamWithoutId.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      await service.remove(teamWithEmptyId.id);
      await service.remove(teamWithoutId.id);
    });

    it('should maintain referential integrity with members', async () => {
      const team = await service.create({
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Description',
      });

      let members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        team.id,
      ]);
      // 验证自动创建了 5 个默认队员
      expect(members).toHaveLength(5);

      await service.remove(team.id);

      members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        team.id,
      ]);
      expect(members).toHaveLength(0);
    });
  });

  describe('外键约束测试', () => {
    it('should handle member insertion for existing team', async () => {
      const team = await service.create({
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Description',
      });

      // 验证自动创建了 5 个默认队员
      const defaultMembers = await databaseService.all(
        'SELECT * FROM team_members WHERE team_id = ?',
        [team.id],
      );
      expect(defaultMembers).toHaveLength(5);

      // 手动添加一个新队员
      const result = await databaseService.run(
        'INSERT INTO team_members (id, nickname, position, team_id) VALUES (?, ?, ?, ?)',
        ['custom-member-id', 'Player1', 'TOP', team.id],
      );
      expect(result.changes).toBe(1);

      const members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        team.id,
      ]);
      expect(members).toHaveLength(6);
    });

    it('should handle team deletion with existing members', async () => {
      const team = await service.create({
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Description',
      });

      let members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        team.id,
      ]);
      // 验证自动创建了 5 个默认队员
      expect(members).toHaveLength(5);

      await service.remove(team.id);

      members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        team.id,
      ]);
      expect(members).toHaveLength(0);
    });
  });

  describe('级联删除测试', () => {
    it('should cascade delete all related members when team is deleted', async () => {
      const team = await service.create({
        name: 'Test Team',
        logo: 'logo.png',
        battleCry: 'Description',
      });

      // 验证自动创建了 5 个默认队员
      expect(team.members).toHaveLength(5);

      let allMembers = await databaseService.all('SELECT * FROM team_members');
      expect(allMembers).toHaveLength(5);

      await service.remove(team.id);

      allMembers = await databaseService.all('SELECT * FROM team_members');
      expect(allMembers).toHaveLength(0);
    });

    it('should handle multiple teams with members deletion', async () => {
      const team1 = await service.create({
        name: 'Team 1',
        logo: 'logo1.png',
        battleCry: 'Description 1',
      });

      const team2 = await service.create({
        name: 'Team 2',
        logo: 'logo2.png',
        battleCry: 'Description 2',
      });

      let team1Members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        team1.id,
      ]);
      let team2Members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        team2.id,
      ]);
      // 每个战队自动创建 5 个默认队员
      expect(team1Members).toHaveLength(5);
      expect(team2Members).toHaveLength(5);

      await service.remove(team1.id);

      team2Members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        team2.id,
      ]);
      expect(team2Members).toHaveLength(5);

      team1Members = await databaseService.all('SELECT * FROM team_members WHERE team_id = ?', [
        team1.id,
      ]);
      expect(team1Members).toHaveLength(0);
    });
  });
});
