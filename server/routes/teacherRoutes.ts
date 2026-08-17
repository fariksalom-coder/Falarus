import { Router, type Request, type Response } from 'express';
import type { DbClient } from '../types/dbClient';
import {
  getTeacherListingPriceUzs,
  isCurrencyCode,
  isTeacherListingPlanCode,
  resolveTeacherListingPlanCode,
} from '../../shared/paymentProducts.js';
import { formatDateInAppTimezone } from '../../shared/appDate.js';
import {
  STUDENT_TRIAL_TEACHER_LIMIT,
  activeTrialTeacherIds,
  checkTrialBooking,
  type TrialRowLike,
} from '../../shared/teacherTrials.js';
import {
  ENROLLED_TRIAL_STATUSES,
  MEET_DOMAIN,
  getEnrolledTeacherIds,
  isSessionJoinable,
  joinWindow,
  listSessionsForRooms,
  normalizeJoinUrl,
  resolveJoinAccess,
  resolveSessionAccess,
  type MeetRoom,
  type MeetSession,
} from '../services/teacherMeet.service.js';

const TRIAL_PRICE_RUB = 490;
const RUB_TO_UZS_RATE = 150;
const TRIAL_PRICE_UZS = TRIAL_PRICE_RUB * RUB_TO_UZS_RATE;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function teacherPublicSelect(): string {
  return [
    'user_id',
    'first_name',
    'last_name',
    'display_name',
    'age',
    'avatar_url',
    'region',
    'city',
    'experience_years',
    'experience_months',
    'teaching_format',
    'headline',
    'about',
    'subjects',
    'teaching_levels',
    'languages',
    'monthly_course_price_amount',
    'monthly_course_price_currency',
    'rating_avg',
    'rating_count',
    'listing_paid_until',
    'education',
    'certificates',
    'achievements',
    'students_total',
    'students_success',
    'students_failed',
    'weekly_availability',
    'is_recommended',
    'free_lessons_used',
    // Tasdiqlangan video-taqdimot (admin tasdiqlaganda to'ldiriladi).
    'video_url',
  ].join(', ');
}

/**
 * O'qituvchining BITTA profil sahifasi uchun tanlov.
 *
 * Ro'yxatdagi qisqa kartochkadan farqi — aloqa maydonlari qo'shiladi.
 * Ular ataylab faqat shu yerda: `/teachers` ro'yxati yuzlab profilni
 * qaytaradi va telefon/telegramni ommaviy yig'ib olishga yo'l ochmaslik
 * kerak. Tafsilot sahifasi bitta o'qituvchini beradi va u yerda aloqa
 * ma'lumoti sahifaning asosiy maqsadi.
 *
 * DIQQAT: bu ilgari VPS'da `sed` yamog'i sifatida yashardi
 * (`ensure_free_access.sh`), repoda esa yo'q edi — ya'ni har deploy uni
 * o'chirib yuborardi. 2026-08-17 da kodga ko'chirildi.
 */
function teacherDetailSelect(): string {
  return [
    teacherPublicSelect(),
    'telegram_url',
    'telegram_username',
    'public_phone_e164',
    'public_email',
    'preferred_contact_method',
  ].join(', ');
}

function teacherOwnerSelect(): string {
  return [
    teacherPublicSelect(),
    'telegram_username',
    'telegram_url',
    'whatsapp_phone_e164',
    'max_contact',
    'public_phone_e164',
    'public_email',
    'preferred_contact_method',
    'profile_status',
    'admin_note',
    'first_listing_discount_used',
    'created_at',
    'updated_at',
  ].join(', ');
}

/** Profil yozuvi borligi tekshirilgan o'qituvchilar (jarayon ichida keshlanadi). */
const PROFIL_BOR = new Set<number>();

/**
 * O'qituvchi profili yozuvini KAFOLATLAYDI.
 *
 * NEGA KERAK: jadval, bloklash, daromad, hujjat va eslatma jadvallari
 * `teacher_profiles(user_id)` ga tashqi kalit bilan bog'langan. Ro'yxatdan
 * o'tgan-u anketani hali to'ldirmagan o'qituvchida bu yozuv bo'lmaydi va
 * panelda har qanday saqlash "foreign key violation" bilan yiqiladi
 * (foydalanuvchiga shunchaki "saqlanmadi" bo'lib ko'rinadi).
 *
 * Yozuv `draft` holatida yaratiladi — o'quvchilar ro'yxatida ko'rinmaydi.
 */
async function ensureTeacherProfile(
  supabase: DbClient,
  user: { id: number; first_name?: unknown; last_name?: unknown }
): Promise<void> {
  if (PROFIL_BOR.has(user.id)) return;
  const { data } = await supabase
    .from('teacher_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) {
    const { error } = await supabase.from('teacher_profiles').insert({
      user_id: user.id,
      first_name: asString(user.first_name) || 'Oʻqituvchi',
      last_name: asString(user.last_name),
      // `age` NOT NULL (16..99). Haqiqiy yosh anketadagi tug'ilgan sanadan hisoblanadi.
      age: 18,
    });
    // Ikki so'rov bir vaqtda kelsa ikkinchisi "duplicate key" beradi — bu xato emas.
    if (error && !/duplicate key/i.test(String((error as { message?: string }).message ?? ''))) {
      throw error;
    }
  }
  PROFIL_BOR.add(user.id);
}

async function ensureTeacherAccount(supabase: DbClient, userId: number, res: Response): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id, account_type, first_name, last_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  const u = data as { account_type?: string; first_name?: string; last_name?: string } | null;
  if (u?.account_type !== 'teacher') {
    res.status(403).json({ error: "Bu kabinet faqat o'qituvchilar uchun" });
    return false;
  }
  await ensureTeacherProfile(supabase, {
    id: userId,
    first_name: u.first_name,
    last_name: u.last_name,
  });
  return true;
}

function normalizeTelegramUsername(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const username = raw.replace(/^@+/, '').replace(/\s+/g, '');
  return username || null;
}

/** "HH:MM" vaqt formatini tekshiradi. */
function isTimeStr(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

function sanitizeEducation(v: unknown): Array<Record<string, string>> {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 10)
    .map((it) => {
      const r = (it ?? {}) as Record<string, unknown>;
      const institution = asString(r.institution).slice(0, 200);
      if (!institution) return null;
      return {
        institution,
        specialty: asString(r.specialty).slice(0, 200),
        // Daraja: bakalavr, magistr, kollej, kurs va h.k.
        degree: asString(r.degree).slice(0, 60),
        start_year: asString(r.start_year).slice(0, 10),
        end_year: asString(r.end_year).slice(0, 10),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function sanitizeCertificates(v: unknown): Array<Record<string, string>> {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 20)
    .map((it) => {
      const r = (it ?? {}) as Record<string, unknown>;
      const title = asString(r.title).slice(0, 200);
      if (!title) return null;
      return {
        title,
        issuer: asString(r.issuer).slice(0, 200),
        year: asString(r.year).slice(0, 10),
        image_url: asString(r.image_url).slice(0, 500),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function sanitizeAvailability(v: unknown): Array<{ day: number; from: string; to: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 60)
    .map((it) => {
      const r = (it ?? {}) as Record<string, unknown>;
      const day = Number(r.day);
      if (!Number.isInteger(day) || day < 0 || day > 6) return null;
      if (!isTimeStr(r.from) || !isTimeStr(r.to) || r.to <= r.from) return null;
      return { day, from: r.from, to: r.to };
    })
    .filter((x): x is { day: number; from: string; to: string } => x !== null);
}

function normalizeTeacherProfilePayload(body: Record<string, unknown>, userId: number): Record<string, unknown> {
  const firstName = asString(body.first_name || body.firstName);
  const lastName = asString(body.last_name || body.lastName);
  const age = asNumber(body.age);
  const experienceYears = asNumber(body.experience_years ?? body.experienceYears) ?? 0;
  const experienceMonths = asNumber(body.experience_months ?? body.experienceMonths) ?? 0;
  const monthlyPrice = asNumber(body.monthly_course_price_amount ?? body.monthlyCoursePriceAmount) ?? 0;
  const monthlyCurrency = asString(body.monthly_course_price_currency ?? body.monthlyCoursePriceCurrency, 'UZS');
  const telegramUsername = normalizeTelegramUsername(asString(body.telegram_username ?? body.telegramUsername));
  const publicPhone = asString(body.public_phone_e164 ?? body.publicPhoneE164) || null;

  if (!firstName) throw new Error('Ism kiritilishi shart');
  if (!lastName) throw new Error('Familiya kiritilishi shart');
  if (!age || age < 16 || age > 99) throw new Error('Yosh 16–99 oralig‘ida bo‘lishi kerak');
  if (!isCurrencyCode(monthlyCurrency)) throw new Error('Valyuta noto‘g‘ri');
  if (!telegramUsername && !publicPhone) {
    throw new Error('Telegram username yoki telefon raqamini kiriting');
  }

  const preferredContact = telegramUsername ? 'telegram' : 'phone';
  const telegramUrl = telegramUsername ? `https://t.me/${telegramUsername}` : null;

  return {
    user_id: userId,
    first_name: firstName,
    last_name: lastName,
    age,
    region: asString(body.region),
    city: asString(body.city),
    experience_years: Math.max(0, experienceYears),
    experience_months: Math.min(11, Math.max(0, experienceMonths)),
    teaching_format: 'online',
    headline: '',
    about: asString(body.about),
    subjects: ['Rus tili'],
    teaching_levels: [],
    languages: ['uz', 'ru'],
    monthly_course_price_amount: Math.max(0, monthlyPrice),
    monthly_course_price_currency: monthlyCurrency,
    telegram_username: telegramUsername,
    telegram_url: telegramUrl,
    whatsapp_phone_e164: null,
    max_contact: null,
    public_phone_e164: publicPhone,
    public_email: null,
    preferred_contact_method: preferredContact,
    achievements: asString(body.achievements).slice(0, 4000),
    students_total: Math.max(0, asNumber(body.students_total) ?? 0),
    students_success: Math.max(0, asNumber(body.students_success) ?? 0),
    students_failed: Math.max(0, asNumber(body.students_failed) ?? 0),
    // jsonb ustunlar: pg JS massivni Postgres array deb yuboradi (obyektlarda buziladi) —
    // shuning uchun JSON string sifatida beramiz, pg uni jsonb'ga cast qiladi.
    education: JSON.stringify(sanitizeEducation(body.education)),
    certificates: JSON.stringify(sanitizeCertificates(body.certificates)),
    weekly_availability: JSON.stringify(sanitizeAvailability(body.weekly_availability)),
    updated_at: new Date().toISOString(),
  };
}

function resolveProfileStatusOnSave(
  existing: { profile_status?: string | null } | null
): string {
  const current = existing?.profile_status ?? 'draft';
  // Admin to'xtatgan/rad etgan bo'lsa — o'sha holat qoladi.
  if (current === 'paused' || current === 'rejected') {
    return current;
  }
  // Admin allaqachon tasdiqlagan bo'lsa (active) — anketa qayta saqlanganda ham faol qoladi.
  if (current === 'active') {
    return 'active';
  }
  // Yangi o'qituvchi: anketa saqlangach ADMIN TASDIG'INI kutadi. Admin "O'qituvchilar"
  // panelida "Tasdiqlash" bosgach active bo'ladi va ro'yxatда ko'rinadi (talabalar bilan aralashmaydi).
  return 'pending_review';
}

async function shareTrialContactsAndOpenChat(
  supabase: DbClient,
  trial: {
    id: number;
    teacher_user_id: number;
    student_user_id: number;
  },
  opts: { free?: boolean } = {}
): Promise<void> {
  const { data: profile } = await supabase
    .from('teacher_profiles')
    .select(
      'user_id, telegram_username, telegram_url, whatsapp_phone_e164, max_contact, public_phone_e164, public_email, preferred_contact_method'
    )
    .eq('user_id', trial.teacher_user_id)
    .maybeSingle();

  if (profile) {
    await supabase.from('teacher_trial_contacts_shared').upsert(
      {
        trial_lesson_id: trial.id,
        teacher_user_id: trial.teacher_user_id,
        student_user_id: trial.student_user_id,
        telegram_username: (profile as any).telegram_username ?? null,
        telegram_url: (profile as any).telegram_url ?? null,
        whatsapp_phone_e164: (profile as any).whatsapp_phone_e164 ?? null,
        max_contact: (profile as any).max_contact ?? null,
        public_phone_e164: (profile as any).public_phone_e164 ?? null,
        public_email: (profile as any).public_email ?? null,
        preferred_contact_method: (profile as any).preferred_contact_method ?? null,
        shared_at: new Date().toISOString(),
      },
      { onConflict: 'trial_lesson_id' }
    );
  }

  // teacher_conversations'da trial_lesson_id ustidagi unikal indeks PARTIAL
  // (WHERE trial_lesson_id IS NOT NULL), shu sabab ON CONFLICT mos kelmaydi va
  // upsert jimgina uzilib qolardi (chat hech qachon ochilmasdi). Shuning uchun
  // qo'lda select-then-insert qilamiz.
  const nowChat = new Date().toISOString();
  const { data: existingConvo } = await supabase
    .from('teacher_conversations')
    .select('id')
    .eq('trial_lesson_id', trial.id)
    .maybeSingle();
  if (existingConvo) {
    await supabase
      .from('teacher_conversations')
      .update({ status: 'active', updated_at: nowChat })
      .eq('id', Number((existingConvo as { id: number }).id));
  } else {
    await supabase.from('teacher_conversations').insert({
      trial_lesson_id: trial.id,
      teacher_user_id: trial.teacher_user_id,
      student_user_id: trial.student_user_id,
      status: 'active',
      updated_at: nowChat,
    });
  }

  await supabase.from('teacher_notifications').insert({
    recipient_user_id: trial.teacher_user_id,
    type: 'trial_lesson_paid',
    title: 'Yangi sinov darsi',
    body: opts.free
      ? 'Yangi o‘quvchi bepul sinov darsiga yozildi. U bilan bog‘laning.'
      : 'O‘quvchi sinov darsi uchun to‘lov qildi. U bilan bog‘laning.',
    entity_type: 'teacher_trial_lesson',
    entity_id: trial.id,
  });
}

export async function activateTeacherTrialPayment(
  supabase: DbClient,
  paymentId: number
): Promise<void> {
  const { data: trial } = await supabase
    .from('teacher_trial_lessons')
    .select('id, teacher_user_id, student_user_id, status')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (!trial) return;

  const trialId = Number((trial as any).id);
  const teacherUserId = Number((trial as any).teacher_user_id);
  const studentUserId = Number((trial as any).student_user_id);
  const now = new Date().toISOString();

  await supabase
    .from('teacher_trial_lessons')
    .update({
      status: 'paid',
      contact_shared_at: now,
      teacher_notified_at: now,
      updated_at: now,
    })
    .eq('id', trialId);

  await shareTrialContactsAndOpenChat(supabase, {
    id: trialId,
    teacher_user_id: teacherUserId,
    student_user_id: studentUserId,
  });
}


export function createTeacherRoutes(
  supabase: DbClient,
  authenticate: (req: Request, res: Response, next: () => void) => void
): Router {
  const router = Router();

  router.get('/teachers', async (req, res) => {
    try {
      const search = asString(req.query.q);
      let query = supabase
        .from('teacher_profiles')
        .select(teacherPublicSelect())
        .eq('profile_status', 'active')
        .order('created_at', { ascending: true })
        .limit(200);
      if (search) {
        query = query.ilike('display_name', `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      /*
        IKKI SHART HAM BAJARILISHI SHART:
          1) admin profilni tasdiqlagan (`profile_status = 'active'`),
          2) listing to'lovi amalda (`listing_paid_until` kelajakda).

        Ilgari bu yerda «3 ta bepul dars» istisnosi bor edi: `free_lessons_used < 3`
        YOKI to'langan. `free_lessons_used` sukut bo'yicha 0 bo'lgani uchun
        o'qituvchi hech qachon to'lamasdan ham ro'yxatga tushardi, to'lov muddati
        tugaganlar esa ro'yxatda qolib ketardi.
      */
      const now = Date.now();
      const visible = ((data ?? []) as any[])
        .filter((tt) => tt.listing_paid_until && new Date(tt.listing_paid_until).getTime() > now)
        .slice(0, 50);
      res.json(visible);
    } catch (e) {
      console.error('[GET /api/teachers]', e);
      res.status(500).json({ error: 'O‘qituvchilar yuklanmadi' });
    }
  });

  router.get('/teachers/:teacherId', async (req, res) => {
    try {
      const teacherId = Number(req.params.teacherId);
      if (!Number.isFinite(teacherId)) return res.status(400).json({ error: 'teacherId noto‘g‘ri' });
      const [{ data: profile, error }, { data: reviews }] = await Promise.all([
        supabase
          .from('teacher_profiles')
          .select(teacherDetailSelect())
          .eq('user_id', teacherId)
          .eq('profile_status', 'active')
          .maybeSingle(),
        supabase
          .from('teacher_student_reviews')
          .select('id, rating, what_liked, opinion, created_at')
          .eq('teacher_user_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (error) throw error;
      if (!profile) return res.status(404).json({ error: 'O‘qituvchi topilmadi' });
      /*
        Ochiq sahifada ham ro'yxatdagi shartlar amal qiladi. Ilgari bu yerda
        hech qanday filtr yo'q edi: to'g'ridan-to'g'ri havola bilan `draft`,
        `pending_review` yoki admin RAD ETGAN profil ham ochilaverardi.
      */
      const paidUntil = (profile as any).listing_paid_until;
      if (!paidUntil || new Date(paidUntil).getTime() <= Date.now()) {
        return res.status(404).json({ error: 'O‘qituvchi topilmadi' });
      }
      res.json({ profile, reviews: reviews ?? [] });
    } catch (e) {
      console.error('[GET /api/teachers/:teacherId]', e);
      res.status(500).json({ error: 'O‘qituvchi yuklanmadi' });
    }
  });

  router.get('/teacher/me', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, userId, res))) return;
      const [profileRes, lessonsRes, notificationsRes, subscriptionsRes] = await Promise.all([
        supabase.from('teacher_profiles').select(teacherOwnerSelect()).eq('user_id', userId).maybeSingle(),
        supabase
          .from('teacher_trial_lessons')
          .select('*')
          .eq('teacher_user_id', userId)
          .neq('status', 'pending_payment')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('teacher_notifications')
          .select('*')
          .eq('recipient_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('teacher_listing_subscriptions')
          .select('*')
          .eq('teacher_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (lessonsRes.error) throw lessonsRes.error;
      if (notificationsRes.error) throw notificationsRes.error;
      if (subscriptionsRes.error) throw subscriptionsRes.error;

      // Har bir sinov darsiga o'quvchi ismini biriktiramiz (kabinetда ko'rinadi).
      const lessons = (lessonsRes.data as any[]) ?? [];
      const studentIds = Array.from(new Set(lessons.map((l) => Number(l.student_user_id))));
      const studentNames = new Map<number, string>();
      await Promise.all(
        studentIds.map(async (sid) => {
          const { data: u } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', sid)
            .maybeSingle();
          if (u) {
            const nm = `${(u as any).first_name ?? ''} ${(u as any).last_name ?? ''}`.trim();
            studentNames.set(sid, nm || 'O‘quvchi');
          }
        })
      );
      const enrichedLessons = lessons.map((l) => ({
        ...l,
        student_name: studentNames.get(Number(l.student_user_id)) ?? 'O‘quvchi',
      }));

      res.json({
        profile: profileRes.data ?? null,
        trial_lessons: enrichedLessons,
        notifications: notificationsRes.data ?? [],
        listing_subscriptions: subscriptionsRes.data ?? [],
      });
    } catch (e) {
      console.error('[GET /api/teacher/me]', e);
      res.status(500).json({ error: 'Kabinet yuklanmadi' });
    }
  });

  router.put('/teacher/me/profile', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, userId, res))) return;
      const payload = normalizeTeacherProfilePayload(req.body ?? {}, userId);
      const { data: existing } = await supabase
        .from('teacher_profiles')
        .select('avatar_url, profile_status, listing_paid_until')
        .eq('user_id', userId)
        .maybeSingle();
      if ((existing as { avatar_url?: string | null } | null)?.avatar_url) {
        (payload as Record<string, unknown>).avatar_url = (existing as { avatar_url: string }).avatar_url;
      } else {
        const { data: userRow } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', userId)
          .maybeSingle();
        const userAvatar = (userRow as { avatar_url?: string | null } | null)?.avatar_url;
        if (userAvatar) (payload as Record<string, unknown>).avatar_url = userAvatar;
      }
      (payload as Record<string, unknown>).profile_status = resolveProfileStatusOnSave(
        existing as { profile_status?: string | null; listing_paid_until?: string | null } | null
      );
      const { data, error } = await supabase
        .from('teacher_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select(teacherOwnerSelect())
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Profil saqlanmadi';
      res.status(400).json({ error: message });
    }
  });

  router.post('/teacher/me/listing-payment', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, userId, res))) return;
      const planCodeRaw = req.body?.plan_code || req.body?.planCode;
      const planCode = isTeacherListingPlanCode(planCodeRaw)
        ? planCodeRaw
        : resolveTeacherListingPlanCode(false);
      const { data: profile } = await supabase
        .from('teacher_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (!profile) return res.status(400).json({ error: 'Avval o‘qituvchi anketasini to‘ldiring' });

      const { data: plan, error: planErr } = await supabase
        .from('teacher_listing_plans')
        .select('code')
        .eq('code', planCode)
        .eq('is_active', true)
        .maybeSingle();
      if (planErr) throw planErr;
      if (!plan) return res.status(404).json({ error: 'Tarif topilmadi' });

      /*
       * Summa BAZADAN emas, koddan olinadi. `teacher_listing_plans.price_amount`
       * tarixan drift qilgan (birinchi oy kodi 69 000 bo'lib qolgan edi), va u
       * admin SQL konsoli orqali o'zgartirilishi ham mumkin. Narxning yagona
       * manbasi — shared/paymentProducts.ts. Rahmat va chek oqimlari ham
       * aynan shu funksiyadan oladi, shuning uchun uchala yo'lda summa bir xil.
       */
      const amount = getTeacherListingPriceUzs(planCode);
      const currency = 'UZS';
      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          tariff_type: null,
          product_code: 'teacher_listing',
          currency,
          amount,
          base_amount: amount,
          discount_amount: 0,
          payment_time: new Date().toISOString(),
          status: 'pending',
          payment_channel: 'manual',
        })
        .select('id, amount, currency, status')
        .single();
      if (payErr || !payment) throw payErr ?? new Error('To‘lov yaratilmadi');

      const { data: subscription, error: subErr } = await supabase
        .from('teacher_listing_subscriptions')
        .insert({
          teacher_user_id: userId,
          payment_id: Number((payment as any).id),
          plan_code: planCode,
          status: 'pending',
        })
        .select('*')
        .single();
      if (subErr) throw subErr;

      res.status(201).json({ payment, subscription });
    } catch (e) {
      console.error('[POST /api/teacher/me/listing-payment]', e);
      res.status(500).json({ error: 'To‘lov yaratilmadi' });
    }
  });

  /**
   * O'quvchining BARCHA sinov darslari + hisob.
   *
   * Qoida: bitta o'quvchi eng ko'pi UCHTA turli ustozdan bittadan sinov darsi
   * oladi, so'ng ulardan BIRINI tanlab oylik kursga to'lov qiladi. Shu sababli
   * bu yerda ham ro'yxat, ham "nechta qoldi" qaytariladi — interfeys shundan
   * quriladi.
   */
  router.get('/my/trial-lessons', authenticate, async (req: any, res) => {
    try {
      const studentId = Number(req.userId);
      const { data: rows, error } = await supabase
        .from('teacher_trial_lessons')
        .select('*')
        .eq('student_user_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Bekor qilinganlar ro'yxatga ham kirmaydi. To'lovi kutilayotganlar
      // KO'RINADI (o'quvchi holatni bilishi kerak), lekin `used` ga
      // qo'shilmaydi — sanash qoidasi `shared/teacherTrials.ts` da.
      const list = ((rows as any[]) ?? []).filter(
        (t) => !String(t.status ?? '').includes('cancel'),
      );

      // Bitta ustoz bir necha marta yozilgan bo'lsa ham — u BITTA hisoblanadi.
      const byTeacher = new Map<number, any>();
      for (const t of list) {
        const id = Number(t.teacher_user_id);
        if (!byTeacher.has(id)) byTeacher.set(id, t);
      }
      const teacherIds = [...byTeacher.keys()];

      let teachers: Record<number, any> = {};
      if (teacherIds.length > 0) {
        const { data: profs } = await supabase
          .from('teacher_profiles')
          .select(
            'user_id, display_name, first_name, last_name, avatar_url, monthly_course_price_amount, monthly_course_price_currency',
          )
          .in('user_id', teacherIds);
        for (const p of ((profs as any[]) ?? [])) teachers[Number(p.user_id)] = p;
      }

      // Chat suhbatlari: «Suhbat» tugmasi to'g'ridan-to'g'ri ochilishi uchun
      // har bir sinov darsining suhbat id'si birga qaytariladi.
      const { data: convos } = await supabase
        .from('teacher_conversations')
        .select('id, trial_lesson_id, teacher_user_id')
        .eq('student_user_id', studentId);
      const convoByTrial = new Map<number, number>();
      const convoByTeacher = new Map<number, number>();
      for (const c of ((convos as any[]) ?? [])) {
        if (c.trial_lesson_id != null) convoByTrial.set(Number(c.trial_lesson_id), Number(c.id));
        if (c.teacher_user_id != null && !convoByTeacher.has(Number(c.teacher_user_id))) {
          convoByTeacher.set(Number(c.teacher_user_id), Number(c.id));
        }
      }

      const items = teacherIds.map((id) => {
        const t = byTeacher.get(id);
        const prof = teachers[id] ?? {};
        // Ism: display_name yo'q bo'lsa — first/last name dan yig'iladi.
        const fallbackName = [prof.first_name, prof.last_name].filter(Boolean).join(' ').trim();
        return {
          trialId: Number(t.id),
          teacherUserId: id,
          teacherName: prof.display_name || fallbackName || null,
          teacherPhoto: prof.avatar_url ?? null,
          monthlyPriceAmount: prof.monthly_course_price_amount ?? null,
          monthlyPriceCurrency: prof.monthly_course_price_currency ?? 'UZS',
          status: String(t.status ?? ''),
          scheduledStartsAt: t.scheduled_starts_at ?? t.requested_starts_at ?? null,
          completedAt: t.completed_at ?? t.completed_by_teacher_at ?? null,
          bookedAt: t.created_at ?? null,
          conversationId: convoByTrial.get(Number(t.id)) ?? convoByTeacher.get(id) ?? null,
        };
      });

      const used = activeTrialTeacherIds(((rows as any[]) ?? []) as TrialRowLike[]).length;
      res.json({
        items,
        used,
        limit: STUDENT_TRIAL_TEACHER_LIMIT,
        remaining: Math.max(0, STUDENT_TRIAL_TEACHER_LIMIT - used),
      });
    } catch (e) {
      console.error('[GET /api/my/trial-lessons]', e);
      res.status(500).json({ error: 'Sinov darslari yuklanmadi' });
    }
  });

  router.get('/teachers/:teacherId/my-trial-lesson', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.params.teacherId);
      const studentId = Number(req.userId);
      if (!Number.isFinite(teacherId)) return res.status(400).json({ error: 'teacherId noto‘g‘ri' });

      const { data: trial, error } = await supabase
        .from('teacher_trial_lessons')
        .select('*')
        .eq('teacher_user_id', teacherId)
        .eq('student_user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!trial) return res.json({ trial: null, payment: null });

      let payment: Record<string, unknown> | null = null;
      const paymentId = (trial as { payment_id?: number | null }).payment_id;
      if (paymentId) {
        const payRes = await supabase
          .from('payments')
          .select('id, status, currency, amount, payment_channel, created_at, product_code, payment_proof_url')
          .eq('id', Number(paymentId))
          .maybeSingle();
        if (payRes.error) throw payRes.error;
        payment = (payRes.data as Record<string, unknown> | null) ?? null;
      }

      res.json({ trial, payment });
    } catch (e) {
      console.error('[GET /api/teachers/:teacherId/my-trial-lesson]', e);
      res.status(500).json({ error: 'Sinov darsi yuklanmadi' });
    }
  });

  // O'quvchining barcha uchrashuvlari (sinov darslari) — profil sahifasi uchun.
  router.get('/my-meetings', authenticate, async (req: any, res) => {
    try {
      const studentId = Number(req.userId);
      const { data: trials, error } = await supabase
        .from('teacher_trial_lessons')
        .select(
          'id, teacher_user_id, status, requested_starts_at, scheduled_starts_at, scheduled_ends_at, timezone, student_message, created_at'
        )
        .eq('student_user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (trials as any[]) ?? [];
      if (rows.length === 0) return res.json([]);

      // O'qituvchi ma'lumotlari + chat suhbat id.
      const teacherIds = Array.from(new Set(rows.map((r) => Number(r.teacher_user_id))));
      const profiles = await Promise.all(
        teacherIds.map(async (tid) => {
          const { data } = await supabase
            .from('teacher_profiles')
            .select('user_id, first_name, last_name, avatar_url')
            .eq('user_id', tid)
            .maybeSingle();
          return data as any;
        })
      );
      const byTeacher = new Map<number, any>();
      profiles.filter(Boolean).forEach((p) => byTeacher.set(Number(p.user_id), p));

      const { data: convos } = await supabase
        .from('teacher_conversations')
        .select('id, trial_lesson_id')
        .eq('student_user_id', studentId);
      const convoByTrial = new Map<number, number>();
      ((convos as any[]) ?? []).forEach((c) => {
        if (c.trial_lesson_id != null) convoByTrial.set(Number(c.trial_lesson_id), Number(c.id));
      });

      const meetings = rows.map((r) => {
        const p = byTeacher.get(Number(r.teacher_user_id));
        const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : 'O‘qituvchi';
        return {
          id: Number(r.id),
          teacher_user_id: Number(r.teacher_user_id),
          teacher_name: name || 'O‘qituvchi',
          teacher_avatar_url: p?.avatar_url ?? null,
          status: r.status,
          scheduled_starts_at: r.scheduled_starts_at ?? r.requested_starts_at ?? null,
          scheduled_ends_at: r.scheduled_ends_at ?? null,
          timezone: r.timezone ?? 'Asia/Tashkent',
          conversation_id: convoByTrial.get(Number(r.id)) ?? null,
          created_at: r.created_at,
        };
      });
      res.json(meetings);
    } catch (e) {
      console.error('[GET /api/my-meetings]', e);
      res.status(500).json({ error: 'Uchrashuvlar yuklanmadi' });
    }
  });

  router.post('/teachers/:teacherId/trial-lessons', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.params.teacherId);
      const studentId = Number(req.userId);
      if (!Number.isFinite(teacherId) || teacherId === studentId) {
        return res.status(400).json({ error: 'O‘qituvchi noto‘g‘ri' });
      }
      const { data: teacher } = await supabase
        .from('teacher_profiles')
        .select('user_id, profile_status, listing_paid_until, free_lessons_used')
        .eq('user_id', teacherId)
        .maybeSingle();
      if (!teacher) return res.status(404).json({ error: 'O‘qituvchi topilmadi' });

      const nowIso = new Date().toISOString();
      // Bepul davr: o'qituvchining birinchi 3 darsi o'quvchi uchun ham BEPUL.
      const freeUsed = Number((teacher as any).free_lessons_used ?? 0);
      const inFreePeriod = freeUsed < 3;
      const listingActive =
        !!(teacher as any).listing_paid_until &&
        String((teacher as any).listing_paid_until) > nowIso;
      // Dars bron qilish uchun ham ikkala shart kerak: admin tasdig'i va to'langan
      // listing. `inFreePeriod` endi faqat NARXGA ta'sir qiladi (dastlabki 3 dars
      // o'quvchi uchun bepul), ro'yxatda turishga emas.
      if ((teacher as any).profile_status !== 'active' || !listingActive) {
        return res.status(403).json({ error: 'O‘qituvchi hozir ro‘yxatda faol emas' });
      }

      // Cheklov: o'quvchi eng ko'pi 3 ta TURLI ustozdan sinov darsi oladi.
      // Qoidaning o'zi `shared/teacherTrials.ts` da — u yerda testlangan.
      const { data: myTrials } = await supabase
        .from('teacher_trial_lessons')
        .select('teacher_user_id, status')
        .eq('student_user_id', studentId);
      const trialCheck = checkTrialBooking({
        existingRows: ((myTrials as any[]) ?? []) as TrialRowLike[],
        teacherId,
      });
      if (!trialCheck.allowed) {
        return res.status(409).json({
          error: trialCheck.message,
          code: 'TRIAL_TEACHER_LIMIT',
          limit: STUDENT_TRIAL_TEACHER_LIMIT,
        });
      }

      const { data: existingTrial } = await supabase
        .from('teacher_trial_lessons')
        .select('*')
        .eq('teacher_user_id', teacherId)
        .eq('student_user_id', studentId)
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const studentMessage = asString(req.body?.student_message || req.body?.studentMessage);
      if (existingTrial) {
        if (studentMessage) {
          await supabase
            .from('teacher_trial_lessons')
            .update({ student_message: studentMessage, updated_at: new Date().toISOString() })
            .eq('id', Number((existingTrial as { id: number }).id));
          (existingTrial as { student_message?: string }).student_message = studentMessage;
        }
        return res.status(200).json(existingTrial);
      }

      // O'quvchi tanlagan dars vaqti (uchrashuv). scheduled_ends_at = boshlanish + 1 soat.
      const reqStart = asString(req.body?.requested_starts_at || req.body?.requestedStartsAt) || null;
      let schedStart: string | null = null;
      let schedEnd: string | null = null;
      if (reqStart) {
        const d = new Date(reqStart);
        if (!Number.isNaN(d.getTime())) {
          schedStart = d.toISOString();
          schedEnd = new Date(d.getTime() + 60 * 60 * 1000).toISOString();
        }
      }

      // Bepul davr: HAR BIR o'quvchi 1 ta bepul dars oladi (3 ta bepul dars = 3 xil o'quvchi).
      // O'quvchi 1 ta dars vaqtini tanlaydi. free_lessons_used shu yerda (band qilinganda) oshadi.
      if (inFreePeriod) {
        // Tanlangan vaqt: slots[] ning birinchisi yoki requested_starts_at.
        const rawSlots: unknown[] = Array.isArray(req.body?.slots)
          ? req.body.slots
          : schedStart
            ? [schedStart]
            : [];
        const chosenIso =
          rawSlots
            .map((s) => {
              const d = new Date(String(s));
              return Number.isNaN(d.getTime()) ? null : d.toISOString();
            })
            .find((x): x is string => x !== null) ?? null;
        const chosenEnd = chosenIso ? new Date(new Date(chosenIso).getTime() + 60 * 60 * 1000).toISOString() : null;

        // O'quvchining shu ustoz bilan mavjud (bekor qilinmagan) darsi bormi?
        const { data: existingRows } = await supabase
          .from('teacher_trial_lessons')
          .select('*')
          .eq('teacher_user_id', teacherId)
          .eq('student_user_id', studentId)
          .order('created_at', { ascending: false });
        const existing = ((existingRows as any[]) ?? []).find(
          (t) => String(t.status) !== 'pending_payment' && !String(t.status).includes('cancel')
        );

        const nowStamp = new Date().toISOString();

        // Allaqachon bepul darsi bor — yangisini yaratmaymiz (1 o'quvchi = 1 dars). Vaqtni yangilaymiz.
        if (existing) {
          const patch: Record<string, unknown> = { updated_at: nowStamp };
          if (studentMessage) patch.student_message = studentMessage;
          if (chosenIso) {
            patch.requested_starts_at = chosenIso;
            patch.scheduled_starts_at = chosenIso;
            patch.scheduled_ends_at = chosenEnd;
          }
          await supabase.from('teacher_trial_lessons').update(patch).eq('id', Number(existing.id));
          Object.assign(existing, patch);
          await shareTrialContactsAndOpenChat(
            supabase,
            { id: Number(existing.id), teacher_user_id: teacherId, student_user_id: studentId },
            { free: true }
          );
          return res.status(200).json([existing]);
        }

        // Yangi bepul dars (1 ta) + o'qituvchining bepul hisoblagichini +1.
        const { data: freeTrial, error: freeErr } = await supabase
          .from('teacher_trial_lessons')
          .insert({
            teacher_user_id: teacherId,
            student_user_id: studentId,
            requested_starts_at: chosenIso,
            scheduled_starts_at: chosenIso,
            scheduled_ends_at: chosenEnd,
            student_phone_e164: asString(req.body?.student_phone_e164 || req.body?.studentPhoneE164) || null,
            student_email: asString(req.body?.student_email || req.body?.studentEmail) || null,
            student_message: studentMessage,
            price_rub_snapshot: 0,
            rub_to_uzs_rate_snapshot: RUB_TO_UZS_RATE,
            price_uzs_snapshot: 0,
            status: 'paid',
            contact_shared_at: nowStamp,
            teacher_notified_at: nowStamp,
          })
          .select('*')
          .single();
        if (freeErr) throw freeErr;

        await supabase
          .from('teacher_profiles')
          .update({ free_lessons_used: freeUsed + 1, updated_at: nowStamp })
          .eq('user_id', teacherId);

        await shareTrialContactsAndOpenChat(
          supabase,
          { id: Number((freeTrial as { id: number }).id), teacher_user_id: teacherId, student_user_id: studentId },
          { free: true }
        );
        return res.status(201).json([freeTrial]);
      }

      const { data, error } = await supabase
        .from('teacher_trial_lessons')
        .insert({
          teacher_user_id: teacherId,
          student_user_id: studentId,
          requested_starts_at: asString(req.body?.requested_starts_at || req.body?.requestedStartsAt) || null,
          student_phone_e164: asString(req.body?.student_phone_e164 || req.body?.studentPhoneE164) || null,
          student_email: asString(req.body?.student_email || req.body?.studentEmail) || null,
          student_message: studentMessage,
          price_rub_snapshot: TRIAL_PRICE_RUB,
          rub_to_uzs_rate_snapshot: RUB_TO_UZS_RATE,
          price_uzs_snapshot: TRIAL_PRICE_UZS,
          status: 'pending_payment',
        })
        .select('*')
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (e) {
      console.error('[POST /api/teachers/:teacherId/trial-lessons]', e);
      res.status(500).json({ error: 'Sinov darsi yaratilmadi' });
    }
  });

  router.post('/teacher-trials/:trialId/payment', authenticate, async (req: any, res) => {
    try {
      const trialId = Number(req.params.trialId);
      const userId = Number(req.userId);
      const currencyRaw = asString(req.body?.currency, 'UZS');
      const currency = isCurrencyCode(currencyRaw) ? currencyRaw : 'UZS';
      const amount = currency === 'RUB' ? TRIAL_PRICE_RUB : TRIAL_PRICE_UZS;
      const { data: trial } = await supabase
        .from('teacher_trial_lessons')
        .select('id, student_user_id, payment_id, status')
        .eq('id', trialId)
        .eq('student_user_id', userId)
        .maybeSingle();
      if (!trial) return res.status(404).json({ error: 'Sinov darsi topilmadi' });
      if ((trial as any).payment_id) return res.status(400).json({ error: 'Bu dars uchun to‘lov allaqachon yaratilgan' });

      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          tariff_type: null,
          product_code: 'teacher_trial',
          currency,
          amount,
          base_amount: amount,
          discount_amount: 0,
          payment_time: new Date().toISOString(),
          status: 'pending',
          payment_channel: 'manual',
        })
        .select('id, amount, currency, status')
        .single();
      if (payErr || !payment) throw payErr ?? new Error('To‘lov yaratilmadi');

      await supabase
        .from('teacher_trial_lessons')
        .update({
          payment_id: Number((payment as any).id),
          paid_currency: currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trialId);

      res.status(201).json({ payment_id: Number((payment as any).id), amount, currency });
    } catch (e) {
      console.error('[POST /api/teacher-trials/:trialId/payment]', e);
      res.status(500).json({ error: 'To‘lov yaratilmadi' });
    }
  });

  router.get('/teacher-trials/:trialId/contact', authenticate, async (req: any, res) => {
    try {
      const trialId = Number(req.params.trialId);
      const userId = Number(req.userId);
      const { data } = await supabase
        .from('teacher_trial_contacts_shared')
        .select('*')
        .eq('trial_lesson_id', trialId)
        .eq('student_user_id', userId)
        .maybeSingle();
      if (!data) return res.status(404).json({ error: 'Kontaktlar faqat to‘lovdan keyin ochiladi' });
      res.json(data);
    } catch (e) {
      console.error('[GET /api/teacher-trials/:trialId/contact]', e);
      res.status(500).json({ error: 'Kontaktlar yuklanmadi' });
    }
  });

  router.get('/teacher-chat', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const { data, error } = await supabase
        .from('teacher_conversations')
        .select('*')
        .or(`teacher_user_id.eq.${userId},student_user_id.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      res.json(data ?? []);
    } catch (e) {
      console.error('[GET /api/teacher-chat]', e);
      res.status(500).json({ error: 'Chatlar yuklanmadi' });
    }
  });

  router.get('/teacher-chat/:conversationId/messages', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const conversationId = Number(req.params.conversationId);
      const { data: convo } = await supabase
        .from('teacher_conversations')
        .select('id, teacher_user_id, student_user_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (!convo || ![Number((convo as any).teacher_user_id), Number((convo as any).student_user_id)].includes(userId)) {
        return res.status(404).json({ error: 'Chat topilmadi' });
      }
      const { data, error } = await supabase
        .from('teacher_conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      res.json(data ?? []);
    } catch (e) {
      console.error('[GET /api/teacher-chat/:conversationId/messages]', e);
      res.status(500).json({ error: 'Xabarlar yuklanmadi' });
    }
  });

  router.post('/teacher-chat/:conversationId/messages', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const conversationId = Number(req.params.conversationId);
      const content = asString(req.body?.content);
      if (!content) return res.status(400).json({ error: 'Xabar bo‘sh bo‘lmasin' });

      const { data: convo } = await supabase
        .from('teacher_conversations')
        .select('id, teacher_user_id, student_user_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (!convo || ![Number((convo as any).teacher_user_id), Number((convo as any).student_user_id)].includes(userId)) {
        return res.status(404).json({ error: 'Chat topilmadi' });
      }

      const { data, error } = await supabase
        .from('teacher_conversation_messages')
        .insert({ conversation_id: conversationId, sender_user_id: userId, content })
        .select('*')
        .single();
      if (error) throw error;
      await supabase
        .from('teacher_conversations')
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      res.status(201).json(data);
    } catch (e) {
      console.error('[POST /api/teacher-chat/:conversationId/messages]', e);
      res.status(500).json({ error: 'Xabar yuborilmadi' });
    }
  });

  router.patch('/teacher/me/trial-lessons/:trialId/complete', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, userId, res))) return;
      const trialId = Number(req.params.trialId);
      const now = new Date().toISOString();
      const { data: trial } = await supabase
        .from('teacher_trial_lessons')
        .select('id, teacher_user_id, student_user_id, status')
        .eq('id', trialId)
        .eq('teacher_user_id', userId)
        .maybeSingle();
      if (!trial) return res.status(404).json({ error: 'Dars topilmadi' });
      if (String((trial as { status?: string }).status) === 'pending_payment') {
        return res.status(400).json({ error: "To'lov tasdiqlangach darsni yakunlash mumkin" });
      }
      await supabase
        .from('teacher_trial_lessons')
        .update({ status: 'completed_by_teacher', completed_by_teacher_at: now, updated_at: now })
        .eq('id', trialId);

      // Eslatma: free_lessons_used endi dars YAKUNLANGANda emas, BEPUL DARS BAND QILINGANda
      // (POST trial-lessons) oshiriladi — chunki 3 ta bepul dars = 3 xil o'quvchi (har biri 1 ta).
      await supabase.from('teacher_notifications').insert({
        recipient_user_id: Number((trial as any).student_user_id),
        type: 'student_review_available',
        title: 'Sinov darsi yakunlandi',
        body: 'Dars haqida fikringizni qoldiring.',
        entity_type: 'teacher_trial_lesson',
        entity_id: trialId,
      });
      res.json({ success: true });
    } catch (e) {
      console.error('[PATCH /api/teacher/me/trial-lessons/:trialId/complete]', e);
      res.status(500).json({ error: 'Dars yakunlanmadi' });
    }
  });

  router.post('/teacher-trials/:trialId/student-review', authenticate, async (req: any, res) => {
    try {
      const trialId = Number(req.params.trialId);
      const userId = Number(req.userId);
      const { data: trial } = await supabase
        .from('teacher_trial_lessons')
        .select('id, teacher_user_id, student_user_id')
        .eq('id', trialId)
        .eq('student_user_id', userId)
        .maybeSingle();
      if (!trial) return res.status(404).json({ error: 'Dars topilmadi' });
      const rating = Math.max(1, Math.min(5, asNumber(req.body?.rating) ?? 5));
      const enrolled = typeof req.body?.enrolled_monthly_course === 'boolean' ? req.body.enrolled_monthly_course : null;
      const { data, error } = await supabase
        .from('teacher_student_reviews')
        .upsert(
          {
            trial_lesson_id: trialId,
            teacher_user_id: Number((trial as any).teacher_user_id),
            student_user_id: userId,
            rating,
            liked_lesson: typeof req.body?.liked_lesson === 'boolean' ? req.body.liked_lesson : null,
            lesson_platform: asString(req.body?.lesson_platform) || null,
            lesson_duration_minutes: asNumber(req.body?.lesson_duration_minutes),
            what_liked: asString(req.body?.what_liked),
            what_was_missing: asString(req.body?.what_was_missing),
            disadvantages: asString(req.body?.disadvantages),
            opinion: asString(req.body?.opinion),
            enrolled_monthly_course: enrolled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'trial_lesson_id' }
        )
        .select('*')
        .single();
      if (error) throw error;
      await supabase.from('teacher_monthly_course_confirmations').upsert(
        {
          trial_lesson_id: trialId,
          teacher_user_id: Number((trial as any).teacher_user_id),
          student_user_id: userId,
          student_claimed_enrolled: enrolled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'trial_lesson_id' }
      );

      // Reytingni qayta hisoblab teacher_profiles'ga yozamiz (profilda ko'rsatiladi).
      const teacherUserId = Number((trial as any).teacher_user_id);
      const { data: allReviews } = await supabase
        .from('teacher_student_reviews')
        .select('rating')
        .eq('teacher_user_id', teacherUserId);
      const ratings = (allReviews ?? [])
        .map((r: any) => Number(r.rating))
        .filter((n: number) => Number.isFinite(n));
      const count = ratings.length;
      const avg = count ? ratings.reduce((s: number, n: number) => s + n, 0) / count : 0;
      await supabase
        .from('teacher_profiles')
        .update({
          rating_avg: Math.round(avg * 10) / 10,
          rating_count: count,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', teacherUserId);

      res.status(201).json(data);
    } catch (e) {
      console.error('[POST /api/teacher-trials/:trialId/student-review]', e);
      res.status(500).json({ error: 'Review saqlanmadi' });
    }
  });

  router.post('/teacher-trials/:trialId/teacher-feedback', authenticate, async (req: any, res) => {
    try {
      const trialId = Number(req.params.trialId);
      const userId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, userId, res))) return;
      const { data: trial } = await supabase
        .from('teacher_trial_lessons')
        .select('id, teacher_user_id, student_user_id')
        .eq('id', trialId)
        .eq('teacher_user_id', userId)
        .maybeSingle();
      if (!trial) return res.status(404).json({ error: 'Dars topilmadi' });
      const enrolled = typeof req.body?.student_enrolled_monthly_course === 'boolean'
        ? req.body.student_enrolled_monthly_course
        : null;
      const { data, error } = await supabase
        .from('teacher_lesson_feedback')
        .upsert(
          {
            trial_lesson_id: trialId,
            teacher_user_id: userId,
            student_user_id: Number((trial as any).student_user_id),
            lesson_went_well: typeof req.body?.lesson_went_well === 'boolean' ? req.body.lesson_went_well : null,
            positives: asString(req.body?.positives),
            negatives: asString(req.body?.negatives),
            difficulties: asString(req.body?.difficulties),
            next_steps: asString(req.body?.next_steps),
            teacher_comment: asString(req.body?.teacher_comment),
            student_enrolled_monthly_course: enrolled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'trial_lesson_id' }
        )
        .select('*')
        .single();
      if (error) throw error;
      await supabase.from('teacher_monthly_course_confirmations').upsert(
        {
          trial_lesson_id: trialId,
          teacher_user_id: userId,
          student_user_id: Number((trial as any).student_user_id),
          teacher_claimed_enrolled: enrolled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'trial_lesson_id' }
      );
      res.status(201).json(data);
    } catch (e) {
      console.error('[POST /api/teacher-trials/:trialId/teacher-feedback]', e);
      res.status(500).json({ error: 'Feedback saqlanmadi' });
    }
  });

  // ─── Video darslar ("met") ─────────────────────────────────────────────────
  // Xonani admin yaratadi va o'qituvchiga biriktiradi. O'qituvchi dars vaqtini
  // qo'shadi. Xona faqat o'qituvchiga va unga yozilgan o'quvchilarga ko'rinadi.

  /** O'qituvchining video xonalari + dars vaqtlari. */
  router.get('/teacher/me/meet-rooms', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, userId, res))) return;

      const { data, error } = await supabase
        .from('teacher_meet_rooms')
        .select('*')
        .eq('teacher_user_id', userId)
        .neq('status', 'archived')
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;

      const rooms = ((data as MeetRoom[]) ?? []).map((r) => ({ ...r, id: Number(r.id) }));
      const sessions = await listSessionsForRooms(
        supabase,
        rooms.map((r) => r.id),
        { includePast: true }
      );

      // Xonaga kira oladigan o'quvchilar soni (o'qituvchiga yozilganlar).
      const { data: trials } = await supabase
        .from('teacher_trial_lessons')
        .select('student_user_id, status')
        .eq('teacher_user_id', userId)
        .in('status', [...ENROLLED_TRIAL_STATUSES]);
      const studentsCount = new Set(
        ((trials as { student_user_id: number }[]) ?? []).map((t) => Number(t.student_user_id))
      ).size;

      res.json({ domain: MEET_DOMAIN, rooms, sessions, students_count: studentsCount });
    } catch (e) {
      console.error('[GET /api/teacher/me/meet-rooms]', e);
      res.status(500).json({ error: 'Video xonalar yuklanmadi' });
    }
  });

  /**
   * O'qituvchi o'zi dars (met) ochadi: kun, soat, davomiylik, mavzu.
   * Havolani o'zi qo'yishi mumkin (Google Meet / Zoom); bo'sh qoldirsa
   * FalaRus'ning o'z video xonasi ishlatiladi.
   */
  router.post('/teacher/me/meet-sessions', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, userId, res))) return;

      const startsAtRaw = asString(req.body?.starts_at);
      const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
      if (!startsAt || Number.isNaN(startsAt.getTime())) {
        return res.status(400).json({ error: 'Dars vaqti noto‘g‘ri' });
      }

      const durationRaw = asNumber(req.body?.duration_minutes) ?? 60;
      const duration = Math.min(Math.max(Math.trunc(durationRaw), 10), 300);
      const title = asString(req.body?.title).slice(0, 120);

      const { url: joinUrl, error: urlError } = normalizeJoinUrl(req.body?.join_url);
      if (urlError) return res.status(400).json({ error: urlError });

      // Havola berilmagan bo'lsa — o'qituvchining FalaRus xonasi kerak.
      let roomId = asNumber(req.body?.room_id);
      if (!joinUrl) {
        const { data: rooms } = await supabase
          .from('teacher_meet_rooms')
          .select('id, teacher_user_id, status')
          .eq('teacher_user_id', userId)
          .eq('status', 'assigned')
          .order('created_at', { ascending: true })
          .limit(10);
        const list = ((rooms as any[]) ?? []).map((r) => ({ ...r, id: Number(r.id) }));
        if (list.length === 0) {
          return res.status(409).json({
            error: 'Havola qo‘ying yoki admindan FalaRus video xonasini so‘rang',
          });
        }
        const chosen = roomId != null ? list.find((r) => r.id === roomId) : list[0];
        if (!chosen) return res.status(403).json({ error: 'Bu xona sizga tegishli emas' });
        roomId = chosen.id;
      } else {
        roomId = null;
      }

      const { data, error } = await supabase
        .from('teacher_meet_sessions')
        .insert({
          room_id: roomId,
          teacher_user_id: userId,
          title,
          starts_at: startsAt.toISOString(),
          duration_minutes: duration,
          join_url: joinUrl,
          created_by: 'teacher',
          created_by_user_id: userId,
        })
        .select('*')
        .single();
      if (error) throw error;

      res.status(201).json({ session: data });
    } catch (e) {
      console.error('[POST /api/teacher/me/meet-sessions]', e);
      res.status(500).json({ error: 'Dars saqlanmadi' });
    }
  });

  /** Darsni o'chirish (bekor qilish). */
  router.delete('/teacher/me/meet-sessions/:sessionId', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, userId, res))) return;
      const sessionId = Number(req.params.sessionId);
      if (!Number.isFinite(sessionId)) return res.status(400).json({ error: 'sessionId kerak' });

      const { data: session } = await supabase
        .from('teacher_meet_sessions')
        .select('id, teacher_user_id')
        .eq('id', sessionId)
        .maybeSingle();
      if (!session) return res.status(404).json({ error: 'Dars topilmadi' });
      if (Number((session as any).teacher_user_id) !== userId) {
        return res.status(403).json({ error: 'Bu dars sizga tegishli emas' });
      }

      const { error } = await supabase.from('teacher_meet_sessions').delete().eq('id', sessionId);
      if (error) throw error;
      res.json({ ok: true });
    } catch (e) {
      console.error('[DELETE /api/teacher/me/meet-sessions/:sessionId]', e);
      res.status(500).json({ error: 'Dars o‘chirilmadi' });
    }
  });

  /** Dars vaqtini o'zgartirish yoki bekor qilish. */
  router.patch('/teacher/me/meet-sessions/:sessionId', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, userId, res))) return;

      const sessionId = Number(req.params.sessionId);
      if (!Number.isFinite(sessionId)) return res.status(400).json({ error: 'sessionId kerak' });

      const { data: session } = await supabase
        .from('teacher_meet_sessions')
        .select('id, teacher_user_id')
        .eq('id', sessionId)
        .maybeSingle();
      if (!session) return res.status(404).json({ error: 'Dars topilmadi' });
      if (Number((session as any).teacher_user_id) !== userId) {
        return res.status(403).json({ error: 'Bu dars sizga tegishli emas' });
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const startsAtRaw = asString(req.body?.starts_at);
      if (startsAtRaw) {
        const d = new Date(startsAtRaw);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Dars vaqti noto‘g‘ri' });
        patch.starts_at = d.toISOString();
      }
      if (typeof req.body?.title === 'string') patch.title = asString(req.body.title).slice(0, 120);
      const duration = asNumber(req.body?.duration_minutes);
      if (duration != null) patch.duration_minutes = Math.min(Math.max(Math.trunc(duration), 10), 300);
      if ('join_url' in (req.body ?? {})) {
        const { url, error: urlError } = normalizeJoinUrl(req.body.join_url);
        if (urlError) return res.status(400).json({ error: urlError });
        patch.join_url = url;
      }
      const status = asString(req.body?.status);
      if (status) {
        if (!['scheduled', 'live', 'ended', 'cancelled'].includes(status)) {
          return res.status(400).json({ error: 'status noto‘g‘ri' });
        }
        patch.status = status;
      }

      const { data, error } = await supabase
        .from('teacher_meet_sessions')
        .update(patch)
        .eq('id', sessionId)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      res.json({ session: data ?? null });
    } catch (e) {
      console.error('[PATCH /api/teacher/me/meet-sessions/:sessionId]', e);
      res.status(500).json({ error: 'Dars yangilanmadi' });
    }
  });

  /**
   * O'quvchi: faqat o'zi yozilgan o'qituvchilar tayinlagan darslar.
   * Har bir darsga kirish oynasi (opens_at / closes_at) ham qaytadi —
   * tugma faqat shu oraliqda faollashadi.
   */
  router.get('/my-meet-lessons', authenticate, async (req: any, res) => {
    try {
      const studentId = Number(req.userId);
      const teacherIds = await getEnrolledTeacherIds(supabase, studentId);
      if (teacherIds.length === 0) return res.json({ domain: MEET_DOMAIN, lessons: [] });

      // Kelgusi va hozir davom etayotgan darslar (2 soat oldingacha ko'rinadi).
      const from = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('teacher_meet_sessions')
        .select('*')
        .in('teacher_user_id', teacherIds)
        .neq('status', 'cancelled')
        .gte('starts_at', from)
        .order('starts_at', { ascending: true })
        .limit(50);
      if (error) throw error;

      const sessions = ((data as MeetSession[]) ?? []).map((s) => ({ ...s, id: Number(s.id) }));
      if (sessions.length === 0) return res.json({ domain: MEET_DOMAIN, lessons: [] });

      const { data: profiles } = await supabase
        .from('teacher_profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', teacherIds);
      const byTeacher = new Map<number, any>();
      ((profiles as any[]) ?? []).forEach((p) => byTeacher.set(Number(p.user_id), p));

      const lessons = sessions.map((s) => {
        const p = byTeacher.get(Number(s.teacher_user_id));
        const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : '';
        const { opensAt, closesAt } = joinWindow(s);
        return {
          id: s.id,
          title: s.title,
          starts_at: s.starts_at,
          duration_minutes: s.duration_minutes,
          status: s.status,
          teacher_user_id: Number(s.teacher_user_id),
          teacher_name: name || 'O‘qituvchi',
          teacher_avatar_url: p?.avatar_url ?? null,
          // Havolaning o'zi berilmaydi — u faqat vaqti kelganda /join orqali olinadi.
          is_external: Boolean(s.join_url),
          opens_at: new Date(opensAt).toISOString(),
          closes_at: new Date(closesAt).toISOString(),
          is_joinable: isSessionJoinable(s),
        };
      });

      res.json({ domain: MEET_DOMAIN, lessons });
    } catch (e) {
      console.error('[GET /api/my-meet-lessons]', e);
      res.status(500).json({ error: 'Video darslar yuklanmadi' });
    }
  });

  /**
   * Darsga kirish. Server VAQTNI tekshiradi: dars boshlanishiga 10 daqiqadan
   * ko'p qolgan bo'lsa 425 qaytaradi va kirish bermaydi.
   */
  router.get('/meet-sessions/:sessionId/join', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const sessionId = Number(req.params.sessionId);
      if (!Number.isFinite(sessionId)) return res.status(400).json({ error: 'sessionId kerak' });

      const access = await resolveSessionAccess(supabase, sessionId, userId);
      if (access.status !== 200 || !access.session) {
        return res.status(access.status).json({
          error: access.error,
          starts_at: access.session?.starts_at ?? null,
          opens_at:
            access.session != null ? new Date(joinWindow(access.session).opensAt).toISOString() : null,
        });
      }

      const session = access.session;
      if (session.join_url) {
        return res.json({
          type: 'external',
          url: session.join_url,
          title: session.title,
          starts_at: session.starts_at,
          role: access.role,
        });
      }

      const { data: user } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', userId)
        .maybeSingle();
      const displayName =
        `${(user as any)?.first_name ?? ''} ${(user as any)?.last_name ?? ''}`.trim() ||
        (access.role === 'teacher' ? 'O‘qituvchi' : 'O‘quvchi');

      res.json({
        type: 'jitsi',
        domain: MEET_DOMAIN,
        room_slug: access.room?.room_slug ?? '',
        title: session.title,
        starts_at: session.starts_at,
        role: access.role,
        display_name: displayName,
        email: (user as any)?.email ?? null,
      });
    } catch (e) {
      console.error('[GET /api/meet-sessions/:sessionId/join]', e);
      res.status(500).json({ error: 'Darsga ulanib bo‘lmadi' });
    }
  });

  /** Xonaga kirish: huquq tekshiriladi, so'ng ulanish ma'lumotlari qaytadi. */
  router.get('/meet-rooms/:roomId/join', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const roomId = Number(req.params.roomId);
      if (!Number.isFinite(roomId)) return res.status(400).json({ error: 'roomId kerak' });

      const access = await resolveJoinAccess(supabase, roomId, userId);
      if (access.status !== 200 || !access.room) {
        return res.status(access.status).json({ error: access.error });
      }

      const { data: user } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', userId)
        .maybeSingle();
      const displayName =
        `${(user as any)?.first_name ?? ''} ${(user as any)?.last_name ?? ''}`.trim() ||
        (access.role === 'teacher' ? 'O‘qituvchi' : 'O‘quvchi');

      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('user_id, first_name, last_name')
        .eq('user_id', Number(access.room.teacher_user_id))
        .maybeSingle();
      const teacherName =
        `${(teacherProfile as any)?.first_name ?? ''} ${(teacherProfile as any)?.last_name ?? ''}`.trim() ||
        'O‘qituvchi';

      res.json({
        domain: MEET_DOMAIN,
        room_slug: access.room.room_slug,
        room_title: access.room.title,
        role: access.role,
        display_name: displayName,
        email: (user as any)?.email ?? null,
        teacher_name: teacherName,
      });
    } catch (e) {
      console.error('[GET /api/meet-rooms/:roomId/join]', e);
      res.status(500).json({ error: 'Xonaga ulanib bo‘lmadi' });
    }
  });

  /* ==========================================================================
   * O'QITUVCHI PANELI (yangi kabinet)
   *
   * Uchta endpoint bir xil manbadan oziqlanadi: sinov darslari
   * (`teacher_trial_lessons`) va onlayn sessiyalar (`teacher_meet_sessions`).
   * Ular JS tomonda birlashtiriladi — SQL agregatsiyasi facade orqali
   * qo'llab-quvvatlanmaydi, o'qituvchi hajmi esa kichik (yuzlab qator).
   * ========================================================================== */

  /** Sinov darsi "haqiqiy dars" hisoblanadigan holatlar (to'lanmagani kirmaydi). */
  const JONLI_TRIAL = [
    'paid',
    'teacher_notified',
    'scheduled',
    'completed_by_teacher',
    'completed',
  ];

  /** Panel uchun bitta dars ko'rinishi — trial ham, sessiya ham shu shaklga keladi. */
  type PanelDars = {
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

  async function panelMalumot(supabase: DbClient, teacherId: number) {
    const [trialsRes, sessionsRes] = await Promise.all([
      supabase
        .from('teacher_trial_lessons')
        .select('*')
        .eq('teacher_user_id', teacherId)
        .neq('status', 'pending_payment')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('teacher_meet_sessions')
        .select('*')
        .eq('teacher_user_id', teacherId)
        .order('starts_at', { ascending: false })
        .limit(500),
    ]);
    if (trialsRes.error) throw trialsRes.error;
    if (sessionsRes.error) throw sessionsRes.error;

    const trials = ((trialsRes.data as any[]) ?? []).map((r) => ({ ...r }));
    const sessions = ((sessionsRes.data as any[]) ?? []).map((r) => ({ ...r }));

    // O'quvchi ismlari va darajasi — bitta so'rovda.
    const ids = [...new Set(trials.map((t) => Number(t.student_user_id)).filter(Number.isFinite))];
    const byId = new Map<number, { name: string; level: string }>();
    if (ids.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, level')
        .in('id', ids);
      for (const u of (users as any[]) ?? []) {
        const nm = `${(u as any).first_name ?? ''} ${(u as any).last_name ?? ''}`.trim();
        byId.set(Number((u as any).id), { name: nm || 'O‘quvchi', level: String((u as any).level ?? '') });
      }
    }

    // Oylik kursga o'tgan-o'tmagani — o'quvchi statusini shu belgilaydi.
    const { data: confirmRows } = await supabase
      .from('teacher_monthly_course_confirmations')
      .select('student_user_id, status')
      .eq('teacher_user_id', teacherId)
      .limit(500);
    const confirmByStudent = new Map<number, string>();
    for (const c of (confirmRows as any[]) ?? []) {
      confirmByStudent.set(Number((c as any).student_user_id), String((c as any).status));
    }

    return { trials, sessions, byId, confirmByStudent };
  }

  function trialToDars(t: any, byId: Map<number, { name: string; level: string }>): PanelDars {
    const sid = Number(t.student_user_id);
    return {
      id: `trial-${t.id}`,
      kind: 'trial',
      title: 'Sinov darsi',
      student_user_id: Number.isFinite(sid) ? sid : null,
      student_name: byId.get(sid)?.name ?? 'O‘quvchi',
      starts_at: t.scheduled_starts_at ? String(t.scheduled_starts_at) : null,
      duration_minutes:
        t.scheduled_starts_at && t.scheduled_ends_at
          ? Math.max(
              10,
              Math.round(
                (new Date(String(t.scheduled_ends_at)).getTime() -
                  new Date(String(t.scheduled_starts_at)).getTime()) /
                  60000
              )
            )
          : 60,
      is_trial: true,
      status: String(t.status),
      room_id: null,
    };
  }

  function sessionToDars(s: any): PanelDars {
    return {
      id: `session-${s.id}`,
      kind: 'session',
      title: String(s.title ?? '') || 'Onlayn dars',
      student_user_id: null,
      student_name: String(s.title ?? '') || 'Guruh darsi',
      starts_at: s.starts_at ? String(s.starts_at) : null,
      duration_minutes: Number(s.duration_minutes ?? 60),
      is_trial: false,
      status: String(s.status),
      room_id: Number(s.room_id) || null,
    };
  }

  /** Bosh sahifa: raqamlar, keyingi dars, bugungi jadval, yangi o'quvchilar. */
  router.get('/teacher/me/panel/summary', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const { trials, sessions, byId, confirmByStudent } = await panelMalumot(supabase, teacherId);

      const now = new Date();
      const bugun = formatDateInAppTimezone(now);
      const haftaOldin = new Date(now.getTime() - 7 * 24 * 3600_000);
      const oyBoshi = new Date(now.getFullYear(), now.getMonth(), 1);
      const otganOyBoshi = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const darslar = [
        ...trials.filter((t) => JONLI_TRIAL.includes(String(t.status))).map((t) => trialToDars(t, byId)),
        ...sessions.filter((s) => String(s.status) !== 'cancelled').map(sessionToDars),
      ].filter((d) => d.starts_at);

      const bugungi = darslar
        .filter((d) => formatDateInAppTimezone(new Date(d.starts_at!)) === bugun)
        .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime());

      const keyingi =
        darslar
          .filter((d) => new Date(d.starts_at!).getTime() > now.getTime())
          .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())[0] ?? null;

      // O'quvchilar — sinov darsi bergan har bir kishi.
      const talabaIds = [...new Set(trials.map((t) => Number(t.student_user_id)).filter(Number.isFinite))];
      const faol = talabaIds.filter((id) => confirmByStudent.get(id) === 'matched_yes').length;
      const yangi = talabaIds.filter((id) => {
        const birinchi = trials
          .filter((t) => Number(t.student_user_id) === id)
          .map((t) => new Date(String(t.created_at)).getTime())
          .sort((a, b) => a - b)[0];
        return birinchi != null && birinchi >= haftaOldin.getTime();
      }).length;
      const sinovKutayotgan = trials.filter(
        (t) => ['paid', 'teacher_notified'].includes(String(t.status)) && !t.scheduled_starts_at
      ).length;

      const otkazilgan =
        trials.filter((t) => ['completed', 'completed_by_teacher'].includes(String(t.status))).length +
        sessions.filter((s) => String(s.status) === 'ended').length;

      // Daromad — HOZIRCHA faqat sinov darslari to'lovi. Oylik kurs to'lovi
      // bazada o'qituvchi bo'yicha yozilmaydi (keyingi bosqich).
      const daromad = (dan: Date, gacha: Date) =>
        trials
          .filter((t) => {
            if (!JONLI_TRIAL.includes(String(t.status))) return false;
            const d = new Date(String(t.created_at)).getTime();
            return d >= dan.getTime() && d < gacha.getTime();
          })
          .reduce((s, t) => s + Number(t.price_uzs_snapshot ?? 0), 0);

      const buOy = daromad(oyBoshi, new Date(now.getFullYear(), now.getMonth() + 1, 1));
      const otganOy = daromad(otganOyBoshi, oyBoshi);

      res.json({
        today: {
          lessons: bugungi.length,
          trials: bugungi.filter((d) => d.is_trial).length,
          schedule: bugungi.slice(0, 8),
        },
        students: {
          total: talabaIds.length,
          active: faol,
          new_this_week: yangi,
          waiting_trial: sinovKutayotgan,
        },
        lessons_done_total: otkazilgan,
        lessons_planned: darslar.filter((d) => new Date(d.starts_at!).getTime() > now.getTime()).length,
        income: {
          month_uzs: buOy,
          prev_month_uzs: otganOy,
          change_percent: otganOy > 0 ? Math.round(((buOy - otganOy) / otganOy) * 100) : null,
          note: 'trial_only',
        },
        next_lesson: keyingi,
        new_students: trials
          .slice(0, 20)
          .filter((t, i, arr) => arr.findIndex((x) => x.student_user_id === t.student_user_id) === i)
          .slice(0, 5)
          .map((t) => ({
            user_id: Number(t.student_user_id),
            name: byId.get(Number(t.student_user_id))?.name ?? 'O‘quvchi',
            level: byId.get(Number(t.student_user_id))?.level ?? '',
            status: String(t.status),
            scheduled_starts_at: t.scheduled_starts_at ? String(t.scheduled_starts_at) : null,
          })),
      });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/summary]', e);
      res.status(500).json({ error: 'Panel ma\'lumoti yuklanmadi' });
    }
  });

  /** Darslar ro'yxati. filter: upcoming | today | completed | cancelled | trial */
  router.get('/teacher/me/panel/lessons', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const filter = String(req.query?.filter ?? 'upcoming');
      const { trials, sessions, byId } = await panelMalumot(supabase, teacherId);

      const hammasi = [
        ...trials.map((t) => trialToDars(t, byId)),
        ...sessions.map(sessionToDars),
      ];
      const now = Date.now();
      const bugun = formatDateInAppTimezone(new Date());

      const tanlangan = hammasi.filter((d) => {
        const bekor = ['cancelled', 'refunded'].includes(d.status);
        const tugagan = ['completed', 'completed_by_teacher', 'ended'].includes(d.status);
        switch (filter) {
          case 'today':
            return !!d.starts_at && formatDateInAppTimezone(new Date(d.starts_at)) === bugun && !bekor;
          case 'completed':
            return tugagan;
          case 'cancelled':
            return bekor;
          case 'trial':
            return d.is_trial && !bekor;
          case 'upcoming':
          default:
            return !!d.starts_at && new Date(d.starts_at).getTime() > now && !bekor && !tugagan;
        }
      });

      tanlangan.sort((a, b) => {
        const at = a.starts_at ? new Date(a.starts_at).getTime() : 0;
        const bt = b.starts_at ? new Date(b.starts_at).getTime() : 0;
        return filter === 'completed' || filter === 'cancelled' ? bt - at : at - bt;
      });

      res.json({ filter, total: tanlangan.length, lessons: tanlangan.slice(0, 200) });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/lessons]', e);
      res.status(500).json({ error: 'Darslar yuklanmadi' });
    }
  });

  /** O'quvchilar. filter: all | new | active | finished | trial */
  router.get('/teacher/me/panel/students', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const filter = String(req.query?.filter ?? 'all');
      const { trials, byId, confirmByStudent } = await panelMalumot(supabase, teacherId);

      const now = Date.now();
      const haftaOldin = now - 7 * 24 * 3600_000;
      const guruh = new Map<number, any[]>();
      for (const t of trials) {
        const sid = Number(t.student_user_id);
        if (!Number.isFinite(sid)) continue;
        if (!guruh.has(sid)) guruh.set(sid, []);
        guruh.get(sid)!.push(t);
      }

      const talabalar = [...guruh.entries()].map(([sid, rows]) => {
        const sana = rows
          .map((r) => new Date(String(r.created_at)).getTime())
          .sort((a, b) => a - b);
        const tasdiq = confirmByStudent.get(sid) ?? null;
        const tugagan = rows.filter((r) =>
          ['completed', 'completed_by_teacher'].includes(String(r.status))
        ).length;
        const kelayotgan = rows
          .filter((r) => r.scheduled_starts_at && new Date(String(r.scheduled_starts_at)).getTime() > now)
          .map((r) => String(r.scheduled_starts_at))
          .sort()[0] ?? null;

        // Holat: oylik kursga o'tgan bo'lsa "faol", trial tugagan-u o'tmagan
        // bo'lsa "tugatgan", aks holda "sinov".
        const holat =
          tasdiq === 'matched_yes'
            ? 'active'
            : tasdiq === 'matched_no'
              ? 'finished'
              : 'trial';

        return {
          user_id: sid,
          name: byId.get(sid)?.name ?? 'O‘quvchi',
          level: byId.get(sid)?.level ?? '',
          status: holat,
          is_new: sana[0] >= haftaOldin,
          lessons_done: tugagan,
          trials_total: rows.length,
          next_lesson_at: kelayotgan,
          first_seen_at: new Date(sana[0]).toISOString(),
        };
      });

      const tanlangan = talabalar.filter((s) => {
        switch (filter) {
          case 'new':
            return s.is_new;
          case 'active':
            return s.status === 'active';
          case 'finished':
            return s.status === 'finished';
          case 'trial':
            return s.status === 'trial';
          default:
            return true;
        }
      });
      tanlangan.sort((a, b) => (a.next_lesson_at ?? '9999').localeCompare(b.next_lesson_at ?? '9999'));

      res.json({
        filter,
        counts: {
          all: talabalar.length,
          new: talabalar.filter((s) => s.is_new).length,
          active: talabalar.filter((s) => s.status === 'active').length,
          finished: talabalar.filter((s) => s.status === 'finished').length,
          trial: talabalar.filter((s) => s.status === 'trial').length,
        },
        students: tanlangan,
      });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/students]', e);
      res.status(500).json({ error: 'O\'quvchilar yuklanmadi' });
    }
  });

  /* --------------------------------------------------------------------------
   * JADVAL (Расписание)
   *
   * Ikki jadval ustida ishlaydi:
   *   `teacher_availability_rules`      — haftaning kuni bo'yicha takrorlanuvchi
   *                                       bo'sh vaqt (masalan har dushanba 09:00-13:00);
   *   `teacher_availability_exceptions` — aniq sanadagi istisno (vaqtni bloklash).
   *
   * O'zbekistonda yozgi vaqt yo'q (doim UTC+5), shuning uchun sana+vaqtdan
   * aniq lahzani hosil qilish uchun `+05:00` qo'shish kifoya.
   * ------------------------------------------------------------------------ */

  const TOSHKENT_OFFSET = '+05:00';

  /** "09:00:00" yoki "09:00" → daqiqa. Yaroqsiz bo'lsa null. */
  function vaqtDaqiqa(value: unknown): number | null {
    const m = String(value ?? '').match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return h * 60 + min;
  }

  const daqiqaVaqt = (d: number) =>
    `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;

  /** `YYYY-MM-DD` + daqiqa → aniq lahza (Toshkent vaqti bo'yicha). */
  const lahza = (sana: string, daqiqa: number) =>
    new Date(`${sana}T${daqiqaVaqt(daqiqa)}:00${TOSHKENT_OFFSET}`).getTime();

  /**
   * Kalendar sanasiga kun qo'shadi.
   *
   * DIQQAT: bu yerda mintaqa ishlatilmaydi. Toshkent yarim tunini (`+05:00`)
   * UTC'ga o'girsak `toISOString()` bir kun ORQAGA siljib ketadi
   * (2026-08-11 → 2026-08-10). Sana — shunchaki kalendar belgisi, shuning
   * uchun UTC yarim tunida hisoblanadi.
   */
  function sanaQoshish(sana: string, kun: number): string {
    const d = new Date(`${sana}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + kun);
    return d.toISOString().slice(0, 10);
  }

  /** `YYYY-MM-DD` ning hafta kuni: 0 = yakshanba (Postgres `dow` bilan bir xil). */
  const haftaKuni = (sana: string) => new Date(`${sana}T12:00:00Z`).getUTCDay();

  /**
   * `date` ustunini `YYYY-MM-DD` ga keltiradi.
   *
   * `pg` drayveri `date` turini JS `Date` obyektiga aylantiradi, shuning uchun
   * to'g'ridan-to'g'ri `String(...).slice(0,10)` qilsak "Tue Aug 11" chiqadi va
   * sana solishtiruvi jimgina buziladi.
   */
  function sanaMatn(value: unknown): string {
    if (value instanceof Date) {
      return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(
        value.getUTCDate()
      ).padStart(2, '0')}`;
    }
    return String(value ?? '').slice(0, 10);
  }

  /** Haftalik setka: har kun uchun slotlar va ularning holati. */
  router.get('/teacher/me/panel/schedule', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;

      const fromRaw = asString(req.query?.from);
      const from = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : formatDateInAppTimezone(new Date());
      const days = Math.min(Math.max(Number(req.query?.days ?? 7) || 7, 1), 31);
      const to = sanaQoshish(from, days - 1);

      const [rulesRes, excRes, { trials, sessions, byId }] = await Promise.all([
        supabase
          .from('teacher_availability_rules')
          .select('*')
          .eq('teacher_user_id', teacherId)
          .eq('is_active', true)
          .limit(200),
        supabase
          .from('teacher_availability_exceptions')
          .select('*')
          .eq('teacher_user_id', teacherId)
          .gte('exception_date', from)
          .lte('exception_date', to)
          .limit(300),
        panelMalumot(supabase, teacherId),
      ]);
      if (rulesRes.error) throw rulesRes.error;
      if (excRes.error) throw excRes.error;

      const rules = ((rulesRes.data as any[]) ?? []).map((r) => ({
        id: Number(r.id),
        weekday: Number(r.weekday),
        start_time: String(r.start_time).slice(0, 5),
        end_time: String(r.end_time).slice(0, 5),
        slot_minutes: Number(r.slot_minutes ?? 60),
      }));
      const exceptions = ((excRes.data as any[]) ?? []).map((e) => ({
        id: Number(e.id),
        date: sanaMatn(e.exception_date),
        start_time: e.start_time ? String(e.start_time).slice(0, 5) : null,
        end_time: e.end_time ? String(e.end_time).slice(0, 5) : null,
        is_available: Boolean(e.is_available),
        slot_minutes: Number(e.slot_minutes ?? 60),
        note: String(e.note ?? ''),
      }));

      // Band qilingan vaqtlar — sinov darslari va onlayn sessiyalar.
      const band = [
        ...trials
          .filter((t) => !['cancelled', 'refunded'].includes(String(t.status)) && t.scheduled_starts_at)
          .map((t) => {
            const s = new Date(String(t.scheduled_starts_at)).getTime();
            const e = t.scheduled_ends_at
              ? new Date(String(t.scheduled_ends_at)).getTime()
              : s + 60 * 60000;
            return { start: s, end: e, trial: true, label: byId.get(Number(t.student_user_id))?.name ?? 'Sinov darsi' };
          }),
        ...sessions
          .filter((s) => String(s.status) !== 'cancelled')
          .map((s) => {
            const st = new Date(String(s.starts_at)).getTime();
            return {
              start: st,
              end: st + Number(s.duration_minutes ?? 60) * 60000,
              trial: false,
              label: String(s.title ?? '') || 'Onlayn dars',
            };
          }),
      ];

      const kunlar = Array.from({ length: days }, (_, i) => {
        const sana = sanaQoshish(from, i);
        const dow = haftaKuni(sana);
        const slotlar: Array<{
          start: string;
          end: string;
          state: string;
          label: string;
          /** Slot qayerdan chiqdi: haftalik qoidadan yoki bir martalik yozuvdan. */
          source: 'rule' | 'exception';
          /** Bir martalik bo'sh vaqt yozuvi (panelda bosib o'chiriladi). */
          exception_id: number | null;
          /** Shu vaqtni bloklab turgan yozuv (panelda bosib ochiladi). */
          block_id: number | null;
        }> = [];
        const olingan = new Set<string>();

        /** Bitta oraliqni slotlarga bo'lib qo'shadi (takrorlanganini tashlab ketadi). */
        const oraliq = (
          boshi: number,
          oxiri: number,
          qadam: number,
          manba: 'rule' | 'exception',
          manbaId: number | null = null
        ) => {
          const step = Math.max(15, qadam);
          for (let m = boshi; m + step <= oxiri; m += step) {
            const kalit = daqiqaVaqt(m);
            if (olingan.has(kalit)) continue;
            olingan.add(kalit);

            const sBosh = lahza(sana, m);
            const sOxir = lahza(sana, m + step);

            const blok = exceptions.find((ex) => {
              if (ex.date !== sana || ex.is_available) return false;
              if (!ex.start_time || !ex.end_time) return true; // butun kun
              const eb = vaqtDaqiqa(ex.start_time);
              const eo = vaqtDaqiqa(ex.end_time);
              return eb != null && eo != null && m < eo && m + step > eb;
            });
            const dars = band.find((b) => sBosh < b.end && sOxir > b.start);

            slotlar.push({
              start: kalit,
              end: daqiqaVaqt(m + step),
              state: dars ? (dars.trial ? 'trial' : 'booked') : blok ? 'blocked' : 'free',
              label: dars ? dars.label : blok ? 'Bloklangan' : '',
              source: manba,
              exception_id: manba === 'exception' ? manbaId : null,
              block_id: blok ? blok.id : null,
            });
          }
        };

        for (const rule of rules.filter((r) => r.weekday === dow)) {
          const boshi = vaqtDaqiqa(rule.start_time);
          const oxiri = vaqtDaqiqa(rule.end_time);
          if (boshi == null || oxiri == null || oxiri <= boshi) continue;
          oraliq(boshi, oxiri, rule.slot_minutes, 'rule');
        }

        // Bir martalik bo'sh vaqt — haftalik qoidaga tushmaydigan qo'shimcha oraliq.
        for (const ex of exceptions) {
          if (ex.date !== sana || !ex.is_available || !ex.start_time || !ex.end_time) continue;
          const boshi = vaqtDaqiqa(ex.start_time);
          const oxiri = vaqtDaqiqa(ex.end_time);
          if (boshi == null || oxiri == null || oxiri <= boshi) continue;
          oraliq(boshi, oxiri, ex.slot_minutes, 'exception', ex.id);
        }

        // Bloklangan soat qoidaga tushmasa ham ko'rinsin (bosib ochish uchun).
        for (const ex of exceptions) {
          if (ex.date !== sana || ex.is_available || !ex.start_time || !ex.end_time) continue;
          const boshi = vaqtDaqiqa(ex.start_time);
          const oxiri = vaqtDaqiqa(ex.end_time);
          if (boshi == null || oxiri == null || oxiri <= boshi) continue;
          oraliq(boshi, oxiri, 60, 'exception', ex.id);
        }

        slotlar.sort((a, b) => a.start.localeCompare(b.start));
        return { date: sana, weekday: dow, slots: slotlar };
      });

      res.json({ from, to, days, timezone: 'Asia/Tashkent', rules, exceptions, calendar: kunlar });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/schedule]', e);
      res.status(500).json({ error: 'Jadval yuklanmadi' });
    }
  });

  /** Takrorlanuvchi bo'sh vaqt qo'shish. */
  router.post('/teacher/me/panel/availability', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const weekday = Number(req.body?.weekday);
      const boshi = vaqtDaqiqa(req.body?.start_time);
      const oxiri = vaqtDaqiqa(req.body?.end_time);
      const slot = Math.min(Math.max(Number(req.body?.slot_minutes ?? 60) || 60, 15), 240);

      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        return res.status(400).json({ error: 'Hafta kuni notoʻgʻri' });
      }
      if (boshi == null || oxiri == null || oxiri <= boshi) {
        return res.status(400).json({ error: 'Vaqt oraligʻi notoʻgʻri' });
      }
      if (oxiri - boshi < slot) {
        return res.status(400).json({ error: 'Oraliq kamida bitta darsga yetmaydi' });
      }

      const { data, error } = await supabase
        .from('teacher_availability_rules')
        .insert({
          teacher_user_id: teacherId,
          weekday,
          start_time: `${daqiqaVaqt(boshi)}:00`,
          end_time: `${daqiqaVaqt(oxiri)}:00`,
          slot_minutes: slot,
          timezone: 'Asia/Tashkent',
          is_active: true,
        })
        .select('*')
        .single();
      if (error) throw error;
      res.status(201).json({
        id: Number((data as any).id),
        weekday,
        start_time: daqiqaVaqt(boshi),
        end_time: daqiqaVaqt(oxiri),
        slot_minutes: slot,
      });
    } catch (e) {
      console.error('[POST /api/teacher/me/panel/availability]', e);
      res.status(500).json({ error: 'Boʻsh vaqt saqlanmadi' });
    }
  });

  router.delete('/teacher/me/panel/availability/:id', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID notoʻgʻri' });
      // Faqat O'ZINING qoidasi o'chadi.
      const { error } = await supabase
        .from('teacher_availability_rules')
        .delete()
        .eq('id', id)
        .eq('teacher_user_id', teacherId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      console.error('[DELETE /api/teacher/me/panel/availability/:id]', e);
      res.status(500).json({ error: 'Oʻchirilmadi' });
    }
  });

  /** Aniq sanadagi vaqtni bloklash (dam olish, band kun). */
  router.post('/teacher/me/panel/availability/block', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const date = asString(req.body?.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Sana notoʻgʻri' });
      }
      const boshi = req.body?.start_time ? vaqtDaqiqa(req.body.start_time) : null;
      const oxiri = req.body?.end_time ? vaqtDaqiqa(req.body.end_time) : null;
      if ((boshi == null) !== (oxiri == null)) {
        return res.status(400).json({ error: 'Boshlanish va tugash vaqti birga berilsin' });
      }
      if (boshi != null && oxiri != null && oxiri <= boshi) {
        return res.status(400).json({ error: 'Vaqt oraligʻi notoʻgʻri' });
      }

      const { data, error } = await supabase
        .from('teacher_availability_exceptions')
        .insert({
          teacher_user_id: teacherId,
          exception_date: date,
          start_time: boshi != null ? `${daqiqaVaqt(boshi)}:00` : null,
          end_time: oxiri != null ? `${daqiqaVaqt(oxiri)}:00` : null,
          is_available: false,
          note: asString(req.body?.note).slice(0, 200),
        })
        .select('*')
        .single();
      if (error) throw error;
      res.status(201).json({ id: Number((data as any).id), date, start_time: boshi != null ? daqiqaVaqt(boshi) : null, end_time: oxiri != null ? daqiqaVaqt(oxiri) : null });
    } catch (e) {
      console.error('[POST /api/teacher/me/panel/availability/block]', e);
      res.status(500).json({ error: 'Bloklanmadi' });
    }
  });

  router.delete('/teacher/me/panel/availability/block/:id', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID notoʻgʻri' });
      const { error } = await supabase
        .from('teacher_availability_exceptions')
        .delete()
        .eq('id', id)
        .eq('teacher_user_id', teacherId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      console.error('[DELETE /api/teacher/me/panel/availability/block/:id]', e);
      res.status(500).json({ error: 'Oʻchirilmadi' });
    }
  });

  /* --------------------------------------------------------------------------
   * PROFIL VA ANKETA (12 qadam)
   * ------------------------------------------------------------------------ */

  /**
   * Anketa qadamlari. Har biri qaysi maydonlar to'lganini biladi —
   * to'ldirilganlik foizi shu ro'yxatdan hisoblanadi, qo'lda emas.
   */
  const ANKETA_QADAMLAR: Array<{ step: number; title: string; fields: string[] }> = [
    { step: 1, title: 'Shaxsiy maʼlumotlar', fields: ['first_name', 'last_name', 'birth_date', 'gender'] },
    { step: 2, title: 'Aloqa maʼlumotlari', fields: ['public_email', 'telegram_username', 'region', 'city'] },
    { step: 3, title: 'Pasport maʼlumotlari', fields: ['passport_number', 'passport_issued_by', 'passport_issued_at'] },
    { step: 4, title: 'Surat', fields: ['avatar_url'] },
    { step: 5, title: 'Bilim dargohlari', fields: ['education'] },
    { step: 6, title: 'Ish tajribasi', fields: ['experience_years'] },
    { step: 7, title: 'Mutaxassislik', fields: ['subjects', 'teaching_levels'] },
    { step: 8, title: 'Tillar', fields: ['languages'] },
    { step: 9, title: 'Yutuq va sertifikatlar', fields: ['certificates', 'achievements'] },
    { step: 10, title: 'Oʻzim va metodikam', fields: ['about', 'headline'] },
    { step: 11, title: 'Video-taqdimot', fields: ['video_url'] },
    { step: 12, title: 'Profilni koʻrish', fields: ['monthly_course_price_amount'] },
  ];

  /** Maydon "to'ldirilgan" hisoblanadimi. Bo'sh matn/massiv ham bo'sh sanaladi. */
  function toldirilgan(value: unknown): boolean {
    if (value == null) return false;
    if (typeof value === 'string') {
      const t = value.trim();
      if (!t || t === '[]' || t === '{}') return false;
      return true;
    }
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return value > 0;
    return Boolean(value);
  }

  /** Anketa uchun tahrirlash mumkin bo'lgan maydonlar va ularning turi. */
  const ANKETA_MAYDON: Record<string, 'text' | 'date' | 'int' | 'json' | 'education' | 'certificates'> = {
    first_name: 'text',
    last_name: 'text',
    birth_date: 'date',
    gender: 'text',
    public_email: 'text',
    telegram_username: 'text',
    region: 'text',
    city: 'text',
    passport_number: 'text',
    passport_issued_by: 'text',
    passport_issued_at: 'date',
    address: 'text',
    education: 'education',
    certificates: 'certificates',
    achievements: 'text',
    experience_years: 'int',
    experience_months: 'int',
    subjects: 'json',
    teaching_levels: 'json',
    languages: 'json',
    about: 'text',
    headline: 'text',
    monthly_course_price_amount: 'int',
  };

  router.get('/teacher/me/panel/profile', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;

      const [profRes, docsRes, userRes] = await Promise.all([
        supabase.from('teacher_profiles').select('*').eq('user_id', teacherId).maybeSingle(),
        supabase
          .from('teacher_documents')
          .select('*')
          .eq('teacher_user_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('users').select('id, avatar_url, email, phone').eq('id', teacherId).maybeSingle(),
      ]);
      if (profRes.error) throw profRes.error;

      const p = ((profRes.data as any) ?? {}) as Record<string, unknown>;
      const u = ((userRes.data as any) ?? {}) as Record<string, unknown>;
      // Surat `users.avatar_url` da ham bo'lishi mumkin.
      const manba: Record<string, unknown> = { ...p, avatar_url: p.avatar_url ?? u.avatar_url };

      const videoDoc = ((docsRes.data as any[]) ?? []).find((d) => String(d.kind) === 'video') ?? null;
      const steps = ANKETA_QADAMLAR.map((q) => ({
        step: q.step,
        title: q.title,
        fields: q.fields,
        // Video-taqdimot yuklangan bo'lsa qadam bajarilgan hisoblanadi —
        // tasdiqlashni admin qiladi, o'qituvchi uni kutib turmaydi.
        done: q.step === 11 ? Boolean(videoDoc) : q.fields.every((f) => toldirilgan(manba[f])),
      }));
      const bajarilgan = steps.filter((s) => s.done).length;

      /*
       * TEKSHIRUVGA YUBORISH — TO'LOVDAN KEYIN.
       *
       * O'qituvchi anketani to'ldiradi va hujjatlarni yuklaydi, lekin
       * moderatorga faqat ro'yxat to'lovi amalga oshgach yuboradi.
       * To'lov: `teacher_profiles.listing_paid_until` (Rahmat callback
       * to'ldiradi) yoki tasdiqlangan `teacher_listing` to'lovi.
       */
      const paidUntil = p.listing_paid_until ? new Date(String(p.listing_paid_until)) : null;
      let tolangan = Boolean(paidUntil && paidUntil.getTime() > Date.now());
      if (!tolangan) {
        const { data: pay } = await supabase
          .from('payments')
          .select('id')
          .eq('user_id', teacherId)
          .eq('product_code', 'teacher_listing')
          .eq('status', 'approved')
          .limit(1);
        tolangan = (((pay as any[]) ?? []).length > 0);
      }

      res.json({
        profile: manba,
        contact: { email: u.email ?? null, phone: u.phone ?? null },
        payment: {
          paid: tolangan,
          paid_until: p.listing_paid_until ?? null,
          first_discount_used: Boolean(p.first_listing_discount_used),
        },
        documents: (docsRes.data as any[]) ?? [],
        anketa: {
          steps,
          current_step: Number(p.anketa_step ?? 1),
          done_steps: bajarilgan,
          total_steps: steps.length,
          completion_percent: Math.round((bajarilgan / steps.length) * 100),
          submitted_at: p.anketa_submitted_at ?? null,
        },
      });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/profile]', e);
      res.status(500).json({ error: 'Profil yuklanmadi' });
    }
  });

  /** Anketa maydonlarini saqlash. Faqat ruxsat etilgan maydonlar o'tadi. */
  router.put('/teacher/me/panel/profile', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const body = (req.body ?? {}) as Record<string, unknown>;

      const patch: Record<string, unknown> = {};
      for (const [key, tur] of Object.entries(ANKETA_MAYDON)) {
        if (!(key in body)) continue;
        const raw = body[key];
        if (tur === 'int') {
          const n = Number(raw);
          patch[key] = Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
        } else if (tur === 'date') {
          const s = asString(raw);
          if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            return res.status(400).json({ error: `${key}: sana YYYY-MM-DD koʻrinishida boʻlsin` });
          }
          patch[key] = s || null;
        } else if (tur === 'json') {
          /*
           * `subjects`, `teaching_levels`, `languages` — bazada `text[]`
           * (JSON emas). Ilgari bu yerda `JSON.stringify` qilinardi va
           * Postgres uni qabul qilmasdi:
           *   malformed array literal: "[\"Soʻzlashuv rus tili\"]"
           * Natijada 7 va 8-qadam saqlanmasdan qolardi. Massivning O'ZI
           * uzatiladi — drayver uni Postgres massiviga aylantiradi.
           */
          patch[key] = Array.isArray(raw)
            ? raw.map((v) => asString(v)).filter(Boolean).slice(0, 30)
            : [];
        } else if (tur === 'education') {
          patch[key] = JSON.stringify(sanitizeEducation(raw));
        } else if (tur === 'certificates') {
          patch[key] = JSON.stringify(sanitizeCertificates(raw));
        } else {
          patch[key] = asString(raw).slice(0, 2000) || null;
        }
      }

      // Yosh — tug'ilgan sanadan. Ommaviy profilda ko'rinadigan `age` ustuni
      // anketada alohida so'ralmaydi, shuning uchun shu yerda yangilanadi.
      if (typeof patch.birth_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(patch.birth_date)) {
        const tugilgan = new Date(`${patch.birth_date}T00:00:00Z`).getTime();
        const yosh = Math.floor((Date.now() - tugilgan) / (365.25 * 24 * 3600_000));
        if (yosh >= 16 && yosh <= 99) patch.age = yosh;
      }

      const step = Number(body.anketa_step);
      if (Number.isInteger(step) && step >= 1 && step <= 12) patch.anketa_step = step;

      if (body.submit === true) {
        // Tekshiruvga yuborish faqat to'lovdan keyin — bu qoida SERVERDA
        // turadi, aks holda tugmani chetlab o'tib so'rov yuborish mumkin.
        const { data: prof } = await supabase
          .from('teacher_profiles')
          .select('listing_paid_until')
          .eq('user_id', teacherId)
          .maybeSingle();
        const until = (prof as any)?.listing_paid_until
          ? new Date(String((prof as any).listing_paid_until))
          : null;
        let tolangan = Boolean(until && until.getTime() > Date.now());
        if (!tolangan) {
          const { data: pay } = await supabase
            .from('payments')
            .select('id')
            .eq('user_id', teacherId)
            .eq('product_code', 'teacher_listing')
            .eq('status', 'approved')
            .limit(1);
          tolangan = (((pay as any[]) ?? []).length > 0);
        }
        if (!tolangan) {
          return res.status(402).json({
            error: 'Hujjatlarni tekshiruvga yuborish uchun avval roʻyxat toʻlovini amalga oshiring',
          });
        }
        patch.anketa_submitted_at = new Date().toISOString();
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'Saqlash uchun maʼlumot yoʻq' });
      }
      patch.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('teacher_profiles')
        .update(patch)
        .eq('user_id', teacherId);
      if (error) throw error;
      res.json({ success: true, saved: Object.keys(patch).filter((k) => k !== 'updated_at') });
    } catch (e) {
      console.error('[PUT /api/teacher/me/panel/profile]', e);
      res.status(500).json({ error: 'Profil saqlanmadi' });
    }
  });

  /* --------------------------------------------------------------------------
   * DAROMAD
   *
   * Ikki manba birlashtiriladi:
   *   1) SINOV DARSLARI — sayt orqali to'langan, `teacher_trial_lessons` dan
   *      avtomatik hisoblanadi (qo'lda kiritilmaydi);
   *   2) OYLIK KURS va boshqa daromad — sayt orqali o'tmaydi, ustoz o'zi
   *      `teacher_earnings` ga yozadi.
   * ------------------------------------------------------------------------ */

  /** `YYYY-MM` kalitini beradi (Toshkent kalendari bo'yicha). */
  const oyKalit = (iso: string) => formatDateInAppTimezone(new Date(iso)).slice(0, 7);

  router.get('/teacher/me/panel/income', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const oylarSoni = Math.min(Math.max(Number(req.query?.months ?? 6) || 6, 1), 24);

      const [{ trials, byId }, earnRes] = await Promise.all([
        panelMalumot(supabase, teacherId),
        supabase
          .from('teacher_earnings')
          .select('*')
          .eq('teacher_user_id', teacherId)
          .order('earned_on', { ascending: false })
          .limit(500),
      ]);
      if (earnRes.error) throw earnRes.error;
      const qolda = ((earnRes.data as any[]) ?? []).map((r) => ({
        id: Number(r.id),
        source: String(r.source),
        student_user_id: r.student_user_id != null ? Number(r.student_user_id) : null,
        student_name: r.student_user_id ? byId.get(Number(r.student_user_id))?.name ?? null : null,
        amount_uzs: Number(r.amount_uzs),
        earned_on: sanaMatn(r.earned_on),
        note: String(r.note ?? ''),
      }));

      // Oxirgi N oyning kalitlari (eng yangisi birinchi).
      const hozir = new Date();
      const oylar: string[] = [];
      for (let i = 0; i < oylarSoni; i++) {
        const d = new Date(hozir.getFullYear(), hozir.getMonth() - i, 1);
        oylar.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      const sinovlar = trials.filter((t) => JONLI_TRIAL.includes(String(t.status)));
      const oylik = oylar.map((oy) => {
        const sinov = sinovlar
          .filter((t) => oyKalit(String(t.created_at)) === oy)
          .reduce((s, t) => s + Number(t.price_uzs_snapshot ?? 0), 0);
        const qoldaOy = qolda
          .filter((e) => e.earned_on.slice(0, 7) === oy)
          .reduce((s, e) => s + e.amount_uzs, 0);
        return { month: oy, trial_uzs: sinov, manual_uzs: qoldaOy, total_uzs: sinov + qoldaOy };
      });

      const jami = oylik.reduce((s, m) => s + m.total_uzs, 0);
      res.json({
        months: oylik,
        total_uzs: jami,
        current_month: oylik[0] ?? null,
        entries: qolda.slice(0, 100),
        note:
          'Sinov darslari sayt orqali to‘lanadi va avtomatik hisoblanadi. ' +
          'Oylik kurs puli sayt orqali o‘tmaydi — uni qo‘lda yozasiz.',
      });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/income]', e);
      res.status(500).json({ error: 'Daromad yuklanmadi' });
    }
  });

  router.post('/teacher/me/panel/income', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const amount = Number(req.body?.amount_uzs);
      const date = asString(req.body?.earned_on);
      const source = ['monthly', 'extra', 'other'].includes(String(req.body?.source))
        ? String(req.body.source)
        : 'monthly';

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Summa musbat son boʻlsin' });
      }
      if (amount > 1_000_000_000) {
        return res.status(400).json({ error: 'Summa juda katta' });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Sana YYYY-MM-DD koʻrinishida boʻlsin' });
      }

      // O'quvchi berilgan bo'lsa — u ROSTDAN shu ustozning o'quvchisimi.
      let studentId: number | null = null;
      if (req.body?.student_user_id != null) {
        const sid = Number(req.body.student_user_id);
        const { data: bor } = await supabase
          .from('teacher_trial_lessons')
          .select('id')
          .eq('teacher_user_id', teacherId)
          .eq('student_user_id', sid)
          .limit(1);
        if (!((bor as any[]) ?? []).length) {
          return res.status(400).json({ error: 'Bu oʻquvchi sizga biriktirilmagan' });
        }
        studentId = sid;
      }

      const { data, error } = await supabase
        .from('teacher_earnings')
        .insert({
          teacher_user_id: teacherId,
          source,
          student_user_id: studentId,
          amount_uzs: Math.round(amount),
          earned_on: date,
          note: asString(req.body?.note).slice(0, 200),
        })
        .select('id, source, amount_uzs, earned_on, note')
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (e) {
      console.error('[POST /api/teacher/me/panel/income]', e);
      res.status(500).json({ error: 'Daromad saqlanmadi' });
    }
  });

  router.delete('/teacher/me/panel/income/:id', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID notoʻgʻri' });
      const { error } = await supabase
        .from('teacher_earnings')
        .delete()
        .eq('id', id)
        .eq('teacher_user_id', teacherId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      console.error('[DELETE /api/teacher/me/panel/income/:id]', e);
      res.status(500).json({ error: 'Oʻchirilmadi' });
    }
  });

  /* --------------------------------------------------------------------------
   * O'QUVCHI KARTOCHKASI
   *
   * Ustoz bitta o'quvchini ochganda ko'radigan hamma narsa bitta so'rovda
   * keladi: darslar tarixi, har darsning hisoboti, ustozning shaxsiy
   * eslatmalari va chat suhbati.
   * ------------------------------------------------------------------------ */

  router.get('/teacher/me/panel/students/:studentId', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const studentId = Number(req.params?.studentId);
      if (!Number.isFinite(studentId)) return res.status(400).json({ error: 'ID notoʻgʻri' });

      const [trialsRes, userRes, notesRes, convRes, confirmRes] = await Promise.all([
        supabase
          .from('teacher_trial_lessons')
          .select('*')
          .eq('teacher_user_id', teacherId)
          .eq('student_user_id', studentId)
          .neq('status', 'pending_payment')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('users')
          .select('id, first_name, last_name, level, created_at')
          .eq('id', studentId)
          .maybeSingle(),
        supabase
          .from('teacher_student_notes')
          .select('*')
          .eq('teacher_user_id', teacherId)
          .eq('student_user_id', studentId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('teacher_conversations')
          .select('id')
          .eq('teacher_user_id', teacherId)
          .eq('student_user_id', studentId)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(1),
        supabase
          .from('teacher_monthly_course_confirmations')
          .select('status')
          .eq('teacher_user_id', teacherId)
          .eq('student_user_id', studentId)
          .limit(1),
      ]);
      if (trialsRes.error) throw trialsRes.error;

      const trials = ((trialsRes.data as any[]) ?? []).map((r) => ({ ...r }));
      // O'qituvchi faqat O'ZIGA sinov darsi bergan o'quvchini ochadi.
      if (trials.length === 0) return res.status(404).json({ error: 'Oʻquvchi topilmadi' });

      const u = (userRes.data as any) ?? {};
      const ism = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Oʻquvchi';
      const tasdiq = String(((confirmRes.data as any[]) ?? [])[0]?.status ?? '');

      const feedbackRes = await supabase
        .from('teacher_lesson_feedback')
        .select('*')
        .eq('teacher_user_id', teacherId)
        .eq('student_user_id', studentId)
        .limit(200);
      const hisobotlar = new Map<number, any>();
      for (const f of ((feedbackRes.data as any[]) ?? [])) {
        hisobotlar.set(Number(f.trial_lesson_id), f);
      }

      const now = Date.now();
      const tugagan = trials.filter((t) =>
        ['completed', 'completed_by_teacher'].includes(String(t.status))
      ).length;
      const bekor = trials.filter((t) => ['cancelled', 'refunded'].includes(String(t.status))).length;
      const kelayotgan = trials.filter(
        (t) => t.scheduled_starts_at && new Date(String(t.scheduled_starts_at)).getTime() > now
      );

      res.json({
        student: {
          user_id: studentId,
          name: ism,
          level: String(u.level ?? ''),
          status: tasdiq === 'matched_yes' ? 'active' : tasdiq === 'matched_no' ? 'finished' : 'trial',
          first_seen_at:
            trials
              .map((t) => String(t.created_at))
              .sort()[0] ?? null,
          next_lesson_at:
            kelayotgan
              .map((t) => String(t.scheduled_starts_at))
              .sort()[0] ?? null,
        },
        stats: {
          total: trials.length,
          done: tugagan,
          cancelled: bekor,
          upcoming: kelayotgan.length,
        },
        lessons: trials.map((t) => {
          const f = hisobotlar.get(Number(t.id)) ?? null;
          return {
            trial_id: Number(t.id),
            starts_at: t.scheduled_starts_at ? String(t.scheduled_starts_at) : null,
            status: String(t.status),
            created_at: String(t.created_at),
            duration_minutes:
              t.scheduled_starts_at && t.scheduled_ends_at
                ? Math.max(
                    10,
                    Math.round(
                      (new Date(String(t.scheduled_ends_at)).getTime() -
                        new Date(String(t.scheduled_starts_at)).getTime()) /
                        60000
                    )
                  )
                : 60,
            topic: f ? String(f.topic ?? '') : '',
            has_report: Boolean(f),
          };
        }),
        reports: [...hisobotlar.values()].map((f) => ({
          trial_lesson_id: Number(f.trial_lesson_id),
          topic: String(f.topic ?? ''),
          positives: String(f.positives ?? ''),
          negatives: String(f.negatives ?? ''),
          difficulties: String(f.difficulties ?? ''),
          next_steps: String(f.next_steps ?? ''),
          teacher_comment: String(f.teacher_comment ?? ''),
          lesson_rating: f.lesson_rating == null ? null : Number(f.lesson_rating),
          determined_level: f.determined_level ? String(f.determined_level) : null,
          lesson_went_well: f.lesson_went_well == null ? null : Boolean(f.lesson_went_well),
          student_enrolled_monthly_course:
            f.student_enrolled_monthly_course == null
              ? null
              : Boolean(f.student_enrolled_monthly_course),
          created_at: String(f.created_at),
        })),
        notes: ((notesRes.data as any[]) ?? []).map((n) => ({
          id: Number(n.id),
          body: String(n.body ?? ''),
          created_at: String(n.created_at),
        })),
        conversation_id: Number(((convRes.data as any[]) ?? [])[0]?.id) || null,
      });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/students/:studentId]', e);
      res.status(500).json({ error: 'Oʻquvchi maʼlumoti yuklanmadi' });
    }
  });

  router.post('/teacher/me/panel/students/:studentId/notes', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const studentId = Number(req.params?.studentId);
      const body = asString(req.body?.body).slice(0, 2000);
      if (!Number.isFinite(studentId)) return res.status(400).json({ error: 'ID notoʻgʻri' });
      if (!body) return res.status(400).json({ error: 'Eslatma boʻsh boʻlmasin' });

      // Faqat o'ziga dars bergan o'quvchi haqida eslatma yozadi.
      const { data: bogliq } = await supabase
        .from('teacher_trial_lessons')
        .select('id')
        .eq('teacher_user_id', teacherId)
        .eq('student_user_id', studentId)
        .limit(1);
      if (!((bogliq as any[]) ?? []).length) {
        return res.status(404).json({ error: 'Oʻquvchi topilmadi' });
      }

      const { data, error } = await supabase
        .from('teacher_student_notes')
        .insert({ teacher_user_id: teacherId, student_user_id: studentId, body })
        .select('*')
        .single();
      if (error) throw error;
      res.status(201).json({
        id: Number((data as any).id),
        body,
        created_at: String((data as any).created_at),
      });
    } catch (e) {
      console.error('[POST /api/teacher/me/panel/students/:studentId/notes]', e);
      res.status(500).json({ error: 'Eslatma saqlanmadi' });
    }
  });

  router.delete('/teacher/me/panel/notes/:noteId', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const id = Number(req.params?.noteId);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID notoʻgʻri' });
      const { error } = await supabase
        .from('teacher_student_notes')
        .delete()
        .eq('id', id)
        .eq('teacher_user_id', teacherId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      console.error('[DELETE /api/teacher/me/panel/notes/:noteId]', e);
      res.status(500).json({ error: 'Oʻchirilmadi' });
    }
  });

  /* --------------------------------------------------------------------------
   * DARS HISOBOTI (prototipdagi "Урок завершён")
   * ------------------------------------------------------------------------ */

  router.get('/teacher/me/panel/lessons/:trialId/report', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const trialId = Number(req.params?.trialId);
      if (!Number.isFinite(trialId)) return res.status(400).json({ error: 'ID notoʻgʻri' });

      const { data: trial } = await supabase
        .from('teacher_trial_lessons')
        .select('*')
        .eq('id', trialId)
        .eq('teacher_user_id', teacherId)
        .maybeSingle();
      if (!trial) return res.status(404).json({ error: 'Dars topilmadi' });

      const sid = Number((trial as any).student_user_id);
      const [{ data: u }, { data: f }] = await Promise.all([
        supabase.from('users').select('first_name, last_name, level').eq('id', sid).maybeSingle(),
        supabase
          .from('teacher_lesson_feedback')
          .select('*')
          .eq('trial_lesson_id', trialId)
          .maybeSingle(),
      ]);

      res.json({
        lesson: {
          trial_id: trialId,
          student_user_id: sid,
          student_name:
            `${(u as any)?.first_name ?? ''} ${(u as any)?.last_name ?? ''}`.trim() || 'Oʻquvchi',
          student_level: String((u as any)?.level ?? ''),
          status: String((trial as any).status),
          starts_at: (trial as any).scheduled_starts_at
            ? String((trial as any).scheduled_starts_at)
            : null,
          duration_minutes:
            (trial as any).scheduled_starts_at && (trial as any).scheduled_ends_at
              ? Math.max(
                  10,
                  Math.round(
                    (new Date(String((trial as any).scheduled_ends_at)).getTime() -
                      new Date(String((trial as any).scheduled_starts_at)).getTime()) /
                      60000
                  )
                )
              : 60,
        },
        report: f
          ? {
              topic: String((f as any).topic ?? ''),
              positives: String((f as any).positives ?? ''),
              negatives: String((f as any).negatives ?? ''),
              difficulties: String((f as any).difficulties ?? ''),
              next_steps: String((f as any).next_steps ?? ''),
              teacher_comment: String((f as any).teacher_comment ?? ''),
              lesson_rating:
                (f as any).lesson_rating == null ? null : Number((f as any).lesson_rating),
              determined_level: (f as any).determined_level
                ? String((f as any).determined_level)
                : null,
              lesson_went_well:
                (f as any).lesson_went_well == null ? null : Boolean((f as any).lesson_went_well),
              student_enrolled_monthly_course:
                (f as any).student_enrolled_monthly_course == null
                  ? null
                  : Boolean((f as any).student_enrolled_monthly_course),
            }
          : null,
      });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/lessons/:trialId/report]', e);
      res.status(500).json({ error: 'Hisobot yuklanmadi' });
    }
  });

  /**
   * Hisobotni saqlash. `complete: true` bo'lsa dars ham yakunlanadi va
   * o'quvchiga fikr qoldirish haqida xabar boradi.
   */
  router.post('/teacher/me/panel/lessons/:trialId/report', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const trialId = Number(req.params?.trialId);
      if (!Number.isFinite(trialId)) return res.status(400).json({ error: 'ID notoʻgʻri' });

      const { data: trial } = await supabase
        .from('teacher_trial_lessons')
        .select('id, student_user_id, status')
        .eq('id', trialId)
        .eq('teacher_user_id', teacherId)
        .maybeSingle();
      if (!trial) return res.status(404).json({ error: 'Dars topilmadi' });
      if (String((trial as any).status) === 'pending_payment') {
        return res.status(400).json({ error: "To'lov tasdiqlangach darsni yakunlash mumkin" });
      }

      const studentId = Number((trial as any).student_user_id);
      const baho = asNumber(req.body?.lesson_rating);
      const enrolled =
        typeof req.body?.student_enrolled_monthly_course === 'boolean'
          ? req.body.student_enrolled_monthly_course
          : null;
      const now = new Date().toISOString();

      const { error } = await supabase.from('teacher_lesson_feedback').upsert(
        {
          trial_lesson_id: trialId,
          teacher_user_id: teacherId,
          student_user_id: studentId,
          topic: asString(req.body?.topic).slice(0, 2000),
          positives: asString(req.body?.positives).slice(0, 2000),
          negatives: asString(req.body?.negatives).slice(0, 2000),
          difficulties: asString(req.body?.difficulties).slice(0, 2000),
          next_steps: asString(req.body?.next_steps).slice(0, 2000),
          teacher_comment: asString(req.body?.teacher_comment).slice(0, 2000),
          lesson_rating: baho == null ? null : Math.min(5, Math.max(1, Math.round(baho))),
          determined_level: asString(req.body?.determined_level).slice(0, 10) || null,
          lesson_went_well:
            typeof req.body?.lesson_went_well === 'boolean' ? req.body.lesson_went_well : null,
          student_enrolled_monthly_course: enrolled,
          updated_at: now,
        },
        { onConflict: 'trial_lesson_id' }
      );
      if (error) throw error;

      // "Kursga yozildimi" javobi — o'quvchi javobi bilan solishtirish uchun.
      if (enrolled != null) {
        await supabase.from('teacher_monthly_course_confirmations').upsert(
          {
            trial_lesson_id: trialId,
            teacher_user_id: teacherId,
            student_user_id: studentId,
            teacher_claimed_enrolled: enrolled,
            updated_at: now,
          },
          { onConflict: 'trial_lesson_id' }
        );
      }

      const yakunla =
        req.body?.complete === true &&
        !['completed', 'completed_by_teacher'].includes(String((trial as any).status));
      if (yakunla) {
        await supabase
          .from('teacher_trial_lessons')
          .update({ status: 'completed_by_teacher', completed_by_teacher_at: now, updated_at: now })
          .eq('id', trialId);
        await supabase.from('teacher_notifications').insert({
          recipient_user_id: studentId,
          type: 'student_review_available',
          title: 'Sinov darsi yakunlandi',
          body: 'Dars haqida fikringizni qoldiring.',
          entity_type: 'teacher_trial_lesson',
          entity_id: trialId,
        });
      }

      res.json({ success: true, completed: yakunla });
    } catch (e) {
      console.error('[POST /api/teacher/me/panel/lessons/:trialId/report]', e);
      res.status(500).json({ error: 'Hisobot saqlanmadi' });
    }
  });

  /* --------------------------------------------------------------------------
   * SHARHLAR, BILDIRISHNOMALAR, BIR MARTALIK BO'SH VAQT
   * ------------------------------------------------------------------------ */

  router.get('/teacher/me/panel/reviews', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;

      const { data, error } = await supabase
        .from('teacher_student_reviews')
        .select('*')
        .eq('teacher_user_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data as any[]) ?? [];

      const ids = [...new Set(rows.map((r) => Number(r.student_user_id)).filter(Number.isFinite))];
      const nomlar = new Map<number, string>();
      if (ids.length) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', ids);
        for (const u of ((users as any[]) ?? [])) {
          nomlar.set(
            Number(u.id),
            `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Oʻquvchi'
          );
        }
      }

      const bahos = rows.map((r) => Number(r.rating)).filter((n) => Number.isFinite(n));
      const breakdown: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
      for (const b of bahos) breakdown[String(Math.round(b))] = (breakdown[String(Math.round(b))] ?? 0) + 1;

      res.json({
        rating_avg: bahos.length
          ? Math.round((bahos.reduce((s, n) => s + n, 0) / bahos.length) * 10) / 10
          : 0,
        rating_count: bahos.length,
        breakdown,
        reviews: rows.map((r) => ({
          id: Number(r.id),
          student_name: nomlar.get(Number(r.student_user_id)) ?? 'Oʻquvchi',
          rating: Number(r.rating ?? 0),
          what_liked: String(r.what_liked ?? ''),
          what_was_missing: String(r.what_was_missing ?? ''),
          opinion: String(r.opinion ?? ''),
          enrolled_monthly_course:
            r.enrolled_monthly_course == null ? null : Boolean(r.enrolled_monthly_course),
          created_at: String(r.created_at),
        })),
      });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/reviews]', e);
      res.status(500).json({ error: 'Sharhlar yuklanmadi' });
    }
  });

  router.get('/teacher/me/panel/notifications', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const { data, error } = await supabase
        .from('teacher_notifications')
        .select('*')
        .eq('recipient_user_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      const rows = (data as any[]) ?? [];
      res.json({
        unread: rows.filter((n) => !n.read_at).length,
        notifications: rows.map((n) => ({
          id: Number(n.id),
          type: String(n.type ?? ''),
          title: String(n.title ?? ''),
          body: String(n.body ?? ''),
          read_at: n.read_at ? String(n.read_at) : null,
          created_at: String(n.created_at),
        })),
      });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/notifications]', e);
      res.status(500).json({ error: 'Bildirishnomalar yuklanmadi' });
    }
  });

  /** Bittasini yoki hammasini o'qilgan deb belgilash. */
  router.post('/teacher/me/panel/notifications/read', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const id = asNumber(req.body?.id);
      const now = new Date().toISOString();
      let q = supabase
        .from('teacher_notifications')
        .update({ read_at: now })
        .eq('recipient_user_id', teacherId);
      if (id != null) q = q.eq('id', Math.round(id));
      else q = q.is('read_at', null);
      const { error } = await q;
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      console.error('[POST /api/teacher/me/panel/notifications/read]', e);
      res.status(500).json({ error: 'Belgilanmadi' });
    }
  });

  /**
   * Jadvaldagi so'nggi o'zgarishlar (prototipdagi "История изменений").
   *
   * Matn SERVERDA tuzilmaydi — panel ikki tilli, shuning uchun faqat
   * hodisa turi va qiymatlari qaytadi.
   */
  router.get('/teacher/me/panel/schedule/activity', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;

      const [{ trials, byId }, rulesRes, excRes] = await Promise.all([
        panelMalumot(supabase, teacherId),
        supabase
          .from('teacher_availability_rules')
          .select('id, weekday, start_time, end_time, created_at')
          .eq('teacher_user_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('teacher_availability_exceptions')
          .select('id, exception_date, start_time, end_time, is_available, created_at')
          .eq('teacher_user_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      type Hodisa = {
        type: 'booked' | 'cancelled' | 'open' | 'block' | 'rule';
        at: string;
        student_name?: string;
        date?: string | null;
        start_time?: string | null;
        end_time?: string | null;
        weekday?: number;
      };

      const hodisalar: Hodisa[] = [];

      for (const t of trials.slice(0, 30)) {
        const ism = byId.get(Number(t.student_user_id))?.name ?? 'Oʻquvchi';
        if (['cancelled', 'refunded'].includes(String(t.status))) {
          hodisalar.push({
            type: 'cancelled',
            at: String(t.updated_at ?? t.created_at),
            student_name: ism,
            date: t.scheduled_starts_at ? String(t.scheduled_starts_at) : null,
          });
        } else if (t.scheduled_starts_at) {
          hodisalar.push({
            type: 'booked',
            at: String(t.created_at),
            student_name: ism,
            date: String(t.scheduled_starts_at),
          });
        }
      }

      for (const r of ((rulesRes.data as any[]) ?? [])) {
        hodisalar.push({
          type: 'rule',
          at: String(r.created_at),
          weekday: Number(r.weekday),
          start_time: String(r.start_time).slice(0, 5),
          end_time: String(r.end_time).slice(0, 5),
        });
      }

      for (const e of ((excRes.data as any[]) ?? [])) {
        hodisalar.push({
          type: e.is_available ? 'open' : 'block',
          at: String(e.created_at),
          date: sanaMatn(e.exception_date),
          start_time: e.start_time ? String(e.start_time).slice(0, 5) : null,
          end_time: e.end_time ? String(e.end_time).slice(0, 5) : null,
        });
      }

      hodisalar.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
      res.json({ events: hodisalar.slice(0, 8) });
    } catch (e) {
      console.error('[GET /api/teacher/me/panel/schedule/activity]', e);
      res.status(500).json({ error: 'Oʻzgarishlar yuklanmadi' });
    }
  });

  /**
   * Bir martalik bo'sh vaqt (aniq sanaga). Haftalik qoidadan farqi: faqat
   * shu kunga tegishli, takrorlanmaydi.
   */
  router.post('/teacher/me/panel/availability/open', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.userId);
      if (!(await ensureTeacherAccount(supabase, teacherId, res))) return;
      const date = asString(req.body?.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Sana notoʻgʻri' });
      const boshi = vaqtDaqiqa(req.body?.start_time);
      const oxiri = vaqtDaqiqa(req.body?.end_time);
      const slot = Math.min(Math.max(Number(req.body?.slot_minutes ?? 60) || 60, 15), 240);
      if (boshi == null || oxiri == null || oxiri <= boshi) {
        return res.status(400).json({ error: 'Vaqt oraligʻi notoʻgʻri' });
      }
      if (oxiri - boshi < slot) {
        return res.status(400).json({ error: 'Oraliq kamida bitta darsga yetmaydi' });
      }

      const { data, error } = await supabase
        .from('teacher_availability_exceptions')
        .insert({
          teacher_user_id: teacherId,
          exception_date: date,
          start_time: `${daqiqaVaqt(boshi)}:00`,
          end_time: `${daqiqaVaqt(oxiri)}:00`,
          is_available: true,
          slot_minutes: slot,
          note: asString(req.body?.note).slice(0, 200),
        })
        .select('*')
        .single();
      if (error) throw error;
      res.status(201).json({
        id: Number((data as any).id),
        date,
        start_time: daqiqaVaqt(boshi),
        end_time: daqiqaVaqt(oxiri),
        slot_minutes: slot,
      });
    } catch (e) {
      console.error('[POST /api/teacher/me/panel/availability/open]', e);
      res.status(500).json({ error: 'Boʻsh vaqt saqlanmadi' });
    }
  });

  return router;
}
