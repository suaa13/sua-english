import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { QuestionBankService } from './question-bank.service';
import { QueryQuestionDto } from './dto/query-question.dto';

@ApiTags('QuestionBank')
@Controller('question-bank')
export class QuestionBankController {
  constructor(private readonly svc: QuestionBankService) {}

  @Get()
  @ApiOperation({ summary: '真题题库列表（可按考试 / 科目 / 难度 / 关键词筛选与分页）' })
  list(@Query() query: QueryQuestionDto) {
    return this.svc.list(query);
  }

  /**
   * 随机抽题。必须声明在 ':id' 之前，否则会被 'random' 当成 id 拦截。
   */
  @Get('random')
  @ApiOperation({ summary: '在筛选条件内随机抽题（海量题库的主要练习入口）' })
  random(@Query() query: QueryQuestionDto, @Query('take') take?: string) {
    const n = Math.min(Math.max(1, Number(take) || 1), 50);
    return this.svc.random(query, n);
  }

  @Get(':id')
  @ApiOperation({ summary: '真题详情' })
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }
}
