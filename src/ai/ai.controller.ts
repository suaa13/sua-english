import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AiService, ChatResult } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { User, AuthUser } from '../common/decorators/current-user.decorator';
import { CREDITS, CreditsService } from '../credits/credits.service';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly credits: CreditsService,
  ) {}

  /**
   * AI 陪练对话代理。密钥只存在服务端，浏览器永不接触。
   * 未配置上游（AI_NOT_CONFIGURED）或上游故障（AI_UPSTREAM_*）时前端按约定回退。
   */
  @UseGuards(JwtAccessGuard)
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: `AI 陪练对话（服务端代理，密钥不出后端，每次 ${CREDITS.AI_CHAT_COST} 积分）` })
  async chat(@Body() dto: ChatDto, @User() user: AuthUser): Promise<ChatResult> {
    // 后端没配上游时按约定返回 AI_NOT_CONFIGURED，不消耗积分（前端安静回退本地规则）
    if (!this.ai.configured) {
      throw new ServiceUnavailableException({
        message: '服务端未配置 AI 模型',
        error: 'AI_NOT_CONFIGURED',
      });
    }

    // 先扣后调：原子扣减防并发超额；上游失败则原额退回，不让用户白扣。
    const cost = await this.credits.consume(user.id, CREDITS.AI_CHAT_COST);
    try {
      return await this.ai.chat(dto);
    } catch (err) {
      await this.credits.refund(user.id, cost);
      throw err;
    }
  }

  /** 前端用来决定显示哪个引擎徽标，不触发任何上游调用。 */
  @Get('status')
  @ApiOperation({ summary: '查询 AI 服务可用性与当前模型' })
  status() {
    return {
      configured: this.ai.configured,
      model: this.ai.configured ? process.env.AI_MODEL || 'gpt-4o-mini' : null,
    };
  }
}
