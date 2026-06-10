import type { DbClient } from '../types/dbClient';
import {
  isTeacherListingPlanCode,
  type TeacherListingPlanCode,
} from '../../shared/paymentProducts.js';

export async function ensureTeacherListingSubscription(
  supabase: DbClient,
  teacherUserId: number,
  paymentId: number,
  planCode: TeacherListingPlanCode
): Promise<void> {
  const { data: profile } = await supabase
    .from('teacher_profiles')
    .select('user_id')
    .eq('user_id', teacherUserId)
    .maybeSingle();
  if (!profile) {
    throw new Error("Avval o'qituvchi anketasini to'ldiring");
  }

  const { data: existing } = await supabase
    .from('teacher_listing_subscriptions')
    .select('id')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from('teacher_listing_subscriptions').insert({
    teacher_user_id: teacherUserId,
    payment_id: paymentId,
    plan_code: planCode,
    status: 'pending',
  });
  if (error) throw error;
}

export function parseTeacherListingPlanCode(body: Record<string, unknown>): TeacherListingPlanCode | null {
  const raw = body.listing_plan_code ?? body.listingPlanCode ?? body.plan_code ?? body.planCode;
  return isTeacherListingPlanCode(raw) ? raw : null;
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
    .select('duration_days')
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

export async function activateTeacherMarketplacePayment(
  supabase: DbClient,
  params: { paymentId: number; userId: number; productCode?: string | null }
): Promise<void> {
  if (params.productCode === 'teacher_trial') {
    await activateTeacherTrialPayment(supabase, params.paymentId);
    return;
  }
  if (params.productCode === 'teacher_listing') {
    await activateTeacherListingPayment(supabase, params.paymentId, params.userId);
  }
}
