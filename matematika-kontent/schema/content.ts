import { z } from 'zod';

/** Qiyinlik: 1 = eng oson, 5 = olimpiada darajasi */
export const Difficulty = z.number().int().min(1).max(5);

/** ---------- Curriculum qatlami (skelet) ---------- */

export const CurriculumLesson = z.object({
  /** Format: m{sinf}-u{bo'lim}-l{dars}. Masalan m05-u06-l03 */
  id: z.string().regex(/^m(0[5-9]|1[01]|dtm)-u\d{2}-l\d{2}$/),
  title: z.string().min(3),
  /** Qiyinlik darajasi */
  d: Difficulty,
  /** Taxminiy davomiylik, daqiqa */
  min: z.number().int().min(5).max(60),
  /** Shu darsga biriktirilgan testdagi savollar soni */
  q: z.number().int().min(3).max(20),
  /** Oldin o'zlashtirilishi kerak bo'lgan darslar id'lari */
  prereq: z.array(z.string()).default([]),
  /** Dars turi */
  kind: z.enum(['theory', 'practice', 'review', 'control']).default('theory'),
});

export const CurriculumUnit = z.object({
  id: z.string(),
  title: z.string(),
  /** Bo'lim yakunida o'quvchi nimani bila oladi */
  objectives: z.array(z.string()).min(1),
  branch: z.enum(['algebra', 'geometry', 'general', 'exam']),
  lessons: z.array(CurriculumLesson).min(1),
});

export const Curriculum = z.object({
  subject: z.literal('matematika'),
  grade: z.union([z.number().int().min(5).max(11), z.literal('dtm')]),
  totalLessons: z.number().int(),
  units: z.array(CurriculumUnit),
});

/** ---------- Content qatlami (to'ldiriladi) ---------- */

export const LessonBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('intro'), text: z.string() }),
  z.object({ type: z.literal('theory'), text: z.string() }),
  z.object({ type: z.literal('formula'), latex: z.string(), caption: z.string().optional() }),
  z.object({
    type: z.literal('example'),
    problem: z.string(),
    steps: z.array(z.object({ text: z.string(), latex: z.string().optional() })),
    answer: z.string(),
  }),
  z.object({ type: z.literal('note'), text: z.string() }),
  z.object({ type: z.literal('mistake'), text: z.string(), correction: z.string() }),
  z.object({ type: z.literal('image'), url: z.string(), alt: z.string() }),
  z.object({ type: z.literal('video'), url: z.string(), durationSec: z.number() }),
  z.object({
    type: z.literal('drill'),
    problem: z.string(),
    answer: z.string(),
    hint: z.string().optional(),
  }),
]);

export const LessonContent = z.object({
  id: z.string(),
  title: z.string(),
  /** Bir jumlada: bu dars nima uchun kerak */
  why: z.string(),
  blocks: z.array(LessonBlock).min(3),
  /** Dars oxiridagi 3 ta asosiy xulosa */
  summary: z.array(z.string()).length(3),
});

/** ---------- Test qatlami ---------- */

export const QuestionType = z.enum([
  'single',      // bitta to'g'ri variant
  'multi',       // bir nechta to'g'ri
  'input',       // raqamli/matnli javob
  'match',       // moslashtirish
  'order',       // tartiblash
  'fill_blank',  // bo'sh joyni to'ldirish
]);

export const Question = z.object({
  id: z.string(),
  lessonId: z.string(),
  type: QuestionType,
  /** Savol matni. Formulalar $...$ ichida (KaTeX) */
  body: z.string(),
  imageUrl: z.string().optional(),
  /** single/multi/match/order uchun */
  options: z.array(z.string()).optional(),
  /** single: index | multi: index[] | input: qabul qilinadigan javoblar | order: indexlar tartibi */
  correct: z.union([z.number(), z.array(z.number()), z.array(z.string())]),
  /** input uchun: nisbiy tolerantlik, masalan 0.01 = 1% */
  tolerance: z.number().optional(),
  /** MAJBURIY — nima uchun shunday */
  explanation: z.string().min(10),
  d: Difficulty,
  /** Mavzu teglari — zaif joylarni aniqlash uchun */
  tags: z.array(z.string()).default([]),
});

export const Quiz = z.object({
  id: z.string(),
  lessonId: z.string(),
  title: z.string(),
  passScore: z.number().default(70),
  timeLimitSec: z.number().nullable().default(null),
  questions: z.array(Question).min(3),
});

export type TCurriculum = z.infer<typeof Curriculum>;
export type TLessonContent = z.infer<typeof LessonContent>;
export type TQuiz = z.infer<typeof Quiz>;
export type TQuestion = z.infer<typeof Question>;
