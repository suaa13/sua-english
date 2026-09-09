import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryGrammarDto {
  @ApiPropertyOptional({ example: '基础', description: '0 基础 | 基础 | 中级 | IELTS / TOEFL' })
  @IsOptional()
  @IsString()
  level?: string;
}
