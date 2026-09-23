/**
 * openai.ts — tarjima tekshiruvi (4-blok "gapirish"/razgovor) va transkripsiya.
 *
 * Tarjima tekshiruvi provayderi TANLANADI:
 *   - OPENAI_API_KEY o'rnatilgan bo'lsa  → OpenAI (chat completions, JSON)
 *   - Aks holda                          → Gemini (server/lib/gemini.ts)
 * Shu tariqa kalit qo'shilsa avtomat OpenAI'ga o'tadi, kalit bo'lmasa ilova
 * Gemini bilan ishlab turaveradi. Transkripsiya hozircha Gemini'da qoladi.
 */
import { geminiJson, geminiTranscribe } from './gemini.js';
import { SPEAKING_ATTEMPTS_BEFORE_SKIP } from '../../shared/dailyCourseDay.js';

// ─────────────────────────────────────────────────────────────
// OpenAI (chat completions) — faqat fetch, SDK yo'q
// ─────────────────────────────────────────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 30_000);

/** OpenAI kaliti mavjudmi — shu asosda tarjima tekshiruvi provayderi tanlanadi. */
export function isOpenAIConfigured(): boolean {
  return OPENAI_API_KEY.trim().length > 0;
}

/** {status, message} shaklidagi xato — isOpenAIQuotaError/openAIUserFacingError shu bilan ishlaydi. */
class OpenAIError extends Error {
  status?: number;
  constructor(message: string, opts?: { status?: number }) {
    super(message);
    this.name = 'OpenAIError';
    this.status = opts?.status;
  }
}

/**
 * OpenAI chat completions, JSON rejim. geminiJson bilan bir xil imzo:
 * { system, user, temperature, maxTokens } → parse qilingan JSON obyekt.
 */
export async function openaiJson<T = Record<string, unknown>>(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: params.temperature ?? 0.15,
        max_tokens: params.maxTokens ?? 650,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let message = `OpenAI ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) message = errBody.error.message;
    } catch {
      /* body JSON emas — status bilan qolamiz */
    }
    throw new OpenAIError(message, { status: res.status });
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!raw) throw new OpenAIError("OpenAI bo'sh javob qaytardi", { status: 502 });

  try {
    return JSON.parse(raw) as T;
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]) as T;
      } catch {
        /* pastda xato tashlanadi */
      }
    }
    throw new OpenAIError("OpenAI javobini o'qib bo'lmadi (JSON emas)", { status: 502 });
  }
}

/**
 * OpenAI Whisper transkripsiyasi (ovoz → matn). multipart/form-data yuklash.
 * 4-blok "gapirish" ovozli rejimida foydalanuvchi nutqini matnga aylantiradi.
 */
async function openaiTranscribe(
  audioBuffer: Buffer,
  mimeType: string,
  filename: string,
  /**
   * Kutilayotgan matn — Whisper uni dekodlashda yo'naltiruvchi sifatida oladi.
   * Qisqa gaplarda bu juda muhim: "Я иду в магазин" ni yo'naltiruvchisiz
   * "Еду в марин" deb yozib qo'yardi. Bu majburlash emas, moyillik: butunlay
   * boshqa gap o'qilsa, u baribir o'zgacha transkripsiya bo'lib chiqadi.
   */
  hint?: string,
  /** Model nomi — zaxira urinishda boshqasiga o'tish uchun. */
  model?: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  let res: Response;
  try {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), filename);
    form.append('model', model || OPENAI_TRANSCRIBE_MODEL);
    form.append('language', 'ru');
    if (hint) form.append('prompt', hint.slice(0, 800));
    form.append('response_format', 'json');
    res = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      signal: controller.signal,
      body: form,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let message = `OpenAI ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) message = errBody.error.message;
    } catch {
      /* body JSON emas — status bilan qolamiz */
    }
    throw new OpenAIError(message, { status: res.status });
  }

  const data = (await res.json()) as { text?: string };
  return (data.text ?? '').trim();
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
 * Ikki ruscha javob AYNAN bir xilmi (tinish belgisi, registr va «ё/е» farqisiz).
 *
 * Bu AI'siz, qat'iy tekshiruv. Kerak bo'lgan sabab: o'quvchiga ekranda
 * ko'rsatilgan to'g'ri javobni AYNAN qaytarganda ham AI ba'zan "xato" derdi va
 * o'quvchi topshiriqdan chiqa olmay qolardi. Bunday holat mantiqan mumkin emas,
 * shuning uchun bu yerda AI'ning hukmi bekor qilinadi.
 */
export function sameRuAnswer(a: string, b: string): boolean {
  const clean = (s: string) =>
    normalizeRuAnswer(s)
      .replace(/ё/g, 'е')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const left = clean(a);
  return left.length > 0 && left === clean(b);
}

/** OpenAI va Gemini kvota/billing xatolarini bir xil aniqlaydi. */
export function isOpenAIQuotaError(err: unknown): boolean {
  const e = err as { status?: number; message?: string; error?: { message?: string } };
  const msg = String(e?.message ?? e?.error?.message ?? '').toLowerCase();
  if (e?.status !== 429) return false;
  return (
    msg.includes('quota') ||
    msg.includes('billing') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource exhausted')
  );
}

export function openAIUserFacingError(err: unknown): string {
  if (isOpenAIQuotaError(err)) {
    return "AI tekshiruv vaqtincha ishlamayapti. Birozdan keyin qayta urinib ko'ring yoki matn bilan javob bering.";
  }
  /*
   * Ovoz fayli o'qilmadi — prod loglarida eng ko'p uchragan holat (yozuv juda
   * qisqa yoki bo'sh chiqqan). Umumiy "xatolik yuz berdi" o'rniga nima qilish
   * kerakligini aytamiz.
   */
  const rawMsg = String((err as { message?: string })?.message ?? '').toLowerCase();
  if (rawMsg.includes('invalid file format') || rawMsg.includes('could not be decoded')) {
    return "Ovoz aniq yozilmadi. Mikrofonni bosib, biroz uzunroq gapiring va qayta urinib ko'ring.";
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

/** Provayder tanlovi: OpenAI birinchi; ulanish/timeout bo'lsa Gemini zaxira. */
async function aiJson<T = Record<string, unknown>>(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  if (!isOpenAIConfigured()) return geminiJson<T>(params);
  try {
    return await openaiJson<T>(params);
  } catch (err) {
    console.warn('[openai] OpenAI xato, Gemini zaxira:', err instanceof Error ? err.message : err);
    return geminiJson<T>(params);
  }
}

/**
 * Modelning `status` maydonini BARDOSHLI o'qiydi.
 *
 * Ilgari `parsed.status === 'correct'` deb qat'iy solishtirilardi, ya'ni
 * "Correct", "correct " yoki "верно" kabi javob ham "wrong" ga aylanib,
 * to'g'ri javob bergan o'quvchi xatoga chiqib qolardi. Endi registr,
 * bo'shliq va sinonimlar hisobga olinadi; `status` umuman kelmasa va
 * xato izohi ham bo'lmasa — javob to'g'ri deb qabul qilinadi.
 */
export function parseCheckStatus(value: unknown, hasErrorText: boolean): 'correct' | 'wrong' {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return hasErrorText ? 'wrong' : 'correct';
  if (raw.startsWith('correct') || raw.startsWith('partial')) return 'correct';
  return ['ok', 'true', 'yes', 'pass', 'passed', 'right', 'good', 'верно', 'правильно', "to'g'ri"].includes(raw)
    ? 'correct'
    : 'wrong';
}

/** `true`/`false`/`"ha"`/`"да"` … → boolean; noaniq bo'lsa `null`. */
function truthy(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  if (['true', 'yes', 'ha', 'да', 'y', '1'].includes(s)) return true;
  if (['false', 'no', "yo'q", 'yoq', 'нет', 'n', '0'].includes(s)) return false;
  return null;
}

/**
 * IKKINCHI FIKR — "wrong" hukmini mustaqil ravishda qayta tekshiradi.
 *
 * Model birinchi so'rovda yo'q joydan xato "topib" qo'yishi mumkin (eng ko'p
 * uchraydigan shikoyat). Shuning uchun xato hukmi chiqqanda toza kontekstda
 * BITTA savol beriladi: ma'no yetkazildimi? Shubha bo'lsa — "ha".
 * Ikkala tekshiruv ham xato desagina javob xato deb belgilanadi.
 * So'rov muvaffaqiyatsiz bo'lsa — birinchi hukm o'zgarishsiz qoladi.
 */
async function secondOpinionMeaningOk(question: string, userAnswer: string, mode: 'translation' | 'open'): Promise<boolean> {
  const system =
    mode === 'translation'
      ? `Ты — независимый проверяющий. Тебе дают узбекскую фразу и русский ответ студента,
записанный распознаванием речи.

Ответь ровно на один вопрос: понял бы носитель русского языка ТОТ ЖЕ смысл?

Считай ответ верным (meaning_ok = true), если:
- смысл совпадает, даже если слова, порядок слов или конструкция другие;
- есть синонимы, лишняя вежливость или обращение;
- пропущено личное местоимение, а форма глагола сохраняет лицо
  («Иду в магазин» = «Я иду в магазин»);
- регистр, пунктуация или мелкие опечатки распознавания речи;
- падежная/стилистическая неточность, не меняющая смысл.

meaning_ok = false ТОЛЬКО если смысл искажён, изменилось действующее лицо
(«я» → «ты»), потеряно смысловое ядро, ответ не по теме, пустой или не по-русски.

Сомневаешься — ставь true.`
      : `Ты — независимый проверяющий. Тебе дают русское задание и ответ студента,
записанный распознаванием речи. Эталонного ответа нет — содержание выбирает студент.

Ответь ровно на один вопрос: это уместный и понятный русский ответ на задание?

meaning_ok = false ТОЛЬКО если ответ не по теме, пустой, не на русском языке
или настолько ломаный, что смысл не восстанавливается.
Сомневаешься — ставь true.`;

  try {
    const parsed = await aiJson<Record<string, unknown>>({
      system: `${system}\n\nВерни только JSON: {"meaning_ok": true | false}`,
      user: `${mode === 'translation' ? 'Uzbek original' : 'Задание'}: ${question}\nОтвет студента: ${userAnswer}\n\nВерни только JSON.`,
      temperature: 0,
      maxTokens: 60,
    });
    return truthy(parsed.meaning_ok) === true;
  } catch {
    // Tekshiruv o'tmadi — birinchi hukm kuchida qoladi.
    return false;
  }
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

/**
 * Tarjimani tekshiradi — BAZADAGI etalon javobsiz.
 *
 * Ilgari bu yerga `ru_correct` (bazadagi to'g'ri javob) uzatilardi va model
 * javobni o'shanga solishtirardi. Endi model faqat O'ZBEKCHA topshiriq bilan
 * o'quvchi AYTGAN gapni ko'radi va tarjima to'g'ri yoki xatoligini o'zi
 * baholaydi. Shu sababli bir xil ma'noni boshqacha so'zlar bilan aytgan
 * o'quvchi endi "xato" deb belgilanmaydi.
 */
export async function checkTranslation(
  uzText: string,
  userAnswer: string,
  attempt: number = 1,
  /** Ekranda o'quvchiga allaqachon ko'rsatilgan to'g'ri javob (bo'lsa). */
  shownAnswer: string = ''
): Promise<TranslationCheckResult> {
  /*
   * KO'RSATILGAN JAVOBNI QAYTARISH — har doim to'g'ri.
   * AI'ga umuman bormaymiz: o'z ko'rsatgan javobini xato deyish mumkin emas.
   */
  if (shownAnswer && sameRuAnswer(userAnswer, shownAnswer)) {
    return {
      status: 'correct',
      feedback: "Barakalla! Endi shu gapni yodda saqlang.",
      error_explanation: '',
      hint: '',
      correct_answer: '',
      mistakes: [],
    };
  }

  const systemPrompt = `
Ты — доброжелательный преподаватель русского языка для узбекских студентов.
Это УСТНОЕ упражнение: студент вслух переводит узбекскую фразу на русский.

Эталонного ответа НЕТ. Оценивай сам, по смыслу узбекской фразы.

Ответ приходит из РАСПОЗНАВАНИЯ РЕЧИ. Поэтому регистр букв, заглавные буквы,
точки, запятые и восклицательные знаки НЕ ОЦЕНИВАЮТСЯ ВООБЩЕ.
«я из узбекистана» и «Я из Узбекистана» — это ОДИН И ТОТ ЖЕ ответ.

════════════════════
ГЛАВНЫЙ ПРИНЦИП
════════════════════

Цель упражнения — научить ГОВОРИТЬ, а не поймать на мелочи.
Вопрос, на который ты отвечаешь, ровно один:

  «Понял бы носитель русского языка ТОТ ЖЕ смысл?»

Если да — это "correct". Даже если сказано другими словами.

Ложное обвинение вредит сильнее пропущенной мелкой ошибки:
студент перестаёт доверять проверке и бросает упражнение.

════════════════════
"correct" — ставь, если смысл передан
════════════════════

Всё это ДОПУСТИМО и остаётся "correct":
- Синонимы: «учитель» / «преподаватель», «друг» / «товарищ»
- Другой порядок слов
- Другая, но корректная конструкция: «Меня зовут Али» / «Моё имя Али»
- ДОБАВЛЕННЫЕ слова вежливости и обращения:
  «Здравствуйте, учитель! Доброе утро!» — верно для «Xayrli tong, o'qituvchi!»
  «Здравствуй, мой друг!» — верно для «Salom, do'stim!»
- Пропущенное обращение, если основной смысл на месте: «Привет» для «Salom, do'stim!»
- Род говорящего: «пошёл» / «пошла» (но НЕ смена лица: «я» → «ты»)
- ПРОПУЩЕННОЕ личное местоимение, если форма глагола сохраняет лицо:
  «Иду в магазин» = «Я иду в магазин» → "correct"
  «Живу в Ташкенте» = «Я живу в Ташкенте» → "correct"
- Регистр и пунктуация в любом виде — это НЕ ошибка
- Мелкие опечатки распознавания речи
- Падежная неточность, которая НЕ меняет смысл
- Разговорный, но понятный вариант

════════════════════
"wrong" — только при реальной ошибке
════════════════════

Ставь "wrong" ТОЛЬКО если верно хотя бы одно:
- Смысл искажён или передан не тот (утро вместо вечера, вопрос вместо ответа)
- Изменилось ДЕЙСТВУЮЩЕЕ ЛИЦО или адресат: «я» → «ты»/«он», «мой» → «твой»
  Пример: «Men O'zbekistondanman» = «Я из Узбекистана».
  «Ты из Узбекистана» — это уже про другого человека → "wrong"
  «Его зовут Али» вместо «Меня зовут Али» → "wrong"
- Ответ не по теме, пустой или «не знаю»
- Пропущено смысловое ядро фразы (без него предложение не значит того же)
- Грамматическая ошибка МЕНЯЕТ смысл (не тот род/число/падеж у ключевого слова,
  из-за чего меняется кто/что/кому)
- Фраза не по-русски: калька с узбекского, которую носитель не поймёт

НЕ ставь "wrong" за:
- «звучит не совсем естественно», если смысл ясен
- лишнюю вежливость или лишнее слово
- стилистику и личные предпочтения

Если сомневаешься между "correct" и "wrong" — ставь "correct".

════════════════════
КАК ДАВАТЬ FEEDBACK
════════════════════

Ты — учитель, а не судья. Объясняй, чтобы студент понял ошибку.

1. error_explanation — что именно неправильно и почему (на узбекском)
   Пример: "'твой' — erkak jinsi, 'дела' esa ko'plik, shuning uchun boshqa shakl kerak."

2. hint_uz — направление к ответу, без самого ответа (на узбекском)
   Пример: "'дела' so'zi uchun ko'plik shakli kerak. Qaysi?"

3. correct_answer — твой правильный русский вариант перевода.
   Заполняй его ВСЕГДА, когда статус "wrong". Когда его показать студенту —
   решает сервер, не ты.

Если статус "correct" — error_explanation и hint_uz оставь пустыми,
а в message_uz коротко похвали.

════════════════════
ПРАВИЛО ПО ПОПЫТКАМ
════════════════════

attempt = 1: конкретная ошибка + мягкая подсказка
attempt = 2 и дальше: объясни подробнее и так, чтобы студент запомнил правило —
             после этой попытки он уже увидит правильный ответ на экране.

ВАЖНО: если студент повторил показанный ему правильный ответ — это "correct".
Никогда не спорь со своим же вариантом перевода.

════════════════════
ВАЖНО
════════════════════

- message_uz, error_explanation, hint_uz — ТОЛЬКО на узбекском языке
- Никогда не пиши объяснение на русском
- Ошибку называй конкретно: какое слово и почему неправильно
- Не выдумывай ошибку там, где её нет

════════════════════
ФОРМАТ ОТВЕТА
════════════════════

Верни только JSON:

{
  "meaning_conveyed": true | false,
  "status": "correct" | "wrong",
  "message_uz": "Umumiy xulosa (1 qisqa jumla)",
  "error_explanation": "Qaysi so'z noto'g'ri va nima uchun (faqat wrong bo'lsa)",
  "hint_uz": "To'g'ri javobga yo'naltiruvchi maslahat (faqat wrong bo'lsa)",
  "correct_answer": "to'g'ri ruscha variant (wrong bo'lsa har doim to'ldiring)"
}

meaning_conveyed — сначала ответь именно на него: понял бы носитель русского
языка тот же смысл? Если true, то status ОБЯЗАН быть "correct".
`;

  const userPrompt = `
Uzbek original: ${uzText}
Student answer: ${userAnswer}
Attempt: ${attempt}

Шаги проверки — строго в этом порядке:
1. Передан ли смысл узбекской фразы? Если да — это "correct", дальше не ищи ошибок.
2. Если смысл НЕ передан — что именно потеряно или искажено?
3. Есть ли грамматическая ошибка, которая МЕНЯЕТ смысл? Только такая делает ответ "wrong".

Синонимы, лишняя вежливость, другой порядок слов и мелкие опечатки — это "correct".

Feedback должен помочь ученику самому найти правильный ответ.

Верни только JSON.
`;

  const parsed = await aiJson<Record<string, unknown>>({
    system: systemPrompt,
    user: userPrompt,
    // 0 — bir xil javob har safar bir xil baholansin.
    temperature: 0,
    maxTokens: 650,
  });

  const errorExplanation = String(parsed.error_explanation ?? '').trim();
  const aiCorrectAnswer = String(parsed.correct_answer ?? '').trim();
  let status = parseCheckStatus(parsed.status, Boolean(errorExplanation));

  /*
   * YOLG'ON AYBLOVGA QARSHI UCH FILTR:
   *   1) o'quvchi aytgani modelning O'Z "to'g'ri javobi" bilan bir xil bo'lsa —
   *      bu qarama-qarshilik, javob to'g'ri (eng ko'p uchragan shikoyat);
   *   2) model o'zi "ma'no yetkazildi" desa — status "wrong" bo'lsa ham to'g'ri;
   *   3) shundan keyin ham "wrong" qolsa — toza kontekstda ikkinchi fikr so'raladi.
   * Hammasi xato desagina javob xato deb belgilanadi.
   */
  const firstVerdict = status;
  if (status === 'wrong' && sameRuAnswer(userAnswer, aiCorrectAnswer)) status = 'correct';
  if (status === 'wrong' && truthy(parsed.meaning_conveyed) === true) status = 'correct';
  if (status === 'wrong' && (await secondOpinionMeaningOk(uzText, userAnswer, 'translation'))) {
    status = 'correct';
  }

  if (status === 'correct') {
    // Hukm "to'g'ri"ga o'zgargan bo'lsa, modelning xato izohlari qolib ketmasin.
    const flipped = firstVerdict === 'wrong';
    return {
      status,
      feedback: flipped ? "To'g'ri! Ma'no to'liq yetkazildi." : String(parsed.message_uz ?? '').trim(),
      error_explanation: '',
      hint: '',
      correct_answer: '',
      mistakes: [],
    };
  }

  // 2-xatodan boshlab modelning O'Z varianti ko'rsatiladi (bazadan emas).
  return {
    status,
    feedback: String(parsed.message_uz ?? '').trim(),
    error_explanation: errorExplanation,
    hint: String(parsed.hint_uz ?? '').trim(),
    correct_answer: attempt >= SPEAKING_ATTEMPTS_BEFORE_SKIP ? aiCorrectAnswer : '',
    mistakes: normalizeMistakes(parsed.mistakes),
  };
}

/**
 * Rus tilidagi ovozni matnga aylantiradi (4-blok "gapirish" ovozli rejimi).
 * OPENAI_API_KEY bor bo'lsa OpenAI Whisper, aks holda Gemini native audio.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'recording.webm',
  /** Kutilayotgan matn (bo'lsa) — tanish gapni aniqroq eshitish uchun. */
  hint?: string,
  /** Model nomi — standart modeldan boshqasini sinash uchun. */
  model?: string,
): Promise<string> {
  const mimeType = filename.endsWith('.mp4') || filename.endsWith('.m4a')
    ? 'audio/mp4'
    : filename.endsWith('.mp3')
      ? 'audio/mpeg'
      : filename.endsWith('.wav')
        ? 'audio/wav'
        : filename.endsWith('.ogg') || filename.endsWith('.oga')
          ? 'audio/ogg'
          : 'audio/webm';

  if (isOpenAIConfigured()) {
    try {
      return await openaiTranscribe(audioBuffer, mimeType, filename, hint, model);
    } catch (err) {
      console.warn('[openai] Whisper xato, Gemini zaxira:', err instanceof Error ? err.message : err);
    }
  }

  return geminiTranscribe({
    audioBase64: audioBuffer.toString('base64'),
    mimeType,
    language: 'ru',
  });
}

/**
 * Ochiq gapirish topshirig'ini baholaydi (`daily_speaking_tasks`).
 *
 * Bu yerda TARJIMA emas — o'quvchi ruscha topshiriqqa o'z so'zlari bilan
 * ruscha javob beradi. Etalon javob yo'q va bo'lishi ham mumkin emas:
 * bitta savolga o'nlab to'g'ri javob bor. Shuning uchun model faqat bitta
 * narsani baholaydi — javob topshiriqqa mos va tushunarli ruschami.
 */
export async function checkOpenSpeaking(
  promptRu: string,
  userAnswer: string,
  attempt: number = 1,
  /** Ekranda ko'rsatilgan namuna javob (bo'lsa) — uni qaytarish har doim to'g'ri. */
  shownAnswer: string = ''
): Promise<TranslationCheckResult> {
  if (shownAnswer && sameRuAnswer(userAnswer, shownAnswer)) {
    return {
      status: 'correct',
      feedback: "Barakalla! Endi shu javobni o'zingizcha ham ayta olasiz.",
      error_explanation: '',
      hint: '',
      correct_answer: '',
      mistakes: [],
    };
  }

  const systemPrompt = `
Ты — доброжелательный преподаватель русского языка для узбекских студентов.
Это УСТНОЕ упражнение: студент отвечает вслух на русское задание своими словами.

Эталонного ответа НЕТ и быть не может — на один вопрос есть много верных ответов.

Ответ приходит из РАСПОЗНАВАНИЯ РЕЧИ. Регистр букв, заглавные буквы и
знаки препинания НЕ ОЦЕНИВАЮТСЯ ВООБЩЕ.

════════════════════
ГЛАВНЫЙ ПРИНЦИП
════════════════════

Ты отвечаешь ровно на один вопрос:

  «Это уместный и понятный русский ответ на данное задание?»

Если да — "correct". Содержание ответа выбирает студент, не ты.
Ложное обвинение вредит сильнее пропущенной мелкой ошибки.

════════════════════
"correct" — ставь, если ответ по теме и понятен
════════════════════

Допустимо и остаётся "correct":
- Любое содержание, если оно отвечает на задание
- Короткий ответ, если задание не требует развёрнутого
- Разговорный стиль, простые конструкции
- Мелкие грамматические неточности, не мешающие понять смысл
- Ошибки распознавания речи

════════════════════
"wrong" — только при реальной проблеме
════════════════════

Ставь "wrong" ТОЛЬКО если верно хотя бы одно:
- Ответ не по теме задания
- Ответ пустой, «не знаю», набор букв
- Ответ не на русском языке
- Речь настолько ломаная, что смысл не восстанавливается

Если сомневаешься — ставь "correct".

════════════════════
FEEDBACK
════════════════════

- message_uz — 1 qisqa jumla (o'zbekcha). "correct" bo'lsa — qisqa maqtov.
- error_explanation — nima mos emasligi (faqat "wrong" bo'lsa, o'zbekcha)
- hint_uz — qanday javob berish kerakligi haqida yo'nalish (faqat "wrong")
- correct_answer — MUMKIN BO'LGAN bitta namuna javob. "wrong" bo'lsa HAR DOIM
  to'ldiring: uni faqat 3-urinishda ko'rsatish — serverning ishi.

После 2-й ошибки студент видит образец ответа и может идти дальше.
Если он повторил показанный образец — это "correct", не спорь со своим же ответом.

Все поля message_uz, error_explanation, hint_uz — ТОЛЬКО на узбекском.

Верни только JSON:

{
  "meaning_conveyed": true | false,
  "status": "correct" | "wrong",
  "message_uz": "...",
  "error_explanation": "...",
  "hint_uz": "...",
  "correct_answer": "..."
}

meaning_conveyed — это ответ на главный вопрос: ответ уместен и понятен?
Если true, то status ОБЯЗАН быть "correct".
`;

  const userPrompt = `
Задание (по-русски): ${promptRu}
Ответ студента: ${userAnswer}
Попытка: ${attempt}

Проверь: это уместный и понятный русский ответ на задание?
Содержание выбирает студент — не требуй конкретных слов.

Верни только JSON.
`;

  const parsed = await aiJson<Record<string, unknown>>({
    system: systemPrompt,
    user: userPrompt,
    temperature: 0,
    maxTokens: 600,
  });

  const errorExplanation = String(parsed.error_explanation ?? '').trim();
  const aiCorrectAnswer = String(parsed.correct_answer ?? '').trim();
  let status = parseCheckStatus(parsed.status, Boolean(errorExplanation));

  // `checkTranslation` dagi bilan bir xil uch filtr — yolg'on ayblovga qarshi.
  const firstVerdict = status;
  if (status === 'wrong' && sameRuAnswer(userAnswer, aiCorrectAnswer)) status = 'correct';
  if (status === 'wrong' && truthy(parsed.meaning_conveyed) === true) status = 'correct';
  if (status === 'wrong' && (await secondOpinionMeaningOk(promptRu, userAnswer, 'open'))) {
    status = 'correct';
  }

  if (status === 'correct') {
    return {
      status,
      feedback:
        firstVerdict === 'wrong'
          ? "To'g'ri! Javobingiz topshiriqqa mos."
          : String(parsed.message_uz ?? '').trim(),
      error_explanation: '',
      hint: '',
      correct_answer: '',
      mistakes: [],
    };
  }

  return {
    status,
    feedback: String(parsed.message_uz ?? '').trim(),
    error_explanation: errorExplanation,
    hint: String(parsed.hint_uz ?? '').trim(),
    correct_answer: attempt >= SPEAKING_ATTEMPTS_BEFORE_SKIP ? aiCorrectAnswer : '',
    mistakes: normalizeMistakes(parsed.mistakes),
  };
}
