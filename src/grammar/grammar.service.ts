import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryGrammarDto } from './dto/query-grammar.dto';

@Injectable()
export class GrammarService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryGrammarDto) {
    const where: Record<string, any> = {};
    if (query.level) where.level = query.level;

    const items = await this.prisma.grammarLesson.findMany({
      where,
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });
    return { items: items.map((g) => this.shape(g)) };
  }

  async detail(id: string) {
    const g = await this.prisma.grammarLesson.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('语法课不存在');
    return this.shape(g);
  }

  private shape(g: any) {
    let examples: string[] = [];
    let exercise: any = null;
    try {
      examples = g.examples ? JSON.parse(g.examples) : [];
    } catch {
      examples = [];
    }
    try {
      exercise = g.exercise ? JSON.parse(g.exercise) : null;
    } catch {
      exercise = null;
    }
    return {
      id: g.id,
      title: g.title,
      level: g.level,
      summary: g.summary ?? null,
      explain: g.explain,
      examples,
      exercise,
    };
  }
}
