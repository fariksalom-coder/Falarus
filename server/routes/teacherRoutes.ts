import { Router, type Request, type Response } from 'express';
import type { DbClient } from '../types/dbClient';
import { isCurrencyCode } from '../../shared/paymentProducts.js';

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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
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

async function ensureTeacherAccount(supabase: DbClient, userId: number, res: Response): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id, account_type')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if ((data as any)?.account_type !== 'teacher') {
    res.status(403).json({ error: "Bu kabinet faqat o'qituvchilar uchun" });
    return false;
  }
  return true;
}

function normalizeTelegramUsername(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const username = raw.replace(/^@+/, '').replace(/\s+/g, '');
  return username || null;
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
    updated_at: new Date().toISOString(),
  };
}

function resolveProfileStatusOnSave(
  existing: { profile_status?: string | null; listing_paid_until?: string | null } | null
): string {
  const listingActive =
    !!existing?.listing_paid_until && new Date(existing.listing_paid_until).getTime() > Date.now();
  const current = existing?.profile_status ?? 'draft';

  if (current === 'paused' || current === 'rejected') {
    return current;
  }

  if (listingActive) {
    return 'active';
  }

  if (!existing || current === 'draft') {
    return 'pending_review';
  }

  return current;
}

async function shareTrialContactsAndOpenChat(
  supabase: DbClient,
  trial: {
    id: number;
    teacher_user_id: number;
    student_user_id: number;
  }
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

  await supabase.from('teacher_conversations').upsert(
    {
      trial_lesson_id: trial.id,
      teacher_user_id: trial.teacher_user_id,
      student_user_id: trial.student_user_id,
      status: 'active',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'trial_lesson_id' }
  );

  await supabase.from('teacher_notifications').insert({
    recipient_user_id: trial.teacher_user_id,
    type: 'trial_lesson_paid',
    title: 'Yangi sinov darsi',
    body: 'O‘quvchi sinov darsi uchun to‘lov qildi. U bilan bog‘laning.',
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

export async function activateTeacherListingPayment(
  supabase: DbClient,
  paymentId: number,
  userId: number
): Promise<void> {
  const { data: subscription } = await supabase
    .from('teacher_listing_subscriptions')
    .select('id, teacher_user_id, plan_code')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (!subscription) return;

  const planCode = String((subscription as any).plan_code);
  const { data: plan } = await supabase
    .from('teacher_listing_plans')
    .select('duration_days, is_intro_offer')
    .eq('code', planCode)
    .maybeSingle();
  const durationDays = Number((plan as any)?.duration_days ?? 30);
  const teacherUserId = Number((subscription as any).teacher_user_id ?? userId);
  const startsAt = new Date();
  const expiresAt = new Date(startsAt);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  await supabase
    .from('teacher_listing_subscriptions')
    .update({
      status: 'active',
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: startsAt.toISOString(),
    })
    .eq('id', Number((subscription as any).id));

  await supabase
    .from('teacher_profiles')
    .update({
      profile_status: 'active',
      listing_paid_until: expiresAt.toISOString(),
      first_listing_discount_used: true,
      updated_at: startsAt.toISOString(),
    })
    .eq('user_id', teacherUserId);
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
        .gt('listing_paid_until', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(50);
      if (search) {
        query = query.ilike('display_name', `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      res.json(data ?? []);
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
          .select(teacherPublicSelect())
          .eq('user_id', teacherId)
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
      res.json({
        profile: profileRes.data ?? null,
        trial_lessons: lessonsRes.data ?? [],
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
      const planCode = asString(req.body?.plan_code || req.body?.planCode, 'teacher_listing_first_month_uzs');
      const { data: profile } = await supabase
        .from('teacher_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (!profile) return res.status(400).json({ error: 'Avval o‘qituvchi anketasini to‘ldiring' });

      const { data: plan, error: planErr } = await supabase
        .from('teacher_listing_plans')
        .select('code, price_amount, currency')
        .eq('code', planCode)
        .eq('is_active', true)
        .maybeSingle();
      if (planErr) throw planErr;
      if (!plan) return res.status(404).json({ error: 'Tarif topilmadi' });

      const amount = Number((plan as any).price_amount);
      const currency = String((plan as any).currency);
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

  router.post('/teachers/:teacherId/trial-lessons', authenticate, async (req: any, res) => {
    try {
      const teacherId = Number(req.params.teacherId);
      const studentId = Number(req.userId);
      if (!Number.isFinite(teacherId) || teacherId === studentId) {
        return res.status(400).json({ error: 'O‘qituvchi noto‘g‘ri' });
      }
      const { data: teacher } = await supabase
        .from('teacher_profiles')
        .select('user_id, profile_status, listing_paid_until')
        .eq('user_id', teacherId)
        .maybeSingle();
      if (!teacher) return res.status(404).json({ error: 'O‘qituvchi topilmadi' });

      const nowIso = new Date().toISOString();
      if (
        (teacher as any).profile_status !== 'active' ||
        !(teacher as any).listing_paid_until ||
        String((teacher as any).listing_paid_until) <= nowIso
      ) {
        return res.status(403).json({ error: 'O‘qituvchi hozir ro‘yxatda faol emas' });
      }

      const { data, error } = await supabase
        .from('teacher_trial_lessons')
        .insert({
          teacher_user_id: teacherId,
          student_user_id: studentId,
          requested_starts_at: asString(req.body?.requested_starts_at || req.body?.requestedStartsAt) || null,
          student_phone_e164: asString(req.body?.student_phone_e164 || req.body?.studentPhoneE164) || null,
          student_email: asString(req.body?.student_email || req.body?.studentEmail) || null,
          student_message: asString(req.body?.student_message || req.body?.studentMessage),
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

  return router;
}
