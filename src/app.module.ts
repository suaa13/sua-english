import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { GrammarModule } from './grammar/grammar.module';
import { RegisterModule } from './register/register.module';
import { CoursesModule } from './courses/courses.module';
import { ProgressModule } from './progress/progress.module';
import { SyncModule } from './sync/sync.module';
import { AiModule } from './ai/ai.module';
import { CreditsModule } from './credits/credits.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    VocabularyModule,
    QuestionBankModule,
    GrammarModule,
    RegisterModule,
    CoursesModule,
    ProgressModule,
    SyncModule,
    AiModule,
    CreditsModule,
  ],
})
export class AppModule {}
