import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync-push.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { User, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Cross-device Sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Get('pull')
  @ApiOperation({ summary: '拉取服务端的学习计划 + 错题本（含删除墓碑）' })
  pull(@User() user: AuthUser) {
    return this.sync.pull(user.id);
  }

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Post('push')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '推送本地状态并双向合并，返回合并后的权威全量',
    description:
      '按每条记录的 clientUpdatedAt 做 last-write-wins；删除以墓碑传播，' +
      '时间不早于对端修改时间时删除胜出。返回值可直接覆盖本地存储。',
  })
  push(@User() user: AuthUser, @Body() dto: SyncPushDto) {
    return this.sync.push(user.id, dto);
  }
}
