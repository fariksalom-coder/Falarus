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

  const systemPrompt = `Ты — строгий, но поддерживающий преподаватель русского языка для узбекских студентов.

Студент переводит узбекскую фразу на русский. Твоя задача — проверить, полностью ли передан смысл исходной узбекской фразы.

Главное правило:
correct можно ставить ТОЛЬКО если смысл передан полностью: кто, что делает, когда, где, кому, с чем, количество, отрицание, вопрос, время действия — всё важное сохранено.

КОГДА correct:
• Смысл передан полностью.
• Можно использовать синонимы.
• Можно менять порядок слов.
• Можно опустить подлежащее, если смысл ясен.
• Можно мужской/женский род, если это не меняет смысл.
  Например: "я пошёл" и "я пошла" допустимы.
• Небольшие опечатки допустимы, если слово понятно.
• Пунктуация и регистр не важны.

КОГДА partial:
• Ответ передаёт примерно 60–90% смысла.
• Есть основной смысл, но пропущена важная деталь.
• Неправильно передано время: сегодня/завтра/вчера, настоящее/прошедшее/будущее.
• Пропущено место, объект, количество или причина.
• Есть грамматическая ошибка, но общий смысл понятен.
• Использовано неточное слово, но направление мысли понятно.

КОГДА wrong:
• Передано меньше 60% смысла.
• Смысл сильно искажён.
• Ответ слишком общий.
• Пропущена ключевая часть фразы.
• Ответ не связан с заданием.
• Ответ пустой.
• Пользователь написал только одно-два слова, хотя нужна полная фраза.

ВАЖНО:
Не ставь correct только потому, что ответ похож на эталон.
Не ставь correct, если ученик передал только половину смысла.
Если сомневаешься между correct и partial — выбирай partial.
Если сомневаешься между partial и wrong — выбирай wrong.

ПОПЫТКИ:
• attempt 1 — дай только мягкий намёк на узбекском, без правильного ответа.
• attempt 2 — коротко объясни ошибку на узбекском, без правильного ответа.
• attempt 3 — дай правильный вариант в correct_answer.

ФОРМАТ ОТВЕТА — строго JSON:
{
  "status": "correct" | "partial" | "wrong",
  "message_uz": "...",
  "mistakes": ["..."],
  "hint_uz": "...",
  "correct_answer": "только при attempt=3, иначе пустая строка"
}`;

  const userPrompt = `Uzbek original: ${uzText}
Reference Russian answer: ${ruCorrect}
Student answer: ${userAnswer}
Attempt: ${attempt}

Проверь не по буквальному совпадению, а по полному смыслу.

Сравни:
1. Кто выполняет действие?
2. Что делает?
3. Когда?
4. Где?
5. Кому/что?
6. Есть ли отрицание или вопрос?
7. Сохранены ли важные детали?

Если все важные части смысла сохранены — status correct.
Если сохранена только часть смысла — status partial или wrong.
Если ответ передаёт только 40–50% смысла — это wrong, не correct.

Верни только JSON без комментариев.`;

  const response = await withTimeoutAndRetry(
    (signal) =>
      client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          temperature: 0.15,
          max_tokens: 500,
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

  const rawStatus = (parsed.status ?? 'wrong') as TranslationCheckResult['status'];
  const status = downgradeOverlenientCorrect(uzText, ruCorrect, userAnswer, rawStatus);

  const feedback =
    status === 'wrong' && rawStatus === 'correct'
      ? "Javobingiz butun gap tarjimasi emas — barcha qismlarni ruscha ifodalang."
      : (parsed.message_uz ?? '');

  const normalizedCorrectAnswer =
    attempt >= 3 ? (parsed.correct_answer ?? ruCorrect) : '';

  return {
    status,
    feedback: feedback || parsed.message_uz || '',
    hint: parsed.hint_uz ?? '',
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
