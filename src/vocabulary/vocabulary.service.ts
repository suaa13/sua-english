import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryWordDto } from './dto/query-word.dto';
import { RandomWordDto } from './dto/random-word.dto';

@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 随机抽词。list() 是「level asc + word asc」固定序，前端固定拉第一页就等于
   * 永远只练到排序最靠前的那批词，所以练习池必须走这里。
   *
   * 实现上没有用 `ORDER BY RANDOM()`（3 万行全表扫，且要写 raw SQL 才能跨
   * sqlite / postgres）：改成在表里随机取 BLOCKS 个连续块，合并后洗牌再截断，
   * 既能覆盖全表，又是纯 ORM 调用。
   */
  async random(query: RandomWordDto) {
    const n = Math.min(Math.max(query.n ?? 400, 1), 1000);
    const where: Record<string, any> = {};
    if (query.level) where.level = query.level;

    const total = await this.prisma.word.count({ where });
    if (!total) return { items: [], total: 0, requested: n };

    // 词数不足 n：直接全表取出洗牌返回（已覆盖全库，无需采样）
    if (total <= n) {
      const all = await this.prisma.word.findMany({
        where,
        orderBy: [{ level: 'asc' }, { word: 'asc' }],
      });
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      return { items: all.map((w) => this.shape(w)), total, requested: n };
    }

    // 全表采样：分块随机 skip 取连续段，合并去重；若去重后不足 n（小表 / 块重叠导致），
    // 继续补采直到凑满 n，保证练习池稳定为 n 个随机词，覆盖全表而非固定序前 n。
    const BLOCKS = 10;
    const per = Math.ceil(n / BLOCKS);
    const maxSkip = Math.max(0, total - per);
    const seen = new Set<string>();
    const pool: any[] = [];
    let guard = 0;
    while (pool.length < n && guard < 20) {
      guard++;
      const chunks = await Promise.all(
        Array.from({ length: BLOCKS }, () =>
          this.prisma.word.findMany({
            where,
            orderBy: [{ level: 'asc' }, { word: 'asc' }],
            skip: Math.floor(Math.random() * (maxSkip + 1)),
            take: per,
          }),
        ),
      );
      for (const chunk of chunks) {
        for (const w of chunk) {
          if (seen.has(w.id)) continue;
          seen.add(w.id);
          pool.push(w);
        }
      }
    }

    // Fisher–Yates
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return { items: pool.slice(0, n).map((w) => this.shape(w)), total, requested: n };
  }

  async list(query: QueryWordDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? query.limit ?? 20, 500);

    const where: Record<string, any> = {};
    if (query.level) where.level = query.level;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { word: { contains: s } },
        { cn: { contains: s } },
        { en: { contains: s } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.word.findMany({
        where,
        orderBy: [{ level: 'asc' }, { word: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.word.count({ where }),
    ]);

    return { items: items.map((w) => this.shape(w)), total, page, pageSize };
  }

  async detail(id: string) {
    const w = await this.prisma.word.findUnique({ where: { id } });
    if (!w) throw new NotFoundException('单词不存在');
    return this.shape(w);
  }

  private shape(w: any) {
    return {
      id: w.id,
      word: w.word,
      ipa: w.ipa ?? null,
      pos: w.pos ?? null,
      cn: w.cn ?? null,
      en: w.en ?? null,
      example: w.example ?? null,
      exampleCn: w.exampleCn ?? null,
      collocation: w.collocation ?? null,
      synonym: w.synonym ?? null,
      level: w.level,
      scenario: w.scenario ?? null,
    };
  }
}
