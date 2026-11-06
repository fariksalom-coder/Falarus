import { voiceRequest } from '../utils/voiceRequest';
import { apiUrl } from '../api';
import { requireAIConsent } from '../utils/aiConsent';

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export type SpeakingTask = {
  id: number;
  uz_text: string;
  topic: string;
  level: string;
  lesson_id: number | null;
  sort_order: number;
};

export type SpeakingTopic = {
  topic: string;
  level: string;
  count: number;
};

export type MistakeDetail = {
  part: string;
  issue: string;
  hint_uz: string;
};

export type CheckResult = {
  status: 'correct' | 'partial' | 'wrong';
  feedback: string;
  error_explanation?: string;
  hint: string;
  correct_answer: string;
  mistakes: MistakeDetail[];
};

export function isPassingStatus(status: CheckResult['status']): boolean {
  return status === 'correct' || status === 'partial';
}

export type SpeakingStats = {
  total: number;
  correct: number;
  partial: number;
  wrong: number;
};

export async function checkSpeakingAnswer(
  token: string,
  taskId: number,
  userAnswer: string,
  mode: 'text' | 'voice',
  attempt: number = 1,
  shownAnswer: string = ''
): Promise<CheckResult> {
  await requireAIConsent();
  return voiceRequest<CheckResult>(apiUrl('/api/speaking/check'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      task_id: taskId,
      user_answer: userAnswer,
      mode,
      attempt,
      ...(shownAnswer ? { shown_answer: shownAnswer } : {}),
    }),
  });
}

/**
 * Tekshiruvga FAQAT o'zbekcha topshiriq va o'quvchi aytgan gap yuboriladi.
 * Bazadagi etalon javob (`ru_correct`) endi uzatilmaydi — to'g'ri yoki
 * xatoligini AI o'zi baholaydi.
 *
 * `shownAnswer` — ekranda allaqachon ko'rsatilgan to'g'ri javob. O'quvchi shuni
 * aynan qaytarsa, server AI'ga bormasdan «to'g'ri» qaytaradi.
 */
export async function checkSpeakingPromptAnswer(
  token: string,
  userAnswer: string,
  uzText: string,
  mode: 'text' | 'voice',
  attempt: number = 1,
  kunlikDayNumber?: number,
  shownAnswer: string = ''
): Promise<CheckResult> {
  await requireAIConsent();
  return voiceRequest<CheckResult>(apiUrl('/api/speaking/check'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      user_answer: userAnswer,
      uz_text: uzText,
      mode,
      attempt,
      ...(kunlikDayNumber != null ? { day_number: kunlikDayNumber } : {}),
      ...(shownAnswer ? { shown_answer: shownAnswer } : {}),
    }),
  });
}

/**
 * Ovozni matnga o'giradi. `mimeType` — brauzer yozgan format
 * (`recorder.audioBlob.type`). Uni yubormaslik iPhone'da xatoga olib keladi:
 * Safari `audio/mp4` yozadi, server esa faylni `.webm` deb belgilardi.
 */
export async function transcribeSpeakingAudio(
  token: string,
  audioBase64: string,
  kunlikDayNumber?: number,
  mimeType?: string
): Promise<string> {
  await requireAIConsent();
  const data = await voiceRequest<{ text?: string }>(apiUrl('/api/speaking/transcribe'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      audio: audioBase64,
      ...(kunlikDayNumber != null ? { day_number: kunlikDayNumber } : {}),
      ...(mimeType ? { mime: mimeType } : {}),
    }),
  });
  if (!data.text?.trim()) throw new Error('Ovoz eshitilmadi. Mikrofonni tekshirib, qayta yozing yoki javobni matn bilan kiriting.');
  return data.text;
}
