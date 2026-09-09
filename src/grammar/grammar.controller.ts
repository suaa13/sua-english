import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { GrammarService } from './grammar.service';
import { QueryGrammarDto } from './dto/query-grammar.dto';

@ApiTags('Grammar')
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammar: GrammarService) {}

  @Get()
  @ApiOperation({ summary: '获取语法课列表（可按 level 筛选）' })
  list(@Query() query: QueryGrammarDto) {
    return this.grammar.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取语法课详情（含例句与练习）' })
  detail(@Param('id') id: string) {
    return this.grammar.detail(id);
  }
}
