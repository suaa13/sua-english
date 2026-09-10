import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 管理后台数据服务：只读汇总，供运营/开发者查看"谁注册了、学了什么"。
 * 一律不返回密码哈希、刷新令牌等敏感字段。
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** 全站概览：用户数与各类学习数据总量 + 最近 7 天新增。 */
  async overview() {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [users, users7d, progress, wrong, sessions, plans, appStates, activeUsers] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: since } } }),
        this.prisma.userProgress.count(),
        this.prisma.wrongQuestion.count({ where: { deleted: false } }),
        this.prisma.studySession.count(),
        this.prisma.studyPlan.count(),
        this.prisma.userAppState.count(),
        // 有学习会话的用户数（真正"产生过数据"的人）
        this.prisma.studySession.groupBy({ by: ['userId'], _count: { _all: true } }),
      ]);

    return {
      users,
      newUsers7d: users7d,
      activeUsers: activeUsers.length,
      progressRows: progress,
      wrongQuestions: wrong,
      studySessions: sessions,
      studyPlans: plans,
      appStates: appStates,
      storage: {
        engine: 'PostgreSQL (Supabase)',
        note: '用户账号 + 学习数据全部落在 Postgres；前端只保留一份本地缓存，以服务端为准。',
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /** 用户列表：基本信息 + 数据条数统计，支持按邮箱/用户名搜索。 */
  async listUsers(opts: { q?: string; page?: number; pageSize?: number } = {}) {
    const page = Math.max(1, Number(opts.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts.pageSize) || 20));
    const q = (opts.q || '').trim();

    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { username: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          profile: true,
          _count: { select: { progress: true, wrongQuestions: true, studySessions: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: users.map((u) => this.shapeUser(u)),
    };
  }

  /** 单个用户明细：账号 + 画像 + 各类学习数据（用于"查看他产生了什么"）。 */
  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        studyPlan: true,
        cefrProfile: true,
        learningState: true,
        appState: true,
        progress: { orderBy: { updatedAt: 'desc' }, take: 100 },
        wrongQuestions: { where: { deleted: false }, orderBy: { wrongAt: 'desc' }, take: 50 },
        studySessions: { orderBy: { date: 'desc' }, take: 60 },
        weeklyReviews: { where: { deleted: false }, orderBy: { clientUpdatedAt: 'desc' }, take: 20 },
        _count: { select: { progress: true, wrongQuestions: true, studySessions: true } },
      },
    });
    if (!user) return null;

    const appDoc = this.json(user.appState?.doc);
    const summary = appDoc ? this.summarizeAppState(appDoc) : null;

    return {
      user: this.shapeUser(user),
      profile: user.profile,
      counts: user._count,
      studyPlan: user.studyPlan
        ? {
            goal: user.studyPlan.goal,
            daily: user.studyPlan.daily,
            days: user.studyPlan.days,
            streak: user.studyPlan.streak,
            weights: this.json(user.studyPlan.weights),
            schedule: this.json(user.studyPlan.schedule),
            progress: this.json(user.studyPlan.progress),
            updatedAt: user.studyPlan.clientUpdatedAt,
          }
        : null,
      cefr: user.cefrProfile
        ? {
            overall: user.cefrProfile.overall,
            skills: this.json(user.cefrProfile.skills),
            diagnostic: this.json(user.cefrProfile.diagnostic),
            goal12w: this.json(user.cefrProfile.goal12w),
            updatedAt: user.cefrProfile.clientUpdatedAt,
          }
        : null,
      learningState: this.json(user.learningState?.doc),
      appState: appDoc
        ? { doc: appDoc, updatedAt: user.appState?.clientUpdatedAt, summary }
        : null,
      progress: user.progress.map((p) => ({
        itemType: p.itemType,
        itemId: p.itemId,
        status: p.status,
        correctCount: p.correctCount,
        totalCount: p.totalCount,
        lastReviewedAt: p.lastReviewedAt,
        updatedAt: p.updatedAt,
      })),
      wrongQuestions: user.wrongQuestions.map((w) => ({
        questionId: w.questionId,
        exam: w.exam,
        subject: w.subject,
        type: w.type,
        title: w.title,
        wrongAt: w.wrongAt,
        dueAt: w.dueAt,
        interval: w.interval,
        ease: w.ease,
        reps: w.reps,
        lastReview: w.lastReview,
      })),
      studySessions: user.studySessions.map((s) => ({ date: s.date, createdAt: s.createdAt })),
      weeklyReviews: user.weeklyReviews.map((r) => ({
        weekStart: r.weekStart,
        doc: this.json(r.doc),
        updatedAt: r.clientUpdatedAt,
      })),
    };
  }

  /** CSV 导出（用户维度），便于离线表格查看。 */
  async exportUsersCsv() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: {
        profile: true,
        _count: { select: { progress: true, wrongQuestions: true, studySessions: true } },
      },
    });
    const head = [
      'id',
      'email',
      'username',
      'targetExam',
      'targetScore',
      'currentLevel',
      'credits',
      'createdAt',
      'lastCheckIn',
      'progress',
      'wrongQuestions',
      'studySessions',
      'vocabularySize',
      'studyDays',
      'totalStudyMinutes',
    ];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [head.join(',')];
    for (const u of users) {
      lines.push(
        [
          u.id,
          u.email,
          u.username,
          u.targetExam,
          u.targetScore ?? '',
          u.currentLevel ?? '',
          u.credits,
          u.createdAt.toISOString(),
          u.lastCheckIn ?? '',
          u._count.progress,
          u._count.wrongQuestions,
          u._count.studySessions,
          u.profile?.vocabularySize ?? '',
          u.profile?.studyDays ?? '',
          u.profile?.totalStudyMinutes ?? '',
        ]
          .map(esc)
          .join(','),
      );
    }
    return lines.join('\n');
  }

  // ---------------- helpers ----------------
  private shapeUser(u: any) {
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      targetExam: u.targetExam,
      targetScore: u.targetScore,
      currentLevel: u.currentLevel,
      examDate: u.examDate,
      dailyStudyMinutes: u.dailyStudyMinutes,
      credits: u.credits,
      lastCheckIn: u.lastCheckIn,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      profile: u.profile
        ? {
            englishLevel: u.profile.englishLevel,
            vocabularySize: u.profile.vocabularySize,
            studyDays: u.profile.studyDays,
            totalStudyMinutes: u.profile.totalStudyMinutes,
            ieltsTarget: u.profile.ieltsTarget,
            toeflTarget: u.profile.toeflTarget,
          }
        : null,
      counts: u._count
        ? {
            progress: u._count.progress,
            wrongQuestions: u._count.wrongQuestions,
            studySessions: u._count.studySessions,
          }
        : undefined,
    };
  }

  private json(s: string | null | undefined): any {
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  /** 把前端主状态压成一眼能看懂的统计。 */
  private summarizeAppState(doc: any) {
    const vocab = doc?.vocab && typeof doc.vocab === 'object' ? Object.values(doc.vocab) : [];
    const activity = Array.isArray(doc?.activity) ? doc.activity : [];
    return {
      vocabTracked: vocab.length,
      vocabKnown: vocab.filter((v: any) => v && v.status === 'known').length,
      vocabLearning: vocab.filter((v: any) => v && v.status === 'learning').length,
      errors: Array.isArray(doc?.errors) ? doc.errors.length : 0,
      mocks: Array.isArray(doc?.mocks) ? doc.mocks.length : 0,
      activityDays: activity.length,
      totalItems: activity.reduce((a: number, x: any) => a + (Number(x?.items) || 0), 0),
      totalMinutes: activity.reduce((a: number, x: any) => a + (Number(x?.mins) || 0), 0),
      streak: doc?.user?.streak ?? null,
      hasPlan: !!doc?.plan,
      savedAt: doc?.savedAt ?? null,
    };
  }
}
