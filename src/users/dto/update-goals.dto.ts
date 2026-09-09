import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsNumber, IsISO8601, IsInt, Min } from 'class-validator';
import { TARGET_EXAMS, LEVELS } from '../../auth/dto/register.dto';

export class UpdateGoalsDto {
  @ApiPropertyOptional({ enum: TARGET_EXAMS })
  @IsOptional()
  @IsIn([...TARGET_EXAMS])
  targetExam?: string;

  @ApiPropertyOptional({ example: 6.5 })
  @IsOptional()
  @IsNumber()
  targetScore?: number;

  @ApiPropertyOptional({ enum: LEVELS })
  @IsOptional()
  @IsIn([...LEVELS])
  currentLevel?: string;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsISO8601()
  examDate?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyStudyMinutes?: number;
}
