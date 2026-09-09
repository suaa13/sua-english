import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProgressDto } from './dto/upsert-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Summary ----------------
  async summary(userId: string) {
    const [rows, sessions] = await this.prisma.$transaction([
      this.prisma.userProgress.findMany({ where: { userId } }),
      this.prisma.studySession.findMany({
        where: { userId },
        select: { date: true },
        orderBy: { date: 'desc' },
      }),
    ]);

    const byStatus = { not_started: 0, learning: 0, completed: 0, mastered: 0 };
    for (const r of rows) {
      if (r.status in byStatus) byStatus[r.status as keyof typeof byStatus] += 1;
    }

    const dates = sessions.map((s) => s.date);
    const today = this.todayStr();

    return {
      total: rows.length,
      byStatus,
      completed: byStatus.completed + byStatus.mastered,
      streakDays: this.computeStreak(dates),
      todayStudied: dates.includes(today),
    };
  }

  // ---------------- Single record ----------------
  async getOne(userId: string, itemType: string, itemId: string) {
    const p = await this.prisma.userProgress.findUnique({
      where: { userId_itemType_itemId: { userId, itemType, itemId } },
    });
    if (!p) throw new NotFoundException('进度记录不存在');
    return this.shape(p);
  }

  // ---------------- Upsert (create or update) ----------------
  async upsert(userId: string, dto: UpsertProgressDto) {
    const data: Record<string, any> = { status: dto.status ?? 'learning' };
    if (dto.correctCount !== undefined) data.correctCount = dto.correctCount;
    if (dto.totalCount !== undefined) data.totalCount = dto.totalCount;
    if (dto.lastReviewedAt !== undefined) data.lastReviewedAt = new Date(dto.lastReviewedAt);

    const record = await this.prisma.userProgress.upsert({
      where: { userId_itemType_itemId: { userId, itemType: dto.itemType, itemId: dto.itemId } },
      create: { userId, itemType: dto.itemType, itemId: dto.itemId, ...data },
      update: data,
    });
    await this.recordSession(userId);
    return this.shape(record);
  }

  // ---------------- Patch by id ----------------
  async update(userId: string, id: string, dto: UpdateProgressDto) {
    const existing = await this.prisma.userProgress.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('进度记录不存在');

    const data: Record<string, any> = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.correctCount !== undefined) data.correctCount = dto.correctCount;
    if (dto.totalCount !== undefined) data.totalCount = dto.totalCount;
    if (dto.lastReviewedAt !== undefined) data.lastReviewedAt = new Date(dto.lastReviewedAt);

    const record = await this.prisma.userProgress.update({ where: { id }, data });
    await this.recordSession(userId);
    return this.shape(record);
  }

  // ---------------- Helpers ----------------
  private async recordSession(userId: string) {
    const date = this.todayStr();
    await this.prisma.studySession.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date },
      update: {},
    });
  }

  private computeStreak(dates: string[]): number {
    const set = new Set(dates);
    let streak = 0;
    const d = new Date();
    // Allow the streak to be "alive" if yesterday was the last study day
    // (i.e. today not yet studied, but the run is unbroken up to yesterday).
    if (!set.has(this.fmt(d))) d.setDate(d.getDate() - 1);
    while (set.has(this.fmt(d))) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  private fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private todayStr(): string {
    return this.fmt(new Date());
  }

  private shape(p: any) {
    return {
      id: p.id,
      itemType: p.itemType,
      itemId: p.itemId,
      status: p.status,
      correctCount: p.correctCount,
      totalCount: p.totalCount,
      lastReviewedAt: p.lastReviewedAt ? new Date(p.lastReviewedAt).toISOString() : null,
      updatedAt: new Date(p.updatedAt).toISOString(),
    };
  }
}
