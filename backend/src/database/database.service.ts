import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// 生产部署时考虑数据库迁移问题，开发阶段直接删除数据库文件重建即可
// 打开数据库
function openDatabase(dbPath: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// 运行 SQL 结果接口
export interface RunResult {
  lastID: number;
  changes: number;
}

// 运行 SQL
function run(db: sqlite3.Database, sql: string, params: any[] = []): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes,
        });
      }
    });
  });
}

// 获取单行
function get<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row as T);
      }
    });
  });
}

// 获取多行
function all<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db: sqlite3.Database;
  private isConnected = false;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const dbPath = this.configService.get<string>('database.path');

    // 确保数据目录存在
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 创建数据库连接
    try {
      this.db = await openDatabase(dbPath);
      this.isConnected = true;
      this.logger.log('Database connected');

      // 启用 WAL 模式提升性能
      await run(this.db, 'PRAGMA journal_mode = WAL');
      await run(this.db, 'PRAGMA synchronous = NORMAL');
      await run(this.db, 'PRAGMA temp_store = MEMORY');
      await run(this.db, 'PRAGMA mmap_size = 30000000000');

      // 初始化表结构
      await this.initTables();
    } catch (err) {
      this.logger.error('Database initialization failed', err.message);
      throw err;
    }
  }

  onModuleDestroy() {
    if (this.db && this.isConnected) {
      this.isConnected = false;
      this.db.close((err) => {
        if (err) {
          // 只记录非"Database handle is closed"的错误
          if (!err.message?.includes('Database handle is closed')) {
            this.logger.error('Error closing database', err.message);
          }
        } else {
          this.logger.log('Database connection closed');
        }
      });
    }
  }

  getDatabase(): sqlite3.Database {
    return this.db;
  }

  async begin(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async commit(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async rollback(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('ROLLBACK', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // 包装方法供其他服务使用
  async run(sql: string, params: any[] = []): Promise<RunResult> {
    return run(this.db, sql, params);
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return get<T>(this.db, sql, params);
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return all<T>(this.db, sql, params);
  }

  async initTables() {
    // teams 表
    await run(
      this.db,
      `
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
    `,
    );

    // team_members 表 (原 players 表)
    await run(
      this.db,
      `
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `,
    );

    // matches 表
    await run(
      this.db,
      `
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        team_a_id TEXT,
        team_b_id TEXT,
        score_a INTEGER DEFAULT 0,
        score_b INTEGER DEFAULT 0,
        winner_id TEXT,
        round TEXT,
        status TEXT CHECK(status IN ('upcoming', 'ongoing', 'finished')),
        start_time TEXT,
        stage TEXT CHECK(stage IN ('swiss', 'elimination')),
        swiss_record TEXT,
        swiss_round INTEGER,
        bo_format TEXT,
        elimination_bracket TEXT CHECK(elimination_bracket IN ('quarterfinals', 'semifinals', 'finals')),
        elimination_game_number INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_a_id) REFERENCES teams(id),
        FOREIGN KEY (team_b_id) REFERENCES teams(id),
        FOREIGN KEY (winner_id) REFERENCES teams(id)
      )
    `,
    );

    // stream_info 表
    await run(
      this.db,
      `
      CREATE TABLE IF NOT EXISTS stream_info (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        title TEXT,
        url TEXT,
        is_live INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    );

    // streamers 表
    await run(
      this.db,
      `
      CREATE TABLE IF NOT EXISTS streamers (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        poster_url TEXT,
        bio TEXT,
        live_url TEXT,
        streamer_type TEXT CHECK(streamer_type IN ('internal', 'guest')),
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    );

    // videos 表
    await run(
      this.db,
      `
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        bvid TEXT NOT NULL,
        bilibili_title TEXT,
        custom_title TEXT,
        cover_url TEXT,
        "order" INTEGER DEFAULT 0,
        status TEXT CHECK(status IN ('enabled', 'disabled')) DEFAULT 'enabled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
      )
    `,
    );

    // videos表唯一索引(bvid)
    await run(this.db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_bvid ON videos(bvid)`);

    // teams表唯一索引(name)
    await run(this.db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_name ON teams(name)`);

    // match_games 表（对战数据表）
    await run(
      this.db,
      `
      CREATE TABLE IF NOT EXISTS match_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT NOT NULL,
        game_number INTEGER NOT NULL CHECK(game_number BETWEEN 1 AND 5),
        winner_team_id TEXT,
        game_duration TEXT,
        game_start_time TEXT,
        blue_team_id TEXT,
        red_team_id TEXT,
        blue_kills INTEGER DEFAULT 0,
        blue_gold INTEGER DEFAULT 0,
        blue_towers INTEGER DEFAULT 0,
        blue_dragons INTEGER DEFAULT 0,
        blue_barons INTEGER DEFAULT 0,
        red_kills INTEGER DEFAULT 0,
        red_gold INTEGER DEFAULT 0,
        red_towers INTEGER DEFAULT 0,
        red_dragons INTEGER DEFAULT 0,
        red_barons INTEGER DEFAULT 0,
        red_ban TEXT,                      -- 红方BAN列表，JSON数组格式 ["Aatrox", "Graves", ...]
        blue_ban TEXT,                     -- 蓝方BAN列表，JSON数组格式 ["Renekton", "LeeSin", ...]
        status INTEGER DEFAULT 1 CHECK(status IN (0, 1)),
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_team_id) REFERENCES teams(id),
        FOREIGN KEY (blue_team_id) REFERENCES teams(id),
        FOREIGN KEY (red_team_id) REFERENCES teams(id),
        UNIQUE(match_id, game_number)
      )
    `,
    );

    // match_games 表索引
    await run(
      this.db,
      `CREATE INDEX IF NOT EXISTS idx_match_games_match_id ON match_games(match_id)`,
    );
    await run(this.db, `CREATE INDEX IF NOT EXISTS idx_match_games_status ON match_games(status)`);

    // player_match_stats 表（选手对战数据表）
    await run(
      this.db,
      `
      CREATE TABLE IF NOT EXISTS player_match_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_game_id INTEGER NOT NULL,
        player_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        position TEXT CHECK(position IN ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT')),
        champion_name TEXT,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        cs INTEGER DEFAULT 0,
        gold INTEGER DEFAULT 0,
        damage_dealt INTEGER DEFAULT 0,
        damage_taken INTEGER DEFAULT 0,
        vision_score INTEGER DEFAULT 0,
        wards_placed INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        first_blood INTEGER DEFAULT 0,
        mvp INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_game_id) REFERENCES match_games(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES team_members(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        UNIQUE(match_game_id, player_id)
      )
    `,
    );

    // player_match_stats 表索引
    await run(
      this.db,
      `CREATE INDEX IF NOT EXISTS idx_player_match_stats_match_game_id ON player_match_stats(match_game_id)`,
    );
    await run(
      this.db,
      `CREATE INDEX IF NOT EXISTS idx_player_match_stats_player_id ON player_match_stats(player_id)`,
    );
    await run(
      this.db,
      `CREATE INDEX IF NOT EXISTS idx_player_match_stats_team_id ON player_match_stats(team_id)`,
    );
    await run(
      this.db,
      `CREATE INDEX IF NOT EXISTS idx_player_match_stats_position ON player_match_stats(position)`,
    );

    // file_hashes 表（图片去重）
    await run(
      this.db,
      `
      CREATE TABLE IF NOT EXISTS file_hashes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL CHECK(file_type IN ('avatar', 'logo', 'poster', 'cover')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    );

    await run(this.db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_file_hash ON file_hashes(hash)`);

    // 初始化 stream_info 的默认数据
    await this.initDefaultData();

    this.logger.log('Database tables initialized');
  }

  private async initDefaultData() {
    // 初始化 stream_info
    await run(
      this.db,
      `
      INSERT OR IGNORE INTO stream_info (id, title, url, is_live)
      VALUES (1, '', '', 0)
    `,
    );
  }

  // file_hashes 表操作方法
  async findFileByHash(
    hash: string,
  ): Promise<{ hash: string; file_path: string; file_type: string } | undefined> {
    return this.get<{ hash: string; file_path: string; file_type: string }>(
      'SELECT hash, file_path, file_type FROM file_hashes WHERE hash = ?',
      [hash],
    );
  }

  async recordFileHash(hash: string, filePath: string, fileType: string): Promise<void> {
    await this.run('INSERT INTO file_hashes (hash, file_path, file_type) VALUES (?, ?, ?)', [
      hash,
      filePath,
      fileType,
    ]);
  }

  async deleteFileHash(hash: string): Promise<void> {
    await this.run('DELETE FROM file_hashes WHERE hash = ?', [hash]);
  }

  async deleteFileHashByPath(filePath: string): Promise<void> {
    await this.run('DELETE FROM file_hashes WHERE file_path = ?', [filePath]);
  }

  // 清空所有数据
  async clearAllData() {
    // 先删除有外键依赖的子表
    await run(this.db, 'DELETE FROM player_match_stats');
    await run(this.db, 'DELETE FROM match_games');
    // 再删除其他表
    await run(this.db, 'DELETE FROM team_members');
    await run(this.db, 'DELETE FROM teams');
    await run(this.db, 'DELETE FROM matches');
    await run(this.db, 'DELETE FROM streamers');
    await run(this.db, 'DELETE FROM videos');
    await run(this.db, 'DELETE FROM file_hashes');
    await run(
      this.db,
      `UPDATE stream_info SET title = '', url = '', is_live = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    );
    this.logger.log('All data cleared');
  }

  // 重置比赛槽位（清空战队和比分，保留槽位结构）
  async resetMatchSlots() {
    await run(
      this.db,
      `
      UPDATE matches 
      SET team_a_id = NULL, team_b_id = NULL, score_a = 0, score_b = 0, 
          winner_id = NULL, status = 'upcoming', updated_at = CURRENT_TIMESTAMP
    `,
    );
    this.logger.log('Match slots reset');
  }
}
