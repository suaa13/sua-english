import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SanitizedUser {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  targetExam: string;
  targetScore: number | null;
  currentLevel: string | null;
  examDate: string | null;
  dailyStudyMinutes: number | null;
  credits: number;
  lastCheckIn: string | null;
  createdAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Login-failure limiter (in-memory). In production this belongs in Redis.
  private readonly attempts = new Map<string, { count: number; lockUntil: number }>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_MS = 15 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------------- Register ----------------
  async register(dto: RegisterDto): Promise<{ user: SanitizedUser; tokens: AuthTokens }> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException('该邮箱或用户名已被注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const examDate = dto.examDate ? new Date(dto.examDate) : undefined;

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          username: dto.username,
          passwordHash,
          targetExam: dto.targetExam ?? 'IELTS',
          targetScore: dto.targetScore ?? null,
          currentLevel: dto.currentLevel ?? 'beginner',
          examDate,
          dailyStudyMinutes: dto.dailyStudyMinutes ?? 30,
          // 注册赠送 10 积分（schema 默认值也是 10，这里显式写出业务规则）
          credits: 10,
          profile: {
            create: {
              ieltsTarget: dto.targetExam === 'TOEFL' ? null : dto.targetScore ?? null,
              toeflTarget: dto.targetExam === 'IELTS' ? null : dto.targetScore ?? null,
            },
          },
        },
      });
      const tokens = await this.issueTokens(user.id, user.email, user.username, user.targetExam);
      return { user: this.sanitize(user), tokens };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('该邮箱或用户名已被注册');
      }
      throw err;
    }
  }

  // ---------------- Login ----------------
  async login(dto: LoginDto): Promise<{ user: SanitizedUser; tokens: AuthTokens }> {
    const identifier = dto.email.trim();
    this.assertNotLocked(identifier);

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
    });
    if (!user) {
      this.recordFailure(identifier);
      throw new UnauthorizedException('邮箱/用户名或密码错误');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      this.recordFailure(identifier);
      throw new UnauthorizedException('邮箱/用户名或密码错误');
    }

    this.clearFailure(identifier);
    const tokens = await this.issueTokens(user.id, user.email, user.username, user.targetExam);
    return { user: this.sanitize(user), tokens };
  }

  // ---------------- Refresh (rotation) ----------------
  async refresh(dto: RefreshDto): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = this.jwt.verify(dto.refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    const hash = this.hashToken(payload.jti);
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: hash } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    // Rotate: revoke old, issue new.
    await this.prisma.refreshToken.update({ where: { token: hash }, data: { revoked: true } });
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return this.issueTokens(user.id, user.email, user.username, user.targetExam);
  }

  // ---------------- Logout ----------------
  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
    if (refreshToken) {
      try {
        const payload = this.jwt.verify(refreshToken, {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        }) as { jti?: string };
        if (payload.jti) {
          await this.prisma.refreshToken.updateMany({
            where: { token: this.hashToken(payload.jti), userId },
            data: { revoked: true },
          });
        }
      } catch {
        // token already invalid; nothing to revoke
      }
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    }
    return { success: true };
  }

  // ---------------- Me ----------------
  async getMe(user: AuthUser): Promise<{ user: SanitizedUser; profile: any }> {
    const found = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });
    if (!found) throw new UnauthorizedException('用户不存在');
    return { user: this.sanitize(found), profile: found.profile };
  }

  // ---------------- Helpers ----------------
  private async issueTokens(
    userId: string,
    email: string,
    username: string,
    targetExam: string,
  ): Promise<AuthTokens> {
    const accessToken = this.jwt.sign(
      { sub: userId, email, username, targetExam },
      { secret: this.config.get<string>('JWT_SECRET'), expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES') || '15m' },
    );
    const jti = crypto.randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: userId, jti },
      { secret: this.config.get<string>('JWT_REFRESH_SECRET'), expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d' },
    );
    const expiresAt = new Date(Date.now() + this.durationToMs(this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d'));
    await this.prisma.refreshToken.create({
      data: { userId, token: this.hashToken(jti), expiresAt, revoked: false },
    });
    return { accessToken, refreshToken };
  }

  private hashToken(jti: string): string {
    return crypto.createHash('sha256').update(jti).digest('hex');
  }

  private sanitize(u: any): SanitizedUser {
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      avatar: u.avatar ?? null,
      targetExam: u.targetExam,
      targetScore: u.targetScore ?? null,
      currentLevel: u.currentLevel ?? null,
      examDate: u.examDate ? new Date(u.examDate).toISOString() : null,
      dailyStudyMinutes: u.dailyStudyMinutes ?? null,
      credits: u.credits ?? 0,
      lastCheckIn: u.lastCheckIn ?? null,
      createdAt: new Date(u.createdAt).toISOString(),
    };
  }

  private recordFailure(key: string) {
    const cur = this.attempts.get(key) || { count: 0, lockUntil: 0 };
    cur.count += 1;
    if (cur.count >= this.MAX_ATTEMPTS) cur.lockUntil = Date.now() + this.LOCK_MS;
    this.attempts.set(key, cur);
  }

  private assertNotLocked(key: string) {
    const cur = this.attempts.get(key);
    if (cur && cur.lockUntil > Date.now()) {
      const retryAfter = Math.ceil((cur.lockUntil - Date.now()) / 1000);
      throw new HttpException(
        { message: `尝试次数过多，请 ${retryAfter} 秒后重试`, error: 'RATE_LIMITED' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private clearFailure(key: string) {
    this.attempts.delete(key);
  }

  private durationToMs(d: string): number {
    const m = /^(\d+)\s*(d|h|m|s)$/.exec(d.trim());
    if (!m) return 7 * 86400000;
    const n = parseInt(m[1], 10);
    switch (m[2]) {
      case 'd':
        return n * 86400000;
      case 'h':
        return n * 3600000;
      case 'm':
        return n * 60000;
      default:
        return n * 1000;
    }
  }
}
