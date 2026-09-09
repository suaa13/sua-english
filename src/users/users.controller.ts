import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateGoalsDto } from './dto/update-goals.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { User, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: '获取当前用户资料与学习画像' })
  getProfile(@User() user: AuthUser) {
    return this.users.getProfile(user.id);
  }

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Patch('profile')
  @ApiOperation({ summary: '更新学习画像（四科能力、词汇量等）' })
  updateProfile(@User() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Patch('goals')
  @ApiOperation({ summary: '更新学习目标（考试 / 分数 / 日期 / 每日时长）' })
  updateGoals(@User() user: AuthUser, @Body() dto: UpdateGoalsDto) {
    return this.users.updateGoals(user.id, dto);
  }
}
