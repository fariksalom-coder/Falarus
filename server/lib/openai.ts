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

/** LLM baʼzan faqat ism yoki gapning bir qismini «toʻgʻri» deb belgilaydi — bunday holatlarni tuzatamiz */
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

  if (userN === 1 && refN >= 3) return 'wrong';

  if (refN >= 3 && userN < refN - 1) return 'wrong';

  if (refN >= 4 && userN < Math.ceil(refN * 0.4)) return 'wrong';

  return status;
}

export async function checkTranslation(
  uzText: string,
  ruCorrect: string,
  userAnswer: string,
  attempt: number = 1
): Promise<TranslationCheckResult> {
  const client = getClient();

  const systemPrompt = `Ты проверяешь перевод с узбекского на русский.

Оценивай смысл, а не дословность. Пунктуация не критична. Учитывай род (он/она). Разрешай синонимы.
Нельзя ставить correct за неполный перевод.

Статусы:
- correct: полный смысл передан.
- partial: смысл в целом есть, но есть заметная ошибка/пропуск.
- wrong: смысл не передан или ответ сильно неполный.

Попытки:
- 1: только намёк, без готового ответа.
- 2: коротко укажи ошибку (что именно не так).
- 3: дай правильный вариант целиком.

Ответ строго JSON:
{
  "status":"correct|partial|wrong",
  "message_uz":"краткий комментарий (1 короткое предложение)",
  "mistakes":[{"part":"...","issue":"...","hint_uz":"..."}],
  "hint_uz":"подсказка по уровню попытки (очень коротко)",
  "correct_answer":"только на попытке 3, иначе пусто"
}`;

  const userPrompt = `Uzbek: ${uzText}
Correct: ${ruCorrect}
User: ${userAnswer}
Attempt: ${attempt}

Проверь, передан ли полный смысл всей фразы. Если ответ неполный, status не может быть correct.
Комментарий и подсказка должны быть короткими и по делу.`;

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
