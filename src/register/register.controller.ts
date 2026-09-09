import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { RegisterService } from './register.service';
import { QueryClusterDto, QueryPhraseDto } from './dto/query-register.dto';

@ApiTags('Register')
@Controller('register')
export class RegisterController {
  constructor(private readonly register: RegisterService) {}

  @Get('clusters')
  @ApiOperation({
    summary: '语义簇列表（每簇返回完整四档语域，便于横向对比）',
    description: 'room 是档位的属性：筛选只决定哪些簇入选，返回仍给全四档。',
  })
  clusters(@Query() query: QueryClusterDto) {
    return this.register.clusters(query);
  }

  @Get('clusters/:key')
  @ApiOperation({ summary: '单个语义簇的四档语域详情' })
  cluster(@Param('key') key: string) {
    return this.register.cluster(key);
  }

  @Get('phrases')
  @ApiOperation({ summary: '语域短语扁平列表（按簇 / 语域 / 场合筛选与分页）' })
  phrases(@Query() query: QueryPhraseDto) {
    return this.register.phrases(query);
  }

  @Get('rooms')
  @ApiOperation({ summary: '场合清单及各场合条目数' })
  rooms() {
    return this.register.rooms();
  }
}
