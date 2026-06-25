import OpenAI from 'openai';

let _client: OpenAI | undefined;

const CHECK_TIMEOUT_MS = 15_000;
const TRANSCRIBE_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0, // we do our own retry/timeout
    });
  }
  return _client;
}

export class OpenAIRetryableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'OpenAIRetryableError';
  }
}

function isRetryable(err: unknown): boolean {
  if (!err) return false;
  const e = err as { status?: number; code?: string; name?: string };
  if (e.name === 'AbortError') return true;
  if (e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED') return true;
  const status = e.status;
  if (typeof status === 'number' && (status === 408 || status === 429 || status >= 500)) return true;
  return false;
}

async function withTimeoutAndRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fn(controller.signal);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        const backoff = Math.min(2000, 250 * Math.pow(2, attempt));
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new OpenAIRetryableError(`${label} failed after ${MAX_RETRIES + 1} attempts`, lastError);
}

export type MistakeDetail = {
  part: string;
  issue: string;
  hint_uz: string;
};

export type TranslationCheckResult = {
  status: 'correct' | 'partial' | 'wrong';
  feedback: string;
  error_explanation: string;
  hint: string;
  correct_answer: string;
  mistakes: MistakeDetail[];
};

/** Normalize Russian answers for cheap exact-match before OpenAI. */
export function normalizeRuAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.!?,…«»""''\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Skip OpenAI when the answer clearly matches the reference (saves quota + works offline).
 */
export function tryExactTranslationMatch(
  ruCorrect: string,
  userAnswer: string,
): TranslationCheckResult | null {
  const ref = normalizeRuAnswer(ruCorrect);
  const user = normalizeRuAnswer(userAnswer);
  if (!ref || !user) return null;
  if (ref === user) {
    return {
      status: 'correct',
      feedback: "Ajoyib! Javobingiz to'g'ri.",
      error_explanation: '',
      hint: '',
      correct_answer: '',
      mistakes: [],
    };
  }
  return null;
}

export function isOpenAIQuotaError(err: unknown): boolean {
  const e = err as { status?: number; message?: string; error?: { message?: string } };
  const msg = String(e?.message ?? e?.error?.message ?? '').toLowerCase();
  return e?.status === 429 && (msg.includes('quota') || msg.includes('billing'));
}

export function openAIUserFacingError(err: unknown): string {
  if (isOpenAIQuotaError(err)) {
    return "AI tekshiruv vaqtincha ishlamayapti. Birozdan keyin qayta urinib ko'ring yoki matn bilan javob bering.";
  }
  const e = err as { status?: number; name?: string };
  if (e?.name === 'AbortError' || e?.status === 408) {
    return "Tekshirish vaqti tugadi. Qayta urinib ko'ring.";
  }
  if (e?.status === 429) {
    return "Juda ko'p so'rov. Biroz kutib, qayta urinib ko'ring.";
  }
  return "Tekshirishda xatolik yuz berdi. Qayta urinib ko'ring.";
}

function tokenCount(s: string): number {
  return s
    .trim()
    .split(/[\s,.;:!?…«»""''\-]+/)
    .filter((t) => t.length > 0).length;
}

/**
 * Защита только от вырожденных случаев когда LLM ставит correct за явно неполный ответ
 * (например, юзер вписал одно слово на длинную фразу). Раньше функция была строже и
 * рубила нормальные короткие переводы вроде «Иду в магазин» при эталоне «Я иду в магазин» —
 * теперь доверяем модели и срабатываем только при огромной разнице.
 */
function downgradeOverlenientCorrect(
  uzText: string,
  ruCorrect: string,
  userAnswer: string,
  status: TranslationCheckResult['status']
): TranslationCheckResult['status'] {
  if (status !== 'correct') return status;
  const uzN = tokenCount(uzText);
  const userN = tokenCount(userAnswer);
  const refN = tokenCount(ruCorrect);
  if (uzN < 2 || refN < 2) return status;

  if (userN === 1 && refN >= 5) return 'wrong';
  if (refN >= 8 && userN < Math.ceil(refN * 0.3)) return 'wrong';

  return status;
}

function normalizeMistakes(value: unknown): MistakeDetail[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string' && item.trim()) {
        return { part: '', issue: item.trim(), hint_uz: '' };
      }
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        const part = String(row.part ?? '').trim();
        const issue = String(row.issue ?? '').trim();
        const hint_uz = String(row.hint_uz ?? '').trim();
        if (!part && !issue && !hint_uz) return null;
        return { part, issue, hint_uz };
      }
      return null;
    })
    .filter((item): item is MistakeDetail => item !== null);
}

export async function checkTranslation(
  uzText: string,
  ruCorrect: string,
  userAnswer: string,
  attempt: number = 1
): Promise<TranslationCheckResult> {
  const exact = tryExactTranslationMatch(ruCorrect, userAnswer);
  if (exact) return exact;

  const client = getClient();

  const systemPrompt = `
Ты — опытный преподаватель русского языка для узбекских студентов.

Студент переводит узбекскую фразу на русский язык.

════════════════════
СТАТУСЫ
════════════════════

"correct" — если:
- Полный смысл передан
- Нет заметной грамматической ошибки
- Фраза звучит естественно по-русски
- Синонимы и другой порядок слов — допустимы
- Род говорящего (пошёл/пошла) — допустим
- Мелкие опечатки — допустимы

"wrong" — если:
- Смысл не полностью передан
- Есть ошибка рода, числа, падежа
- Пропущено важное слово
- Фраза звучит неестественно
- Ответ пустой или не по теме

════════════════════
КАК ДАВАТЬ FEEDBACK
════════════════════

Ты — учитель, а не судья. Твоя задача — помочь ученику понять ошибку.

Feedback должен состоять из 3 частей:

1. error_explanation — что конкретно неправильно и почему
   Пример: "'твой' — это мужской род, но слово 'дела' требует другого притяжательного местоимения"

2. hint_uz — направление к правильному ответу (без самого ответа, на узбекском)
   Пример: "'дела' so'zi uchun 'твой' emas, boshqa so'z ishlatiladi. Qaysi?"

3. correct_answer — только на 3-й попытке

════════════════════
ПРАВИЛО ПО ПОПЫТКАМ
════════════════════

attempt = 1:
- Укажи конкретную ошибку в error_explanation (на узбекском)
- Дай мягкую подсказку в hint_uz — направь, не давай ответ
- correct_answer = ""

attempt = 2:
- Объясни ошибку подробнее в error_explanation (на узбекском)
- В hint_uz дай более прямую подсказку
- correct_answer = ""

attempt = 3:
- Объясни ошибку в error_explanation (на узбекском)
- correct_answer = правильный вариант

════════════════════
ПРИМЕРЫ ХОРОШЕГО FEEDBACK
════════════════════

Пример 1:
Uzbek: Ishlar qalay?
Student: Как ты?
error_explanation: "'Как ты?' — bu 'Sen qalaysan?' degan savol. 'Ishlar qalay?' esa ishlar/ahvol haqida so'raydi."
hint_uz: "Rus tilida 'ishlar' yoki 'ahvol' haqida so'raydigan iborani eslang."

Пример 2:
Uzbek: Ishlar qalay?
Student: Как твой дела?
error_explanation: "'твой' so'zi noto'g'ri. 'дела' so'zi ko'plik (множественное число), shuning uchun 'твой' emas, boshqa shakl kerak."
hint_uz: "'мой дела', 'твой дела' — bu noto'g'ri. Ko'plik uchun qanday shakl ishlatiladi?"

Пример 3:
Uzbek: Hayot qalay?
Student: Какой жизнь?
error_explanation: "2 ta xato: 1) 'жизнь' — ayol jinsi (женский род), shuning uchun 'какой' emas. 2) So'roq gapi boshqacha tuziladi."
hint_uz: "'жизнь' so'zi uchun to'g'ri so'roq olmoshini tanlang."

════════════════════
ВАЖНО
════════════════════

- Все поля message_uz, error_explanation, hint_uz — только на узбекском языке
- Никогда не пиши объяснение на русском
- Если сомневаешься — ставь wrong
- Ошибку называй конкретно: какое слово, почему неправильно

════════════════════
ФОРМАТ ОТВЕТА
════════════════════

Верни только JSON:

{
  "status": "correct" | "wrong",
  "message_uz": "Umumiy xulosa (1 qisqa jumla)",
  "error_explanation": "Qaysi so'z noto'g'ri va nima uchun (attempt 1-3)",
  "hint_uz": "To'g'ri javobga yo'naltiruvchi maslahat (attempt 1-2), attempt 3 da bo'sh",
  "correct_answer": "faqat attempt=3 da, aks holda bo'sh satr"
}
`;

  const userPrompt = `
Uzbek original: ${uzText}
Reference Russian answer: ${ruCorrect}
Student answer: ${userAnswer}
Attempt: ${attempt}

Проверь строго, но объясни педагогически.

Шаги проверки:
1. Передан ли полный смысл?
2. Правильный ли род, число, падеж каждого слова?
3. Звучит ли фраза естественно?
4. Если есть ошибка — какое конкретно слово неправильное и почему?

Feedback должен помочь ученику самому найти правильный ответ.

Верни только JSON.
`;

  const response = await withTimeoutAndRetry(
    (signal) =>
      client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          temperature: 0.15,
          max_tokens: 650,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        },
        { signal }
      ),
    CHECK_TIMEOUT_MS,
    'checkTranslation'
  );

  const raw = response.choices[0]?.message?.content ?? '{}';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('AI javobini o‘qib bo‘lmadi');
  }

  const rawStatus: TranslationCheckResult['status'] =
    parsed.status === 'correct' ? 'correct' : 'wrong';
  const status = downgradeOverlenientCorrect(uzText, ruCorrect, userAnswer, rawStatus);

  const feedback =
    status === 'wrong' && rawStatus === 'correct'
      ? "Javobingiz butun gap tarjimasi emas — barcha qismlarni ruscha ifodalang."
      : (parsed.message_uz ?? '');

  const aiCorrectAnswer = String(parsed.correct_answer ?? '').trim();
  const normalizedCorrectAnswer = attempt >= 3 ? aiCorrectAnswer || ruCorrect.trim() : '';

  return {
    status,
    feedback: feedback || String(parsed.message_uz ?? '').trim(),
    error_explanation: String(parsed.error_explanation ?? '').trim(),
    hint: String(parsed.hint_uz ?? '').trim(),
    correct_answer: normalizedCorrectAnswer,
    mistakes: normalizeMistakes(parsed.mistakes),
  };
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'recording.webm'
): Promise<string> {
  const client = getClient();

  const file = new File([audioBuffer], filename, { type: 'audio/webm' });

  const transcription = await withTimeoutAndRetry(
    (signal) =>
      client.audio.transcriptions.create(
        {
          model: 'whisper-1',
          file,
          language: 'ru',
        },
        { signal }
      ),
    TRANSCRIBE_TIMEOUT_MS,
    'transcribeAudio'
  );

  return transcription.text;
}
