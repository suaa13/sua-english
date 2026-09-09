import { Module } from '@nestjs/common';

import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { CreditsModule } from '../credits/credits.module';

@Module({
  // 需要 CreditsService 在 AI 调用前扣积分
  imports: [CreditsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
