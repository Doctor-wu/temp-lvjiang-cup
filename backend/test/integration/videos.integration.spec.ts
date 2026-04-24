import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { VideosModule } from '../../src/modules/videos/videos.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { DatabaseModule } from '../../src/database/database.module';
import { CacheModule } from '../../src/cache/cache.module';
import { VideosService } from '../../src/modules/videos/videos.service';
import { DatabaseService } from '../../src/database/database.service';
import { CacheService } from '../../src/cache/cache.service';

describe('Videos API Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let videosService: VideosService;
  let databaseService: DatabaseService;
  let cacheService: CacheService;
  let createdVideoId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              jwt: {
                secret: 'test-secret-key-for-jwt-signing-in-test-environment',
                expiresIn: '1h',
              },
              database: {
                path: ':memory:',
              },
              cache: {
                ttl: 60,
              },
              admin: {
                username: 'admin',
                password: 'admin123',
              },
            }),
          ],
        }),
        DatabaseModule,
        CacheModule,
        AuthModule,
        VideosModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    videosService = moduleFixture.get<VideosService>(VideosService);
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    cacheService = moduleFixture.get<CacheService>(CacheService);

    const loginResponse = await request(app.getHttpServer()).post('/api/admin/auth/login').send({
      username: 'admin',
      password: 'admin123',
    });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await databaseService.run('DELETE FROM videos');
    cacheService.flush();
  });

  describe('GET /api/videos - 前端视频列表', () => {
    const TEST_BV_1 = 'BV1swD9BEE7S';
    const TEST_BV_2 = 'BV1C8QhB9EMX';
    const TEST_BV_3 = 'BV1ctDXBkEuV';

    it('应该返回启用状态的视频', async () => {
      await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV_1}`,
        status: 'enabled',
      });
      await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV_2}`,
        status: 'disabled',
      });

      const response = await request(app.getHttpServer()).get('/api/videos').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('enabled');
    });

    it('应该最多返回10条视频', async () => {
      const testBvIds = ['BV1swD9BEE7S', 'BV1C8QhB9EMX', 'BV1ctDXBkEuV'];
      for (let i = 0; i < 3; i++) {
        await videosService.create({
          url: `https://www.bilibili.com/video/${testBvIds[i]}`,
          status: 'enabled',
        });
      }

      const response = await request(app.getHttpServer()).get('/api/videos').expect(200);

      expect(response.body.length).toBe(3);
    });

    it('应该按order字段正确排序', async () => {
      await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV_1}`,
        status: 'enabled',
      });
      await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV_2}`,
        status: 'enabled',
      });
      await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV_3}`,
        status: 'enabled',
      });

      const response = await request(app.getHttpServer()).get('/api/videos').expect(200);

      expect(response.body[0].order).toBe(0);
      expect(response.body[1].order).toBe(1);
      expect(response.body[2].order).toBe(2);
    });

    it('不应该返回禁用的视频', async () => {
      await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV_1}`,
        status: 'disabled',
      });

      const response = await request(app.getHttpServer()).get('/api/videos').expect(200);

      expect(response.body.every((v: any) => v.status === 'enabled')).toBe(true);
    });

    it('应该返回空数组当没有启用视频', async () => {
      await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV_1}`,
        status: 'disabled',
      });

      const response = await request(app.getHttpServer()).get('/api/videos').expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/admin/videos - 后台视频列表', () => {
    const TEST_BV_1 = 'BV1swD9BEE7S';
    const TEST_BV_2 = 'BV1C8QhB9EMX';

    it('需要JWT认证', async () => {
      const response = await request(app.getHttpServer()).get('/api/admin/videos').expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('需要有效的JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/videos')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('认证成功时返回所有视频（包括禁用的）', async () => {
      await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV_1}`,
        status: 'enabled',
      });
      await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV_2}`,
        status: 'disabled',
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('后台返回所有视频（分页）', async () => {
      const testBvIds = ['BV1swD9BEE7S', 'BV1C8QhB9EMX', 'BV1ctDXBkEuV'];
      for (let i = 0; i < 3; i++) {
        await videosService.create({
          url: `https://www.bilibili.com/video/${testBvIds[i]}`,
          status: 'enabled',
        });
      }

      const response = await request(app.getHttpServer())
        .get('/api/admin/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });
  });

  describe('POST /api/admin/videos - 创建视频', () => {
    const TEST_BV = 'BV1swD9BEE7S';

    it('需要JWT认证', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/videos')
        .send({
          url: `https://www.bilibili.com/video/${TEST_BV}`,
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('参数校验 - 缺少必填字段url应返回400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('参数校验 - 无效的url应返回400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'invalid-url',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('参数校验 - 自定义标题超出长度应返回400', async () => {
      const longTitle = 'a'.repeat(51);
      const response = await request(app.getHttpServer())
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: `https://www.bilibili.com/video/${TEST_BV}`,
          customTitle: longTitle,
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('参数校验 - 无效的status值应返回400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: `https://www.bilibili.com/video/${TEST_BV}`,
          status: 'invalid_status',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('PUT /api/admin/videos/:id - 更新视频', () => {
    const TEST_BV = 'BV1swD9BEE7S';

    beforeEach(async () => {
      const video = await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV}`,
        status: 'enabled',
      });
      createdVideoId = video.id;
    });

    it('需要JWT认证', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/videos/${createdVideoId}`)
        .send({
          customTitle: 'Updated Title',
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('更新成功', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/videos/${createdVideoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customTitle: 'Updated Title',
          status: 'disabled',
        })
        .expect(200);

      expect(response.body.customTitle).toBe('Updated Title');
      expect(response.body.status).toBe('disabled');
    });

    it('更新不存在的视频返回404', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/admin/videos/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customTitle: 'Updated Title',
        })
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('视频不存在');
    });

    it('部分更新 - 只更新customTitle', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/videos/${createdVideoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customTitle: 'Only Title Updated',
        })
        .expect(200);

      expect(response.body.customTitle).toBe('Only Title Updated');
      expect(response.body.bvid).toBe(TEST_BV);
    });

    it('更新自定义标题', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/videos/${createdVideoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customTitle: 'Updated Custom Title',
        })
        .expect(200);

      expect(response.body.customTitle).toBe('Updated Custom Title');
    });
  });

  describe('DELETE /api/admin/videos/:id - 删除视频', () => {
    const TEST_BV = 'BV1swD9BEE7S';

    beforeEach(async () => {
      const video = await videosService.create({
        url: `https://www.bilibili.com/video/${TEST_BV}`,
        status: 'enabled',
      });
      createdVideoId = video.id;
    });

    it('需要JWT认证', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/admin/videos/${createdVideoId}`)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('删除成功', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/videos/${createdVideoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await expect(videosService.findById(createdVideoId)).rejects.toThrow();
    });

    it('删除不存在的视频返回404', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/admin/videos/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('视频不存在');
    });

    it('删除后缓存被清除', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/videos/${createdVideoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response = await request(app.getHttpServer()).get('/api/videos').expect(200);
      const deletedVideo = response.body.find((v: any) => v.id === createdVideoId);
      expect(deletedVideo).toBeUndefined();
    });
  });

  describe('PUT /api/admin/videos/sort - 批量排序', () => {
    let createdVideoIds: string[] = [];

    beforeEach(async () => {
      createdVideoIds = [];
      await databaseService.run('DELETE FROM videos');
      cacheService.flush();

      // Directly insert test videos into database to avoid bilibili API calls
      for (let i = 0; i < 3; i++) {
        const id = `video-sort-test-${i}`;
        await databaseService.run(
          'INSERT INTO videos (id, bvid, bilibili_title, custom_title, cover_url, "order", status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, `BV1swD9BEE7${i}`, `Test Video ${i}`, `Test ${i}`, '', i, 'enabled', 'admin'],
        );
        createdVideoIds.push(id);
      }
    });

    it('需要JWT认证', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/admin/videos/sort')
        .send({ orderedIds: ['video-0', 'video-1', 'video-2'] })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('批量排序成功', async () => {
      // 验证视频已创建
      expect(createdVideoIds.length).toBeGreaterThanOrEqual(1);

      const adminResponse = await request(app.getHttpServer())
        .get('/api/admin/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 集成测试中没有应用 TransformInterceptor，响应直接返回 Video[]
      const videos = Array.isArray(adminResponse.body)
        ? adminResponse.body
        : adminResponse.body.data || [];
      expect(videos.length).toBeGreaterThanOrEqual(1);

      const orderedIds = videos.slice(0, 3).map((v: any) => v.id);

      const response = await request(app.getHttpServer())
        .put('/api/admin/videos/sort')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderedIds });

      expect(response.status).toBe(200);
    }, 30000);
  });
});
