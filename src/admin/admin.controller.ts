import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { AdminTokenGuard, ADMIN_TOKEN_HEADER } from './guards/admin-token.guard';

/**
 * 管理后台只读 API。鉴权：`x-admin-token: <ADMIN_TOKEN>`（服务端环境变量）。
 * 与用户账号体系完全隔离 —— 管理员不需要是注册用户。
 */
@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminTokenGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @ApiOperation({
    summary: '全站概览：用户数与各类学习数据总量',
    description: `需要请求头 ${ADMIN_TOKEN_HEADER}`,
  })
  overview() {
    return this.admin.overview();
  }

  @Get('users')
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
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: '导出用户 CSV' })
  async exportCsv() {
    return this.admin.exportUsersCsv();
  }

  @Get('users/:id')
  @ApiOperation({ summary: '单个用户明细：画像、学习进度、错题、学习记录、主状态快照' })
  async getUser(@Param('id') id: string) {
    const data = await this.admin.getUser(id);
    if (!data) throw new NotFoundException('用户不存在');
    return data;
  }
}
