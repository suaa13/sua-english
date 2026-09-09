import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { SEED_WORDS, SEED_GRAMMAR, COURSES, SEED_QUESTIONS } from './seed-content';

const prisma = new PrismaClient();

async function seedUser() {
  const email = 'demo@sua.english';
  const username = 'demo';
  const password = 'Password123';

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log('Seed user already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      targetExam: 'IELTS',
      targetScore: 6.5,
      currentLevel: 'beginner',
      dailyStudyMinutes: 30,
      profile: {
        create: {
          englishLevel: 'A1',
          ieltsTarget: 6.5,
          toeflTarget: 80,
        },
      },
    },
  });
  console.log(`Seeded demo user: ${user.email} / ${password}`);
}

async function seedVocab() {
  const count = await prisma.word.count();
  if (count > 0) {
    console.log(`Vocabulary already has ${count} words, skipping.`);
    return;
  }
  await prisma.word.createMany({
    data: SEED_WORDS.map((w, i) => ({
      id: `v-${i + 1}`,
      word: w.word,
      ipa: w.ipa,
      pos: w.pos,
      cn: w.cn,
      en: w.en,
      example: w.example,
      exampleCn: w.exampleCn,
      collocation: w.collocation,
      synonym: w.synonym,
      level: w.level,
      scenario: w.scenario,
    })),
  });
  console.log(`Seeded ${SEED_WORDS.length} vocabulary words.`);
}

async function seedGrammar() {
  const count = await prisma.grammarLesson.count();
  if (count > 0) {
    console.log(`Grammar already has ${count} lessons, skipping.`);
    return;
  }
  await prisma.grammarLesson.createMany({
    data: SEED_GRAMMAR.map((g, i) => ({
      id: `g-${i + 1}`,
      title: g.title,
      level: g.level,
      summary: g.summary,
      explain: g.explain,
      examples: JSON.stringify(g.examples),
      exercise: JSON.stringify(g.exercise),
      order: i + 1,
    })),
  });
  console.log(`Seeded ${SEED_GRAMMAR.length} grammar lessons.`);
}

async function seedCourses() {
  const count = await prisma.course.count();
  if (count > 0) {
    console.log(`Courses already have ${count} entries, skipping.`);
    return;
  }
  const courses = COURSES.map((c, i) => {
    const lessons: any[] = [];
    c.grammarRefs.forEach((ref, idx) => {
      lessons.push({ id: `l-${i + 1}-g-${idx + 1}`, title: `语法课 #${ref}`, type: 'grammar', refId: `g-${ref}` });
    });
    c.vocabRefs.forEach((ref, idx) => {
      lessons.push({ id: `l-${i + 1}-v-${idx + 1}`, title: `词汇 #${ref}`, type: 'vocab', refId: `v-${ref}` });
    });
    lessons.push({ id: `l-${i + 1}-p`, title: '阶段练习', type: 'practice', refId: null });
    return {
      slug: c.slug,
      title: c.title,
      exam: c.exam,
      level: c.level,
      description: c.description,
      lessons: JSON.stringify(lessons),
      order: i + 1,
    };
  });
  await prisma.course.createMany({ data: courses });
  console.log(`Seeded ${courses.length} courses.`);
}

async function seedQuestions() {
  const count = await prisma.questionBank.count();
  if (count > 0) {
    console.log(`Question bank already has ${count} items, skipping.`);
    return;
  }
  await prisma.questionBank.createMany({
    data: SEED_QUESTIONS.map((q) => ({
      exam: q.exam,
      subject: q.subject,
      type: q.type,
      difficulty: q.difficulty,
      year: q.year ?? null,
      source: q.source ?? null,
      title: q.title,
      prompt: q.prompt,
      referenceAnswer: q.referenceAnswer ?? null,
      keyword: q.keyword ?? null,
      tags: q.tags ? JSON.stringify(q.tags) : null,
    })),
  });
  console.log(`Seeded ${SEED_QUESTIONS.length} question-bank items.`);
}

async function main() {
  await seedUser();
  await seedVocab();
  await seedGrammar();
  await seedCourses();
  await seedQuestions();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
