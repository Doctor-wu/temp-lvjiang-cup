import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../../database/database.service';
import { CacheService } from '../../../cache/cache.service';
import { loadChampionMap, parseChampionPool } from '../utils/champion-map.util';
import {
  parseExcel,
  getExcelRowCount,
  validateExcelHeaders,
  parseLiveUrl,
} from '../utils/excel.util';
import { validateImportData } from '../utils/validate-import.util';
import { ImportTeamDto, ImportResultDto, ImportErrorDto } from '../dto/import';
import { getTeamLogoPath, getTeamLogoThumbnailPath } from '../../../common/utils/path.util';

@Injectable()
export class TeamsImportService {
  private readonly logger = new Logger(TeamsImportService.name);
  private readonly TEMPLATE_DIR = path.join(process.cwd(), 'templates');
  private readonly TEMPLATE_FILE = 'team-import-template.xlsx';
  private readonly CACHE_KEY_ALL = 'teams:all';
  private readonly CACHE_KEY_PREFIX = 'team:';

  constructor(
    private databaseService: DatabaseService,
    private cacheService: CacheService,
  ) {}

  async generateTemplate(): Promise<string> {
    const templatePath = path.join(this.TEMPLATE_DIR, this.TEMPLATE_FILE);

    if (fs.existsSync(templatePath)) {
      this.logger.log(`Using cached template: ${templatePath}`);
      return templatePath;
    }

    this.logger.log(`Generating new template: ${templatePath}`);
    await this.ensureTemplateDir();

    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    workbook.modified = new Date();

    await this.createMainSheet(workbook);
    await this.createChampionListSheet(workbook);

    await workbook.xlsx.writeFile(templatePath);
    this.logger.log(`Template generated successfully: ${templatePath}`);

    return templatePath;
  }

  private async ensureTemplateDir(): Promise<void> {
    if (!fs.existsSync(this.TEMPLATE_DIR)) {
      fs.mkdirSync(this.TEMPLATE_DIR, { recursive: true });
    }
  }

  private async createMainSheet(workbook: ExcelJS.Workbook): Promise<void> {
    const sheet = workbook.addWorksheet('战队与队员信息导入');

    sheet.getCell('A1').value = '战队与队员信息导入模板';
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.getCell('A2').value =
      '说明：每支战队占5行，分别对应5个位置（上单、打野、中单、ADC、辅助）。请按顺序填写，同一战队只需在第1行填写战队信息。';
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
    sheet.mergeCells('A2:N2');

    sheet.getCell('A3').value = '战队名称';
    sheet.getCell('B3').value = '队标URL';
    sheet.getCell('C3').value = '参赛宣言';
    sheet.getCell('D3').value = '位置';
    sheet.getCell('E3').value = '队员昵称';
    sheet.getCell('F3').value = '队员游戏ID';
    sheet.getCell('G3').value = '队员头像URL';
    sheet.getCell('H3').value = '评分';
    sheet.getCell('I3').value = '是否队长';
    sheet.getCell('J3').value = '实力等级';
    sheet.getCell('K3').value = '常用英雄';
    sheet.getCell('L3').value = '直播间号';
    sheet.getCell('M3').value = '个人简介';
    sheet.getCell('N3').value = '拍卖价';

    const headerRow = sheet.getRow(3);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCE5FF' },
    };

    sheet.getCell('A4').value = '示例战队';
    sheet.getCell('B4').value = 'https://example.com/logo.png';
    sheet.getCell('C4').value = '我们是冠军！';
    sheet.getCell('D4').value = '上单';
    sheet.getCell('E4').value = '小明';
    sheet.getCell('F4').value = 'Champion123';
    sheet.getCell('G4').value = 'https://example.com/avatar.png';
    sheet.getCell('H4').value = 85;
    sheet.getCell('I4').value = '是';
    sheet.getCell('J4').value = 'S';
    sheet.getCell('K4').value = '亚索,盲僧';
    sheet.getCell('L4').value = '123456';
    sheet.getCell('M4').value = '我是上单选手';
    sheet.getCell('N4').value = 100;

    for (let i = 5; i <= 8; i++) {
      const positionMap: { [key: number]: string } = {
        5: '打野',
        6: '中单',
        7: 'ADC',
        8: '辅助',
      };
      const auctionPriceMap: { [key: number]: number } = {
        5: 80,
        6: 90,
        7: 110,
        8: 70,
      };
      sheet.getCell(`D${i}`).value = positionMap[i];
      sheet.getCell(`E${i}`).value = `队员${i - 3}`;
      sheet.getCell(`H${i}`).value = 75;
      sheet.getCell(`I${i}`).value = '否';
      sheet.getCell(`J${i}`).value = 'B';
      sheet.getCell(`N${i}`).value = auctionPriceMap[i];
    }

    sheet.getCell('D4').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"上单,打野,中单,ADC,辅助"'],
    };
    sheet.getCell('D5').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"上单,打野,中单,ADC,辅助"'],
    };
    sheet.getCell('D6').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"上单,打野,中单,ADC,辅助"'],
    };
    sheet.getCell('D7').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"上单,打野,中单,ADC,辅助"'],
    };
    sheet.getCell('D8').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"上单,打野,中单,ADC,辅助"'],
    };

    sheet.getCell('I4').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"是,否"'],
    };
    sheet.getCell('I5').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"是,否"'],
    };
    sheet.getCell('I6').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"是,否"'],
    };
    sheet.getCell('I7').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"是,否"'],
    };
    sheet.getCell('I8').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"是,否"'],
    };

    sheet.getCell('J4').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"S,A,B,C,D"'],
    };
    sheet.getCell('J5').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"S,A,B,C,D"'],
    };
    sheet.getCell('J6').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"S,A,B,C,D"'],
    };
    sheet.getCell('J7').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"S,A,B,C,D"'],
    };
    sheet.getCell('J8').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"S,A,B,C,D"'],
    };

    for (let col = 1; col <= 13; col++) {
      sheet.getColumn(col).width = 15;
    }
    sheet.getColumn(3).width = 20;
    sheet.getColumn(11).width = 25;
    sheet.getColumn(13).width = 25;
  }

  private async createChampionListSheet(workbook: ExcelJS.Workbook): Promise<void> {
    const sheet = workbook.addWorksheet('英雄列表（参考）');

    sheet.getCell('A1').value = '英雄名称参考';
    sheet.getCell('A1').font = { size: 14, bold: true };

    sheet.getCell('A3').value = '英文ID';
    sheet.getCell('B3').value = '中文名称';
    sheet.getCell('C3').value = '中文称号';

    const headerRow = sheet.getRow(3);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCFFCC' },
    };

    const championMap = loadChampionMap();
    let row = 4;

    for (const champion of Object.values(championMap)) {
      sheet.getCell(`A${row}`).value = champion.id;
      sheet.getCell(`B${row}`).value = champion.name;
      sheet.getCell(`C${row}`).value = champion.title;
      row++;
    }

    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 20;
  }

  async refreshTemplate(): Promise<string> {
    const templatePath = path.join(this.TEMPLATE_DIR, this.TEMPLATE_FILE);

    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
      this.logger.log(`Old template deleted: ${templatePath}`);
    }

    return this.generateTemplate();
  }

  async importFromExcel(filePath: string): Promise<ImportResultDto> {
    const errors: ImportErrorDto[] = [];
    const externalUrlItems: string[] = [];
    let created = 0;
    let updated = 0;
    const failed = 0;

    try {
      const headerValidation = await validateExcelHeaders(filePath);
      if (!headerValidation.valid) {
        throw new Error(`缺少必要的列头: ${headerValidation.missingHeaders.join(', ')}`);
      }

      const teams = await parseExcel(filePath);
      const rowCount = await getExcelRowCount(filePath);

      const validationResult = validateImportData(teams, rowCount);
      if (!validationResult.valid) {
        return new ImportResultDto(teams.length, 0, 0, teams.length, validationResult.errors, []);
      }

      const existingTeams = await this.databaseService.all<any>('SELECT * FROM teams');
      const existingTeamMap = new Map(existingTeams.map((t) => [t.name, t]));

      const existingTeamCount = existingTeams.length;
      const newTeamCount = teams.filter((t) => !existingTeamMap.has(t.name)).length;

      if (existingTeamCount + newTeamCount > 16) {
        return new ImportResultDto(
          teams.length,
          0,
          0,
          teams.length,
          [new ImportErrorDto(0, '', '', 'teamLimit', '导入后战队总数将超过16支上限')],
          [],
        );
      }

      await this.databaseService.begin();

      try {
        for (const team of teams) {
          const existingTeam = existingTeamMap.get(team.name);

          if (existingTeam) {
            await this.updateTeamWithMembers(existingTeam.id, team);
            updated++;
          } else {
            await this.createTeamWithMembers(team);
            created++;
          }

          if (team.logoUrl && team.logoUrl.startsWith('http')) {
            externalUrlItems.push(`队标: ${team.name} - ${team.logoUrl}`);
          }
          for (const member of team.members) {
            if (member.avatarUrl && member.avatarUrl.startsWith('http')) {
              externalUrlItems.push(
                `头像: ${team.name}-${member.nickname || member.position} - ${member.avatarUrl}`,
              );
            }
          }
        }

        await this.databaseService.commit();
      } catch (err) {
        await this.databaseService.rollback();
        throw err;
      }

      this.cacheService.del(this.CACHE_KEY_ALL);
      for (const team of existingTeamMap.values()) {
        this.cacheService.del(`${this.CACHE_KEY_PREFIX}${team.id}`);
      }

      return new ImportResultDto(teams.length, created, updated, failed, errors, externalUrlItems);
    } finally {
      this.cleanupTempFile(filePath);
    }
  }

  private async createTeamWithMembers(team: ImportTeamDto): Promise<void> {
    const teamId = uuidv4();

    await this.databaseService.run(
      `INSERT INTO teams (id, name, logo_url, battle_cry, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [teamId, team.name, team.logoUrl || null, team.battleCry || null],
    );

    for (const member of team.members) {
      const memberId = uuidv4();
      const championPool = member.championPoolStr ? parseChampionPool(member.championPoolStr) : [];

      await this.databaseService.run(
        `INSERT INTO team_members (id, nickname, avatar_url, position, team_id, game_id, bio, champion_pool, rating, is_captain, live_url, level, auction_price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          memberId,
          member.nickname || null,
          member.avatarUrl || null,
          member.position,
          teamId,
          member.gameId || null,
          member.bio || null,
          championPool.length > 0 ? JSON.stringify(championPool) : null,
          member.rating || 60,
          member.isCaptain ? 1 : 0,
          member.liveRoom ? parseLiveUrl(member.liveRoom) : null,
          member.level || null,
          member.auctionPrice || 0,
        ],
      );
    }
  }

  private async updateTeamWithMembers(teamId: string, team: ImportTeamDto): Promise<void> {
    const existing = await this.databaseService.get<any>('SELECT * FROM teams WHERE id = ?', [
      teamId,
    ]);

    if (existing.logo_url && existing.logo_url !== team.logoUrl) {
      await this.deleteTeamFile(existing.logo_url);
    }

    await this.databaseService.run(
      `UPDATE teams SET name = ?, logo_url = ?, battle_cry = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [team.name, team.logoUrl || null, team.battleCry || null, teamId],
    );

    const oldMembers = await this.databaseService.all<any>(
      'SELECT avatar_url FROM team_members WHERE team_id = ?',
      [teamId],
    );
    for (const member of oldMembers) {
      if (member.avatar_url) {
        await this.deleteMemberFile(member.avatar_url);
      }
    }
    await this.databaseService.run(`DELETE FROM team_members WHERE team_id = ?`, [teamId]);

    for (const member of team.members) {
      const memberId = uuidv4();
      const championPool = member.championPoolStr ? parseChampionPool(member.championPoolStr) : [];

      await this.databaseService.run(
        `INSERT INTO team_members (id, nickname, avatar_url, position, team_id, game_id, bio, champion_pool, rating, is_captain, live_url, level, auction_price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          memberId,
          member.nickname || null,
          member.avatarUrl || null,
          member.position,
          teamId,
          member.gameId || null,
          member.bio || null,
          championPool.length > 0 ? JSON.stringify(championPool) : null,
          member.rating || 60,
          member.isCaptain ? 1 : 0,
          member.liveRoom ? parseLiveUrl(member.liveRoom) : null,
          member.level || null,
          member.auctionPrice || 0,
        ],
      );
    }
  }

  private async deleteTeamFile(fileUrl: string): Promise<void> {
    if (!fileUrl || fileUrl.startsWith('http')) return;
    try {
      const filename = path.basename(fileUrl);
      const filePath = getTeamLogoPath(filename);
      const thumbnailPath = getTeamLogoThumbnailPath(filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        await this.databaseService.deleteFileHashByPath(filePath);
        this.logger.log(`Team file deleted: ${filePath}`);
      }
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        await this.databaseService.deleteFileHashByPath(thumbnailPath);
        this.logger.log(`Team thumbnail deleted: ${thumbnailPath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete team file ${fileUrl}: ${error.message}`);
    }
  }

  private async deleteMemberFile(fileUrl: string): Promise<void> {
    if (!fileUrl || fileUrl.startsWith('http')) return;
    try {
      const filename = path.basename(fileUrl);
      const avatarDir = path.dirname(getTeamLogoPath('placeholder')).replace('teams', 'members');
      const filePath = path.join(avatarDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        await this.databaseService.deleteFileHashByPath(filePath);
        this.logger.log(`Member avatar deleted: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete member avatar ${fileUrl}: ${error.message}`);
    }
  }

  async generateErrorReport(errors: ImportErrorDto[]): Promise<Buffer> {
    const lines: string[] = [];

    // 标题
    lines.push('========================================');
    lines.push('       战队信息导入错误报告');
    lines.push('========================================');
    lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
    lines.push(`错误总数：${errors.length}`);
    lines.push('');

    // 错误详情
    lines.push('------ 错误详情 ------');
    lines.push('');

    errors.forEach((error, index) => {
      lines.push(`[${index + 1}] 第 ${error.row} 行`);
      lines.push(`    战队名称：${error.teamName || '未知'}`);
      lines.push(`    位置：${error.position || '未知'}`);
      lines.push(`    错误字段：${error.field || '未知'}`);
      lines.push(`    错误信息：${error.message}`);
      lines.push('');
    });

    lines.push('========================================');
    lines.push('              报告结束');
    lines.push('========================================');

    const content = lines.join('\n');
    return Buffer.from(content, 'utf-8');
  }

  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Temp file cleaned up: ${filePath}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to cleanup temp file: ${filePath}`, err);
    }
  }
}
