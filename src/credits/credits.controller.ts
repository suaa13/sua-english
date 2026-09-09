import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CREDITS, CreditsService } from './credits.service';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { User, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Credits')
@ApiBearerAuth()
@Controller('credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  /** 积分余额与今日签到状态。前端据此决定签到按钮是否可点。 */
  @UseGuards(JwtAccessGuard)
  @Get()
  @ApiOperation({ summary: '查询积分余额与签到状态' })
  status(@User() user: AuthUser) {
    return this.credits.status(user.id);
  }

  /** 每日签到，送 5 积分；当天重复调用不发奖（awarded=0）。 */
  @UseGuards(JwtAccessGuard)
  @Post('checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: `每日签到（+${CREDITS.DAILY_CHECKIN} 积分）` })
  checkIn(@User() user: AuthUser) {
    return this.credits.checkIn(user.id);
  }
}
