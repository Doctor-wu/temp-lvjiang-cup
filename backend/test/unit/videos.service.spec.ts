import { Test, TestingModule } from '@nestjs/testing';
import { VideosService, SortItem } from '../../src/modules/videos/videos.service';
import { DatabaseService } from '../../src/database/database.service';
import { CacheService } from '../../src/cache/cache.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock sqlite3 before any imports that use it
const mockRun = jest.fn();
const mockGet = jest.fn();
const mockAll = jest.fn();
const mockClose = jest.fn();

jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(function () {
    return { run: mockRun, get: mockGet, all: mockAll, close: mockClose };
  }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    end: jest.fn(),
    close: jest.fn(),
  }),
}));

describe('VideosService', () => {
  let service: VideosService;
  let databaseService: DatabaseService;
  let cacheService: CacheService;

  const mockDatabaseService = {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
    findFileByHash: jest.fn(),
    recordFileHash: jest.fn(),
    deleteFileHashByPath: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockVideoRow = {
    id: '1',
    bilibili_title: 'Test Video',
    custom_title: '',
    bvid: 'BV1234567890',
    page: 1,
    cover_url: 'test-cover.jpg',
    order: 0,
    status: 'enabled',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<VideosService>(VideosService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    cacheService = module.get<CacheService>(CacheService);

    jest.spyOn(service, 'fetchAndSaveCover').mockResolvedValue('test-cover.jpg');
    jest.spyOn(service, 'fetchBilibiliMeta').mockResolvedValue({
      title: 'Test Video',
      coverUrl: 'https://example.com/cover.jpg',
      embedable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该返回最多10条启用视频', async () => {
      const mockVideos = [
        { ...mockVideoRow, id: 1, title: 'Video 1' },
        { ...mockVideoRow, id: 2, title: 'Video 2' },
      ];
      mockCacheService.get.mockReturnValue(undefined);
      mockDatabaseService.all.mockResolvedValue(mockVideos);

      const result = await service.findAll(false);

      expect(result).toHaveLength(2);
      expect(mockDatabaseService.all).toHaveBeenCalledWith(
        'SELECT * FROM videos WHERE status = \'enabled\' ORDER BY "order" ASC',
      );
    });

    it('应该使用缓存', async () => {
      const cachedVideos = [
        {
          id: '1',
          title: 'Cached Video',
          bvid: 'BV1234567890',
          page: 1,
          coverUrl: 'http://example.com/cover.jpg',
          order: 0,
          status: 'enabled',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          createdBy: 'admin',
        },
      ];
      mockCacheService.get.mockReturnValue(cachedVideos);

      const result = await service.findAll(false);

      expect(result).toEqual(cachedVideos);
      expect(mockCacheService.get).toHaveBeenCalledWith('videos:all');
      expect(mockDatabaseService.all).not.toHaveBeenCalled();
    });

    it('应该包含缓存设置', async () => {
      mockCacheService.get.mockReturnValue(undefined);
      mockDatabaseService.all.mockResolvedValue([mockVideoRow]);

      await service.findAll(false);

      expect(mockCacheService.set).toHaveBeenCalledWith('videos:all', expect.any(Array));
    });

    it('应该返回所有视频（包括禁用的）当 includeDisabled 为 true', async () => {
      mockCacheService.get.mockReturnValue(undefined);
      mockDatabaseService.all.mockResolvedValue([mockVideoRow]);

      const result = await service.findAll(true);

      expect(result).toHaveLength(1);
      expect(mockDatabaseService.all).toHaveBeenCalledWith(
        'SELECT * FROM videos ORDER BY "order" ASC',
      );
    });
  });

  describe('findAllAdmin', () => {
    it('应该返回所有视频（包括禁用的）', async () => {
      mockCacheService.get.mockReturnValue(undefined);
      mockDatabaseService.all.mockResolvedValue([mockVideoRow]);

      const result = await service.findAllAdmin();

      expect(mockDatabaseService.all).toHaveBeenCalledWith(
        'SELECT * FROM videos ORDER BY "order" ASC',
      );
    });
  });

  describe('findById', () => {
    it('应该返回指定ID的视频', async () => {
      mockDatabaseService.get.mockResolvedValue(mockVideoRow);

      const result = await service.findById('1');

      expect(result.id).toBe('1');
      expect(result.title).toBe('Test Video');
      expect(mockDatabaseService.get).toHaveBeenCalledWith('SELECT * FROM videos WHERE id = ?', [
        '1',
      ]);
    });

    it('应该在视频不存在时抛出NotFoundException', async () => {
      mockDatabaseService.get.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      url: 'https://www.bilibili.com/video/BV1234567890',
      customTitle: 'New Video',
      order: 0,
      status: 'enabled',
    };

    it('应该创建新视频', async () => {
      mockCacheService.get.mockReturnValue(undefined);
      mockDatabaseService.get
        .mockResolvedValueOnce({ count: 5 }) // for count check
        .mockResolvedValueOnce(null) // for existing bvid check
        .mockImplementation((sql: string) => {
          // For findById after creation - return mockVideoRow for any ID
          return Promise.resolve(mockVideoRow);
        });
      mockDatabaseService.run.mockResolvedValue({ lastID: 6 });

      const result = await service.create(createDto);

      expect(mockDatabaseService.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO videos'),
        expect.arrayContaining(['BV1234567890']),
      );
      expect(mockCacheService.del).toHaveBeenCalled();
    });

    it('应该检测重复bvid+page', async () => {
      mockCacheService.get.mockReturnValue(undefined);
      mockDatabaseService.get
        .mockResolvedValueOnce({ count: 5 })
        .mockResolvedValueOnce(mockVideoRow);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('应该检测启用数量限制（最多10个）', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({ count: 10 });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('应该使用默认order值0', async () => {
      const dtoWithoutOrder = { url: 'https://www.bilibili.com/video/BV1234567890' };
      mockCacheService.get.mockReturnValue(undefined);
      mockDatabaseService.get
        .mockResolvedValueOnce({ count: 5 })
        .mockResolvedValueOnce(null)
        .mockImplementation((sql: string) => {
          return Promise.resolve(mockVideoRow);
        });
      mockDatabaseService.run.mockResolvedValue({ lastID: 6 });

      await service.create(dtoWithoutOrder as any);

      expect(mockDatabaseService.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO videos'),
        expect.arrayContaining([0]),
      );
    });
  });

  describe('update', () => {
    it('应该更新视频', async () => {
      const updatedRow = { ...mockVideoRow, custom_title: 'Updated Title' };
      mockDatabaseService.get
        .mockResolvedValueOnce(mockVideoRow) // for findById (existence check)
        .mockResolvedValueOnce(updatedRow); // for findById (return updated)
      mockDatabaseService.run.mockResolvedValue(undefined);

      const result = await service.update('1', { customTitle: 'Updated Title' });

      expect(mockDatabaseService.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE videos SET'),
        expect.arrayContaining(['Updated Title']),
      );
      expect(result.title).toBe('Updated Title');
    });

    it('应该在视频不存在时抛出NotFoundException', async () => {
      mockDatabaseService.get.mockResolvedValue(null);

      await expect(service.update('999', { customTitle: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('应该删除视频', async () => {
      mockDatabaseService.get.mockResolvedValue(mockVideoRow);
      mockDatabaseService.run.mockResolvedValue(undefined);

      await service.remove('1');

      expect(mockDatabaseService.run).toHaveBeenCalledWith('DELETE FROM videos WHERE id = ?', [
        '1',
      ]);
      expect(mockCacheService.del).toHaveBeenCalled();
    });

    it('应该在视频不存在时抛出NotFoundException', async () => {
      mockDatabaseService.get.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sort', () => {
    it('应该批量排序视频', async () => {
      const sortItems: SortItem[] = [
        { id: '1', order: 1 },
        { id: '2', order: 2 },
      ];
      mockDatabaseService.run.mockResolvedValue(undefined);
      mockDatabaseService.get.mockResolvedValueOnce(null);
      mockDatabaseService.all.mockResolvedValue([mockVideoRow]);

      const result = await service.sort(sortItems);

      expect(mockDatabaseService.run).toHaveBeenCalledTimes(2);
      expect(mockCacheService.del).toHaveBeenCalled();
    });

    it('应该清除缓存', async () => {
      const sortItems: SortItem[] = [{ id: '1', order: 1 }];
      mockDatabaseService.run.mockResolvedValue(undefined);
      mockDatabaseService.get.mockResolvedValueOnce(null);
      mockDatabaseService.all.mockResolvedValue([mockVideoRow]);

      await service.sort(sortItems);

      expect(mockCacheService.del).toHaveBeenCalled();
    });
  });
});
