import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../cache/cache.service';
import * as xlsx from 'xlsx';
import {
  validateMatchInfo,
  validateTeamStats,
  validatePlayerStats,
  validateTeamNamesMatch,
  validateParsedMatchData,
  parseSheetGameNumber,
  validateGameNumberUniqueness,
  validateSheetsForFormat,
  validateGameNumberConsistency,
  ImportOptions,
  ValidSheetInfo,
  GameNumberWarning,
  SingleGameImportResult,
  MultiGameImportResponse,
  ParsedMatchData,
  MatchInfoData,
  TeamStatsData,
  PlayerStatsData,
  BanData,
} from '../utils/match-excel.util';
import {
  NoValidSheetException,
  DuplicateGameNumberException,
  GameNumberExceedFormatException,
} from './errors/match-data-import.errors';

@Injectable()
export class MatchDataService {
  private readonly logger = new Logger(MatchDataService.name);
  private readonly CACHE_TTL = 60; // 60 seconds

  constructor(
    private databaseService: DatabaseService,
    private cacheService: CacheService,
  ) {}

  // ============= 缓存相关方法 =============

  private getCheckCacheKey(matchId: string): string {
    return `match_data:check:${matchId}`;
  }

  private getSeriesCacheKey(matchId: string): string {
    return `match_data:series:${matchId}`;
  }

  private getGameCacheKey(matchId: string, gameNumber: number): string {
    return `match_data:game:${matchId}:${gameNumber}`;
  }

  private clearMatchCache(matchId: string): void {
    // 清除所有与matchId相关的缓存
    const cacheKeys = this.cacheService.get<string[]>('match_data:keys');
    if (cacheKeys) {
      cacheKeys.forEach((key) => {
        if (key.includes(matchId)) {
          this.cacheService.del(key);
        }
      });
    }

    // 尝试清除已知key
    this.cacheService.del(this.getCheckCacheKey(matchId));
    this.cacheService.del(this.getSeriesCacheKey(matchId));

    // 清除game缓存 (1-5)
    for (let i = 1; i <= 5; i++) {
      this.cacheService.del(this.getGameCacheKey(matchId, i));
    }
  }

  // ============= 公共查询方法 =============

  /**
   * 检查比赛是否有数据
   */
  async checkMatchDataExists(matchId: string): Promise<{ hasData: boolean; gameCount: number }> {
    const cacheKey = this.getCheckCacheKey(matchId);

    // 尝试从缓存获取
    const cached = this.cacheService.get<{ hasData: boolean; gameCount: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    // 检查比赛是否存在
    const match = await this.databaseService.get<any>('SELECT id FROM matches WHERE id = ?', [
      matchId,
    ]);

    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }

    // 查询数据条数
    const result = await this.databaseService.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM match_games WHERE match_id = ? AND status = 1',
      [matchId],
    );

    const response = {
      hasData: result.count > 0,
      gameCount: result.count,
    };

    // 写入缓存
    this.cacheService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  /**
   * 获取系列赛信息（包括所有对局概要）
   */
  async getMatchSeries(matchId: string): Promise<any> {
    const cacheKey = this.getSeriesCacheKey(matchId);

    // 尝试从缓存获取
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // 检查比赛是否存在并获取信息
    const match = await this.databaseService.get<any>(
      'SELECT id, team_a_id, team_b_id, bo_format FROM matches WHERE id = ?',
      [matchId],
    );

    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }

    // 获取战队信息
    const teamA = await this.databaseService.get<any>('SELECT id, name FROM teams WHERE id = ?', [
      match.team_a_id,
    ]);

    const teamB = await this.databaseService.get<any>('SELECT id, name FROM teams WHERE id = ?', [
      match.team_b_id,
    ]);

    // 获取所有game概要
    const games = await this.databaseService.all<any>(
      `SELECT game_number, winner_team_id, game_duration, status 
       FROM match_games 
       WHERE match_id = ? 
       ORDER BY game_number ASC`,
      [matchId],
    );

    // 计算预期的game数量
    const maxGames = this.getMaxGames(match.bo_format);

    // 构建games数组
    const gameSummaries = [];
    for (let i = 1; i <= maxGames; i++) {
      const game = games.find((g) => g.game_number === i);
      gameSummaries.push({
        gameNumber: i,
        winnerTeamId: game?.winner_team_id || null,
        gameDuration: game?.game_duration || null,
        hasData: !!game && game.status === 1,
      });
    }

    const response = {
      matchId: match.id,
      teamA: teamA ? { id: teamA.id, name: teamA.name } : null,
      teamB: teamB ? { id: teamB.id, name: teamB.name } : null,
      format: match.bo_format || 'BO1',
      games: gameSummaries,
    };

    // 写入缓存
    this.cacheService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  /**
   * 获取具体某一局的完整数据
   */
  async getMatchGameData(matchId: string, gameNumber: number): Promise<any> {
    const cacheKey = this.getGameCacheKey(matchId, gameNumber);

    // 尝试从缓存获取
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // 检查比赛是否存在
    const match = await this.databaseService.get<any>(
      'SELECT id, bo_format FROM matches WHERE id = ?',
      [matchId],
    );

    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }

    // 验证gameNumber是否在bo_format范围内
    const maxGames = this.getMaxGames(match.bo_format);
    if (gameNumber > maxGames) {
      throw new BadRequestException({
        code: 40002,
        message: `Game number ${gameNumber} exceeds the BO format limit (${maxGames})`,
      });
    }

    // 获取game数据（包含BAN信息和BV号）
    const game = await this.databaseService.get<any>(
      `SELECT id, match_id, game_number, winner_team_id, game_duration, game_start_time,
              blue_team_id, red_team_id,
              blue_kills, blue_gold, blue_towers, blue_dragons, blue_barons,
              red_kills, red_gold, red_towers, red_dragons, red_barons,
              red_ban, blue_ban, video_bvid
       FROM match_games
       WHERE match_id = ? AND game_number = ? AND status = 1`,
      [matchId, gameNumber],
    );

    if (!game) {
      // 数据不存在时返回 null，而非抛出404异常
      // 这样前端可以正常处理未导入数据的情况
      return null;
    }

    // 获取蓝色方战队信息
    const blueTeam = await this.databaseService.get<any>(
      'SELECT id, name, logo_url FROM teams WHERE id = ?',
      [game.blue_team_id],
    );

    // 获取红色方战队信息
    const redTeam = await this.databaseService.get<any>(
      'SELECT id, name, logo_url FROM teams WHERE id = ?',
      [game.red_team_id],
    );

    // 获取选手统计数据并按位置排序
    const playerStatsRaw = await this.databaseService.all<any>(
      `SELECT pms.id, pms.player_id, pms.position, pms.champion_name,
              pms.kills, pms.deaths, pms.assists, pms.cs, pms.gold,
              pms.damage_dealt, pms.damage_taken, pms.vision_score,
              pms.wards_placed, pms.level, pms.first_blood, pms.mvp,
              pms.team_id,
              tm.nickname as player_name,
              tm.avatar_url as player_avatar_url,
              t.name as team_name
       FROM player_match_stats pms
       JOIN team_members tm ON pms.player_id = tm.id
       JOIN teams t ON pms.team_id = t.id
       WHERE pms.match_game_id = ?
       ORDER BY pms.team_id, 
                CASE pms.position
                  WHEN 'TOP' THEN 1
                  WHEN 'JUNGLE' THEN 2
                  WHEN 'MID' THEN 3
                  WHEN 'ADC' THEN 4
                  WHEN 'SUPPORT' THEN 5
                  ELSE 6
                END`,
      [game.id],
    );

    // 格式化选手统计数据
    const playerStats = playerStatsRaw.map((ps) => ({
      id: ps.id,
      playerId: ps.player_id,
      playerName: ps.player_name,
      playerAvatarUrl: ps.player_avatar_url || null,
      teamId: ps.team_id,
      teamName: ps.team_name,
      position: ps.position,
      championName: ps.champion_name,
      kills: ps.kills,
      deaths: ps.deaths,
      assists: ps.assists,
      kda: `${ps.kills}/${ps.deaths}/${ps.assists}`,
      cs: ps.cs,
      gold: ps.gold,
      damageDealt: ps.damage_dealt,
      damageTaken: ps.damage_taken,
      visionScore: ps.vision_score,
      wardsPlaced: ps.wards_placed,
      level: ps.level,
      firstBlood: ps.first_blood === 1,
      mvp: ps.mvp === 1,
    }));

    // 聚合团队总伤害和总承伤
    const redTeamDamage = playerStatsRaw
      .filter((ps) => ps.team_id === game.red_team_id)
      .reduce((sum, ps) => sum + (ps.damage_dealt || 0), 0);

    const redTeamDamageTaken = playerStatsRaw
      .filter((ps) => ps.team_id === game.red_team_id)
      .reduce((sum, ps) => sum + (ps.damage_taken || 0), 0);

    const blueTeamDamage = playerStatsRaw
      .filter((ps) => ps.team_id === game.blue_team_id)
      .reduce((sum, ps) => sum + (ps.damage_dealt || 0), 0);

    const blueTeamDamageTaken = playerStatsRaw
      .filter((ps) => ps.team_id === game.blue_team_id)
      .reduce((sum, ps) => sum + (ps.damage_taken || 0), 0);

    // 解析BAN数据（JSON字符串转数组）
    const parseBans = (banJson: string | null): string[] => {
      if (!banJson) return [];
      try {
        const parsed = JSON.parse(banJson);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    // 构建响应
    const response = {
      id: game.id,
      matchId: game.match_id,
      gameNumber: game.game_number,
      winnerTeamId: game.winner_team_id,
      gameDuration: game.game_duration, // 保留兼容
      gameStartTime: game.game_start_time,
      videoBvid: game.video_bvid || null, // 新增
      blueTeam: {
        teamId: game.blue_team_id,
        teamName: blueTeam?.name || '',
        logoUrl: blueTeam?.logo_url || '',
        side: 'blue' as const,
        kills: game.blue_kills,
        gold: game.blue_gold,
        towers: game.blue_towers,
        dragons: game.blue_dragons,
        barons: game.blue_barons,
        isWinner: game.winner_team_id === game.blue_team_id,
        totalDamage: blueTeamDamage,
        totalDamageTaken: blueTeamDamageTaken,
      },
      redTeam: {
        teamId: game.red_team_id,
        teamName: redTeam?.name || '',
        logoUrl: redTeam?.logo_url || '',
        side: 'red' as const,
        kills: game.red_kills,
        gold: game.red_gold,
        towers: game.red_towers,
        dragons: game.red_dragons,
        barons: game.red_barons,
        isWinner: game.winner_team_id === game.red_team_id,
        totalDamage: redTeamDamage,
        totalDamageTaken: redTeamDamageTaken,
      },
      bans: {
        red: parseBans(game.red_ban),
        blue: parseBans(game.blue_ban),
      },
      playerStats,
    };

    // 写入缓存
    this.cacheService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  // ============= 管理员操作方法 =============

  /**
   * 从Excel导入比赛数据
   * 支持多Sheet导入，每个Sheet对应一局比赛
   */
  async importMatchData(
    matchId: string,
    file: Express.Multer.File,
    adminId: string,
    options?: ImportOptions,
  ): Promise<
    | MultiGameImportResponse
    | {
        imported: boolean;
        gameNumber: number;
        playerCount: number;
        failedCount: number;
        overwritten: boolean;
        failedPlayers?: Array<{
          row: number;
          nickname: string;
          side: string;
          type: string;
          message: string;
        }>;
      }
  > {
    const { dryRun = false, confirmWarnings = false } = options || {};

    // 读取Excel文件
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });

    // 解析所有Sheet名称
    const validSheets: ValidSheetInfo[] = [];
    for (const sheetName of workbook.SheetNames) {
      const gameNumber = parseSheetGameNumber(sheetName);
      if (gameNumber !== null) {
        validSheets.push({ sheetName, gameNumber });
      }
    }

    // 如果没有有效Sheet，抛出NoValidSheetException
    if (validSheets.length === 0) {
      throw new NoValidSheetException();
    }

    // 校验局数唯一性
    const uniquenessResult = validateGameNumberUniqueness(validSheets);
    if (!uniquenessResult.valid) {
      throw new DuplicateGameNumberException(uniquenessResult.errors);
    }

    // 校验赛制合法性
    const match = await this.databaseService.get<any>(
      'SELECT id, bo_format FROM matches WHERE id = ?',
      [matchId],
    );
    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }
    const formatResult = validateSheetsForFormat(validSheets, match.bo_format);
    if (!formatResult.valid) {
      throw new GameNumberExceedFormatException(formatResult.errors);
    }

    // 按局数排序后逐Sheet解析数据
    const sortedSheets = validSheets.sort((a, b) => a.gameNumber - b.gameNumber);
    const warnings: GameNumberWarning[] = [];
    const parsedResults: ParsedMatchData[] = [];

    for (const sheetInfo of sortedSheets) {
      const sheet = workbook.Sheets[sheetInfo.sheetName];
      // 直接读取Sheet的单元格数据
      const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // 构造ParsedMatchData对象
      const parsedData = this.parseSheetData(sheetData);

      // 局数一致性校验
      const consistency = validateGameNumberConsistency(
        sheetInfo.gameNumber,
        parsedData.matchInfo.gameNumber,
      );
      if (!consistency.consistent && consistency.warning) {
        warnings.push({ ...consistency.warning, sheetName: sheetInfo.sheetName });
      }

      // 以Sheet局数为准
      parsedData.matchInfo.gameNumber = sheetInfo.gameNumber;
      parsedResults.push(parsedData);
    }

    // 如果有告警且用户未确认，返回告警
    if (warnings.length > 0 && !confirmWarnings) {
      return {
        imported: false,
        totalGames: sortedSheets.length,
        results: [],
        warnings,
      };
    }

    // 预检模式
    if (dryRun) {
      return {
        imported: false,
        totalGames: sortedSheets.length,
        results: sortedSheets.map((s) => ({
          gameNumber: s.gameNumber,
          imported: false,
          playerCount: 0,
          failedCount: 0,
          overwritten: false,
        })),
      };
    }

    // 逐Sheet导入数据
    const results: SingleGameImportResult[] = [];
    for (const parsedData of parsedResults) {
      try {
        const result = await this.importSingleGameData(matchId, parsedData, adminId);
        results.push(result);
      } catch (error) {
        results.push({
          gameNumber: parsedData.matchInfo.gameNumber,
          imported: false,
          playerCount: 0,
          failedCount: 0,
          overwritten: false,
          error: error.message,
        });
      }
    }

    return {
      imported: results.every((r) => r.imported),
      totalGames: results.length,
      results,
    };
  }

  /**
   * 导入单局比赛数据
   * 将原有importMatchData的核心逻辑抽取为私有方法
   */
  private async importSingleGameData(
    matchId: string,
    parsedData: ParsedMatchData,
    adminId: string,
  ): Promise<SingleGameImportResult> {
    // 检查比赛是否存在
    const match = await this.databaseService.get<any>(
      'SELECT id, team_a_id, team_b_id, bo_format FROM matches WHERE id = ?',
      [matchId],
    );

    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }

    // 获取对战中的战队信息
    const teamA = await this.databaseService.get<any>('SELECT id, name FROM teams WHERE id = ?', [
      match.team_a_id,
    ]);
    const teamB = await this.databaseService.get<any>('SELECT id, name FROM teams WHERE id = ?', [
      match.team_b_id,
    ]);

    if (!teamA || !teamB) {
      throw new NotFoundException('对战中的战队信息不完整');
    }

    // 验证Excel中的战队名称是否与所选对战中的战队名称一致
    const teamNamesValidation = validateTeamNamesMatch(
      parsedData.matchInfo.teamAName,
      parsedData.matchInfo.teamBName,
      teamA.name,
      teamB.name,
    );

    if (!teamNamesValidation.valid) {
      throw new BadRequestException({
        code: 40001,
        message: '战队名称不匹配',
        errors: teamNamesValidation.errors,
      });
    }

    // 验证MatchInfo
    const matchInfoValidation = validateMatchInfo(parsedData.matchInfo);
    if (!matchInfoValidation.valid) {
      throw new BadRequestException({
        code: 40001,
        message: 'Match info validation failed',
        errors: matchInfoValidation.errors,
      });
    }

    // 验证game number
    const maxGames = this.getMaxGames(match.bo_format);
    if (parsedData.matchInfo.gameNumber > maxGames) {
      throw new BadRequestException({
        code: 40002,
        message: `Game number ${parsedData.matchInfo.gameNumber} exceeds the BO format limit (${maxGames})`,
      });
    }

    // 验证TeamStats
    for (let i = 0; i < parsedData.teamStats.length; i++) {
      const validation = validateTeamStats(parsedData.teamStats[i], i + 1);
      if (!validation.valid) {
        throw new BadRequestException({
          code: 40001,
          message: 'Team stats validation failed',
          errors: validation.errors,
        });
      }
    }

    // 验证PlayerStats
    for (let i = 0; i < parsedData.playerStats.length; i++) {
      const validation = validatePlayerStats(parsedData.playerStats[i], i + 1);
      if (!validation.valid) {
        throw new BadRequestException({
          code: 40001,
          message: 'Player stats validation failed',
          errors: validation.errors,
        });
      }
    }

    // 验证英雄名称（BAN和选手使用英雄）
    const championValidation = validateParsedMatchData(parsedData);
    if (!championValidation.valid) {
      throw new BadRequestException({
        code: 40002,
        message: '英雄名称验证失败',
        errors: championValidation.errors,
      });
    }

    // 使用事务导入数据
    await this.databaseService.begin();

    try {
      // 确定蓝色方和红色方
      const blueTeamName = this.normalizeTeamName(parsedData.matchInfo.teamBName);
      const redTeamName = this.normalizeTeamName(parsedData.matchInfo.teamAName);

      // 匹配战队ID
      let blueTeamId = await this.matchTeamName(blueTeamName);
      let redTeamId = await this.matchTeamName(redTeamName);

      // 如果没有精确匹配，尝试使用比赛中的战队
      if (!blueTeamId && match.team_a_id && match.team_b_id) {
        // 根据名称匹配
        const teamAData = await this.databaseService.get<any>(
          'SELECT id, name FROM teams WHERE id = ?',
          [match.team_a_id],
        );
        const teamBData = await this.databaseService.get<any>(
          'SELECT id, name FROM teams WHERE id = ?',
          [match.team_b_id],
        );

        if (teamAData && this.normalizeTeamName(teamAData.name) === blueTeamName) {
          blueTeamId = teamAData.id;
        } else if (teamBData && this.normalizeTeamName(teamBData.name) === blueTeamName) {
          blueTeamId = teamBData.id;
        }

        if (teamAData && this.normalizeTeamName(teamAData.name) === redTeamName) {
          redTeamId = teamAData.id;
        } else if (teamBData && this.normalizeTeamName(teamBData.name) === redTeamName) {
          redTeamId = teamBData.id;
        }
      }

      if (!blueTeamId || !redTeamId) {
        throw new BadRequestException({
          code: 40001,
          message: 'Could not match team names to existing teams',
        });
      }

      // 检查是否已存在该game
      const existingGame = await this.databaseService.get<any>(
        'SELECT id FROM match_games WHERE match_id = ? AND game_number = ?',
        [matchId, parsedData.matchInfo.gameNumber],
      );

      // 标记是否为覆盖导入
      const overwritten = !!existingGame;

      if (existingGame) {
        // 删除旧数据（级联删除player_match_stats）
        await this.databaseService.run('DELETE FROM player_match_stats WHERE match_game_id = ?', [
          existingGame.id,
        ]);
        await this.databaseService.run('DELETE FROM match_games WHERE id = ?', [existingGame.id]);
      }

      // 确定winner
      let winnerTeamId: string | null = null;
      const winner = parsedData.matchInfo.winner.toLowerCase();
      if (winner === 'blue' || winner === '蓝方') {
        winnerTeamId = blueTeamId;
      } else if (winner === 'red' || winner === '红方') {
        winnerTeamId = redTeamId;
      }

      // 准备BAN数据（JSON格式）
      const redBanJson = JSON.stringify(parsedData.bans.redBans);
      const blueBanJson = JSON.stringify(parsedData.bans.blueBans);

      // 插入match_games（包含BAN数据、游戏时长和BV号）
      const gameResult = await this.databaseService.run(
        `INSERT INTO match_games (
          match_id, game_number, winner_team_id, game_duration, game_start_time,
          blue_team_id, red_team_id,
          blue_kills, blue_gold, blue_towers, blue_dragons, blue_barons,
          red_kills, red_gold, red_towers, red_dragons, red_barons,
          red_ban, blue_ban, video_bvid,
          status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          matchId,
          parsedData.matchInfo.gameNumber,
          winnerTeamId,
          parsedData.matchInfo.gameDuration, // 恢复：用于雷达图维度计算
          parsedData.matchInfo.gameStartTime || new Date().toISOString(),
          blueTeamId,
          redTeamId,
          this.getTeamStatsForSide(parsedData.teamStats, 'blue'),
          this.getTeamFieldForSide(parsedData.teamStats, 'gold', 'blue'),
          this.getTeamFieldForSide(parsedData.teamStats, 'towers', 'blue'),
          this.getTeamFieldForSide(parsedData.teamStats, 'dragons', 'blue'),
          this.getTeamFieldForSide(parsedData.teamStats, 'barons', 'blue'),
          this.getTeamStatsForSide(parsedData.teamStats, 'red'),
          this.getTeamFieldForSide(parsedData.teamStats, 'gold', 'red'),
          this.getTeamFieldForSide(parsedData.teamStats, 'towers', 'red'),
          this.getTeamFieldForSide(parsedData.teamStats, 'dragons', 'red'),
          this.getTeamFieldForSide(parsedData.teamStats, 'barons', 'red'),
          redBanJson,
          blueBanJson,
          parsedData.matchInfo.videoBvid || null, // 视频BV号
          adminId,
        ],
      );

      const gameId = gameResult.lastID;

      // 插入player_match_stats
      let playerCount = 0;
      const failedPlayers: Array<{
        row: number;
        nickname: string;
        side: string;
        type: 'player_not_found' | 'team_mismatch' | 'data_validation' | 'parse_error';
        message: string;
      }> = [];

      // 从MatchInfo获取MVP选手昵称
      const mvpNickname = parsedData.matchInfo.mvp;

      for (let i = 0; i < parsedData.playerStats.length; i++) {
        const ps = parsedData.playerStats[i];
        // Excel行号 = 表头(6) + 索引(从0开始) + 1 = 7 + i
        const excelRow = 7 + i;

        // 根据阵营确定战队ID
        const expectedTeamId = this.normalizeTeamName(ps.side).includes('red')
          ? redTeamId
          : blueTeamId;

        // 匹配选手，增加战队关联验证
        const player = await this.matchPlayerNicknameWithTeam(ps.nickname, expectedTeamId);
        if (!player) {
          const errorMsg = `选手 ${ps.nickname} 在${ps.side === 'red' ? '红方' : '蓝方'}战队中未找到`;
          this.logger.warn(errorMsg);
          failedPlayers.push({
            row: excelRow,
            nickname: ps.nickname,
            side: ps.side,
            type: 'player_not_found',
            message: errorMsg,
          });
          continue;
        }

        // 验证选手的战队是否与预期一致
        if (player.team_id !== expectedTeamId) {
          const errorMsg = `选手 ${ps.nickname} 的战队与预期的${ps.side}方战队不匹配`;
          this.logger.error(errorMsg);
          failedPlayers.push({
            row: excelRow,
            nickname: ps.nickname,
            side: ps.side,
            type: 'team_mismatch',
            message: errorMsg,
          });
          continue;
        }

        // 判断当前选手是否是MVP
        const isMvp = ps.nickname === mvpNickname ? 1 : 0;
        // 一血字段已废弃，固定设置为0

        // 防御性验证：确保英雄名称不为空
        if (!ps.championName) {
          throw new BadRequestException({
            code: 40002,
            message: `选手"${ps.nickname}"的英雄名称无效`,
          });
        }

        await this.databaseService.run(
          `INSERT INTO player_match_stats (
            match_game_id, player_id, team_id, position, champion_name,
            kills, deaths, assists, cs, gold, damage_dealt, damage_taken,
            vision_score, wards_placed, level, first_blood, mvp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            gameId,
            player.id,
            player.team_id,
            ps.position.toUpperCase(),
            ps.championName,
            ps.kills,
            ps.deaths,
            ps.assists,
            ps.cs,
            ps.gold,
            ps.damageDealt,
            ps.damageTaken,
            ps.visionScore,
            ps.wardsPlaced,
            ps.level,
            0, // first_blood 废弃，固定为0
            isMvp,
          ],
        );
        playerCount++;
      }

      if (playerCount === 0) {
        throw new BadRequestException({
          code: 40001,
          message: '没有成功导入任何选手数据，请检查选手昵称是否正确',
          failedPlayers,
        });
      }

      if (failedPlayers.length > 0) {
        this.logger.warn(
          `导入完成，但${failedPlayers.length}个选手匹配失败:`,
          JSON.stringify(failedPlayers),
        );
      }

      await this.databaseService.commit();

      // 清除缓存
      this.clearMatchCache(matchId);

      this.logger.log(
        `Imported match data: matchId=${matchId}, gameNumber=${parsedData.matchInfo.gameNumber}, players=${playerCount}`,
      );

      return {
        gameNumber: parsedData.matchInfo.gameNumber,
        imported: true,
        playerCount,
        failedCount: failedPlayers.length,
        overwritten,
        failedPlayers: failedPlayers.length > 0 ? failedPlayers : undefined,
      };
    } catch (error) {
      await this.databaseService.rollback();
      throw error;
    }
  }

  /**
   * 解析Sheet数据（二维数组）为ParsedMatchData对象
   * 参考parseMatchDataExcel的逻辑，但直接处理二维数组
   */
  private parseSheetData(sheetData: any[][]): ParsedMatchData {
    if (sheetData.length < 18) {
      throw new Error(`Excel文件行数不足，当前${sheetData.length}行，应为18行（包含BAN数据）`);
    }

    // 解析第2行: MatchInfo数据
    const matchInfoRow = sheetData[1];
    if (!matchInfoRow || matchInfoRow.length === 0) {
      throw new Error('第2行（对战信息数据行）为空或格式错误');
    }
    const matchInfo = this.parseMatchInfoRow(matchInfoRow);

    // 解析第4-5行: TeamStats数据
    const teamStats: TeamStatsData[] = [];
    for (let i = 3; i <= 4; i++) {
      if (
        sheetData[i] &&
        sheetData[i].some((cell) => cell !== null && cell !== undefined && cell !== '')
      ) {
        teamStats.push(this.parseTeamStatsRow(sheetData[i], i + 1));
      } else {
        throw new Error(`第${i + 1}行（战队数据行）为空或格式错误`);
      }
    }

    if (teamStats.length !== 2) {
      throw new Error(`战队数据不完整，应为2行，实际${teamStats.length}行`);
    }

    // 解析第7-16行: PlayerStats数据
    const playerStats: PlayerStatsData[] = [];
    for (let i = 6; i <= 15; i++) {
      if (
        sheetData[i] &&
        sheetData[i].some((cell) => cell !== null && cell !== undefined && cell !== '')
      ) {
        playerStats.push(this.parsePlayerStatsRow(sheetData[i], i + 1));
      } else {
        throw new Error(`第${i + 1}行（选手数据行）为空或格式错误`);
      }
    }

    if (playerStats.length !== 10) {
      throw new Error(`选手数据不完整，应为10行，实际${playerStats.length}行`);
    }

    // 解析第17-18行: BAN数据
    const bans = this.parseBansRow(sheetData[16], sheetData[17]);

    return { matchInfo, teamStats, playerStats, bans };
  }

  /**
   * 解析MatchInfo行数据
   */
  private parseMatchInfoRow(row: any[]): MatchInfoData {
    // 检测格式：
    // 7列新模板（无游戏时长）: [teamA, teamB, 局数, 比赛时间, 获胜方, MVP, 视频BV号]
    // 8列新模板（含游戏时长）: [teamA, teamB, 局数, 比赛时间, 游戏时长, 获胜方, MVP, 视频BV号]
    // 8列旧模板（含游戏时长）: [红方战队名, 蓝方战队名, 局数, 比赛时间, 游戏时长, 获胜方, MVP, 视频BV号]
    // 7列旧模板（无游戏时长）: [红方战队名, 蓝方战队名, 局数, 比赛时间, 获胜方, MVP, 视频BV号]
    const row4 = this.extractCellValue(row[4]);
    const row5 = this.extractCellValue(row[5]);

    const is8ColumnFormat =
      row4.includes(':') &&
      ['red', 'blue', '红方', '蓝方'].some((v) => row5.toLowerCase().includes(v));

    if (is8ColumnFormat) {
      // 8列格式（含游戏时长，用于雷达图维度计算）
      return {
        teamAName: this.extractCellValue(row[0]),
        teamBName: this.extractCellValue(row[1]),
        gameNumber: this.extractNumericValue(row[2]),
        gameStartTime: this.extractCellValue(row[3]),
        gameDuration: row4, // E列: 游戏时长
        winner: row5, // F列: 获胜方
        firstBlood: '', // 废弃
        mvp: this.extractCellValue(row[6]), // G列: MVP
        videoBvid: this.extractCellValue(row[7]), // H列: 视频BV号
      };
    } else {
      // 7列格式（无游戏时长）
      return {
        teamAName: this.extractCellValue(row[0]),
        teamBName: this.extractCellValue(row[1]),
        gameNumber: this.extractNumericValue(row[2]),
        gameStartTime: this.extractCellValue(row[3]),
        gameDuration: '', // 新格式无游戏时长（验证会失败）
        winner: row4, // E列: 获胜方
        firstBlood: '', // 废弃
        mvp: row5, // F列: MVP
        videoBvid: this.extractCellValue(row[6]), // G列: 视频BV号
      };
    }
  }

  /**
   * 解析TeamStats行数据
   */
  private parseTeamStatsRow(row: any[], _rowIndex: number): TeamStatsData {
    return {
      side: this.extractCellValue(row[0]),
      teamName: this.extractCellValue(row[1]),
      kills: this.extractNumericValue(row[2]),
      deaths: this.extractNumericValue(row[3]),
      assists: this.extractNumericValue(row[4]),
      gold: this.extractNumericValue(row[5]),
      towers: this.extractNumericValue(row[6]),
      dragons: this.extractNumericValue(row[7]),
      barons: this.extractNumericValue(row[8]),
    };
  }

  /**
   * 解析PlayerStats行数据
   */
  private parsePlayerStatsRow(row: any[], _rowIndex: number): PlayerStatsData {
    const rawChampionName = this.extractCellValue(row[3]);
    // 将中文英雄名转换为英文ID
    const { findChampionId } = require('../teams/utils/champion-map.util');
    const championId = findChampionId(rawChampionName);

    return {
      side: this.extractCellValue(row[0]),
      position: this.extractCellValue(row[1]).toUpperCase(),
      nickname: this.extractCellValue(row[2]),
      championName: championId || '', // 转换为英文ID，找不到则为空字符串
      championNameRaw: rawChampionName, // 保留原始值用于错误提示
      kills: this.extractNumericValue(row[4]),
      deaths: this.extractNumericValue(row[5]),
      assists: this.extractNumericValue(row[6]),
      cs: this.extractNumericValue(row[7]),
      gold: this.extractNumericValue(row[8]),
      damageDealt: this.extractNumericValue(row[9]),
      damageTaken: this.extractNumericValue(row[10]),
      level: this.extractNumericValue(row[11]),
      visionScore: this.extractNumericValue(row[12]),
      wardsPlaced: this.extractNumericValue(row[13]),
      wardsCleared: this.extractNumericValue(row[14]),
    };
  }

  /**
   * 解析BAN数据行
   */
  private parseBansRow(headerRow: any[] | undefined, dataRow: any[] | undefined): BanData {
    // 如果没有BAN数据行，返回空数组
    if (!dataRow || dataRow.length === 0) {
      return { redBans: [], blueBans: [], errors: [] };
    }

    const redBans: string[] = [];
    const blueBans: string[] = [];
    const errors: string[] = [];

    const { findChampionId } = require('../teams/utils/champion-map.util');

    // 解析前5列为红方BAN
    for (let i = 0; i < 5; i++) {
      const ban = this.extractCellValue(dataRow[i]);
      if (ban) {
        // 将中文英雄名转换为英文ID
        const championId = findChampionId(ban);
        if (championId) {
          redBans.push(championId);
        } else {
          // 收集错误，不再直接存储原始值
          errors.push(`红方BAN${i + 1}英雄"${ban}"不存在，请检查英雄名称`);
        }
      }
    }

    // 解析后5列为蓝方BAN
    for (let i = 5; i < 10; i++) {
      const ban = this.extractCellValue(dataRow[i]);
      if (ban) {
        // 将中文英雄名转换为英文ID
        const championId = findChampionId(ban);
        if (championId) {
          blueBans.push(championId);
        } else {
          // 收集错误，不再直接存储原始值
          errors.push(`蓝方BAN${i - 4}英雄"${ban}"不存在，请检查英雄名称`);
        }
      }
    }

    return { redBans, blueBans, errors };
  }

  /**
   * 提取单元格值
   */
  private extractCellValue(cellValue: any): string {
    if (cellValue === null || cellValue === undefined) {
      return '';
    }
    if (typeof cellValue === 'string') {
      return cellValue.trim();
    }
    return String(cellValue).trim();
  }

  /**
   * 提取数值
   */
  private extractNumericValue(cellValue: any): number {
    if (cellValue === null || cellValue === undefined || cellValue === '') {
      return 0;
    }
    const num = Number(cellValue);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 删除比赛数据（整局）
   */
  async deleteMatchGameData(
    matchId: string,
    gameNumber: number,
    adminId: string,
  ): Promise<{ deleted: boolean; gameNumber: number }> {
    try {
      // 检查比赛是否存在
      const match = await this.databaseService.get<any>(
        'SELECT id, bo_format FROM matches WHERE id = ?',
        [matchId],
      );

      if (!match) {
        throw new NotFoundException(`Match with id ${matchId} not found`);
      }

      // 检查game是否存在
      const game = await this.databaseService.get<any>(
        'SELECT id, game_number FROM match_games WHERE match_id = ? AND game_number = ? AND status = 1',
        [matchId, gameNumber],
      );

      if (!game) {
        throw new NotFoundException({
          code: 40003,
          message: `Match game ${gameNumber} not found for match ${matchId}`,
        });
      }

      // 使用事务删除数据
      await this.databaseService.begin();

      try {
        // 先删除选手统计数据
        await this.databaseService.run('DELETE FROM player_match_stats WHERE match_game_id = ?', [
          game.id,
        ]);

        // 再删除比赛游戏数据（硬删除）
        await this.databaseService.run('DELETE FROM match_games WHERE id = ?', [game.id]);

        await this.databaseService.commit();

        // 清除缓存
        this.clearMatchCache(matchId);

        this.logger.log(
          `Deleted match game data: matchId=${matchId}, gameNumber=${gameNumber}, adminId=${adminId}`,
        );

        return {
          deleted: true,
          gameNumber,
        };
      } catch (error) {
        await this.databaseService.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete match game data: ${error.message}`, error.stack);
      throw new BadRequestException({
        code: 50000,
        message: `Failed to delete match game data: ${error.message}`,
      });
    }
  }

  /**
   * 通过JSON更新比赛数据
   */
  async updateMatchGameData(
    matchId: string,
    gameId: number,
    data: any,
    _adminId: string,
  ): Promise<{ updated: boolean; gameId: number }> {
    try {
      // 检查比赛是否存在
      const match = await this.databaseService.get<any>(
        'SELECT id, bo_format FROM matches WHERE id = ?',
        [matchId],
      );

      if (!match) {
        throw new NotFoundException(`Match with id ${matchId} not found`);
      }

      // 检查game是否存在
      const game = await this.databaseService.get<any>(
        'SELECT id, game_number, blue_team_id, red_team_id FROM match_games WHERE id = ? AND match_id = ? AND status = 1',
        [gameId, matchId],
      );

      if (!game) {
        throw new NotFoundException({
          code: 40003,
          message: `Match game with id ${gameId} not found`,
        });
      }

      // 验证game number
      const maxGames = this.getMaxGames(match.bo_format);
      if (game.game_number > maxGames) {
        throw new BadRequestException({
          code: 40002,
          message: `Game number ${game.game_number} exceeds the BO format limit (${maxGames})`,
        });
      }

      // 使用事务更新数据
      await this.databaseService.begin();

      try {
        // 更新match_games
        const updates: string[] = [];
        const values: any[] = [];

        if (data.winnerTeamId !== undefined) {
          updates.push('winner_team_id = ?');
          values.push(data.winnerTeamId);
        }
        if (data.gameDuration !== undefined) {
          updates.push('game_duration = ?');
          values.push(data.gameDuration);
        }
        if (data.gameStartTime !== undefined) {
          updates.push('game_start_time = ?');
          values.push(data.gameStartTime);
        }
        if (data.blueTeam) {
          updates.push(
            'blue_kills = ?',
            'blue_gold = ?',
            'blue_towers = ?',
            'blue_dragons = ?',
            'blue_barons = ?',
          );
          values.push(
            data.blueTeam.kills,
            data.blueTeam.gold,
            data.blueTeam.towers,
            data.blueTeam.dragons,
            data.blueTeam.barons,
          );
        }
        if (data.redTeam) {
          updates.push(
            'red_kills = ?',
            'red_gold = ?',
            'red_towers = ?',
            'red_dragons = ?',
            'red_barons = ?',
          );
          values.push(
            data.redTeam.kills,
            data.redTeam.gold,
            data.redTeam.towers,
            data.redTeam.dragons,
            data.redTeam.barons,
          );
        }

        if (updates.length > 0) {
          updates.push('updated_at = CURRENT_TIMESTAMP');
          values.push(gameId);

          await this.databaseService.run(
            `UPDATE match_games SET ${updates.join(', ')} WHERE id = ?`,
            values,
          );
        }

        // 更新或插入player_match_stats
        if (data.playerStats && Array.isArray(data.playerStats)) {
          // 删除旧数据
          await this.databaseService.run('DELETE FROM player_match_stats WHERE match_game_id = ?', [
            gameId,
          ]);

          // 插入新数据
          for (const ps of data.playerStats) {
            if (!ps.championName) {
              throw new BadRequestException({
                code: 40002,
                message: `选手"${ps.nickname}"的英雄名称无效`,
              });
            }

            await this.databaseService.run(
              `INSERT INTO player_match_stats (
                match_game_id, player_id, team_id, position, champion_name,
                kills, deaths, assists, cs, gold, damage_dealt, damage_taken,
                vision_score, wards_placed, level, first_blood, mvp
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                gameId,
                ps.playerId,
                ps.teamId,
                ps.position.toUpperCase(),
                ps.championName,
                ps.kills,
                ps.deaths,
                ps.assists,
                ps.cs,
                ps.gold,
                ps.damageDealt,
                ps.damageTaken,
                ps.visionScore,
                ps.wardsPlaced,
                ps.level,
                ps.firstBlood ? 1 : 0,
                ps.mvp ? 1 : 0,
              ],
            );
          }
        }

        await this.databaseService.commit();

        // 清除缓存
        this.clearMatchCache(matchId);

        this.logger.log(`Updated match game data: matchId=${matchId}, gameId=${gameId}`);

        return {
          updated: true,
          gameId,
        };
      } catch (error) {
        await this.databaseService.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update match game data: ${error.message}`, error.stack);
      throw new BadRequestException({
        code: 50000,
        message: `Failed to update match game data: ${error.message}`,
      });
    }
  }

  /**
   * 获取对战基本信息（用于模板下载文件名生成）
   */
  async getMatchBasicInfo(matchId: string): Promise<{
    teamAName: string;
    teamBName: string;
    boFormat: string;
  }> {
    const match = await this.databaseService.get<any>(
      `SELECT m.bo_format, ta.name as team_a_name, tb.name as team_b_name
       FROM matches m
       LEFT JOIN teams ta ON m.team_a_id = ta.id
       LEFT JOIN teams tb ON m.team_b_id = tb.id
       WHERE m.id = ?`,
      [matchId],
    );

    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }

    return {
      teamAName: match.team_a_name || '未知战队',
      teamBName: match.team_b_name || '未知战队',
      boFormat: match.bo_format || 'BO1',
    };
  }

  // ============= 私有辅助方法 =============

  /**
   * 根据BO格式获取最大game数量
   */
  private getMaxGames(boFormat: string): number {
    switch (boFormat) {
      case 'BO1':
        return 1;
      case 'BO3':
        return 3;
      case 'BO5':
        return 5;
      default:
        return 1;
    }
  }

  /**
   * 标准化战队名称
   */
  private normalizeTeamName(name: string): string {
    return name.trim().toLowerCase();
  }

  /**
   * 匹配战队名称
   */
  private async matchTeamName(name: string): Promise<string | null> {
    const teams = await this.databaseService.all<any>('SELECT id, name FROM teams');

    const normalizedName = this.normalizeTeamName(name);

    for (const team of teams) {
      if (this.normalizeTeamName(team.name) === normalizedName) {
        return team.id;
      }
    }

    return null;
  }

  /**
   * 匹配选手昵称
   */
  private async matchPlayerNickname(nickname: string): Promise<any | null> {
    const players = await this.databaseService.all<any>(
      'SELECT id, nickname, team_id FROM team_members',
    );

    const normalizedNickname = nickname.trim().toLowerCase();

    for (const player of players) {
      if (player.nickname && player.nickname.trim().toLowerCase() === normalizedNickname) {
        return player;
      }
    }

    return null;
  }

  /**
   * 匹配选手昵称（带战队关联验证）
   */
  private async matchPlayerNicknameWithTeam(
    nickname: string,
    expectedTeamId: string,
  ): Promise<any | null> {
    const players = await this.databaseService.all<any>(
      'SELECT id, nickname, team_id FROM team_members WHERE team_id = ?',
      [expectedTeamId],
    );

    const normalizedNickname = nickname.trim().toLowerCase();

    for (const player of players) {
      if (player.nickname && player.nickname.trim().toLowerCase() === normalizedNickname) {
        return player;
      }
    }

    return null;
  }

  /**
   * 获取指定方的击杀数
   */
  private getTeamStatsForSide(teamStats: any[], side: string): number {
    const sideLower = side.toLowerCase();
    for (const ts of teamStats) {
      const tsSide = ts.side.toLowerCase();
      if (
        (sideLower === 'blue' && (tsSide === 'blue' || tsSide === '蓝方')) ||
        (sideLower === 'red' && (tsSide === 'red' || tsSide === '红方'))
      ) {
        return ts.kills;
      }
    }
    return 0;
  }

  /**
   * 获取指定方的某个字段值
   */
  private getTeamFieldForSide(teamStats: any[], field: string, side: string): number {
    const sideLower = side.toLowerCase();
    for (const ts of teamStats) {
      const tsSide = ts.side.toLowerCase();
      if (
        (sideLower === 'blue' && (tsSide === 'blue' || tsSide === '蓝方')) ||
        (sideLower === 'red' && (tsSide === 'red' || tsSide === '红方'))
      ) {
        return ts[field] || 0;
      }
    }
    return 0;
  }
}
