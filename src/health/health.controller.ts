import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('System')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '服务健康检查' })
  health() {
    return { status: 'ok', service: 'sua-english-backend', time: new Date().toISOString() };
  }
}
