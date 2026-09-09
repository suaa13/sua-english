import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ChatDto, ChatScene, ChatMessageDto } from './dto/chat.dto';

// 场景系统提示：把模型约束在「英语陪练」这个角色里，避免跑题或用中文长篇说教。
const SCENE_SYSTEM: Record<ChatScene, string> = {
  casual:
    'You are SUA English\'s AI English Partner, a friendly and encouraging IELTS/TOEFL tutor. Reply in the same language the user writes (English if they write English, Chinese if Chinese). Correct mistakes gently, then give a better version. Keep replies concise and practical.',
  ielts:
    'You are an IELTS Speaking examiner. Ask one question at a time, follow the Part 1/2/3 style, and do not give a band score until the test finishes. After each answer, give one short piece of feedback (fluency, vocabulary, grammar or pronunciation) and then ask the next question.',
  toefl:
    'You are a TOEFL Speaking trainer. Give one task at a time with its timing (15s prepare / 45s speak, or integrated tasks). After the answer, give one focused suggestion and then move to the next task.',
  coach:
    'You are a strict but encouraging English coach. The user must produce first: never write the full answer for them. Judge whether the attempt meets the stated criteria, then give exactly one key improvement. Be specific and short.',
};

const MAX_MESSAGES = 20;      // 只带最近 20 条上下文，控制成本与失败率
const MAX_CHARS = 4000;       // 单条内容上限
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 20000;

export interface ChatResult {
  text: string;
  model: string;
  engine: 'upstream';
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /** 服务端是否配好了上游模型。未配置时前端应回退到本地规则，而不是反复打这个接口。 */
  get configured(): boolean {
    return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL);
  }

  /** OpenAI 兼容端点：base 可以填到 /v1，也可以填完整路径。 */
  endpoint(): string {
    const base = String(process.env.AI_BASE_URL || '').trim().replace(/\/+$/, '');
    return /\/chat\/completions$/i.test(base) ? base : base + '/chat/completions';
  }

  async chat(dto: ChatDto): Promise<ChatResult> {
    if (!this.configured) {
      throw new ServiceUnavailableException({
        message: '服务端未配置 AI 模型',
        error: 'AI_NOT_CONFIGURED',
      });
    }

    const model = process.env.AI_MODEL || DEFAULT_MODEL;
    const messages = this.sanitize(dto.messages);
    const ctrl = new AbortController();
    const timeout = Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
    const tid = setTimeout(() => ctrl.abort(), timeout);

    try {
      const res = await fetch(this.endpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.AI_API_KEY,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: SCENE_SYSTEM[dto.scene || 'casual'] }, ...messages],
          temperature: dto.temperature ?? 0.7,
          stream: false,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        this.logger.warn(`AI upstream responded ${res.status}`);
        throw new BadGatewayException({
          message: '上游模型调用失败，请稍后重试',
          error: 'AI_UPSTREAM_FAILED',
        });
      }

      const json = (await res.json().catch(() => null)) as
        | { choices?: { message?: { content?: string } }[] }
        | null;
      const text = json?.choices?.[0]?.message?.content;
      if (!text || !String(text).trim()) {
        throw new BadGatewayException({ message: '上游返回内容为空', error: 'AI_UPSTREAM_EMPTY' });
      }

      return { text: String(text).trim(), model, engine: 'upstream' };
    } catch (err) {
      // 已经是可预期的业务异常就直接抛，别再包一层
      if (err instanceof BadGatewayException) throw err;
      this.logger.error(`AI upstream error: ${(err as Error).message}`);
      throw new BadGatewayException({
        message: 'AI 服务暂时不可用',
        error: 'AI_UPSTREAM_FAILED',
      });
    } finally {
      clearTimeout(tid);
    }
  }

  /** 丢掉空消息、只留最近若干条、截断超长内容。 */
  private sanitize(messages: ChatMessageDto[]): ChatMessageDto[] {
    return (messages || [])
      .filter((m) => m && m.content && m.content.trim())
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  }
}
