import type { DbClient } from '../types/dbClient';
import { MEET_DOMAIN, generateRoomSlug } from './teacherMeet.service.js';

/**
 * liveStream.service.ts — support ochadigan JONLI EFIR (vebinar).
 *
 * Formati: support kamera va mikrofon bilan gapiradi, ro'yxatdan o'tgan
 * istalgan foydalanuvchi kirib tomosha qiladi va yozma chatda savol beradi.
 * So'z berish Jitsi ichida moderator (support) qo'lida.
 *
 * NIMA UCHUN SLUG YASHIRIN.
 * Jitsi bu serverda `jitsi-anonymous` rejimida ishlaydi — ya'ni xonaga
 * BIRINCHI kirgan odam moderator bo'lib qoladi va boshqalarni chiqarib
 * yubora oladi. Shuning uchun xona nomi tasodifiy va u talabaga FAQAT efir
 * `live` holatiga o'tgandan keyin beriladi. Support esa efirni boshlash
 * paytida xonaga birinchi kiradi va moderator bo'ladi.
 *
 * Bu himoya to'liq emas: efir boshlangach xona nomini bilgan talaba Jitsi
 * sahifasini to'g'ridan-to'g'ri ochib, o'zining mikrofonini yoqishi mumkin.
 * U moderator BO'LMAYDI, ya'ni support uni o'chirib yoki chiqarib yubora
 * oladi. To'liq yopish uchun Jitsi'da JWT autentifikatsiyasi kerak — u
 * hozirgi o'qituvchi darslarini ham qayta yozishni talab qiladi.
 */

/**
 * Efirni FAQAT oltin support hisobi boshqaradi (`users.is_golden`).
 *
 * Admin paneli bu ishga aralashmaydi: efirni jonli olib boradigan odam
 * support, ya'ni u o'z hisobidan — oddiy ilova ichidan — boshlaydi va
 * tugatadi. Belgi telefon raqamiga emas, ustunga bog'langan (migratsiya 154).
 */
export async function isSupportAccount(supabase: DbClient, userId: number): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('is_golden')
    .eq('id', userId)
    .maybeSingle();
  return (data as { is_golden?: boolean } | null)?.is_golden === true;
}

export type LiveStreamStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export type LiveStreamRow = {
  id: number;
  room_slug: string;
  title: string;
  description: string;
  status: LiveStreamStatus;
  starts_at: string | null;
  duration_minutes: number;
  started_at: string | null;
  ended_at: string | null;
  created_by_admin_id: number | null;
  created_at: string;
  updated_at: string;
};

/** Talabaga yuboriladigan ko'rinish — xona nomi faqat jonli efirda bo'ladi. */
export type PublicLiveStream = {
  id: number;
  title: string;
  description: string;
  status: LiveStreamStatus;
  starts_at: string | null;
  duration_minutes: number;
  started_at: string | null;
  /** Faqat `status === 'live'` bo'lganda to'ldiriladi. */
  room_slug: string | null;
};

const SELECT_COLS =
  'id, room_slug, title, description, status, starts_at, duration_minutes, started_at, ended_at, created_by_admin_id, created_at, updated_at';

function toRow(r: unknown): LiveStreamRow {
  const x = (r ?? {}) as Record<string, unknown>;
  return {
    ...(x as unknown as LiveStreamRow),
    id: Number(x.id),
    duration_minutes: Number(x.duration_minutes ?? 60),
    created_by_admin_id:
      x.created_by_admin_id == null ? null : Number(x.created_by_admin_id),
  };
}

function toPublic(r: LiveStreamRow): PublicLiveStream {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    starts_at: r.starts_at,
    duration_minutes: r.duration_minutes,
    started_at: r.started_at,
    room_slug: r.status === 'live' ? r.room_slug : null,
  };
}

/** Rejalashtirilgan efir shu muddatdan keyin ro'yxatdan tushadi. */
const KECHIKISH_CHEGARASI_MS = 6 * 60 * 60 * 1000;

export type CreateInput = {
  title: string;
  description?: string;
  /** ISO vaqt. `startNow` bo'lsa e'tiborga olinmaydi. */
  startsAt?: string | null;
  durationMinutes?: number;
  /** true — yozuv darhol `live` holatida ochiladi. */
  startNow?: boolean;
  adminId: number | null;
};

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** Hozir jonli turgan efir (bo'lmasa null). */
export async function getLiveStream(supabase: DbClient): Promise<LiveStreamRow | null> {
  const { data, error } = await supabase
    .from('live_streams')
    .select(SELECT_COLS)
    .eq('status', 'live')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRow(data) : null;
}

/**
 * Talaba uchun holat: jonli efir + yaqin kunlardagi rejalashtirilganlar.
 * Xona nomi faqat jonli efirda qaytariladi.
 */
export async function getPublicState(supabase: DbClient): Promise<{
  domain: string;
  live: PublicLiveStream | null;
  upcoming: PublicLiveStream[];
}> {
  const live = await getLiveStream(supabase);

  // Vaqti o'tib ketgan, lekin yopilmagan rejalar ro'yxatni to'ldirmasin.
  const chegara = new Date(Date.now() - KECHIKISH_CHEGARASI_MS).toISOString();
  const { data, error } = await supabase
    .from('live_streams')
    .select(SELECT_COLS)
    .eq('status', 'scheduled')
    .gte('starts_at', chegara)
    .order('starts_at', { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);

  return {
    domain: MEET_DOMAIN,
    live: live ? toPublic(live) : null,
    upcoming: ((data as unknown[]) ?? []).map((r) => toPublic(toRow(r))),
  };
}

/** Admin ro'yxati — bekor qilingan va tugaganlari bilan birga. */
export async function listForAdmin(supabase: DbClient): Promise<{
  domain: string;
  streams: LiveStreamRow[];
}> {
  const { data, error } = await supabase
    .from('live_streams')
    .select(SELECT_COLS)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return { domain: MEET_DOMAIN, streams: ((data as unknown[]) ?? []).map(toRow) };
}

export async function createStream(
  supabase: DbClient,
  input: CreateInput,
): Promise<ServiceResult<LiveStreamRow>> {
  const title = String(input.title ?? '').trim().slice(0, 200);
  if (!title) return { ok: false, status: 400, error: 'Efir nomi kerak' };

  const durationMinutes = Math.min(300, Math.max(10, Number(input.durationMinutes) || 60));
  const startNow = input.startNow === true;

  let startsAt: string | null = null;
  if (!startNow) {
    const raw = String(input.startsAt ?? '').trim();
    const d = raw ? new Date(raw) : null;
    if (!d || Number.isNaN(d.getTime())) {
      return { ok: false, status: 400, error: 'Boshlanish vaqti kerak' };
    }
    startsAt = d.toISOString();
  }

  // Bir vaqtda ikkita jonli efir bo'lmaydi (bazada ham unikal indeks bor,
  // lekin foydalanuvchiga tushunarli xabar shu yerda beriladi).
  if (startNow) {
    const mavjud = await getLiveStream(supabase);
    if (mavjud) {
      return { ok: false, status: 409, error: 'Hozir boshqa efir jonli turibdi. Avval uni tugating.' };
    }
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('live_streams')
    .insert({
      room_slug: generateRoomSlug(),
      title,
      description: String(input.description ?? '').trim().slice(0, 2000),
      status: startNow ? 'live' : 'scheduled',
      starts_at: startNow ? nowIso : startsAt,
      duration_minutes: durationMinutes,
      started_at: startNow ? nowIso : null,
      created_by_admin_id: input.adminId,
    })
    .select(SELECT_COLS)
    .single();

  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, data: toRow(data) };
}

export async function startStream(
  supabase: DbClient,
  id: number,
): Promise<ServiceResult<LiveStreamRow>> {
  const { data: row, error: readErr } = await supabase
    .from('live_streams')
    .select(SELECT_COLS)
    .eq('id', id)
    .maybeSingle();
  if (readErr) return { ok: false, status: 500, error: readErr.message };
  if (!row) return { ok: false, status: 404, error: 'Efir topilmadi' };

  const joriy = toRow(row);
  if (joriy.status === 'live') return { ok: true, data: joriy };
  if (joriy.status !== 'scheduled') {
    return { ok: false, status: 400, error: 'Bu efir allaqachon yakunlangan' };
  }

  const mavjud = await getLiveStream(supabase);
  if (mavjud) {
    return { ok: false, status: 409, error: 'Hozir boshqa efir jonli turibdi. Avval uni tugating.' };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('live_streams')
    .update({ status: 'live', started_at: nowIso, updated_at: nowIso })
    .eq('id', id)
    .select(SELECT_COLS)
    .single();
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, data: toRow(data) };
}

export async function endStream(
  supabase: DbClient,
  id: number,
): Promise<ServiceResult<LiveStreamRow>> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('live_streams')
    .update({ status: 'ended', ended_at: nowIso, updated_at: nowIso })
    .eq('id', id)
    .select(SELECT_COLS)
    .single();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: 'Efir topilmadi' };
  return { ok: true, data: toRow(data) };
}

export async function cancelStream(
  supabase: DbClient,
  id: number,
): Promise<ServiceResult<LiveStreamRow>> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('live_streams')
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select(SELECT_COLS)
    .single();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 400, error: 'Faqat rejalashtirilgan efirni bekor qilish mumkin' };
  return { ok: true, data: toRow(data) };
}

/** Support efirga host sifatida kiradi — xona nomi shu yerda beriladi. */
export async function getHostRoom(
  supabase: DbClient,
  id: number,
): Promise<ServiceResult<{ domain: string; room_slug: string; title: string }>> {
  const { data, error } = await supabase
    .from('live_streams')
    .select(SELECT_COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: 'Efir topilmadi' };
  const row = toRow(data);
  return { ok: true, data: { domain: MEET_DOMAIN, room_slug: row.room_slug, title: row.title } };
}
