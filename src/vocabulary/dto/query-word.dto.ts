import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryWordDto {
  @ApiPropertyOptional({ example: 'ielts', description: 'basic | ielts | toefl' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: 'environment', description: '模糊搜索 word / 中文释义 / 英文释义' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: '每页条数，最大 500' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;

  @ApiPropertyOptional({ example: 300, description: '别名：与 pageSize 等价，便于前端批量拉取词库' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
