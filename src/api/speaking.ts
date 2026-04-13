import { apiUrl } from '../api';

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export type SpeakingTask = {
  id: number;
  uz_text: string;
  ru_correct: string;
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
  hint: string;
  correct_answer: string;
  mistakes: MistakeDetail[];
};

export type SpeakingStats = {
  total: number;
  correct: number;
  partial: number;
  wrong: number;
};

export async function getSpeakingTopics(token: string): Promise<SpeakingTopic[]> {
  const res = await fetch(apiUrl('/api/speaking/topics'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Mavzular yuklanmadi');
  return res.json();
}

export async function getSpeakingTasks(
  token: string,
  opts?: { topic?: string; lessonId?: number }
): Promise<SpeakingTask[]> {
  let url = '/api/speaking/tasks';
  const params: string[] = [];
  if (opts?.topic) params.push(`topic=${encodeURIComponent(opts.topic)}`);
  if (opts?.lessonId) params.push(`lesson_id=${opts.lessonId}`);
  if (params.length) url += '?' + params.join('&');
  const res = await fetch(apiUrl(url), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Topshiriqlar yuklanmadi');
  return res.json();
}

export async function checkSpeakingAnswer(
  token: string,
  taskId: number,
  userAnswer: string,
  mode: 'text' | 'voice',
  attempt: number = 1
): Promise<CheckResult> {
  const res = await fetch(apiUrl('/api/speaking/check'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ task_id: taskId, user_answer: userAnswer, mode, attempt }),
  });
  if (!res.ok) throw new Error('Tekshirishda xatolik');
  return res.json();
}

export async function transcribeSpeakingAudio(
  token: string,
  audioBase64: string
): Promise<string> {
  const res = await fetch(apiUrl('/api/speaking/transcribe'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ audio: audioBase64 }),
  });
  if (!res.ok) throw new Error('Ovozni tanib bo\'lmadi');
  const data = await res.json();
  return data.text;
}

export async function getSpeakingStats(token: string): Promise<SpeakingStats> {
  const res = await fetch(apiUrl('/api/speaking/stats'), { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Statistika yuklanmadi');
  return res.json();
}
