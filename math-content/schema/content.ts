import { z } from 'zod';

/**
 * Matematika dars kontenti sxemasi (5-11 sinf + DTM).
 * Barcha dars JSON fayllari shu sxemadan o'tishi shart.
 */

// ---------------------------------------------------------------------------
// Yordamchi primitivlar
// ---------------------------------------------------------------------------

/** Emoji va boshqa piktogrammalarga ruxsat yo'q. */
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

/** Baholovchi ("bu oson", "juda qiyin") gaplar taqiqlangan. */
const JUDGEMENT_RE =
  /\b(oson(gina)?|qiyin|murakkab emas|sodda-ku|hammaga tushunarli)\b/iu;

/**
 * Begona alifbo harflari lotin so'zlari ichiga tasodifan tushib qolishi
 * mumkin: kirill "turса" (aslida "tursa"), turkcha "Suriş" (aslida
 * "Surish"), fransuzcha "séntner". Ko'z bilan farqlanmaydi, shuning
 * uchun sxema darajasida rad etiladi.
 *
 * Kirill (U+0400-U+04FF) va ASCII dan tashqaridagi lotin harflari
 * (U+00C0-U+024F) taqiqlanadi. Tire (U+2014) va matematik belgilar
 * bu oraliqqa kirmaydi, shuning uchun ular ruxsat etiladi.
 */
const FOREIGN_LETTER_RE = /[À-ɏЀ-ӿ]/u;

const cleanText = (min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((s) => !EMOJI_RE.test(s), { message: 'Emoji ishlatish taqiqlangan' })
    .refine((s) => !FOREIGN_LETTER_RE.test(s), {
      message:
        'Begona alifbo harfi topildi, matn faqat lotin alifbosida bo\'lishi kerak',
    })
    .refine((s) => !JUDGEMENT_RE.test(s), {
      message: 'Baholovchi gap ("oson"/"qiyin") ishlatish taqiqlangan',
    });

/** LaTeX ifoda: $ ... $ ichida yoki toza LaTeX matni. */
const latex = z
  .string()
  .trim()
  .min(1)
  .max(400)
  .refine((s) => !EMOJI_RE.test(s), { message: 'Emoji ishlatish taqiqlangan' });

export const LessonIdSchema = z
  .string()
  .regex(
    /^m(0[5-9]|1[01])-u\d{2}-l\d{2}$/,
    'Dars id formati: m{sinf}-u{bolim}-l{dars}, masalan m05-u06-l03',
  );

export const UnitIdSchema = z
  .string()
  .regex(/^m(0[5-9]|1[01])-u\d{2}$/, "Bo'lim id formati: m05-u06");

// ---------------------------------------------------------------------------
// Bloklar
// ---------------------------------------------------------------------------

/** Hayotiy vaziyatdan boshlanadigan kirish. */
export const IntroBlockSchema = z.object({
  type: z.literal('intro'),
  text: cleanText(60, 700),
});

/** Nazariy tushuntirish. Sinf darajasiga mos, sodda til. */
export const TheoryBlockSchema = z.object({
  type: z.literal('theory'),
  title: cleanText(3, 120).optional(),
  text: cleanText(60, 1200),
  /** Ta'rif sifatida ajratib ko'rsatiladigan asosiy jumla. */
  keyPoint: cleanText(10, 300).optional(),
});

/** LaTeX formulasi. */
export const FormulaBlockSchema = z.object({
  type: z.literal('formula'),
  latex,
  /** Formuladagi harflar nimani anglatishi. */
  caption: cleanText(5, 400).optional(),
});

export const StepSchema = z.object({
  text: cleanText(3, 400),
  latex: latex.optional(),
});

/** Bosqichma-bosqich yechiladigan namuna masala. */
export const ExampleBlockSchema = z.object({
  type: z.literal('example'),
  task: cleanText(15, 600),
  steps: z.array(StepSchema).min(2).max(8),
  answer: cleanText(1, 200),
});

/** O'quvchilar aynan shu mavzuda qiladigan real xato. */
export const MistakeBlockSchema = z.object({
  type: z.literal('mistake'),
  /** Xato yechim yoki xato fikr. */
  wrong: cleanText(10, 500),
  /** Nima uchun xato. */
  why: cleanText(15, 600),
  /** To'g'ri variant. */
  correct: cleanText(5, 500),
});

/** Mustaqil mashq. */
export const DrillBlockSchema = z.object({
  type: z.literal('drill'),
  question: cleanText(10, 500),
  answer: cleanText(1, 300),
  hint: cleanText(10, 400),
  /** 1 - takrorlash, 2 - standart, 3 - kengaytirilgan. */
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

/** Qo'shimcha eslatma yoki tarixiy fakt. Ixtiyoriy. */
export const NoteBlockSchema = z.object({
  type: z.literal('note'),
  text: cleanText(20, 600),
});

export const BlockSchema = z.discriminatedUnion('type', [
  IntroBlockSchema,
  TheoryBlockSchema,
  FormulaBlockSchema,
  ExampleBlockSchema,
  MistakeBlockSchema,
  DrillBlockSchema,
  NoteBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;

// ---------------------------------------------------------------------------
// Dars
// ---------------------------------------------------------------------------

const countOf = (blocks: Block[], type: Block['type']) =>
  blocks.filter((b) => b.type === type).length;

export const LessonContentSchema = z
  .object({
    id: LessonIdSchema,
    unitId: UnitIdSchema,
    grade: z.number().int().min(5).max(11),
    subject: z.enum(['matematika', 'algebra', 'geometriya']),
    title: cleanText(3, 160),
    /** Bitta jumla: dars nima uchun kerak, real hayotdan misol bilan. */
    why: cleanText(40, 400),
    blocks: z.array(BlockSchema).min(7).max(40),
    /** Aniq 3 ta xulosa. */
    summary: z.array(cleanText(10, 300)).length(3),
    tags: z.array(z.string().trim().min(1)).default([]),
    /** DTM testlarida uchraydigan mavzumi. */
    dtm: z.boolean().default(false),
    estimatedMinutes: z.number().int().min(10).max(90).default(35),
    /** Shu darsdan oldin o'zlashtirilishi kerak bo'lgan darslar. */
    prerequisites: z.array(LessonIdSchema).default([]),
  })
  .superRefine((lesson, ctx) => {
    const { blocks } = lesson;

    const requirements: Array<[Block['type'], number, string]> = [
      ['intro', 1, "kamida 1 ta 'intro' blok"],
      ['theory', 1, "kamida 1 ta 'theory' blok"],
      ['example', 2, "kamida 2 ta 'example' blok"],
      ['mistake', 1, "kamida 1 ta 'mistake' blok"],
      ['drill', 3, "kamida 3 ta 'drill' blok"],
    ];

    for (const [type, min, message] of requirements) {
      if (countOf(blocks, type) < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['blocks'],
          message: `Dars ${lesson.id}: ${message} bo'lishi shart`,
        });
      }
    }

    if (countOf(blocks, 'theory') > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blocks'],
        message: `Dars ${lesson.id}: 'theory' bloklar soni 3 tadan oshmasin`,
      });
    }

    if (countOf(blocks, 'drill') > 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blocks'],
        message: `Dars ${lesson.id}: 'drill' bloklar soni 6 tadan oshmasin`,
      });
    }

    if (blocks[0]?.type !== 'intro') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blocks', 0],
        message: `Dars ${lesson.id}: birinchi blok 'intro' bo'lishi shart`,
      });
    }

    // id ichidagi bo'lim prefiksi unitId bilan mos kelishi kerak.
    if (!lesson.id.startsWith(`${lesson.unitId}-`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['id'],
        message: `Dars id '${lesson.id}' unitId '${lesson.unitId}' bilan mos emas`,
      });
    }

    // Sinf raqami id bilan mos kelishi kerak.
    const gradeFromId = Number(lesson.id.slice(1, 3));
    if (gradeFromId !== lesson.grade) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grade'],
        message: `Dars id sinfi (${gradeFromId}) grade maydoniga (${lesson.grade}) mos emas`,
      });
    }
  });

export type LessonContent = z.infer<typeof LessonContentSchema>;

/** Bir nechta darsdan iborat massiv — generator chiqishi shu formatda. */
export const LessonContentArraySchema = z.array(LessonContentSchema).min(1);

// ---------------------------------------------------------------------------
// Kurikulum
// ---------------------------------------------------------------------------

export const CurriculumLessonSchema = z.object({
  id: LessonIdSchema,
  title: cleanText(3, 160),
  dtm: z.boolean().default(false),
});

export const CurriculumUnitSchema = z.object({
  id: UnitIdSchema,
  title: cleanText(3, 160),
  subject: z.enum(['matematika', 'algebra', 'geometriya']),
  lessons: z.array(CurriculumLessonSchema).min(1),
});

export const CurriculumSchema = z.object({
  grade: z.number().int().min(5).max(11),
  title: cleanText(3, 160),
  units: z.array(CurriculumUnitSchema).min(1),
});

export type Curriculum = z.infer<typeof CurriculumSchema>;
