import {
  Body,
  Controller,
  Get,
  Header,
  Ip,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminLoginDto } from './dto/admin-login.dto';

/**
 * 管理后台 API。
 * 鉴权：先 `POST /api/v1/admin/login` 用账号密码换取会话令牌，之后带
 * `Authorization: Bearer <token>`。与用户账号体系完全隔离 —— 管理员不是注册用户。
 */
@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly auth: AdminAuthService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: '管理员账号密码登录，返回会话令牌' })
  login(@Body() dto: AdminLoginDto, @Ip() ip: string) {
    return this.auth.login(dto, ip || 'unknown');
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: '校验当前会话是否仍然有效' })
  me() {
    return { ok: true };
  }

  @Get('overview')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: '全站概览：用户数与各类学习数据总量' })
  overview() {
    return this.admin.overview();
  }

  @Get('users')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: '注册用户列表（含数据条数统计，支持搜索与翻页）' })
  listUsers(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listUsers({
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('users.csv')
  @UseGuards(AdminAuthGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: '导出用户 CSV' })
  async exportCsv() {
    return this.admin.exportUsersCsv();
  }

  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: '单个用户明细：画像、学习进度、错题、学习记录、主状态快照' })
  async getUser(@Param('id') id: string) {
    const data = await this.admin.getUser(id);
    if (!data) throw new NotFoundException('用户不存在');
    return data;
  }
}
