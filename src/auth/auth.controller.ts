import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { User, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '注册新用户，并自动建立学习画像' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登录，返回 access + refresh token' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用 refresh token 换取新令牌（轮换）' })
  @Post('refresh')
  @ApiOperation({ summary: '使用 refresh token 换取新令牌（轮换）' })
  async refresh(@Body() dto: RefreshDto) {
    // Await here so a rejected Promise becomes a caught HttpException rather
    // than an unhandled rejection that crashes the process.
    const tokens = await this.auth.refresh(dto);
    // Mirror the login/register shape so the frontend parses both identically.
    return { tokens };
  }

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '退出登录，吊销 refresh token' })
  logout(@User() user: AuthUser, @Body() body: { refreshToken?: string }) {
    return this.auth.logout(user.id, body?.refreshToken);
  }

  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息与学习画像' })
  me(@User() user: AuthUser) {
    return this.auth.getMe(user);
  }
}
