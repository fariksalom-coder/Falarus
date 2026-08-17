import { z } from 'zod';
import { UnitIdSchema } from './content';

/**
 * Savollar bankasi sxemasi.
 * Ikki tur: 'test' (A/B/C/D variantli) va 'open' (ochiq javobli masala).
 * Har ikkalasida ham to'liq bosqichma-bosqich yechim majburiy.
 */

const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

const JUDGEMENT_RE =
  /\b(oson(gina)?|qiyin|murakkab emas|sodda-ku|hammaga tushunarli)\b/iu;

/**
 * Begona alifbo harflari lotin so'zlari ichiga tasodifan tushib qolishi
 * mumkin: kirill "turса" (aslida "tursa"), turkcha "Suriş" (aslida
 * "Surish"). Ko'z bilan farqlanmaydi, shuning uchun sxema darajasida
 * rad etiladi. Tire va matematik belgilar bu oraliqqa kirmaydi.
 */
const FOREIGN_LETTER_RE = /[À-ɏЀ-ӿ]/u;

const cleanText = (min = 1, max = 800) =>
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
      message: 'Baholovchi gap ishlatish taqiqlangan',
    });

export const QuestionIdSchema = z
  .string()
  .regex(/^q(0[5-9]|1[01])-\d{3}$/, 'Savol id formati: q05-001');

/** Yechimning bitta bosqichi. */
export const SolutionStepSchema = z.object({
  text: cleanText(3, 400),
  latex: z.string().trim().min(1).max(400).optional(),
});

const baseFields = {
  id: QuestionIdSchema,
  unitId: UnitIdSchema,
  /** Savol qaysi mavzuni tekshiradi. */
  topic: cleanText(3, 160),
  question: cleanText(10, 800),
  /** Bosqichma-bosqich yechim. Yakuniy javob ham shu yerda izohlanadi. */
  solution: z.array(SolutionStepSchema).min(2).max(8),
  /** 1 - takrorlash, 2 - standart, 3 - kengaytirilgan. */
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  dtm: z.boolean().default(false),
};

/** Variantli test savoli. To'rtta variant, bittasi to'g'ri. */
export const TestQuestionSchema = z.object({
  ...baseFields,
  type: z.literal('test'),
  // z.tuple() bu loyihaning non-strict tsconfig'ida element turini yo'qotadi
  // (zod 4 strict mode talab qiladi), shuning uchun uzunligi qat'iy massiv.
  options: z.array(cleanText(1, 300)).length(4),
  correct: z.enum(['A', 'B', 'C', 'D']),
});

/** Ochiq javobli masala. */
export const OpenQuestionSchema = z.object({
  ...baseFields,
  type: z.literal('open'),
  answer: cleanText(1, 300),
});

export const QuestionSchema = z
  .discriminatedUnion('type', [TestQuestionSchema, OpenQuestionSchema])
  .superRefine((q, ctx) => {
    if (q.type === 'test') {
      const unique = new Set(q.options.map((o) => o.trim().toLowerCase()));
      if (unique.size !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: `Savol ${q.id}: variantlar takrorlanmasligi kerak`,
        });
      }
    }
  });

export type Question = z.infer<typeof QuestionSchema>;

export const QuestionBankSchema = z.object({
  grade: z.number().int().min(5).max(11),
  title: cleanText(3, 160),
  questions: z.array(QuestionSchema).min(1),
});

export type QuestionBank = z.infer<typeof QuestionBankSchema>;
