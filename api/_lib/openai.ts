import OpenAI from 'openai';

let _client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
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

export async function checkTranslation(
  uzText: string,
  ruCorrect: string,
  userAnswer: string,
  attempt: number = 1
): Promise<TranslationCheckResult> {
  const client = getClient();

  const systemPrompt = `Ты опытный и добрый преподаватель русского языка для узбекских учеников.

Твоя задача:
Проверить перевод и помочь ученику улучшить ответ.

ВАЖНО:
- Всегда отвечай ТОЛЬКО на узбекском языке
- НЕ критикуй резко
- НЕ говори просто "неправильно"
- Поддерживай ученика
- Объясняй мягко и понятно

Ты работаешь как наставник, а не как проверка.

Правила:
1. Сначала оцени ответ:
   - correct (полностью правильно)
   - partial (есть ошибки, но смысл понятен)
   - wrong (сильно отличается)

2. Если есть ошибки:
   - объясни, что не так
   - укажи часть ошибки
   - дай подсказку (не давай сразу полный ответ)

3. Поведение:
   - всегда поддерживай
   - мотивируй попробовать ещё раз

4. Незначительные отличия в пунктуации или порядке слов при сохранении смысла считай правильными

5. Только если ответ полностью неправильный или 3-я попытка:
   - можно показать правильный ответ

Формат ответа строго JSON:
{"status":"correct"|"partial"|"wrong","message_uz":"...","mistakes":[{"part":"...","issue":"...","hint_uz":"..."}],"hint_uz":"...","correct_answer":"..."}`;

  const userPrompt = `Uzbek: ${uzText}
Correct: ${ruCorrect}
User: ${userAnswer}
Attempt: ${attempt}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  return {
    status: parsed.status ?? 'wrong',
    feedback: parsed.message_uz ?? '',
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

  const transcription = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'ru',
  });

  return transcription.text;
}
