import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ProgressService } from './progress.service';
import { UpsertProgressDto } from './dto/upsert-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { User, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Learning Progress')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Get('summary')
  @ApiOperation({ summary: '学习概览：各状态计数、完成数、连续学习天数、今日是否学习' })
  summary(@User() user: AuthUser) {
    return this.progress.summary(user.id);
  }

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Get(':itemType/:itemId')
  @ApiOperation({ summary: '获取某条学习记录的进度' })
  getOne(@User() user: AuthUser, @Param('itemType') itemType: string, @Param('itemId') itemId: string) {
    return this.progress.getOne(user.id, itemType, itemId);
  }

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '上报 / 更新某条学习记录（upsert）' })
  upsert(@User() user: AuthUser, @Body() dto: UpsertProgressDto) {
    return this.progress.upsert(user.id, dto);
  }

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: '按记录 id 更新进度（状态 / 正确数 / 总数）' })
  update(@User() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProgressDto) {
    return this.progress.update(user.id, id, dto);
  }
}
