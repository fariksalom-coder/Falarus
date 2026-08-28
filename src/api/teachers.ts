import { apiUrl } from '../api';
import {
  TEACHER_LISTING_PLAN_MONTH,
  type TeacherListingPlanCode,
} from '../../shared/paymentProducts';

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** Ta'lim (qayerda o'qigan). */
export type TeacherEducation = {
  institution: string;
  specialty?: string;
  start_year?: string;
  end_year?: string;
};

/** Sertifikat / diplom. */
export type TeacherCertificate = {
  title: string;
  issuer?: string;
  year?: string;
  image_url?: string | null;
};

/** Haftalik bandlik: day = 0 (Yakshanba) .. 6 (Shanba), vaqt "HH:MM". */
export type TeacherAvailabilitySlot = {
  day: number;
  from: string;
  to: string;
};

export type TeacherProfile = {
  user_id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  age: number;
  avatar_url: string | null;
  region: string;
  city: string;
  experience_years: number;
  experience_months: number;
  teaching_format: 'online' | 'offline' | 'online_offline';
  headline: string;
  about: string;
  subjects: string[];
  teaching_levels: string[];
  languages: string[];
  monthly_course_price_amount: number;
  monthly_course_price_currency: string;
  telegram_username?: string | null;
  telegram_url?: string | null;
  whatsapp_phone_e164?: string | null;
  max_contact?: string | null;
  public_phone_e164?: string | null;
  public_email?: string | null;
  preferred_contact_method?: string | null;
  profile_status?: string;
  admin_note?: string | null;
  first_listing_discount_used?: boolean;
  listing_paid_until?: string | null;
  rating_avg?: number;
  rating_count?: number;
  created_at?: string;
  updated_at?: string;
  // ── Kengaytirilgan profil (yangi) ──────────────────────────────
  education?: TeacherEducation[];
  certificates?: TeacherCertificate[];
  achievements?: string;
  /** O'qituvchi tayyorlagan talabalar (o'zi kiritgan track-record). */
  students_total?: number;
  students_success?: number;
  students_failed?: number;
  /** Haftalik dars berish jadvali. */
  weekly_availability?: TeacherAvailabilitySlot[];
  /** FalaRus admin tomonidan tavsiya etilgan. */
  is_recommended?: boolean;
  /** Admin tasdiqlagan video-taqdimot (tasdiqlanmagani ko'rinmaydi). */
  video_url?: string | null;
  /** O'tilgan bepul darslar soni (3 tadan keyin listing to'lovi shart). */
  free_lessons_used?: number;
};

export type TeacherTrialLesson = {
  id: number;
  teacher_user_id: number;
  student_user_id: number;
  payment_id: number | null;
  requested_starts_at: string | null;
  scheduled_starts_at: string | null;
  status: string;
  student_phone_e164: string | null;
  student_email: string | null;
  student_message: string;
  scheduled_ends_at?: string | null;
  /** O'quvchi ismi — o'qituvchi kabinetida ko'rsatiladi. */
  student_name?: string;
  created_at: string;
  updated_at: string;
};

export type TeacherNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  read_at?: string | null;
  created_at: string;
};

export type TeacherCabinet = {
  profile: TeacherProfile | null;
  trial_lessons: TeacherTrialLesson[];
  notifications: TeacherNotification[];
  listing_subscriptions: Array<Record<string, unknown>>;
};

/** Chat suhbati. */
export type TeacherConversation = {
  id: number;
  trial_lesson_id: number | null;
  teacher_user_id: number;
  student_user_id: number;
  status: string;
  last_message_at: string | null;
  created_at: string;
};

/** Chat xabari. */
export type TeacherChatMessage = {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  content: string;
  created_at: string;
  read_at?: string | null;
};

export async function getTeacherConversations(token: string): Promise<TeacherConversation[]> {
  const res = await fetch(apiUrl('/api/teacher-chat'), { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Chatlar yuklanmadi');
  return data;
}

export async function getTeacherChatMessages(
  token: string,
  conversationId: number,
): Promise<TeacherChatMessage[]> {
  const res = await fetch(apiUrl(`/api/teacher-chat/${conversationId}/messages`), {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Xabarlar yuklanmadi');
  return data;
}

export async function sendTeacherChatMessage(
  token: string,
  conversationId: number,
  content: string,
): Promise<TeacherChatMessage> {
  const res = await fetch(apiUrl(`/api/teacher-chat/${conversationId}/messages`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Xabar yuborilmadi');
  return data;
}

export type TeacherStudentReview = {
  id: number;
  rating: number;
  what_liked: string;
  opinion: string;
  created_at: string;
};

export type TeacherPublicDetail = {
  profile: TeacherProfile;
  reviews: TeacherStudentReview[];
};

export async function listTeachers(): Promise<TeacherProfile[]> {
  const res = await fetch(apiUrl('/api/teachers'));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "O'qituvchilar yuklanmadi");
  return data;
}

/** Sertifikat rasmini yuklaydi, public URL qaytaradi. */
export async function uploadCertificateImage(token: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(apiUrl('/api/teacher/me/certificate-image'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Rasm yuklanmadi');
  return data.url as string;
}

export type TeacherReviewPayload = {
  rating: number;
  what_liked?: string;
  opinion?: string;
};

/** O'quvchi tugallangan sinov darsdan keyin sharh qoldiradi. */
export async function submitTeacherReview(
  token: string,
  trialId: number,
  payload: TeacherReviewPayload,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/teacher-trials/${trialId}/student-review`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Sharh saqlanmadi');
  }
}

export async function getTeacherPublicDetail(teacherId: number): Promise<TeacherPublicDetail> {
  const res = await fetch(apiUrl(`/api/teachers/${teacherId}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "O'qituvchi yuklanmadi");
  return data;
}

export type TeacherProfilePayload = Partial<TeacherProfile> & {
  first_name: string;
  last_name: string;
  age: number;
};

export async function getTeacherCabinet(token: string): Promise<TeacherCabinet> {
  const res = await fetch(apiUrl('/api/teacher/me'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "O'qituvchi kabineti yuklanmadi");
  return data;
}

export async function saveTeacherProfile(token: string, payload: TeacherProfilePayload): Promise<TeacherProfile> {
  const res = await fetch(apiUrl('/api/teacher/me/profile'), {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Anketa saqlanmadi');
  return data;
}

export async function createTeacherListingPayment(
  token: string,
  planCode: TeacherListingPlanCode = TEACHER_LISTING_PLAN_MONTH,
): Promise<{ payment: { id: number; amount: number; currency: string; status: string } }> {
  const res = await fetch(apiUrl('/api/teacher/me/listing-payment'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ plan_code: planCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "To'lov yaratilmadi");
  return data;
}

export type MyTeacherTrialLessonResponse = {
  trial: TeacherTrialLesson | null;
  payment: {
    id: number;
    status: string;
    currency: string;
    amount: number;
    payment_channel: string | null;
    created_at: string;
    product_code?: string;
    payment_proof_url?: string | null;
  } | null;
};

export async function getMyTeacherTrialLesson(
  token: string,
  teacherId: number,
): Promise<MyTeacherTrialLessonResponse> {
  const res = await fetch(apiUrl(`/api/teachers/${teacherId}/my-trial-lesson`), {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Sinov darsi yuklanmadi');
  return data;
}

export async function createTeacherTrialLesson(
  token: string,
  teacherId: number,
  body: {
    student_message?: string;
    requested_starts_at?: string;
    student_phone_e164?: string;
    student_email?: string;
  } = {},
): Promise<TeacherTrialLesson> {
  const res = await fetch(apiUrl(`/api/teachers/${teacherId}/trial-lessons`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Sinov darsi yaratilmadi');
  return data;
}

/** O'quvchi profilidagi "O'qituvchi bilan uchrashuv". */
export type StudentMeeting = {
  id: number;
  teacher_user_id: number;
  teacher_name: string;
  teacher_avatar_url: string | null;
  status: string;
  scheduled_starts_at: string | null;
  scheduled_ends_at: string | null;
  timezone: string;
  conversation_id: number | null;
  created_at: string;
};

/** O'quvchining barcha uchrashuvlari (sinov darslari). */
export async function getMyMeetings(token: string): Promise<StudentMeeting[]> {
  const res = await fetch(apiUrl('/api/my-meetings'), { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Uchrashuvlar yuklanmadi');
  return data;
}

/** Bepul davrда bir nechta (3 tagacha) dars vaqtini tanlab yozilish. */
export async function bookFreeLessons(
  token: string,
  teacherId: number,
  slots: string[],
): Promise<TeacherTrialLesson[]> {
  const res = await fetch(apiUrl(`/api/teachers/${teacherId}/trial-lessons`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ slots }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Darsga yozilmadi');
  return Array.isArray(data) ? data : [data];
}

/** O'quvchining sinov darslari — statistika paneli uchun. */
export type MyTrialItem = {
  trialId: number;
  teacherUserId: number;
  teacherName: string | null;
  teacherPhoto: string | null;
  monthlyPriceAmount: number | null;
  monthlyPriceCurrency: string;
  status: string;
  scheduledStartsAt: string | null;
  completedAt: string | null;
  /** Qachon yozilgan. */
  bookedAt: string | null;
  /** Ustoz bilan chat suhbati (bo'lmasa null). */
  conversationId: number | null;
};

export type MyTrialsResponse = {
  items: MyTrialItem[];
  used: number;
  limit: number;
  remaining: number;
};

export async function getMyTrialLessons(token: string): Promise<MyTrialsResponse> {
  const res = await fetch(apiUrl('/api/my/trial-lessons'), { headers: authHeaders(token) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Sinov darslari yuklanmadi');
  return data as MyTrialsResponse;
}
