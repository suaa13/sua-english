import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SyncCefrDto, SyncLearningStateDto, SyncPlanDto, SyncPushDto,
  SyncWeeklyReviewDto, SyncWeeklyReviewTombstoneDto, SyncWrongQuestionDto,
} from './dto/sync-push.dto';

/** 保留的墓碑上限，避免单用户无限增长。 */
const TOMBSTONE_KEEP = 2000;
/** 错题本上限，与前端 saveWQ 的 slice(0, 500) 保持一致。 */
const ITEM_KEEP = 500;

type PlanRow = {
  goal: string;
  daily: number;
  days: number;
  weights: string | null;
  schedule: string | null;
  progress: string | null;
  streak: number;
  clientUpdatedAt: Date;
  createdAt: Date;
};

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Pull ----------------
  async pull(userId: string) {
    const [plan, rows, cefr, state, reviews] = await this.prisma.$transaction([
      this.prisma.studyPlan.findUnique({ where: { userId } }),
      this.prisma.wrongQuestion.findMany({
        where: { userId },
        orderBy: { wrongAt: 'desc' },
        take: ITEM_KEEP + TOMBSTONE_KEEP,
      }),
      this.prisma.cefrProfile.findUnique({ where: { userId } }),
      this.prisma.learningState.findUnique({ where: { userId } }),
      this.prisma.weeklyReview.findMany({ where: { userId }, orderBy: { clientUpdatedAt: 'desc' }, take: 200 }),
    ]);
    return this.shapeState(plan as PlanRow | null, rows, cefr, state, reviews);
  }

  // ---------------- Push (双向合并) ----------------
  async push(userId: string, dto: SyncPushDto) {
    const incoming = dto.wrongQuestions ?? [];
    const tombstones = dto.tombstones ?? [];

    // 同一 id 客户端可能重复上报，取 clientUpdatedAt 最大的那条。
    const incomingMap = new Map<string, SyncWrongQuestionDto>();
    for (const it of incoming) {
      const prev = incomingMap.get(it.id);
      if (!prev || this.clientTs(it) > this.clientTs(prev)) incomingMap.set(it.id, it);
    }
    const tombMap = new Map<string, number>();
    for (const t of tombstones) {
      const prev = tombMap.get(t.id);
      if (prev == null || t.ts > prev) tombMap.set(t.id, t.ts);
    }

    const ids = [...new Set([...incomingMap.keys(), ...tombMap.keys()])];

    await this.prisma.$transaction(async (tx) => {
      const existing = ids.length
        ? await tx.wrongQuestion.findMany({ where: { userId, questionId: { in: ids } } })
        : [];
      const exMap = new Map(existing.map((r) => [r.questionId, r]));

      // --- 1) 错题条目 ---
      for (const [qid, it] of incomingMap) {
        const cu = this.clientTs(it);

        // 同一批里若既有条目又有墓碑，删除时间不早于修改时间则删除胜出。
        const tombTs = tombMap.get(qid);
        if (tombTs != null && tombTs >= cu) continue;

        const row = exMap.get(qid);
        const data = this.toRow(it, cu);

        if (!row) {
          await tx.wrongQuestion.create({ data: { userId, questionId: qid, ...data } });
        } else if (cu > row.clientUpdatedAt.getTime()) {
          // 比服务端更新才覆盖；同时复活曾被删除的条目（用户又答错了）。
          await tx.wrongQuestion.update({ where: { id: row.id }, data: { ...data, deleted: false } });
        }
      }

      // --- 2) 删除墓碑 ---
      for (const [qid, ts] of tombMap) {
        const row = exMap.get(qid);
        if (!row) {
          // 服务端没有这条：仍要落一条墓碑行，否则别的设备上的旧副本
          // 下次推送时会把它"复活"。
          await tx.wrongQuestion.create({
            data: {
              userId,
              questionId: qid,
              deleted: true,
              clientUpdatedAt: new Date(ts),
              wrongAt: new Date(ts),
              dueAt: new Date(ts),
            },
          });
        } else if (ts >= row.clientUpdatedAt.getTime() && !row.deleted) {
          await tx.wrongQuestion.update({
            where: { id: row.id },
            data: { deleted: true, clientUpdatedAt: new Date(ts) },
          });
        }
      }

      // --- 3) 学习计划（单条，last-write-wins）---
      const curPlan = await tx.studyPlan.findUnique({ where: { userId } });
      if (dto.plan) {
        const cu = dto.plan.updatedAt ?? dto.plan.createdAt ?? Date.now();
        if (!curPlan || cu > curPlan.clientUpdatedAt.getTime()) {
          const data = this.planToRow(dto.plan, cu);
          await tx.studyPlan.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
          });
        }
      } else if (dto.planRemovedAt != null) {
        if (curPlan && dto.planRemovedAt >= curPlan.clientUpdatedAt.getTime()) {
          await tx.studyPlan.delete({ where: { userId } });
        }
      }

      // --- 3.5) CEFR 能力档案（单条，last-write-wins，与 plan 同款）---
      if (dto.cefr) {
        const cu = dto.cefr.updatedAt ?? dto.cefr.createdAt ?? Date.now();
        const cur = await tx.cefrProfile.findUnique({ where: { userId } });
        if (!cur || cu > cur.clientUpdatedAt.getTime()) {
          const data = this.cefrToRow(dto.cefr, cu);
          await tx.cefrProfile.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
          });
        }
      }

      // --- 4) 学习状态（每用户一条，last-write-wins）---
      if (dto.state) {
        const cu = dto.state.updatedAt ?? Date.now();
        const cur = await tx.learningState.findUnique({ where: { userId } });
        if (!cur || cu > cur.clientUpdatedAt.getTime()) {
          const data = this.stateToRow(dto.state, cu);
          await tx.learningState.upsert({ where: { userId }, create: { userId, ...data }, update: data });
        }
      }

      // --- 5) 每周复盘（按 userId + weekStart LWW，支持墓碑）---
      const incomingReviews = dto.weeklyReviews ?? [];
      const incomingReviewTombs = dto.weeklyReviewTombstones ?? [];
      const reviewMap = new Map<string, SyncWeeklyReviewDto>();
      for (const it of incomingReviews) {
        const prev = reviewMap.get(it.weekStart);
        if (!prev || this.reviewTs(it) > this.reviewTs(prev)) reviewMap.set(it.weekStart, it);
      }
      const reviewTombMap = new Map<string, number>();
      for (const t of incomingReviewTombs) {
        const prev = reviewTombMap.get(t.weekStart);
        if (prev == null || t.ts > prev) reviewTombMap.set(t.weekStart, t.ts);
      }
      const reviewKeys = [...new Set([...reviewMap.keys(), ...reviewTombMap.keys()])];
      const existingReviews = reviewKeys.length
        ? await tx.weeklyReview.findMany({ where: { userId, weekStart: { in: reviewKeys } } })
        : [];
      const reviewExMap = new Map(existingReviews.map((r) => [r.weekStart, r]));

      for (const [weekStart, it] of reviewMap) {
        const cu = this.reviewTs(it);
        const tombTs = reviewTombMap.get(weekStart);
        if (tombTs != null && tombTs >= cu) continue;
        const row = reviewExMap.get(weekStart);
        const data = this.reviewToRow(it, cu);
        if (!row) {
          await tx.weeklyReview.create({ data: { userId, weekStart, ...data } });
        } else if (cu > row.clientUpdatedAt.getTime()) {
          await tx.weeklyReview.update({ where: { id: row.id }, data: { ...data, deleted: false } });
        }
      }

      for (const [weekStart, ts] of reviewTombMap) {
        const row = reviewExMap.get(weekStart);
        if (!row) {
          await tx.weeklyReview.create({
            data: { userId, weekStart, deleted: true, doc: null, clientUpdatedAt: new Date(ts), createdAt: new Date(ts) },
          });
        } else if (ts >= row.clientUpdatedAt.getTime() && !row.deleted) {
          await tx.weeklyReview.update({ where: { id: row.id }, data: { deleted: true, doc: null, clientUpdatedAt: new Date(ts) } });
        }
      }

      // --- 6) 墓碑修剪 ---
      const tombCount = await tx.wrongQuestion.count({ where: { userId, deleted: true } });
      if (tombCount > TOMBSTONE_KEEP) {
        const stale = await tx.wrongQuestion.findMany({
          where: { userId, deleted: true },
          orderBy: { clientUpdatedAt: 'asc' },
          take: tombCount - TOMBSTONE_KEEP,
          select: { id: true },
        });
        if (stale.length) {
          await tx.wrongQuestion.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
        }
      }
    });

    // 合并后回吐权威全量，客户端直接覆盖本地即可。
    return this.pull(userId);
  }

  // ---------------- Helpers ----------------
  /** 客户端修改时间：优先 updatedAt，退化到 lastReview / wrongAt。 */
  private clientTs(it: SyncWrongQuestionDto): number {
    return it.updatedAt ?? it.lastReview ?? it.wrongAt ?? 0;
  }

  private toRow(it: SyncWrongQuestionDto, cu: number) {
    const ms = (v: number | undefined, fb: number) => new Date(v == null ? fb : v);
    return {
      exam: it.exam ?? null,
      subject: it.subject ?? null,
      type: it.type ?? null,
      title: it.title ?? null,
      prompt: it.prompt ?? null,
      referenceAnswer: it.referenceAnswer ?? null,
      wrongAt: ms(it.wrongAt, cu),
      dueAt: ms(it.dueAt, cu),
      interval: it.interval ?? 0,
      ease: it.ease ?? 2.5,
      reps: it.reps ?? 0,
      lastReview: it.lastReview ? new Date(it.lastReview) : null,
      clientUpdatedAt: new Date(cu),
    };
  }

  private planToRow(p: SyncPlanDto, cu: number) {
    return {
      goal: p.goal ?? 'IELTS',
      daily: p.daily ?? 20,
      days: p.days ?? 30,
      weights: p.weights ? JSON.stringify(p.weights) : null,
      schedule: p.schedule ? JSON.stringify(p.schedule) : null,
      progress: p.progress ? JSON.stringify(p.progress) : null,
      streak: p.streak ?? 0,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(cu),
      clientUpdatedAt: new Date(cu),
    };
  }

  private cefrToRow(c: SyncCefrDto, cu: number) {
    return {
      overall: c.overall ?? 'A1',
      skills: c.skills ? JSON.stringify(c.skills) : null,
      diagnostic: c.diagnostic ? JSON.stringify(c.diagnostic) : null,
      goal12w: c.goal12w ? JSON.stringify(c.goal12w) : null,
      createdAt: c.createdAt ? new Date(c.createdAt) : new Date(cu),
      clientUpdatedAt: new Date(cu),
    };
  }

  private stateToRow(s: SyncLearningStateDto, cu: number) {
    return {
      doc: s.doc ? JSON.stringify(s.doc) : null,
      createdAt: s.createdAt ? new Date(s.createdAt) : new Date(cu),
      clientUpdatedAt: new Date(cu),
    };
  }

  private reviewTs(it: SyncWeeklyReviewDto | SyncWeeklyReviewTombstoneDto): number {
    return ('ts' in it) ? it.ts : (it.updatedAt ?? 0);
  }

  private reviewToRow(it: SyncWeeklyReviewDto, cu: number) {
    return {
      doc: it.doc ? JSON.stringify(it.doc) : null,
      deleted: it.deleted ?? false,
      createdAt: new Date(cu),
      clientUpdatedAt: new Date(cu),
    };
  }

  private parse<T>(s: string | null, fb: T): T {
    if (!s) return fb;
    try {
      const v = JSON.parse(s);
      return v == null ? fb : (v as T);
    } catch {
      return fb;
    }
  }

  private shapeState(plan: PlanRow | null, rows: any[], cefr: any, state: any, reviews: any[]) {
    const live = rows.filter((r) => !r.deleted).slice(0, ITEM_KEEP);
    const liveReviews = reviews.filter((r) => !r.deleted);
    return {
      plan: plan
        ? {
            goal: plan.goal,
            daily: plan.daily,
            days: plan.days,
            weights: this.parse<Record<string, number>>(plan.weights, {}),
            schedule: this.parse<any[]>(plan.schedule, []),
            progress: this.parse<Record<string, number>>(plan.progress, {}),
            streak: plan.streak,
            createdAt: plan.createdAt.getTime(),
            updatedAt: plan.clientUpdatedAt.getTime(),
          }
        : null,
      wrongQuestions: live.map((r) => ({
        id: r.questionId,
        exam: r.exam ?? undefined,
        subject: r.subject ?? undefined,
        type: r.type ?? undefined,
        title: r.title ?? undefined,
        prompt: r.prompt ?? undefined,
        referenceAnswer: r.referenceAnswer ?? undefined,
        wrongAt: r.wrongAt.getTime(),
        dueAt: r.dueAt.getTime(),
        interval: r.interval,
        ease: r.ease,
        reps: r.reps,
        lastReview: r.lastReview ? r.lastReview.getTime() : 0,
        updatedAt: r.clientUpdatedAt.getTime(),
      })),
      tombstones: rows
        .filter((r) => r.deleted)
        .map((r) => ({ id: r.questionId, ts: r.clientUpdatedAt.getTime() })),
      cefr: cefr
        ? {
            overall: cefr.overall,
            skills: this.parse<Record<string, string>>(cefr.skills, {}),
            diagnostic: this.parse<any>(cefr.diagnostic, null),
            goal12w: this.parse<any>(cefr.goal12w, null),
            createdAt: cefr.createdAt.getTime(),
            updatedAt: cefr.clientUpdatedAt.getTime(),
          }
        : null,
      state: state
        ? {
            doc: this.parse<any>(state.doc, null),
            createdAt: state.createdAt.getTime(),
            updatedAt: state.clientUpdatedAt.getTime(),
          }
        : null,
      weeklyReviews: liveReviews.map((r) => ({
        weekStart: r.weekStart,
        doc: this.parse<any>(r.doc, null),
        deleted: false,
        updatedAt: r.clientUpdatedAt.getTime(),
      })),
      weeklyReviewTombstones: reviews
        .filter((r) => r.deleted)
        .map((r) => ({ weekStart: r.weekStart, ts: r.clientUpdatedAt.getTime() })),
      serverTime: Date.now(),
    };
  }
}
