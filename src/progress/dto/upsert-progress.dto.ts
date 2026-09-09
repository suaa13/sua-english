import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  IsISO8601,
} from 'class-validator';

export const PROGRESS_STATUSES = [
  'not_started',
  'learning',
  'completed',
  'mastered',
] as const;

export class UpsertProgressDto {
  @ApiProperty({ example: 'vocab', description: 'vocab | grammar | course | lesson | listening | reading | writing | speaking' })
  @IsString()
  itemType: string;

  @ApiProperty({ example: 'v-environment' })
  @IsString()
  itemId: string;

  @ApiPropertyOptional({ enum: PROGRESS_STATUSES })
  @IsOptional()
  @IsIn([...PROGRESS_STATUSES])
  status?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  correctCount?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalCount?: number;

  @ApiPropertyOptional({ example: '2026-08-28T10:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  lastReviewedAt?: string;
}
