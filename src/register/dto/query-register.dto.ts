import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 语义簇查询参数。
 *
 * 注意 `room` 的语义：room 是「档位」的属性（每簇四档各落在一个典型场合），
 * 不是簇的属性。所以 `?room=board` 表示「筛出含董事会话术的簇」，
 * 但返回时仍给完整四档 —— 语域阶梯的价值就在对比，截断就没意义了。
 */
export class QueryClusterDto {
  @ApiPropertyOptional({
    example: 'board',
    description: 'factory 车间验厂 | expo 展会 | proposal 客户提案 | email 邮件往来 | board 董事会 | meeting 跨部门会议',
  })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ example: 'cheap', description: '模糊搜索 cluster / 中文簇名 / 英文表达' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 50, description: '每页簇数，最大 200' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class QueryPhraseDto {
  @ApiPropertyOptional({ example: 'cheap', description: '按语义簇 key 精确筛选' })
  @IsOptional()
  @IsString()
  cluster?: string;

  @ApiPropertyOptional({ example: 'executive', description: 'casual | neutral | professional | executive' })
  @IsOptional()
  @IsString()
  register?: string;

  @ApiPropertyOptional({
    example: 'proposal',
    description: 'factory | expo | proposal | email | board | meeting',
  })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ example: 'margin', description: '模糊搜索英文表达 / 中文释义' })
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
}
