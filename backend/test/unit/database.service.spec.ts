import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const mockRun = jest.fn();
const mockGet = jest.fn();
const mockAll = jest.fn();
const mockClose = jest.fn();

const resetMocks = () => {
  mockRun.mockReset();
  mockGet.mockReset();
  mockAll.mockReset();
  mockClose.mockReset();

  mockRun.mockImplementation(function (this: any, sql: string, params: any[], callback: any) {
    callback.call({ lastID: 1, changes: 1 }, null);
  });
  mockGet.mockImplementation((sql, params, callback) => {
    callback(null, undefined);
  });
  mockAll.mockImplementation((sql, params, callback) => {
    callback(null, []);
  });
  mockClose.mockImplementation((callback) => {
    if (callback) callback(null);
  });
};

jest.mock('sqlite3', () => {
  return {
    Database: jest.fn().mockImplementation(function (
      dbPath: string,
      callback?: (err: Error | null) => void,
    ) {
      if (callback) {
        process.nextTick(() => callback(null));
      }
      return {
        run: mockRun,
        get: mockGet,
        all: mockAll,
        close: mockClose,
      };
    }),
    verbose: jest.fn().mockReturnThis(),
  };
});

import * as fs from 'fs';
import { DatabaseService } from '../../src/database/database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let configService: ConfigService;

  const mockDbPath = './data/test.db';

  beforeEach(async () => {
    resetMocks();
    jest.clearAllMocks();

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockDbPath),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('数据库连接', () => {
    it('应该使用配置中的路径连接数据库', async () => {
      await service.onModuleInit();
      expect(configService.get).toHaveBeenCalledWith('database.path');
    });

    it('当数据目录不存在时应该创建目录', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await service.onModuleInit();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  describe('执行查询 (get方法)', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该返回单行查询结果', async () => {
      const expectedRow = { id: '1', name: 'Test Team' };
      mockGet.mockImplementation((sql, params, callback) => {
        callback(null, expectedRow);
      });

      const result = await service.get('SELECT * FROM teams WHERE id = ?', ['1']);
      expect(result).toEqual(expectedRow);
    });

    it('当没有匹配行时应该返回undefined', async () => {
      mockGet.mockImplementation((sql, params, callback) => {
        callback(null, undefined);
      });

      const result = await service.get('SELECT * FROM teams WHERE id = ?', ['999']);
      expect(result).toBeUndefined();
    });
  });

  describe('执行查询 (all方法)', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该返回多行查询结果', async () => {
      const expectedRows = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
      ];
      mockAll.mockImplementation((sql, params, callback) => {
        callback(null, expectedRows);
      });

      const result = await service.all('SELECT * FROM teams');
      expect(result).toEqual(expectedRows);
      expect(result).toHaveLength(2);
    });

    it('当表为空时应该返回空数组', async () => {
      mockAll.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const result = await service.all('SELECT * FROM teams');
      expect(result).toEqual([]);
    });
  });

  describe('执行修改 (run方法)', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该执行INSERT并返回lastId和changes', async () => {
      mockRun.mockImplementation(function (this: any, sql, params, callback) {
        callback.call({ lastID: 5, changes: 1 }, null);
      });

      const result = await service.run('INSERT INTO teams (id, name) VALUES (?, ?)', [
        '5',
        'New Team',
      ]);

      expect(result.lastID).toBe(5);
      expect(result.changes).toBe(1);
    });

    it('应该执行UPDATE并返回changes数量', async () => {
      mockRun.mockImplementation(function (this: any, sql, params, callback) {
        callback.call({ lastID: 0, changes: 3 }, null);
      });

      const result = await service.run('UPDATE teams SET name = ? WHERE id > ?', ['Updated', '0']);
      expect(result.changes).toBe(3);
    });
  });

  describe('事务处理', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该支持事务的BEGIN, COMMIT操作', async () => {
      await service.run('BEGIN TRANSACTION');
      await service.run('INSERT INTO teams (id, name) VALUES (?, ?)', ['1', 'Team A']);
      await service.run('COMMIT');

      expect(mockRun).toHaveBeenCalledWith('BEGIN TRANSACTION', [], expect.any(Function));
      expect(mockRun).toHaveBeenCalledWith('COMMIT', [], expect.any(Function));
    });

    it('应该支持事务的ROLLBACK操作', async () => {
      await service.run('BEGIN TRANSACTION');
      await service.run('ROLLBACK');

      expect(mockRun).toHaveBeenCalledWith('ROLLBACK', [], expect.any(Function));
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('当SQL语法错误时应该抛出异常', async () => {
      const dbError = new Error('SQLITE_ERROR: syntax error');
      mockRun.mockImplementation((sql, params, callback) => {
        callback(dbError);
      });

      await expect(service.run('INVALID SQL')).rejects.toThrow('SQLITE_ERROR: syntax error');
    });

    it('当查询不存在的表时应该抛出异常', async () => {
      const dbError = new Error('SQLITE_ERROR: no such table: nonexistent');
      mockGet.mockImplementation((sql, params, callback) => {
        callback(dbError);
      });

      await expect(service.get('SELECT * FROM nonexistent')).rejects.toThrow('no such table');
    });
  });

  describe('数据库初始化', () => {
    it('应该创建所有必要的表', async () => {
      const executedQueries: string[] = [];
      mockRun.mockImplementation(function (this: any, sql: string, params: any[], callback: any) {
        executedQueries.push(sql);
        callback.call({ lastID: 1, changes: 1 }, null);
      });

      await service.onModuleInit();

      expect(executedQueries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS teams'))).toBe(
        true,
      );
      expect(
        executedQueries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS team_members')),
      ).toBe(true);
      expect(executedQueries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS matches'))).toBe(
        true,
      );
      expect(
        executedQueries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS stream_info')),
      ).toBe(true);
      expect(
        executedQueries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS player_match_stats')),
      ).toBe(true);
    });

    it('应该启用WAL模式', async () => {
      const executedQueries: string[] = [];
      mockRun.mockImplementation(function (this: any, sql: string, params: any[], callback: any) {
        executedQueries.push(sql);
        callback.call({ lastID: 1, changes: 1 }, null);
      });

      await service.onModuleInit();

      expect(executedQueries).toContain('PRAGMA journal_mode = WAL');
      expect(executedQueries).toContain('PRAGMA synchronous = NORMAL');
      expect(executedQueries).toContain('PRAGMA temp_store = MEMORY');
    });

    it('应该初始化默认数据', async () => {
      const executedQueries: string[] = [];
      mockRun.mockImplementation(function (this: any, sql: string, params: any[], callback: any) {
        executedQueries.push(sql);
        callback.call({ lastID: 1, changes: 1 }, null);
      });

      await service.onModuleInit();

      expect(executedQueries.some((q) => q.includes('INSERT OR IGNORE INTO stream_info'))).toBe(
        true,
      );
    });
  });

  describe('数据库关闭', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('应该在模块销毁时关闭数据库连接', () => {
      service.onModuleDestroy();
      expect(mockClose).toHaveBeenCalled();
    });

    it('当关闭出错时应该记录错误但不抛出', () => {
      const closeError = new Error('Close error');
      mockClose.mockImplementation((callback) => {
        callback(closeError);
      });

      expect(() => service.onModuleDestroy()).not.toThrow();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
