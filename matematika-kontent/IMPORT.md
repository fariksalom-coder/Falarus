# Platformaga import qilish

## 1. Supabase jadvallari

```sql
create table subjects (
  id text primary key,
  name_uz text not null,
  color text not null,
  sort_order int not null
);

create table units (
  id text primary key,
  subject_id text references subjects(id),
  grade text not null,
  title text not null,
  branch text not null,
  objectives jsonb not null default '[]',
  sort_order int not null
);

create table lessons (
  id text primary key,
  unit_id text references units(id) on delete cascade,
  title text not null,
  difficulty int not null check (difficulty between 1 and 5),
  duration_min int not null,
  kind text not null,
  sort_order int not null,
  content jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table lesson_prerequisites (
  lesson_id text references lessons(id) on delete cascade,
  prereq_id text references lessons(id) on delete cascade,
  primary key (lesson_id, prereq_id)
);

create table quizzes (
  id text primary key,
  lesson_id text references lessons(id) on delete cascade,
  title text not null,
  pass_score int not null default 70,
  time_limit_sec int
);

create table questions (
  id text primary key,
  quiz_id text references quizzes(id) on delete cascade,
  lesson_id text references lessons(id),
  type text not null,
  body text not null,
  image_url text,
  options jsonb,
  correct jsonb not null,
  tolerance numeric,
  explanation text not null,
  difficulty int not null,
  tags text[] default '{}',
  sort_order int not null
);

create index on lessons(unit_id);
create index on questions(quiz_id);
create index on questions using gin(tags);
```

**Muhim**: `questions.correct` ustuni RLS bilan himoyalanadi — o'quvchi rolidagi
foydalanuvchi uni hech qachon o'qiy olmasligi kerak. Baholash faqat server tomonda.

```sql
alter table questions enable row level security;

create policy "questions_read_safe" on questions for select
  using (true);
-- Ammo API qatlamida correct maydoni o'quvchiga hech qachon yuborilmaydi.
-- Eng ishonchli yo'l: correct ni alohida jadvalga (question_answers) ajratish
-- va unga faqat service role kirish huquqini berish.
```

## 2. Import skripti

`scripts/import-content.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { Curriculum, Quiz, LessonContent } from '../schema/content';

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function importGrade(grade: string) {
  const raw = JSON.parse(await readFile(`curriculum/grade-${grade}.json`, 'utf8'));
  const data = Curriculum.parse(raw); // Zod validatsiya — xato bo'lsa shu yerda to'xtaydi

  for (const [ui, unit] of data.units.entries()) {
    await db.from('units').upsert({
      id: unit.id,
      subject_id: 'matematika',
      grade: String(data.grade),
      title: unit.title,
      branch: unit.branch,
      objectives: unit.objectives,
      sort_order: ui,
    });

    for (const [li, lesson] of unit.lessons.entries()) {
      await db.from('lessons').upsert({
        id: lesson.id,
        unit_id: unit.id,
        title: lesson.title,
        difficulty: lesson.d,
        duration_min: lesson.min,
        kind: lesson.kind,
        sort_order: li,
      });
    }
  }

  // Prerequisite'lar barcha dars yaratilgandan KEYIN yoziladi (foreign key uchun)
  for (const unit of data.units) {
    for (const lesson of unit.lessons) {
      for (const p of lesson.prereq) {
        await db.from('lesson_prerequisites').upsert({ lesson_id: lesson.id, prereq_id: p });
      }
    }
  }

  console.log(`${grade}-sinf: ${data.totalLessons} dars import qilindi`);
}

const grade = process.argv[process.argv.indexOf('--grade') + 1];
await importGrade(grade);
```

Ishga tushirish:

```bash
npx tsx scripts/import-content.ts --grade 05
npx tsx scripts/import-content.ts --grade 06
# ... 07, 08, 09, 10, 11, dtm
```

## 3. Tekshirish

Import tugagach:

```sql
-- Jami darslar soni 1000 bo'lishi kerak
select count(*) from lessons;

-- Sinf bo'yicha taqsimot
select u.grade, count(l.id)
from units u join lessons l on l.unit_id = u.id
group by u.grade order by u.grade;

-- Yo'q prerequisite'lar (bo'sh chiqishi kerak)
select lp.* from lesson_prerequisites lp
left join lessons l on l.id = lp.prereq_id
where l.id is null;
```

## 4. Kontent qatlamini yuklash

Dars matni va testlar `GENERATION.md` bo'yicha partiyalab tayyorlanadi.
Tayyor bo'lgan sari:

```bash
npx tsx scripts/import-lessons.ts lessons/m05-u06.json
npx tsx scripts/import-quizzes.ts questions/m05-u06.json
```

Kontenti hali yozilmagan dars platformada "Tez orada" holatida ko'rinadi —
`lessons.content is null` sharti bilan.
