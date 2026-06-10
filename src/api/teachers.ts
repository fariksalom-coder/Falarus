import { apiUrl } from '../api';

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

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
  created_at: string;
  updated_at: string;
};

export type TeacherCabinet = {
  profile: TeacherProfile | null;
  trial_lessons: TeacherTrialLesson[];
  notifications: Array<Record<string, unknown>>;
  listing_subscriptions: Array<Record<string, unknown>>;
};

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
  planCode = 'teacher_listing_first_month_uzs',
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

export async function completeTeacherTrial(token: string, trialId: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/teacher/me/trial-lessons/${trialId}/complete`), {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Dars yakunlanmadi');
}
