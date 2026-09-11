import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'crypto';

import type { AdminLoginDto } from './dto/admin-login.dto';

/** 管理员会话有效期：12 小时（比用户 access token 的 15 分钟长，免频繁登录）。 */
const ADMIN_TTL_MS = 12 * 60 * 60 * 1000;
/** 同一 IP 在窗口内允许的失败次数，超过即 429 限流（防暴力破解）。 */
const MAX_FAILS = 8;
const FAIL_WINDOW_MS = 10 * 60 * 1000;

export interface AdminIdentity {
  name: string;
}

/**
 * 管理员账号密码登录 + 会话签发。
 *
 * 凭据来源是环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD`（不是用户表 —— 管理员
 * 不该是注册用户，也不该有学习数据）。登录成功签发一个**独立密钥**的 JWT：
 * 密钥为 `ADMIN_JWT_SECRET`，缺省时从 `JWT_SECRET` 派生 `"...::admin"`。
 * 这样普通用户拿自己的 access token 永远换不到管理员权限（两者密钥不同）。
 */
@Injectable()
export class AdminAuthService {
  private readonly fails = new Map<string, { n: number; until: number }>();

  constructor(private readonly jwt: JwtService) {}

  /** 账号密码是否已配置。未配置则后台整体停用（默认即关闭，不会裸奔）。 */
  isConfigured(): boolean {
    const { username, password } = this.credentials();
    return !!username && !!password;
  }

  /** 账号密码登录，成功返回会话令牌。 */
  async login(dto: AdminLoginDto, ip: string) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'ADMIN_NOT_CONFIGURED',
        message: '服务端未配置管理员账号密码（ADMIN_USERNAME / ADMIN_PASSWORD），管理后台已停用',
      });
    }

    this.assertNotThrottled(ip);

    const { username, password } = this.credentials();
    // 两个字段都做恒定时间比较，且都算完再判断，避免"先返回用户错还是密码错"的信息泄露。
    const okUser = safeEqual(dto.username, username);
    const okPass = safeEqual(dto.password, password);
    if (!okUser || !okPass) {
      this.noteFailure(ip);
      throw new UnauthorizedException({ code: 'ADMIN_BAD_CREDENTIALS', message: '账号或密码错误' });
    }

    this.fails.delete(ip);
    const expiresAt = Date.now() + ADMIN_TTL_MS;
    const token = await this.jwt.signAsync(
      { sub: 'admin', role: 'admin', name: username },
      { secret: this.secret(), expiresIn: Math.floor(ADMIN_TTL_MS / 1000) },
    );
    return { token, expiresAt, username, role: 'admin' as const };
  }

  /** 校验会话令牌；无效返回 null（不抛错，交给 Guard 决定语义）。 */
  verify(token: string): AdminIdentity | null {
    if (!token || !this.isConfigured()) return null;
    try {
      const payload = this.jwt.verify<{ role?: string; name?: string }>(token, { secret: this.secret() });
      if (!payload || payload.role !== 'admin') return null;
      return { name: payload.name || 'admin' };
    } catch {
      return null;
    }
  }

  // ---------------- internals ----------------

  private credentials() {
    return {
      username: (process.env.ADMIN_USERNAME || '').trim(),
      password: process.env.ADMIN_PASSWORD || '',
    };
  }

  /** 管理员专用签名密钥。与用户 token 的密钥不同源，杜绝越权。 */
  private secret(): string {
    const explicit = (process.env.ADMIN_JWT_SECRET || '').trim();
    if (explicit) return explicit;
    const base = (process.env.JWT_SECRET || 'dev-access-secret').trim();
    return `${base}::admin`;
  }

  private assertNotThrottled(ip: string) {
    const rec = this.fails.get(ip);
    if (rec && rec.until > Date.now() && rec.n >= MAX_FAILS) {
      throw new HttpException(
        { code: 'ADMIN_TOO_MANY_ATTEMPTS', message: '登录尝试过于频繁，请 10 分钟后再试' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private noteFailure(ip: string) {
    const now = Date.now();
    const rec = this.fails.get(ip);
    if (!rec || rec.until <= now) this.fails.set(ip, { n: 1, until: now + FAIL_WINDOW_MS });
    else rec.n += 1;

    // 顺手清理过期记录，避免 Map 无限增长
    if (this.fails.size > 5000) {
      for (const [k, v] of this.fails) if (v.until <= now) this.fails.delete(k);
    }
  }
}

/** 恒定时间字符串比较：长度不同也走一次比较，避免用长度差异猜出密码长度。 */
function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(String(a ?? ''), 'utf8');
  const B = Buffer.from(String(b ?? ''), 'utf8');
  if (A.length !== B.length) {
    timingSafeEqual(A, A);
    return false;
  }
  return timingSafeEqual(A, B);
}
