import { Module } from '@nestjs/common';

import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';

@Module({
  controllers: [CreditsController],
  providers: [CreditsService],
  // 导出给 AiModule 使用：AI 调用需要在此扣积分。
  exports: [CreditsService],
})
export class CreditsModule {}
