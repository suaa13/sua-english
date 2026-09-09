import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryCourseDto } from './dto/query-course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryCourseDto) {
    const where: Record<string, any> = {};
    if (query.exam) where.exam = query.exam;
    if (query.level) where.level = query.level;

    const items = await this.prisma.course.findMany({
      where,
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });
    return { items: items.map((c) => this.shape(c)) };
  }

  async detail(idOrSlug: string) {
    const c = await this.prisma.course.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!c) throw new NotFoundException('课程不存在');
    return this.shape(c);
  }

  private shape(c: any) {
    let lessons: any[] = [];
    try {
      lessons = c.lessons ? JSON.parse(c.lessons) : [];
    } catch {
      lessons = [];
    }
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      exam: c.exam,
      level: c.level,
      description: c.description ?? null,
      lessons,
    };
  }
}
