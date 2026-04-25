import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiPropertyOptional({ description: '成员ID (可选，不传则由后端生成UUID)' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({ description: '昵称' })
  @IsNotEmpty()
  @IsString()
  nickname: string;

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

  @ApiPropertyOptional({ description: '英雄池' })
  @IsArray()
  @IsOptional()
  championPool?: string[];

  @ApiPropertyOptional({ description: 'rating' })
  @IsNumber()
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ description: '是否为队长' })
  @IsBoolean()
  @IsOptional()
  isCaptain?: boolean;

  @ApiPropertyOptional({ description: '直播URL' })
  @IsString()
  @IsOptional()
  liveUrl?: string;

  @ApiPropertyOptional({ description: '排序顺序' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '拍卖价 (0-200的正整数)' })
  @IsInt()
  @Min(0)
  @Max(200)
  @IsOptional()
  auctionPrice?: number;
}
