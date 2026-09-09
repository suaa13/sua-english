import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsInt, Min, IsISO8601 } from 'class-validator';
import { PROGRESS_STATUSES } from './upsert-progress.dto';

export class UpdateProgressDto {
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
