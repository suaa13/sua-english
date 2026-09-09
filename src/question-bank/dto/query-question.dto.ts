import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryQuestionDto {
  @ApiPropertyOptional({ example: 'IELTS', description: 'IELTS | TOEFL' })
  @IsOptional()
  @IsString()
  exam?: string;

  @ApiPropertyOptional({ example: 'Reading', description: 'Listening | Reading | Writing | Speaking' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: 'medium', description: 'easy | medium | hard' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ example: 'environment', description: '模糊搜索 title / prompt / keyword / source' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 50, description: '每页条数，最大 500' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;

  @ApiPropertyOptional({ example: 50, description: '别名：与 pageSize 等价' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
