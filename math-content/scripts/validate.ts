/**
 * Dars va kurikulum JSON fayllarini sxemaga qarshi tekshiradi.
 *
 * Ishga tushirish:
 *   npx tsx math-content/scripts/validate.ts
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CurriculumSchema,
  LessonContentArraySchema,
  type Curriculum,
  type LessonContent,
} from '../schema/content';
import { QuestionBankSchema } from '../schema/questions';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const curriculumDir = join(root, 'curriculum');
const lessonsDir = join(root, 'lessons');
const questionsDir = join(root, 'questions');

let errorCount = 0;
let lessonCount = 0;

const fail = (file: string, message: string) => {
  errorCount += 1;
  console.error(`  [XATO] ${file}: ${message}`);
};

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, 'utf8'));

// ---------------------------------------------------------------------------
// 1. Kurikulum fayllari
// ---------------------------------------------------------------------------

console.log('Kurikulum fayllari tekshirilmoqda...');

const declaredLessons = new Map<string, string>(); // lessonId -> unitId

for (const file of readdirSync(curriculumDir).filter((f) =>
  /^grade-\d+\.json$/.test(f),
)) {
  const parsed = CurriculumSchema.safeParse(readJson(join(curriculumDir, file)));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fail(file, `${issue.path.join('.')} — ${issue.message}`);
    }
    continue;
  }

  const curriculum: Curriculum = parsed.data;
  for (const unit of curriculum.units) {
    for (const lesson of unit.lessons) {
      if (declaredLessons.has(lesson.id)) {
        fail(file, `dars id takrorlangan: ${lesson.id}`);
      }
      if (!lesson.id.startsWith(`${unit.id}-`)) {
        fail(file, `${lesson.id} bo'lim ${unit.id} bilan mos emas`);
      }
      declaredLessons.set(lesson.id, unit.id);
    }
  }
  console.log(
    `  ${file}: ${curriculum.units.length} bo'lim, ` +
      `${curriculum.units.reduce((n, u) => n + u.lessons.length, 0)} dars`,
  );
}

// ---------------------------------------------------------------------------
// 2. Dars kontenti fayllari
// ---------------------------------------------------------------------------

console.log('\nDars kontenti tekshirilmoqda...');

const writtenLessons = new Set<string>();

if (existsSync(lessonsDir)) {
  for (const file of readdirSync(lessonsDir).filter((f) => f.endsWith('.json'))) {
    const parsed = LessonContentArraySchema.safeParse(
      readJson(join(lessonsDir, file)),
    );
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        fail(file, `${issue.path.join('.')} — ${issue.message}`);
      }
      continue;
    }

    for (const lesson of parsed.data as LessonContent[]) {
      lessonCount += 1;

      // Namuna fayli ham haqiqiy dars kontentini saqlaydi, shuning uchun
      // u yozilgan darslar sonida hisobga olinadi. Faqat takrorlanish
      // tekshiruvidan chetlatiladi, chunki u uslub etaloni sifatida
      // boshqa faylda nusxalanishi mumkin.
      const isSample = basename(file).includes('namuna');

      if (!isSample && writtenLessons.has(lesson.id)) {
        fail(file, `dars kontenti takrorlangan: ${lesson.id}`);
      }
      writtenLessons.add(lesson.id);

      if (!declaredLessons.has(lesson.id)) {
        fail(file, `${lesson.id} kurikulumda e'lon qilinmagan`);
      }

      for (const prereq of lesson.prerequisites) {
        if (!declaredLessons.has(prereq)) {
          fail(file, `${lesson.id} uchun mavjud bo'lmagan shart: ${prereq}`);
        }
      }
    }
    console.log(`  ${file}: ${parsed.data.length} dars`);
  }
}

// ---------------------------------------------------------------------------
// 3. Savollar bankasi
// ---------------------------------------------------------------------------

console.log('\nSavollar bankasi tekshirilmoqda...');

const declaredUnits = new Set<string>([...declaredLessons.values()]);
const questionIds = new Set<string>();
let testCount = 0;
let openCount = 0;

if (existsSync(questionsDir)) {
  for (const file of readdirSync(questionsDir).filter((f) =>
    f.endsWith('.json'),
  )) {
    const parsed = QuestionBankSchema.safeParse(
      readJson(join(questionsDir, file)),
    );
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        fail(file, `${issue.path.join('.')} — ${issue.message}`);
      }
      continue;
    }

    for (const q of parsed.data.questions) {
      if (questionIds.has(q.id)) {
        fail(file, `savol id takrorlangan: ${q.id}`);
      }
      questionIds.add(q.id);

      if (!declaredUnits.has(q.unitId)) {
        fail(file, `${q.id} mavjud bo'lmagan bo'limga ishora qiladi: ${q.unitId}`);
      }

      if (q.type === 'test') testCount += 1;
      else openCount += 1;
    }

    console.log(
      `  ${file}: ${parsed.data.questions.length} savol ` +
        `(${parsed.data.questions.filter((q) => q.type === 'test').length} test, ` +
        `${parsed.data.questions.filter((q) => q.type === 'open').length} ochiq)`,
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Yakuniy hisobot
// ---------------------------------------------------------------------------

const total = declaredLessons.size;
const done = writtenLessons.size;

console.log(`\nJami e'lon qilingan dars: ${total}`);
console.log(`Kontenti yozilgan dars:   ${done}`);
console.log(`Qolgan:                   ${total - done}`);
console.log(`Tekshirilgan dars obyekti: ${lessonCount}`);
console.log(`Savollar: ${questionIds.size} ta (${testCount} test, ${openCount} ochiq)`);

if (errorCount > 0) {
  console.error(`\n${errorCount} ta xato topildi.`);
  process.exit(1);
}

console.log('\nBarcha fayllar sxemaga mos.');
