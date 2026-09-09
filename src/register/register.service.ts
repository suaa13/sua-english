import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryClusterDto, QueryPhraseDto } from './dto/query-register.dto';

/**
 * 语域阶梯（RegisterPhrase）读写服务。
 *
 * 表结构见 prisma/schema.sqlite.prisma 的 RegisterPhrase：
 * 同一语义簇（cluster）下固定四档语域，order 0-3 即
 * casual → neutral → professional → executive。
 *
 * 设计意图见 .workbuddy/research/language-stratification.md：
 * 四档语法全对，但能进的房间不同。评分看语域适配度，而非对错。
 */
const REGISTER_ORDER = ['casual', 'neutral', 'professional', 'executive'];

@Injectable()
export class RegisterService {
  constructor(private readonly prisma: PrismaService) {}

  /** 语义簇列表：每个簇返回完整四档，便于横向对比。 */
  async clusters(query: QueryClusterDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 200);

    const tierWhere: Record<string, any> = {};
    if (query.room) tierWhere.room = query.room;

    // search 命中任一档的表达也算命中该簇
    const searchWhere = query.search
      ? {
          OR: [
            { cluster: { contains: query.search } },
            { clusterCn: { contains: query.search } },
            { phrase: { contains: query.search } },
          ],
        }
      : {};

    // 先按条件取到候选簇 key（命中档位即入选，不截断同簇其他档）
    const matched = await this.prisma.registerPhrase.findMany({
      where: { ...tierWhere, ...searchWhere },
      select: { cluster: true },
      distinct: ['cluster'],
      orderBy: { cluster: 'asc' },
    });

    const keys = matched.map((m) => m.cluster);
    const total = keys.length;
    const pagedKeys = keys.slice((page - 1) * pageSize, page * pageSize);

    // 再把这些簇的全档拉出来，保证每簇四档完整
    const rows = pagedKeys.length
      ? await this.prisma.registerPhrase.findMany({
          where: { cluster: { in: pagedKeys } },
          orderBy: [{ cluster: 'asc' }, { order: 'asc' }],
        })
      : [];

    const grouped = new Map<string, any>();
    for (const r of rows) {
      if (!grouped.has(r.cluster)) {
        grouped.set(r.cluster, { cluster: r.cluster, clusterCn: r.clusterCn, tiers: [] });
      }
      grouped.get(r.cluster).tiers.push(this.shape(r));
    }

    return {
      items: [...grouped.values()].map((g) => ({
        ...g,
        tiers: g.tiers.sort(
          (a: any, b: any) =>
            REGISTER_ORDER.indexOf(a.register) - REGISTER_ORDER.indexOf(b.register),
        ),
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 单个语义簇的四档详情。 */
  async cluster(key: string) {
    const rows = await this.prisma.registerPhrase.findMany({
      where: { cluster: key },
      orderBy: { order: 'asc' },
    });
    if (!rows.length) throw new NotFoundException('语义簇不存在');

    return {
      cluster: rows[0].cluster,
      clusterCn: rows[0].clusterCn,
      tiers: rows.map((r) => this.shape(r)),
    };
  }

  /** 扁平的语域短语列表，支持按簇 / 语域 / 场合筛选。 */
  async phrases(query: QueryPhraseDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 500);

    const where: Record<string, any> = {};
    if (query.cluster) where.cluster = query.cluster;
    if (query.register) where.register = query.register;
    if (query.room) where.room = query.room;
    if (query.search) {
      const s = query.search;
      where.OR = [{ phrase: { contains: s } }, { phraseCn: { contains: s } }];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.registerPhrase.findMany({
        where,
        orderBy: [{ cluster: 'asc' }, { order: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.registerPhrase.count({ where }),
    ]);

    return { items: items.map((r) => this.shape(r)), total, page, pageSize };
  }

  /** 场合清单 + 各场合条目数，供「六个房间」导航使用。 */
  async rooms() {
    const grouped = await this.prisma.registerPhrase.groupBy({
      by: ['room'],
      _count: { _all: true },
      orderBy: { room: 'asc' },
    });
    return grouped.map((g) => ({ room: g.room, count: g._count._all }));
  }

  private shape(r: any) {
    return {
      id: r.id,
      cluster: r.cluster,
      clusterCn: r.clusterCn,
      register: r.register,
      order: r.order,
      room: r.room ?? null,
      phrase: r.phrase,
      phraseCn: r.phraseCn ?? null,
    };
  }
}
