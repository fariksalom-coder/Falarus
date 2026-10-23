import type { ScheduleData } from '../../shared/teacherOnboarding';
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
  /** Onboarding v2 da so'ralmaydi — eski profillarda bo'lishi mumkin. */
  age: number | null;
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
  /** Admin katalog tumbleri (migr. 214): tasdiqlangan, lekin hali ko'rinmasligi mumkin. */
  catalog_visible?: boolean;
  admin_note?: string | null;
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
  // ── Onboarding v2 ─────────────────────────────────────────────
  /** Bir dars narxi, so'm. */
  lesson_price_uzs?: number | null;
  /** Sertifikat hujjatlari admin tomonidan tekshirilgan. */
  certified_verified?: boolean;
  onboarding_path?: 'certified' | 'experienced' | null;
  birth_country?: string | null;
  proficiency?: string | null;
  /** Jadval o'qituvchining vaqt zonasida (weekday 1 = dushanba). */
  schedule?: ScheduleData | null;
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

