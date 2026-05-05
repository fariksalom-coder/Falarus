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

  const systemPrompt = `Ты опытный и добрый преподаватель русского языка для узбекских учеников.

Задача: проверить, перевёл ли ученик **всё** узбекское предложение на русский (смысл и состав реплики), опираясь на эталон «Correct» и на исходник «Uzbek».

ВАЖНО (язык ответа в JSON):
- Поля message_uz, hint_uz, mistakes[].hint_uz — только на узбекском.
- Будь тактичным, не груби; но оценка должна быть **честной и строгой по смыслу**.

Критичные правила оценки:
1. **correct** — только если русский ответ ученика передаёт **полный** смысл **всего** узбекского предложения (как эталон по содержанию), допускаются лишь мелочи: пунктуация, ё/е, порядок слов при том же смысле, сокращения не меняющие смысл.
2. **Никогда** не ставь **correct**, если ученик дал лишь **часть** фразы: одно слово из эталона, только имя, только приветствие без второй части, обрывок — это **wrong** (если почти нет смысла) или **partial** (если есть заметная часть смысла, но важное пропущено).
3. Пример: Uzbek «Xayrli tong, Ali!», эталон «Доброе утро, Али!» — ответ ученика только «Али» или только «Доброе утро» → **wrong** (неполный перевод).
4. **partial** — основной смысл узбекского текста в целом передан, но есть заметные ошибки (слово, падеж, лишнее/пропущено не ключевое слово).
5. **wrong** — смысл не совпадает, перевода почти нет, или ответ сильно неполный.
6. Если ответ отличается от эталона только родом/формой обращения, но грамматически и по смыслу для того же узбекского текста верно — можно **correct**.
7. На попытке 3 или при полном провале можно в correct_answer дать полный эталон; на ранних попытках в подсказках не копируй эталон целиком.

Формат ответа строго JSON:
{"status":"correct"|"partial"|"wrong","message_uz":"...","mistakes":[{"part":"...","issue":"...","hint_uz":"..."}],"hint_uz":"...","correct_answer":"..."}`;

  const userPrompt = `Перевести нужно **целиком** это узбекское предложение (не фрагмент):
Uzbek: ${uzText}

Эталонный русский (ориентир по смыслу и полноте, не единственная допустимая формулировка, но полнота должна совпадать):
Correct: ${ruCorrect}

Ответ ученика (русский):
User: ${userAnswer}

Номер попытки: ${attempt}

Сначала мысленно проверь: есть ли в ответе ученика **все** части смысла узбекского предложения. Если нет — status не может быть correct.`;

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

  return {
    status,
    feedback: feedback || parsed.message_uz || '',
    hint: parsed.hint_uz ?? '',
    correct_answer: parsed.correct_answer ?? ruCorrect,
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
