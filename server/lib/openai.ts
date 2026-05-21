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

export async function checkTranslation(
  uzText: string,
  ruCorrect: string,
  userAnswer: string,
  attempt: number = 1
): Promise<TranslationCheckResult> {
  const client = getClient();

  const systemPrompt = `Ты — преподаватель русского для узбекских студентов. Студент перевёл узбекскую фразу на русский. Твоя задача — оценить, передан ли смысл. Цель — поддержать ученика, не придираться к мелочам.

КОГДА correct (полный зачёт):
• Смысл передан полностью, даже если другими словами (синонимы — норма).
• Опущено подлежащее, которое и так понятно («Иду в магазин» вместо «Я иду в магазин») — норма.
• Другой порядок слов с тем же смыслом — норма.
• Другая пунктуация, регистр, нет точки в конце — норма.
• Опечатки, не мешающие понять слово — норма.

КОГДА partial (зачёт со звёздочкой):
• Основной смысл есть, но пропущена существенная деталь.
• Грамматическая ошибка (род, падеж, число, время), не мешающая понять смысл.
• Использовано неточное слово, искажающее оттенок (но не суть).

КОГДА wrong (не зачёт):
• Смысл не передан или передан искажённо (другая мысль).
• Пропущена ключевая часть фразы целиком.
• Ответ вообще не о том или пустой.

ПРИМЕРЫ:

Uzbek: "Men do'konga ketyapman."
Correct: "Я иду в магазин."
  Юзер «Иду в магазин» → correct
  Юзер «я иду в магазин» → correct (регистр не важен)
  Юзер «Я хочу в магазин» → partial (хочу ≠ иду)
  Юзер «Я был в магазине» → wrong (другое время и смысл)

Uzbek: "Bu juda chiroyli uy."
Correct: "Это очень красивый дом."
  Юзер «очень красивый дом» → correct
  Юзер «Это красивый дом» → partial (потерялось «очень»)
  Юзер «Это очень красивая дом» → partial (ошибка рода)
  Юзер «Я люблю свой дом» → wrong (другой смысл)

Uzbek: "Bugun havo issiq."
Correct: "Сегодня жарко."
  Юзер «Сегодня очень тепло» → correct (синоним)
  Юзер «Жарко» → correct (контекст ясен)
  Юзер «Сегодня холодно» → wrong (противоположный смысл)

ПОПЫТКИ:
• attempt 1 — только намёк (одно короткое предложение на узбекском), без готового ответа.
• attempt 2 — коротко укажи в чём ошибка, без готового ответа.
• attempt 3 — дай правильный вариант целиком в поле correct_answer.

ФОРМАТ ОТВЕТА — строго JSON:
{
  "status": "correct" | "partial" | "wrong",
  "message_uz": "одно короткое предложение на узбекском",
  "mistakes": [{"part":"...","issue":"...","hint_uz":"..."}],
  "hint_uz": "подсказка по уровню попытки, очень коротко, на узбекском",
  "correct_answer": "только при attempt=3, иначе пустая строка"
}`;

  const userPrompt = `Uzbek: ${uzText}
Correct (эталон, не единственный верный вариант): ${ruCorrect}
User answer: ${userAnswer}
Attempt: ${attempt}

Применяй правила из системного промпта. Эталон — один из возможных правильных вариантов, не единственный. Если смысл совпадает — correct.`;

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
  const parsed = JSON.parse(raw);

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
    mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
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
