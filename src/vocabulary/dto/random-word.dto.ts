import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RandomWordDto {
  @ApiPropertyOptional({ example: 'ielts', description: 'basic | ielts | toefl，不传则全库随机' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: 400, description: '抽取条数，1–1000' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  n?: number;
}
