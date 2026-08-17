/**
 * gemini.ts — Google Gemini provayder qatlami: matn (4-blok tarjima tekshiruvi) va
 * transkripsiya (ovozli javob). OPENAI_API_KEY bo'lmasa tekshiruv shu yerdan o'tadi.
 *
 * Autentifikatsiya — sozlamaga qarab avtomatik tanlanadi:
 *
 *   1. AI Studio (default) — GEMINI_API_KEY → generativelanguage.googleapis.com,
 *      `x-goog-api-key` header. Ham doimiy "AIza..." kalitlari, ham vaqtinchalik
 *      "AQ..." tokenlari shu yerda ishlaydi.
 *
 *   2. Vertex AI — GOOGLE_APPLICATION_CREDENTIALS=/path/sa.json + GEMINI_PROJECT_ID.
 *      OAuth token google-auth-library orqali olinadi va AVTOMATIK yangilanadi.
 *      GEMINI_API_KEY qo'yilmagan bo'lsa shu rejim tanlanadi.
 *
 * Model tanlovi (o'lchangan, 2026-07-23):
 *   - gemini-3.1-flash-lite  → ~3.7s, thinking yo'q, to'liq javob. DEFAULT.
 *   - gemini-3.5 / 3.6-flash → ~10-13s va thinking maxOutputTokens'ni yeb, javobni
 *     kesib qo'yadi (MAX_TOKENS, ~90 belgi). thinkingBudget:0 bilan tuzaladi, lekin sekin.
 *   - gemini-2.0-*, gemini-2.5-flash → 404 "no longer available".
 */

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
/** Audio kirish (transkripsiya, ovozli savol) — matn modeli bilan bir xil bo'lishi shart emas. */
const AUDIO_MODEL = process.env.GEMINI_AUDIO_MODEL || DEFAULT_MODEL;
const VERTEX_LOCATION = process.env.GEMINI_LOCATION || 'us-central1';
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 40_000);
const MAX_RETRIES = 2;
// "thinking" yoqilgan bo'lsa maxOutputTokens byudjetini yeydi va javob kesiladi.
// Ustoz uchun kechikish muhimroq → default 0 (o'chirilgan).
const THINKING_BUDGET = Number(process.env.GEMINI_THINKING_BUDGET || 0);

export class GeminiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, opts: { status?: number; code?: string; cause?: unknown } = {}) {
    super(message);
    this.name = 'GeminiError';
    this.status = opts.status;
    this.code = opts.code;
    this.cause = opts.cause;
  }
}

function notConfigured(detail: string): GeminiError {
  return new GeminiError(`Gemini not configured: ${detail}`, { code: 'AI_NOT_CONFIGURED' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Autentifikatsiya rejimini aniqlash
// ─────────────────────────────────────────────────────────────────────────────

type AuthMode =
  | { kind: 'api-key'; apiKey: string }
  | { kind: 'vertex-adc'; projectId: string };

function resolveAuthMode(): AuthMode {
  // GEMINI_ACCESS_TOKEN — eski nom, GEMINI_API_KEY bilan bir xil ishlaydi.
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_ACCESS_TOKEN ||
    ''
  ).trim();

  // AI Studio endpointi "AIza..." kalitlarini ham, "AQ..." tokenlarini ham
  // `x-goog-api-key` sifatida qabul qiladi — ikkalasi uchun bitta yo'l.
  if (apiKey) return { kind: 'api-key', apiKey };

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const projectId = (
      process.env.GEMINI_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      ''
    ).trim();
    if (!projectId) {
      throw notConfigured('GOOGLE_APPLICATION_CREDENTIALS bor, lekin GEMINI_PROJECT_ID yo\'q');
    }
    return { kind: 'vertex-adc', projectId };
  }

  throw notConfigured('GEMINI_API_KEY yoki GOOGLE_APPLICATION_CREDENTIALS o\'rnatilmagan');
}

/**
 * Vaqtinchalik "AQ..." tokenlari muddati tugaganda Google 401/403 qaytaradi.
 * Shu holatni aniq xabar bilan ajratamiz, aks holda "AI ishlamayapti" deb qolinadi.
 */
function isExpiredCredential(status: number | undefined, message: string): boolean {
  if (status !== 401 && status !== 403) return false;
  const m = message.toLowerCase();
  return (
    m.includes('expired') ||
    m.includes('invalid authentication') ||
    m.includes('api key not valid') ||
    m.includes('unauthenticated')
  );
}

// google-auth-library faqat ADC rejimida kerak — dinamik import qilamiz.
let _auth: { getAccessToken(): Promise<string | null | undefined> } | undefined;

async function getVertexAccessToken(): Promise<string> {
  if (!_auth) {
    const { GoogleAuth } = await import('google-auth-library');
    _auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  }
  // GoogleAuth.getAccessToken() tokenni ichida keshlaydi va muddati tugasa o'zi yangilaydi.
  const token = await _auth.getAccessToken();
  if (!token) throw notConfigured('Vertex AI uchun access token olinmadi');
  return token;
}

async function buildRequest(model: string): Promise<{ url: string; headers: Record<string, string> }> {
  const mode = resolveAuthMode();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (mode.kind === 'api-key') {
    headers['x-goog-api-key'] = mode.apiKey;
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      headers,
    };
  }

  headers.Authorization = `Bearer ${await getVertexAccessToken()}`;
  return {
    url:
      `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${mode.projectId}` +
      `/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`,
    headers,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// So'rov yuborish (timeout + retry)
// ─────────────────────────────────────────────────────────────────────────────

function isRetryable(err: unknown): boolean {
  const e = err as { status?: number; code?: string; name?: string };
  if (e?.name === 'AbortError') return true;
  if (e?.code === 'ETIMEDOUT' || e?.code === 'ECONNRESET' || e?.code === 'ECONNREFUSED') return true;
  const s = e?.status;
  return typeof s === 'number' && (s === 408 || s === 429 || s >= 500);
}

export type GeminiTurn = { role: 'user' | 'model'; text: string };

/** Foydalanuvchi yuborgan ovoz (base64) — ovozli savol va talaffuz tekshiruvi uchun. */
export type GeminiAudio = { base64: string; mimeType: string };

export type GeminiChatParams = {
  system: string;
  user: string;
  history?: GeminiTurn[];
  /** Berilsa, matn bilan birga audio ham modelga yuboriladi (native audio kirish). */
  audio?: GeminiAudio;
  temperature?: number;
  maxTokens?: number;
  /** true bo'lsa model faqat valid JSON qaytaradi (responseMimeType). */
  json?: boolean;
  model?: string;
};

/** Brauzerdan kelgan mime'ni Gemini qabul qiladigan shaklga keltiradi. */
function normalizeAudioMime(mimeType: string): string {
  const m = (mimeType || '').split(';')[0].trim().toLowerCase();
  if (m === 'audio/webm' || m === 'video/webm') return 'audio/webm';
  if (m === 'audio/mp4' || m === 'video/mp4' || m === 'audio/m4a') return 'audio/mp4';
  if (m === 'audio/mpeg' || m === 'audio/mp3') return 'audio/mp3';
  if (m === 'audio/wav' || m === 'audio/x-wav') return 'audio/wav';
  if (m === 'audio/ogg') return 'audio/ogg';
  return m || 'audio/webm';
}

type GeminiPart = { text?: string; inlineData?: { mimeType?: string; data?: string } };

type GeminiApiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

/** Umumiy generateContent chaqiruvi — matn ham, audio ham shu yerdan o'tadi. */
async function postGenerate(
  model: string,
  body: Record<string, unknown>,
  signal: AbortSignal
): Promise<GeminiApiResponse> {
  const { url, headers } = await buildRequest(model);
  const res = await fetch(url, { method: 'POST', headers, signal, body: JSON.stringify(body) });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    let message = bodyText.slice(0, 500);
    try {
      message = (JSON.parse(bodyText) as GeminiApiResponse).error?.message ?? message;
    } catch {
      /* xom matn qoladi */
    }
    if (isExpiredCredential(res.status, message)) {
      throw new GeminiError(
        `Gemini kaliti eskirgan yoki yaroqsiz (${res.status}). GEMINI_API_KEY ni yangilang. Asl xabar: ${message}`,
        { status: res.status, code: 'AI_CREDENTIAL_EXPIRED' }
      );
    }
    // Balans tugashi rate-limit'ga o'xshab 429 keladi, lekin KUTISH YORDAM BERMAYDI —
    // hisobni to'ldirish kerak. Log'da darhol ajralib tursin.
    if (res.status === 429 && /credits? (are )?depleted|billing|prepayment/i.test(message)) {
      throw new GeminiError(
        `GEMINI BALANSI TUGAGAN — hisobni to'ldiring: https://ai.studio/projects . Asl xabar: ${message}`,
        { status: res.status, code: 'AI_CREDITS_DEPLETED' }
      );
    }
    throw new GeminiError(`Gemini ${res.status}: ${message}`, { status: res.status });
  }

  const data = (await res.json()) as GeminiApiResponse;
  if (data.promptFeedback?.blockReason) {
    throw new GeminiError(`Gemini so'rovni bloklandi (${data.promptFeedback.blockReason})`, {
      status: 400,
    });
  }
  return data;
}

function buildGenerationConfig(
  model: string,
  params: Pick<GeminiChatParams, 'temperature' | 'maxTokens' | 'json'>
): Record<string, unknown> {
  const cfg: Record<string, unknown> = {
    temperature: params.temperature ?? 0.4,
    maxOutputTokens: params.maxTokens ?? 900,
  };
  if (params.json) cfg.responseMimeType = 'application/json';
  // Thinking yoqiq qolsa javob MAX_TOKENS'ga urilib kesiladi — barcha modellarda o'chiramiz.
  if (THINKING_BUDGET >= 0 && !model.includes('tts')) {
    cfg.thinkingConfig = { thinkingBudget: THINKING_BUDGET };
  }
  return cfg;
}

async function callOnce(params: GeminiChatParams, signal: AbortSignal): Promise<string> {
  const model = params.model || (params.audio ? AUDIO_MODEL : DEFAULT_MODEL);

  const userParts: GeminiPart[] = [{ text: params.user }];
  if (params.audio) {
    userParts.push({
      inlineData: {
        mimeType: normalizeAudioMime(params.audio.mimeType),
        data: params.audio.base64,
      },
    });
  }

  const data = await postGenerate(
    model,
    {
      systemInstruction: { parts: [{ text: params.system }] },
      contents: [
        ...(params.history ?? []).map((h) => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }],
        })),
        { role: 'user', parts: userParts },
      ],
      generationConfig: buildGenerationConfig(model, params),
    },
    signal
  );

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();

  if (!text) {
    const reason = candidate?.finishReason ?? 'NO_CANDIDATE';
    throw new GeminiError(`Gemini bo'sh javob qaytardi (${reason})`, { status: 502 });
  }
  return text;
}

/**
 * Timeout + qayta urinish: model band bo'lsa (429/503) yoki so'rov uzilib qolsa
 * qayta uriniladi, aks holda bitta vaqtinchalik xato javobni yo'q qilardi.
 */
async function withRetry<T>(
  label: string,
  timeoutMs: number,
  fn: (signal: AbortSignal) => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fn(controller.signal);
    } catch (err) {
      lastError = err;
      // Sozlama, kalit va balans xatolarini qayta urinib ko'rishdan foyda yo'q.
      const code = (err as GeminiError)?.code;
      if (
        code === 'AI_NOT_CONFIGURED' ||
        code === 'AI_CREDENTIAL_EXPIRED' ||
        code === 'AI_CREDITS_DEPLETED'
      ) {
        throw err;
      }
      if (attempt < maxRetries && isRetryable(err)) {
        // 503 (band) uchun uzunroq kutamiz — darhol urinish yana 503 beradi.
        const status = (err as GeminiError)?.status;
        const base = status === 503 || status === 429 ? 1200 : 250;
        await new Promise((r) => setTimeout(r, Math.min(6000, base * 2 ** attempt)));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new GeminiError(`Gemini ${label} so'rovi muvaffaqiyatsiz tugadi`);
}

/** Gemini'ga matnli so'rov — timeout va retry bilan. */
export async function geminiChat(params: GeminiChatParams): Promise<string> {
  return withRetry('chat', REQUEST_TIMEOUT_MS, (signal) => callOnce(params, signal));
}

// ─────────────────────────────────────────────────────────────────────────────
// Transkripsiya — Gemini native audio kirish (Whisper o'rniga)
// ─────────────────────────────────────────────────────────────────────────────

/** Ovozni matnga aylantiradi. `language` berilsa shu tilda yozib beradi (masalan 'ru'). */
export async function geminiTranscribe(params: {
  audioBase64: string;
  mimeType: string;
  language?: string;
}): Promise<string> {
  const til =
    params.language === 'ru'
      ? 'Audio RUS tilida. Kirill alifbosida yoz.'
      : params.language
        ? `Audio "${params.language}" tilida.`
        : '';

  const text = await geminiChat({
    system:
      'Sen aniq transkripsiya vositasisan. Berilgan audioni SO\'ZMA-SO\'Z matnga aylantirasan. ' +
      `${til} Faqat eshitilgan matnni qaytar — izoh, tirnoq, sarlavha yoki qo'shimcha so'z QO'SHMA. ` +
      'Hech narsa eshitilmasa bo\'sh satr qaytar.',
    user: 'Ushbu audioni transkripsiya qil.',
    audio: { base64: params.audioBase64, mimeType: params.mimeType },
    temperature: 0,
    maxTokens: 1200,
  }).catch((err) => {
    // Bo'sh audio => bo'sh transkripsiya, bu xato emas.
    if ((err as GeminiError)?.status === 502) return '';
    throw err;
  });

  return text.trim();
}

/** JSON kutilgan chaqiruvlar uchun: model javobini xavfsiz parse qiladi. */
export async function geminiJson<T = Record<string, unknown>>(
  params: Omit<GeminiChatParams, 'json'>
): Promise<T> {
  const raw = await geminiChat({ ...params, json: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    // responseMimeType odatda toza JSON beradi, lekin ehtiyot uchun ```json bloklarini kesamiz.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]) as T;
      } catch {
        /* pastda xato tashlanadi */
      }
    }
    throw new GeminiError('Gemini javobini o\'qib bo\'lmadi (JSON emas)', { status: 502 });
  }
}
