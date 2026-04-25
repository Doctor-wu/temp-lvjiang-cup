import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../cache/cache.service';
import { BaseCachedService } from '../../common/services/base-cached.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { getTeamLogoPath, getTeamLogoThumbnailPath } from '../../common/utils/path.util';

export interface TeamMember {
  id: string;
  userId?: number;
  nickname: string;
  avatarUrl?: string;
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  teamId: string;
  gameId?: string;
  bio?: string;
  championPool?: string[];
  rating?: number;
  isCaptain?: boolean;
  liveUrl?: string;
  sortOrder?: number;
  level?: 'S' | 'A' | 'B' | 'C' | 'D';
  auctionPrice?: number;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  logoUrl?: string;
  logoThumbnailUrl?: string;
  battleCry?: string;
  members: TeamMember[];
}

@Injectable()
export class TeamsService extends BaseCachedService<Team, string> {
  private readonly memberLogger = new Logger(TeamsService.name);

  constructor(databaseService: DatabaseService, cacheService: CacheService) {
    super(databaseService, cacheService, 'TeamsService');
  }

  protected getCachePrefix(): string {
    return 'teams';
  }

  protected async findAllFromDb(): Promise<Team[]> {
    const teams = await this.databaseService.all<any>(
      'SELECT * FROM teams ORDER BY created_at DESC',
    );

    const members = await this.databaseService.all<any>('SELECT * FROM team_members');

    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      logo: team.logo,
      logoUrl: team.logo_url,
      logoThumbnailUrl: team.logo_thumbnail_url,
      battleCry: team.battle_cry,
      members: members
        .filter((m) => m.team_id === team.id)
        .map((m) => ({
          id: m.id,
          userId: m.user_id,
          nickname: m.nickname,
          avatarUrl: m.avatar_url,
          position: m.position,
          teamId: m.team_id,
          gameId: m.game_id,
          bio: m.bio,
          championPool: m.champion_pool ? JSON.parse(m.champion_pool) : [],
          rating: m.rating,
          isCaptain: Boolean(m.is_captain),
          liveUrl: m.live_url,
          sortOrder: m.sort_order,
          level: m.level,
        })),
    }));
  }

  protected async findOneFromDb(id: string): Promise<Team | undefined> {
    const team = await this.databaseService.get<any>('SELECT * FROM teams WHERE id = ?', [id]);

    if (!team) {
      return undefined;
    }

    const members = await this.databaseService.all<any>(
      'SELECT * FROM team_members WHERE team_id = ?',
      [id],
    );

    return {
      id: team.id,
      name: team.name,
      logo: team.logo,
      logoUrl: team.logo_url,
      logoThumbnailUrl: team.logo_thumbnail_url,
      battleCry: team.battle_cry,
      members: members.map((m) => ({
        id: m.id,
        userId: m.user_id,
        nickname: m.nickname,
        avatarUrl: m.avatar_url,
        position: m.position,
        teamId: m.team_id,
        gameId: m.game_id,
        bio: m.bio,
        championPool: m.champion_pool ? JSON.parse(m.champion_pool) : [],
        rating: m.rating,
        isCaptain: Boolean(m.is_captain),
        liveUrl: m.live_url,
        sortOrder: m.sort_order,
        level: m.level,
      })),
    };
  }

  async findAll(): Promise<Team[]> {
    return this.getOrSetAll();
  }

  async findOne(id: string): Promise<Team> {
    try {
      return await this.getOrSetOne(id);
    } catch (error) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
  }

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    // 如果前端未提供ID，则后端生成UUID
    const teamId = createTeamDto.id || uuidv4();

    await this.databaseService.run(
      `INSERT INTO teams (id, name, logo, logo_url, logo_thumbnail_url, battle_cry) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        teamId,
        createTeamDto.name,
        createTeamDto.logo || null,
        createTeamDto.logoUrl || null,
        createTeamDto.logoThumbnailUrl || null,
        createTeamDto.battleCry || null,
      ],
    );

    // 自动创建 5 个默认队员（上单、打野、中单、ADC、辅助）
    const defaultPositions = [
      { pos: 'TOP', name: '上单' },
      { pos: 'JUNGLE', name: '打野' },
      { pos: 'MID', name: '中单' },
      { pos: 'ADC', name: 'ADC' },
      { pos: 'SUPPORT', name: '辅助' },
    ];

    this.memberLogger.log(`Creating 5 default members for team ${teamId}`);

    for (let i = 0; i < defaultPositions.length; i++) {
      const { pos, name } = defaultPositions[i];
      const memberId = uuidv4(); // 队员ID也使用UUID
      this.memberLogger.log(`Creating member ${memberId} with nickname ${name}`);

      await this.databaseService.run(
        `INSERT INTO team_members (id, nickname, position, team_id, rating, is_captain, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          memberId, // 使用UUID作为队员ID
          name, // 默认昵称：上单/打野/中单/ADC/辅助
          pos, // 位置：TOP/JUNGLE/MID/ADC/SUPPORT
          teamId, // 战队 ID
          60, // 默认评分
          0, // 默认不设置队长，由管理员后期编辑
        ],
      );

      this.memberLogger.log(`Member ${memberId} created successfully`);
    }

    this.memberLogger.log(`Team created: ${teamId}`);

    this.clearAllCache();

    return this.findOne(teamId);
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    const existing = await this.databaseService.get<any>('SELECT * FROM teams WHERE id = ?', [id]);
    if (!existing) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (updateTeamDto.name !== undefined) {
      updates.push('name = ?');
      values.push(updateTeamDto.name);
    }
    if (updateTeamDto.logo !== undefined) {
      updates.push('logo = ?');
      values.push(updateTeamDto.logo);
    }
    if (updateTeamDto.logoUrl !== undefined) {
      if (existing.logo_url && existing.logo_url !== updateTeamDto.logoUrl) {
        await this.deleteFile(existing.logo_url);
      }
      updates.push('logo_url = ?');
      values.push(updateTeamDto.logoUrl);
    }
    if (updateTeamDto.logoThumbnailUrl !== undefined) {
      if (
        existing.logo_thumbnail_url &&
        existing.logo_thumbnail_url !== updateTeamDto.logoThumbnailUrl
      ) {
        await this.deleteFile(existing.logo_thumbnail_url);
      }
      updates.push('logo_thumbnail_url = ?');
      values.push(updateTeamDto.logoThumbnailUrl);
    }
    if (updateTeamDto.battleCry !== undefined) {
      updates.push('battle_cry = ?');
      values.push(updateTeamDto.battleCry);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await this.databaseService.run(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    if (updateTeamDto.members !== undefined) {
      const oldMembers = await this.databaseService.all<any>(
        'SELECT avatar_url FROM team_members WHERE team_id = ?',
        [id],
      );
      for (const member of oldMembers) {
        if (member.avatar_url) {
          await this.deleteFile(member.avatar_url);
        }
      }
      await this.databaseService.run('DELETE FROM team_members WHERE team_id = ?', [id]);

      if (updateTeamDto.members.length > 0) {
        for (const member of updateTeamDto.members) {
          await this.databaseService.run(
            `INSERT INTO team_members (id, user_id, nickname, avatar_url, position, team_id, game_id, bio, champion_pool, rating, is_captain, live_url, sort_order, auction_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              member.id || `${id}_${member.position}`,
              member.userId || null,
              member.nickname,
              member.avatarUrl || null,
              member.position,
              id,
              member.gameId || null,
              member.bio || null,
              member.championPool ? JSON.stringify(member.championPool) : null,
              member.rating || 60,
              member.isCaptain ? 1 : 0,
              member.liveUrl || null,
              member.sortOrder || null,
              (member as any).auctionPrice || 0,
            ],
          );
        }
      }
    }

    this.memberLogger.log(`Team updated: ${id}`);

    this.clearRelatedCache(id);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.databaseService.get<any>('SELECT * FROM teams WHERE id = ?', [id]);
    if (!existing) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }

    await this.databaseService.run('DELETE FROM teams WHERE id = ?', [id]);

    if (existing.logo_url) {
      await this.deleteFile(existing.logo_url);
    }
    if (existing.logo_thumbnail_url) {
      await this.deleteFile(existing.logo_thumbnail_url);
    }

    this.memberLogger.log(`Team deleted: ${id}`);

    this.clearRelatedCache(id);
  }

  private async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;
    if (fileUrl.startsWith('http')) return;
    try {
      const filename = path.basename(fileUrl);
      let filePath: string;
      let thumbnailPath: string;

      if (fileUrl.includes('/teams/')) {
        filePath = getTeamLogoPath(filename);
        thumbnailPath = getTeamLogoThumbnailPath(filename);
      } else if (fileUrl.includes('/members/')) {
        filePath = path.join(
          path.dirname(getTeamLogoPath('placeholder')).replace('teams', 'members'),
          filename,
        );
      } else {
        return;
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        await this.databaseService.deleteFileHashByPath(filePath);
        this.memberLogger.log(`File deleted: ${filePath}`);
      }
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        await this.databaseService.deleteFileHashByPath(thumbnailPath);
        this.memberLogger.log(`Thumbnail deleted: ${thumbnailPath}`);
      }
    } catch (error) {
      this.memberLogger.error(`Failed to delete file ${fileUrl}: ${error.message}`);
    }
  }

  // ==================== 队员管理方法 ====================

  /**
   * 获取某战队所有队员
   */
  async findMembersByTeamId(teamId: string): Promise<TeamMember[]> {
    const team = await this.databaseService.get<any>('SELECT id FROM teams WHERE id = ?', [teamId]);
    if (!team) {
      throw new NotFoundException(`Team with id ${teamId} not found`);
    }

    const members = await this.databaseService.all<any>(
      'SELECT * FROM team_members WHERE team_id = ? ORDER BY sort_order ASC, created_at ASC',
      [teamId],
    );

    return members.map((m) => this.mapToTeamMember(m));
  }

  /**
   * 获取单个队员
   */
  async findMemberById(id: string): Promise<TeamMember> {
    const member = await this.databaseService.get<any>('SELECT * FROM team_members WHERE id = ?', [
      id,
    ]);

    if (!member) {
      throw new NotFoundException(`Member with id ${id} not found`);
    }

    return this.mapToTeamMember(member);
  }

  /**
   * 创建队员
   */
  async createMember(teamId: string, createMemberDto: CreateMemberDto): Promise<TeamMember> {
    const team = await this.databaseService.get<any>('SELECT id FROM teams WHERE id = ?', [teamId]);
    if (!team) {
      throw new NotFoundException(`Team with id ${teamId} not found`);
    }

    // 如果前端未提供ID，则后端生成UUID
    const memberId = createMemberDto.id || uuidv4();

    // 如果设置为队长，先移除该战队其他队长的队长身份
    if (createMemberDto.isCaptain) {
      await this.databaseService.run(
        'UPDATE team_members SET is_captain = 0 WHERE team_id = ? AND is_captain = 1',
        [teamId],
      );
    }

    await this.databaseService.run(
      `INSERT INTO team_members (id, user_id, nickname, avatar_url, position, team_id, game_id, bio, champion_pool, rating, is_captain, live_url, sort_order, auction_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memberId,
        createMemberDto.userId || null,
        createMemberDto.nickname,
        createMemberDto.avatarUrl || null,
        createMemberDto.position,
        teamId,
        createMemberDto.gameId || null,
        createMemberDto.bio || null,
        createMemberDto.championPool ? JSON.stringify(createMemberDto.championPool) : null,
        createMemberDto.rating || 60,
        createMemberDto.isCaptain ? 1 : 0,
        createMemberDto.liveUrl || null,
        createMemberDto.sortOrder || null,
        createMemberDto.auctionPrice || 0,
      ],
    );

    this.memberLogger.log(`Member created: ${memberId} for team ${teamId}`);

    // 清除战队缓存
    this.clearRelatedCache(teamId);

    return this.findMemberById(memberId);
  }

  /**
   * 更新队员
   */
  async updateMember(id: string, updateMemberDto: UpdateMemberDto): Promise<TeamMember> {
    const existing = await this.databaseService.get<any>(
      'SELECT * FROM team_members WHERE id = ?',
      [id],
    );
    if (!existing) {
      throw new NotFoundException(`Member with id ${id} not found`);
    }

    // 如果设置为队长，先移除该战队其他队长的队长身份
    if (updateMemberDto.isCaptain) {
      await this.databaseService.run(
        'UPDATE team_members SET is_captain = 0 WHERE team_id = ? AND is_captain = 1',
        [existing.team_id],
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (updateMemberDto.userId !== undefined) {
      updates.push('user_id = ?');
      values.push(updateMemberDto.userId);
    }
    if (updateMemberDto.nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(updateMemberDto.nickname);
    }
    if (updateMemberDto.avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(updateMemberDto.avatarUrl);
    }
    if (updateMemberDto.position !== undefined) {
      updates.push('position = ?');
      values.push(updateMemberDto.position);
    }
    if (updateMemberDto.gameId !== undefined) {
      updates.push('game_id = ?');
      values.push(updateMemberDto.gameId);
    }
    if (updateMemberDto.bio !== undefined) {
      updates.push('bio = ?');
      values.push(updateMemberDto.bio);
    }
    if (updateMemberDto.championPool !== undefined) {
      updates.push('champion_pool = ?');
      values.push(JSON.stringify(updateMemberDto.championPool));
    }
    if (updateMemberDto.rating !== undefined) {
      updates.push('rating = ?');
      values.push(updateMemberDto.rating);
    }
    if (updateMemberDto.isCaptain !== undefined) {
      updates.push('is_captain = ?');
      values.push(updateMemberDto.isCaptain ? 1 : 0);
    }
    if (updateMemberDto.liveUrl !== undefined) {
      updates.push('live_url = ?');
      values.push(updateMemberDto.liveUrl);
    }
    if (updateMemberDto.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(updateMemberDto.sortOrder);
    }
    if (updateMemberDto.level !== undefined) {
      updates.push('level = ?');
      values.push(updateMemberDto.level);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      await this.databaseService.run(
        `UPDATE team_members SET ${updates.join(', ')} WHERE id = ?`,
        values,
      );
    }

    this.memberLogger.log(`Member updated: ${id}`);

    // 清除缓存
    this.clearRelatedCache(existing.team_id);

    return this.findMemberById(id);
  }

  /**
   * 删除队员
   */
  async removeMember(id: string): Promise<void> {
    const existing = await this.databaseService.get<any>(
      'SELECT * FROM team_members WHERE id = ?',
      [id],
    );
    if (!existing) {
      throw new NotFoundException(`Member with id ${id} not found`);
    }

    await this.databaseService.run('DELETE FROM team_members WHERE id = ?', [id]);

    if (existing.avatar_url) {
      await this.deleteFile(existing.avatar_url);
    }

    this.memberLogger.log(`Member deleted: ${id}`);

    // 清除缓存
    this.clearRelatedCache(existing.team_id);
  }

  /**
   * 设置队长（保证同一战队只有一个队长）
   */
  async updateCaptain(teamId: string, memberId: string): Promise<TeamMember> {
    const team = await this.databaseService.get<any>('SELECT id FROM teams WHERE id = ?', [teamId]);
    if (!team) {
      throw new NotFoundException(`Team with id ${teamId} not found`);
    }

    const member = await this.databaseService.get<any>(
      'SELECT * FROM team_members WHERE id = ? AND team_id = ?',
      [memberId, teamId],
    );
    if (!member) {
      throw new NotFoundException(`Member with id ${memberId} not found in team ${teamId}`);
    }

    // 先移除该战队所有队长的队长身份
    await this.databaseService.run(
      'UPDATE team_members SET is_captain = 0, updated_at = CURRENT_TIMESTAMP WHERE team_id = ?',
      [teamId],
    );

    // 设置新队长
    await this.databaseService.run(
      'UPDATE team_members SET is_captain = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [memberId],
    );

    this.memberLogger.log(`Captain updated: ${memberId} for team ${teamId}`);

    // 清除缓存
    this.clearRelatedCache(teamId);

    return this.findMemberById(memberId);
  }

  /**
   * 将数据库记录映射为 TeamMember 对象
   */
  private mapToTeamMember(m: any): TeamMember {
    return {
      id: m.id,
      userId: m.user_id,
      nickname: m.nickname,
      avatarUrl: m.avatar_url,
      position: m.position,
      teamId: m.team_id,
      gameId: m.game_id,
      bio: m.bio,
      championPool: m.champion_pool ? JSON.parse(m.champion_pool) : [],
      rating: m.rating,
      isCaptain: Boolean(m.is_captain),
      liveUrl: m.live_url,
      sortOrder: m.sort_order,
      level: m.level,
      auctionPrice: m.auction_price || 0,
    };
  }
}
