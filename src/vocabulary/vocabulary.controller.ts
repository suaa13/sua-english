import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { VocabularyService } from './vocabulary.service';
import { QueryWordDto } from './dto/query-word.dto';
import { RandomWordDto } from './dto/random-word.dto';

@ApiTags('Vocabulary')
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocab: VocabularyService) {}

  @Get()
  @ApiOperation({ summary: '获取单词列表（支持按 level / 关键词筛选与分页）' })
  list(@Query() query: QueryWordDto) {
    return this.vocab.list(query);
  }

  // 必须声明在 :id 之前，否则会被 detail 路由吃掉
  @Get('random')
  @ApiOperation({ summary: '随机抽词（练习池专用，避免固定排序导致只练到前几页）' })
  @ApiQuery({ name: 'level', required: false, example: 'ielts' })
  @ApiQuery({ name: 'n', required: false, example: 400 })
  random(@Query() query: RandomWordDto) {
    return this.vocab.random(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单词详情' })
  detail(@Param('id') id: string) {
    return this.vocab.detail(id);
  }
}
