import { apiUrl } from '../api';

/** O'qituvchi panelidagi bitta dars — sinov darsi ham, onlayn sessiya ham. */
export type PanelLesson = {
  id: string;
  kind: 'trial' | 'session';
  title: string;
  student_user_id: number | null;
  student_name: string;
  starts_at: string | null;
  duration_minutes: number;
  is_trial: boolean;
  status: string;
  room_id: number | null;
};

export type PanelStudent = {
  user_id: number;
  name: string;
  level: string;
  status: 'active' | 'finished' | 'trial';
  is_new: boolean;
  lessons_done: number;
  trials_total: number;
  next_lesson_at: string | null;
  first_seen_at: string;
};

export type PanelSummary = {
  today: { lessons: number; trials: number; schedule: PanelLesson[] };
  students: { total: number; active: number; new_this_week: number; waiting_trial: number };
  lessons_done_total: number;
  lessons_planned: number;
  /** `note: 'trial_only'` — hozircha faqat sinov darslari to'lovi hisoblanadi. */
  income: { month_uzs: number; prev_month_uzs: number; change_percent: number | null; note: string };
  next_lesson: PanelLesson | null;
  new_students: Array<{
    user_id: number;
    name: string;
    level: string;
    status: string;
    scheduled_starts_at: string | null;
  }>;
};

export type LessonFilter = 'upcoming' | 'today' | 'completed' | 'cancelled' | 'trial';
export type StudentFilter = 'all' | 'new' | 'active' | 'finished' | 'trial';

export type ScheduleSlot = {
  start: string;
  end: string;
  state: 'free' | 'booked' | 'trial' | 'blocked';
  label: string;
  /** Slot haftalik qoidadan chiqdimi yoki bir martalik yozuvdanmi. */
  source: 'rule' | 'exception';
  /** Bir martalik bo'sh vaqt yozuvi — katakni bosib o'chirish uchun. */
  exception_id: number | null;
  /** Shu soatni bloklab turgan yozuv — katakni bosib ochish uchun. */
  block_id: number | null;
};

export type ScheduleDay = { date: string; weekday: number; slots: ScheduleSlot[] };

export type AvailabilityRule = {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
};

export type ScheduleResponse = {
  from: string;
  to: string;
  days: number;
  timezone: string;
  rules: AvailabilityRule[];
  exceptions: Array<{
    id: number;
    date: string;
    start_time: string | null;
    end_time: string | null;
    /** `true` — bir martalik BO'SH vaqt, `false` — bloklangan vaqt. */
    is_available: boolean;
    slot_minutes: number;
    note: string;
  }>;
  calendar: ScheduleDay[];
};

export type DocumentKind = 'passport' | 'diploma' | 'certificate' | 'other';

/** Hujjat yuklash — multipart, shuning uchun `send` dan foydalanmaydi. */
export async function uploadTeacherDocument(
  token: string,
  kind: DocumentKind,
  file: File
): Promise<{ id: number; file_url: string; status: string }> {
  const fd = new FormData();
  fd.append('kind', kind);
  fd.append('file', file);
  const res = await fetch(apiUrl('/api/teacher/me/panel/documents'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Hujjat yuklanmadi');
  return data as { id: number; file_url: string; status: string };
}

export async function deleteTeacherDocument(token: string, id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/teacher/me/panel/documents/${id}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error || 'Oʻchirilmadi');
  }
}

/**
 * Video-taqdimotni yuklaydi (havola emas, faylning o'zi).
 *
 * `fetch` yuklash jarayonini ko'rsatmaydi, shuning uchun XHR: video katta
 * bo'ladi va o'qituvchi foizni ko'rib turishi kerak.
 */
export function uploadTeacherVideo(
  token: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ id: number; file_url: string; status: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/teacher/me/panel/video'));
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText) as { error?: string };
      } catch {
        /* javob JSON emas */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as unknown as { id: number; file_url: string; status: string });
      } else {
        reject(new Error(data.error || 'Video yuklanmadi'));
      }
    };
    xhr.onerror = () => reject(new Error('Video yuklanmadi'));
    xhr.send(form);
  });
}

export async function deleteTeacherVideo(token: string): Promise<void> {
  const res = await fetch(apiUrl('/api/teacher/me/panel/video'), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error || 'Oʻchirilmadi');
  }
}

export type AnketaStep = { step: number; title: string; fields: string[]; done: boolean };

export type TeacherProfileResponse = {
  profile: Record<string, unknown>;
  contact: { email: string | null; phone: string | null };
  /** Ro'yxat to'lovi holati — tekshiruvga yuborish shu bilan ochiladi. */
  payment?: {
    paid: boolean;
    paid_until: string | null;
    first_discount_used: boolean;
  };
  documents: Array<{
    id: number;
    kind: string;
    file_url: string;
    original_name: string;
    status: string;
    /** Moderator izohi (rad etilganda sabab). */
    admin_note?: string;
  }>;
  anketa: {
    steps: AnketaStep[];
    current_step: number;
    done_steps: number;
    total_steps: number;
    completion_percent: number;
    submitted_at: string | null;
  };
};

export function getTeacherProfile(token: string): Promise<TeacherProfileResponse> {
  return send<TeacherProfileResponse>(token, '/api/teacher/me/panel/profile', 'GET');
}

export function saveTeacherProfile(
  token: string,
  patch: Record<string, unknown>
): Promise<{ success: boolean; saved: string[] }> {
  return send(token, '/api/teacher/me/panel/profile', 'PUT', patch);
}

async function send<T>(token: string, path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Amal bajarilmadi');
  return data as T;
}

export function getSchedule(token: string, from: string, days = 7): Promise<ScheduleResponse> {
  return send<ScheduleResponse>(token, `/api/teacher/me/panel/schedule?from=${from}&days=${days}`, 'GET');
}

export function addAvailability(
  token: string,
  body: { weekday: number; start_time: string; end_time: string; slot_minutes: number }
): Promise<AvailabilityRule> {
  return send<AvailabilityRule>(token, '/api/teacher/me/panel/availability', 'POST', body);
}

export function removeAvailability(token: string, id: number): Promise<{ success: boolean }> {
  return send(token, `/api/teacher/me/panel/availability/${id}`, 'DELETE');
}

export function blockTime(
  token: string,
  body: { date: string; start_time?: string; end_time?: string; note?: string }
): Promise<{ id: number }> {
  return send(token, '/api/teacher/me/panel/availability/block', 'POST', body);
}

export function unblockTime(token: string, id: number): Promise<{ success: boolean }> {
  return send(token, `/api/teacher/me/panel/availability/block/${id}`, 'DELETE');
}

async function get<T>(token: string, path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Maʼlumot yuklanmadi');
  return data as T;
}

export function getPanelSummary(token: string): Promise<PanelSummary> {
  return get<PanelSummary>(token, '/api/teacher/me/panel/summary');
}

export function getPanelLessons(
  token: string,
  filter: LessonFilter
): Promise<{ filter: string; total: number; lessons: PanelLesson[] }> {
  return get(token, `/api/teacher/me/panel/lessons?filter=${filter}`);
}

export function getPanelStudents(
  token: string,
  filter: StudentFilter
): Promise<{
  filter: string;
  counts: Record<StudentFilter, number>;
  students: PanelStudent[];
}> {
  return get(token, `/api/teacher/me/panel/students?filter=${filter}`);
}

export type IncomeMonth = { month: string; trial_uzs: number; manual_uzs: number; total_uzs: number };
export type IncomeEntry = {
  id: number;
  source: string;
  student_name: string | null;
  amount_uzs: number;
  earned_on: string;
  note: string;
};
export type IncomeResponse = {
  months: IncomeMonth[];
  total_uzs: number;
  current_month: IncomeMonth | null;
  entries: IncomeEntry[];
  note: string;
};

export function getIncome(token: string, months = 6): Promise<IncomeResponse> {
  return send<IncomeResponse>(token, `/api/teacher/me/panel/income?months=${months}`, 'GET');
}

export function addIncome(
  token: string,
  body: { amount_uzs: number; earned_on: string; source?: string; note?: string }
): Promise<{ id: number }> {
  return send(token, '/api/teacher/me/panel/income', 'POST', body);
}

export function removeIncome(token: string, id: number): Promise<{ success: boolean }> {
  return send(token, `/api/teacher/me/panel/income/${id}`, 'DELETE');
}

/** Jadvaldagi so'nggi o'zgarish. Matn panelda (ikki tilda) tuziladi. */
export type ScheduleEvent = {
  type: 'booked' | 'cancelled' | 'open' | 'block' | 'rule';
  at: string;
  student_name?: string;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  weekday?: number;
};

export function getScheduleActivity(token: string): Promise<{ events: ScheduleEvent[] }> {
  return send(token, '/api/teacher/me/panel/schedule/activity', 'GET');
}

/** Bir martalik bo'sh vaqt — faqat shu sanaga, takrorlanmaydi. */
export function addOpenTime(
  token: string,
  body: { date: string; start_time: string; end_time: string; slot_minutes?: number }
): Promise<{ id: number }> {
  return send(token, '/api/teacher/me/panel/availability/open', 'POST', body);
}

/* ------------------------------ O'quvchi kartochkasi ------------------------------ */

export type StudentNote = { id: number; body: string; created_at: string };

export type StudentLesson = {
  trial_id: number;
  starts_at: string | null;
  status: string;
  created_at: string;
  duration_minutes: number;
  topic: string;
  has_report: boolean;
};

export type LessonReport = {
  topic: string;
  positives: string;
  negatives: string;
  difficulties: string;
  next_steps: string;
  teacher_comment: string;
  lesson_rating: number | null;
  determined_level: string | null;
  lesson_went_well: boolean | null;
  student_enrolled_monthly_course: boolean | null;
};

export type StudentDetail = {
  student: {
    user_id: number;
    name: string;
    level: string;
    status: 'active' | 'finished' | 'trial';
    first_seen_at: string | null;
    next_lesson_at: string | null;
  };
  stats: { total: number; done: number; cancelled: number; upcoming: number };
  lessons: StudentLesson[];
  reports: Array<LessonReport & { trial_lesson_id: number; created_at: string }>;
  notes: StudentNote[];
  conversation_id: number | null;
};

export function getStudentDetail(token: string, studentId: number): Promise<StudentDetail> {
  return send<StudentDetail>(token, `/api/teacher/me/panel/students/${studentId}`, 'GET');
}

export function addStudentNote(token: string, studentId: number, body: string): Promise<StudentNote> {
  return send<StudentNote>(token, `/api/teacher/me/panel/students/${studentId}/notes`, 'POST', {
    body,
  });
}

export function removeStudentNote(token: string, noteId: number): Promise<{ success: boolean }> {
  return send(token, `/api/teacher/me/panel/notes/${noteId}`, 'DELETE');
}

/* --------------------------------- Dars hisoboti --------------------------------- */

export type LessonReportResponse = {
  lesson: {
    trial_id: number;
    student_user_id: number;
    student_name: string;
    student_level: string;
    status: string;
    starts_at: string | null;
    duration_minutes: number;
  };
  report: LessonReport | null;
};

export function getLessonReport(token: string, trialId: number): Promise<LessonReportResponse> {
  return send<LessonReportResponse>(token, `/api/teacher/me/panel/lessons/${trialId}/report`, 'GET');
}

export function saveLessonReport(
  token: string,
  trialId: number,
  body: Partial<LessonReport> & { complete?: boolean }
): Promise<{ success: boolean; completed: boolean }> {
  return send(token, `/api/teacher/me/panel/lessons/${trialId}/report`, 'POST', body);
}

/* ------------------------------ Sharh va bildirishnoma ------------------------------ */

export type PanelReview = {
  id: number;
  student_name: string;
  rating: number;
  what_liked: string;
  what_was_missing: string;
  opinion: string;
  enrolled_monthly_course: boolean | null;
  created_at: string;
};

export type ReviewsResponse = {
  rating_avg: number;
  rating_count: number;
  breakdown: Record<string, number>;
  reviews: PanelReview[];
};

export function getPanelReviews(token: string): Promise<ReviewsResponse> {
  return send<ReviewsResponse>(token, '/api/teacher/me/panel/reviews', 'GET');
}

export type PanelNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function getPanelNotifications(
  token: string
): Promise<{ unread: number; notifications: PanelNotification[] }> {
  return send(token, '/api/teacher/me/panel/notifications', 'GET');
}

export function markNotificationsRead(token: string, id?: number): Promise<{ success: boolean }> {
  return send(token, '/api/teacher/me/panel/notifications/read', 'POST', id ? { id } : {});
}
