import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsInt, Min, Max } from 'class-validator';

export class ImportMemberDto {
  @ApiPropertyOptional({ description: 'Excel 原始行号' })
  @IsInt()
  @IsOptional()
  rowIndex?: number;

  @ApiPropertyOptional({ description: '昵称' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ description: '位置', enum: ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] })
  @IsString()
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

  @ApiPropertyOptional({ description: '游戏ID' })
  @IsString()
  @IsOptional()
  gameId?: string;

  @ApiPropertyOptional({ description: '个人简介' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ description: '英雄池（逗号分隔的中文名称）' })
  @IsString()
  @IsOptional()
  championPoolStr?: string;

  @ApiPropertyOptional({ description: '评分 0-100' })
  @IsNumber()
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ description: '是否队长（原始字符串）', enum: ['是', '否'] })
  @IsString()
  @IsOptional()
  isCaptainStr?: string;

  @ApiPropertyOptional({ description: '是否队长（解析后布尔值）' })
  @IsBoolean()
  @IsOptional()
  isCaptain?: boolean;

  @ApiPropertyOptional({ description: '实力等级', enum: ['S', 'A', 'B', 'C', 'D'] })
  @IsEnum(['S', 'A', 'B', 'C', 'D'])
  @IsOptional()
  level?: 'S' | 'A' | 'B' | 'C' | 'D';

  @ApiPropertyOptional({ description: '拍卖价 (0-200的正整数)' })
  @IsInt()
  @Min(0)
  @Max(200)
  @IsOptional()
  auctionPrice?: number;

  @ApiPropertyOptional({ description: '直播间号（纯数字）' })
  @IsString()
  @IsOptional()
  liveRoom?: string;

  @ApiPropertyOptional({ description: '个人简介' })
  @IsString()
  @IsOptional()
  personalBio?: string;
}
