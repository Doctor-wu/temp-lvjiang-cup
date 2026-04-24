import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../cache/cache.service';
import {
  parseMatchDataExcel,
  validateMatchInfo,
  validateTeamStats,
  validatePlayerStats,
  validateTeamNamesMatch,
  validateParsedMatchData,
} from '../utils/match-excel.util';

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

    // 获取game数据（包含BAN信息）
    const game = await this.databaseService.get<any>(
      `SELECT id, match_id, game_number, winner_team_id, game_duration, game_start_time,
              blue_team_id, red_team_id,
              blue_kills, blue_gold, blue_towers, blue_dragons, blue_barons,
              red_kills, red_gold, red_towers, red_dragons, red_barons,
              red_ban, blue_ban
       FROM match_games
       WHERE match_id = ? AND game_number = ? AND status = 1`,
      [matchId, gameNumber],
    );

    if (!game) {
      throw new NotFoundException({
        code: 40003,
        message: `Match data for game ${gameNumber} not found`,
      });
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
      gameDuration: game.game_duration,
      gameStartTime: game.game_start_time,
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
   */
  async importMatchData(
    matchId: string,
    file: Express.Multer.File,
    adminId: string,
  ): Promise<{
    imported: boolean;
    gameNumber: number;
    playerCount: number;
    failedCount: number;
    overwritten: boolean;  // 新增：标记是否覆盖导入
    failedPlayers?: Array<{
      row: number;
      nickname: string;
      side: string;
      type: string;
      message: string;
    }>;
  }> {
    try {
      // 检查比赛是否存在
      const match = await this.databaseService.get<any>(
        'SELECT id, team_a_id, team_b_id, bo_format FROM matches WHERE id = ?',
        [matchId],
      );

      if (!match) {
        throw new NotFoundException(`Match with id ${matchId} not found`);
      }

      // 解析Excel文件
      const fileBuffer = file.buffer || require('fs').readFileSync(file.path);
      const parsedData = parseMatchDataExcel(fileBuffer);

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
        parsedData.matchInfo.redTeamName,
        parsedData.matchInfo.blueTeamName,
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
        const blueTeamName = this.normalizeTeamName(parsedData.matchInfo.blueTeamName);
        const redTeamName = this.normalizeTeamName(parsedData.matchInfo.redTeamName);

        // 匹配战队ID
        let blueTeamId = await this.matchTeamName(blueTeamName);
        let redTeamId = await this.matchTeamName(redTeamName);

        // 如果没有精确匹配，尝试使用比赛中的战队
        if (!blueTeamId && match.team_a_id && match.team_b_id) {
          // 根据名称匹配
          const teamA = await this.databaseService.get<any>(
            'SELECT id, name FROM teams WHERE id = ?',
            [match.team_a_id],
          );
          const teamB = await this.databaseService.get<any>(
            'SELECT id, name FROM teams WHERE id = ?',
            [match.team_b_id],
          );

          if (teamA && this.normalizeTeamName(teamA.name) === blueTeamName) {
            blueTeamId = teamA.id;
          } else if (teamB && this.normalizeTeamName(teamB.name) === blueTeamName) {
            blueTeamId = teamB.id;
          }

          if (teamA && this.normalizeTeamName(teamA.name) === redTeamName) {
            redTeamId = teamA.id;
          } else if (teamB && this.normalizeTeamName(teamB.name) === redTeamName) {
            redTeamId = teamB.id;
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

        // 插入match_games（包含BAN数据）
        const gameResult = await this.databaseService.run(
          `INSERT INTO match_games (
            match_id, game_number, winner_team_id, game_duration, game_start_time,
            blue_team_id, red_team_id,
            blue_kills, blue_gold, blue_towers, blue_dragons, blue_barons,
            red_kills, red_gold, red_towers, red_dragons, red_barons,
            red_ban, blue_ban,
            status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            matchId,
            parsedData.matchInfo.gameNumber,
            winnerTeamId,
            parsedData.matchInfo.gameDuration,
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

        // 从MatchInfo获取MVP选手昵称和一血阵营
        const mvpNickname = parsedData.matchInfo.mvp;
        const firstBloodSide = parsedData.matchInfo.firstBlood;

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
          // 判断当前选手是否获得一血（根据阵营）
          const isFirstBlood = ps.side === firstBloodSide ? 1 : 0;

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
              isFirstBlood,
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
          imported: true,
          gameNumber: parsedData.matchInfo.gameNumber,
          playerCount,
          failedCount: failedPlayers.length,
          overwritten,
          failedPlayers: failedPlayers.length > 0 ? failedPlayers : undefined,
        };
      } catch (error) {
        await this.databaseService.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to import match data: ${error.message}`, error.stack);
      throw new BadRequestException({
        code: 50000,
        message: `Failed to import match data: ${error.message}`,
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
