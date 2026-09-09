import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

// 积分规则集中在此，避免散落各处后难以调整。
export const CREDITS = {
  REGISTER_GIFT: 10, // 注册赠送
  DAILY_CHECKIN: 5,  // 每日签到
  AI_CHAT_COST: 1,   // 一次 AI 调用（走平台 server 代理；用户自带 key 不扣）
} as const;

/** 服务端本地日期 YYYY-MM-DD，与 StudySession.date 同一约定，避免时区歧义。 */
function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 余额 + 今日是否还能签到。 */
  async status(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('用户不存在');
    const today = todayStr();
    return {
      credits: u.credits,
      lastCheckIn: u.lastCheckIn ?? null,
      canCheckIn: u.lastCheckIn !== today,
    };
  }

  /**
   * 每日签到送 5 积分。同一天重复调用不重复发奖，
   * 以 awarded=0 表示「今天领过了」，让前端提示而不是报错。
   */
  async checkIn(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('用户不存在');

    const today = todayStr();
    if (u.lastCheckIn === today) {
      return {
        credits: u.credits,
        awarded: 0,
        lastCheckIn: u.lastCheckIn,
        message: '今天已经签到过了，明天再来',
      };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: CREDITS.DAILY_CHECKIN }, lastCheckIn: today },
    });

    return {
      credits: updated.credits,
      awarded: CREDITS.DAILY_CHECKIN,
      lastCheckIn: today,
      message: `签到成功，+${CREDITS.DAILY_CHECKIN} 积分`,
    };
  }

  /**
   * 扣费。余额不足抛 402 INSUFFICIENT_CREDITS，由调用方决定提示方式。
   *
   * 用 updateMany + where credits >= cost 做原子扣减：单条 SQL 完成
   * 「判断余额 + 扣减」，并发请求不会把余额扣成负数。
   */
  async consume(userId: string, cost: number = CREDITS.AI_CHAT_COST) {
    if (cost <= 0) return 0;

    const res = await this.prisma.user.updateMany({
      where: { id: userId, credits: { gte: cost } },
      data: { credits: { decrement: cost } },
    });

    if (res.count === 0) {
      // 要么用户不存在、要么余额不足 —— 查一次以便给出准确提示
      const u = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!u) throw new NotFoundException('用户不存在');
      throw new HttpException(
        {
          message: `积分不足（当前 ${u.credits}，本次需要 ${cost}）。每日签到可 +${CREDITS.DAILY_CHECKIN}，也可在「AI 设置」里填自己的 API Key（自带 key 不消耗积分）。`,
          error: 'INSUFFICIENT_CREDITS',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return cost;
  }

  /** 退款：上游调用失败时不该让用户白扣积分。 */
  async refund(userId: string, cost: number = CREDITS.AI_CHAT_COST) {
    if (cost <= 0) return 0;
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { credits: { increment: cost } },
    });
    this.logger.warn(`refunded ${cost} credit(s) to user ${userId}`);
    return cost;
  }
}
