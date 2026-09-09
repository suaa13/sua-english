import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'A2' })
  @IsOptional()
  @IsString()
  englishLevel?: string;

  @ApiPropertyOptional({ example: '5.0' })
  @IsOptional()
  @IsString()
  listeningLevel?: string;

  @ApiPropertyOptional({ example: '5.5' })
  @IsOptional()
  @IsString()
  readingLevel?: string;

  @ApiPropertyOptional({ example: '4.5' })
  @IsOptional()
  @IsString()
  writingLevel?: string;

  @ApiPropertyOptional({ example: '5.0' })
  @IsOptional()
  @IsString()
  speakingLevel?: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  vocabularySize?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  studyDays?: number;

  @ApiPropertyOptional({ example: 360 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalStudyMinutes?: number;
}
