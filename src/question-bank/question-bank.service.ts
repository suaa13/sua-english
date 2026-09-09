import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryQuestionDto } from './dto/query-question.dto';

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryQuestionDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? query.limit ?? 20, 500);

    const where: Record<string, any> = {};
    if (query.exam) where.exam = query.exam;
    if (query.subject) where.subject = query.subject;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { title: { contains: s } },
        { prompt: { contains: s } },
        { keyword: { contains: s } },
        { source: { contains: s } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.questionBank.findMany({
        where,
        orderBy: [{ exam: 'asc' }, { subject: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.questionBank.count({ where }),
    ]);

    return { items: items.map((q) => this.shape(q)), total, page, pageSize };
  }

  /**
   * 在筛选条件内随机抽题。
   * 海量题库（10 万+）靠翻页无法有效练习，随机取样才是主要用法。
   * 实现：先 count，再随机 skip —— 避免深分页的 OFFSET 开销。
   */
  async random(query: QueryQuestionDto, take = 1) {
    const where: Record<string, any> = {};
    if (query.exam) where.exam = query.exam;
    if (query.subject) where.subject = query.subject;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { title: { contains: s } },
        { prompt: { contains: s } },
        { keyword: { contains: s } },
        { source: { contains: s } },
      ];
    }

    const total = await this.prisma.questionBank.count({ where });
    if (!total) return { items: [], total: 0 };
    const n = Math.min(Math.max(1, take), 50);
    // 保证取样窗口不越界：skip 上限为 total - n
    const maxSkip = Math.max(0, total - n);
    const skip = Math.floor(Math.random() * (maxSkip + 1));

    const items = await this.prisma.questionBank.findMany({
      where,
      skip,
      take: n,
    });
    return { items: items.map((q) => this.shape(q)), total };
  }

  async detail(id: string) {
    const q = await this.prisma.questionBank.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('真题不存在');
    return this.shape(q);
  }

  private shape(q: any) {
    let tags: string[] = [];
    try {
      tags = q.tags ? JSON.parse(q.tags) : [];
    } catch {
      tags = [];
    }
    return {
      id: q.id,
      exam: q.exam,
      subject: q.subject,
      type: q.type,
      difficulty: q.difficulty,
      year: q.year,
      source: q.source,
      title: q.title,
      prompt: q.prompt,
      referenceAnswer: q.referenceAnswer,
      keyword: q.keyword,
      tags,
      desc: (q.prompt || '').slice(0, 120),
      createdAt: q.createdAt,
    };
  }
}
