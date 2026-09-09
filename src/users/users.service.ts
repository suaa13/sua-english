import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateGoalsDto } from './dto/update-goals.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return this.shape(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.ensure(userId);
    const profile = await this.prisma.userProfile.update({
      where: { userId },
      data: { ...dto },
    });
    return { profile };
  }

  async updateGoals(userId: string, dto: UpdateGoalsDto) {
    await this.ensure(userId);
    const examDate = dto.examDate ? new Date(dto.examDate) : undefined;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        targetExam: dto.targetExam,
        targetScore: dto.targetScore,
        currentLevel: dto.currentLevel,
        examDate,
        dailyStudyMinutes: dto.dailyStudyMinutes,
      },
    });

    // Keep profile targets in sync with the chosen exam.
    if (dto.targetExam || dto.targetScore !== undefined) {
      await this.prisma.userProfile.update({
        where: { userId },
        data: {
          ieltsTarget: dto.targetExam === 'TOEFL' ? null : (dto.targetScore ?? undefined),
          toeflTarget: dto.targetExam === 'IELTS' ? null : (dto.targetScore ?? undefined),
        },
      });
    }

    return this.shape(user);
  }

  private async ensure(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('用户不存在');
  }

  private shape(u: any) {
    const { passwordHash, ...rest } = u;
    return {
      user: {
        id: rest.id,
        email: rest.email,
        username: rest.username,
        avatar: rest.avatar ?? null,
        targetExam: rest.targetExam,
        targetScore: rest.targetScore ?? null,
        currentLevel: rest.currentLevel ?? null,
        examDate: rest.examDate ? new Date(rest.examDate).toISOString() : null,
        dailyStudyMinutes: rest.dailyStudyMinutes ?? null,
        credits: rest.credits ?? 0,
        lastCheckIn: rest.lastCheckIn ?? null,
        createdAt: new Date(rest.createdAt).toISOString(),
      },
      profile: rest.profile ?? null,
    };
  }
}
