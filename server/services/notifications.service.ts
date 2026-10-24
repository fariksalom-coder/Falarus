/**
 * BILDIRISHNOMALAR — matnli va ovozli xabarlar.
 *
 * Bir xabar uch yo'l bilan yetadi:
 *   1. Ilova ichida («kirish qutisi», `notifications` jadvali) — ilova ochilganda
 *      ko'rilmagan xabar kartochka bo'lib chiqadi va OVOZI o'ynaydi.
 *   2. Web push — sayt/PWA obunalari (push_subscriptions).
 *   3. FCM — mobil ilova tokenlari (push_devices), FCM sozlangan bo'lsa.
 *
 * Ovoz yopiq telefonda o'z-o'zidan gapirmaydi (web push ham, FCM ham ixtiyoriy
 * audio chala olmaydi). Bildirishnoma bosilganda ilova ochiladi va ovoz o'ynaydi;
 * ilova ochiq turganda (masalan, kun yopilganda) ovoz darhol eshitiladi.
 *
 * Qoidalar (notification_rules) har soatda tekshiriladi: soati kelgan va yoqilgan
 * qoida o'z shartidagi odamlarga yuboradi. `dedupe_key` (qoida + Toshkent sanasi)
 * bir odamga kuniga bir martadan ortiq ketishiga yo'l qo'ymaydi.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../lib/db.js';

export type Query = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
export type Trigger = 'no_study_today' | 'inactive_days' | 'registered_not_started' | 'day_completed';
export type Segment = 'all' | 'subscribers' | 'inactive' | 'not_started' | 'user';

export type Rule = {
  id: number; code: string; trigger: Trigger; param: number; send_hour: number;
  title: string; body: string; url: string; voice_text: string | null; audio_url: string | null; enabled: boolean;
};
export type Message = { title: string; body: string; url: string; audio_url: string | null };

/** Push yuboruvchilar — testda soxtasi beriladi. Qaytaradi: xabar yetgan odamlar. */
export type Pushers = {
  web: (userIds: number[], m: Message) => Promise<number[]>;
  app: (userIds: number[], m: Message) => Promise<number[]>;
};

const VISIBLE = "u.is_golden IS NOT TRUE AND u.account_type IS DISTINCT FROM 'teacher'";
const TASHKENT_TODAY = "(date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent')";
/** Bir qoida bir martada ko'pi bilan shuncha odamga — xato shart butun bazaga ketmasin. */
export const MAX_PER_RUN = 20000;

const defaultQuery: Query | null = pool ? (sql, params) => pool!.query(sql, params) : null;
function db(q?: Query): Query {
  const r = q ?? defaultQuery;
  if (!r) throw new Error('Database unavailable');
  return r;
}

export function tashkentDate(d = new Date()): string {
  return new Date(d.getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
}
export function tashkentHour(d = new Date()): number {
  return new Date(d.getTime() + 5 * 3_600_000).getUTCHours();
}

/** Ichki manzil: faqat `/` bilan boshlanadigan yo'l (tashqi saytga yo'naltirib bo'lmasin). */
export function safeUrl(v: unknown): string {
  const s = String(v ?? '').trim();
  return /^\/(?!\/)[^\s]*$/.test(s) ? s.slice(0, 300) : '/';
}

/** Qoida sharti → foydalanuvchi id lari uchun SQL (param — $1). */
function triggerSql(trigger: Trigger): string | null {
  switch (trigger) {
    case 'no_study_today':
      // Oxirgi N kunda dars qilgan, lekin bugun hali qilmagan.
      return `SELECT u.id FROM users u WHERE ${VISIBLE}
        AND EXISTS (SELECT 1 FROM user_kunlik_day_progress p WHERE p.user_id = u.id AND p.updated_at >= now() - ($1::int * interval '1 day'))
        AND NOT EXISTS (SELECT 1 FROM user_kunlik_day_progress p WHERE p.user_id = u.id AND p.updated_at >= ${TASHKENT_TODAY})`;
    case 'inactive_days':
      // Aynan N-kuni: oxirgi kirish [N+1, N) kun oldin — har uzilishda bir marta.
      return `SELECT u.id FROM users u WHERE ${VISIBLE}
        AND u.last_seen_at < now() - ($1::int * interval '1 day')
        AND u.last_seen_at >= now() - (($1::int + 1) * interval '1 day')`;
    case 'registered_not_started':
      return `SELECT u.id FROM users u WHERE ${VISIBLE}
        AND u.created_at < now() - ($1::int * interval '1 day')
        AND u.created_at >= now() - (($1::int + 1) * interval '1 day')
        AND NOT EXISTS (SELECT 1 FROM user_kunlik_day_progress p WHERE p.user_id = u.id)`;
    default:
      return null;
  }
}

function segmentSql(segment: Segment): string {
  switch (segment) {
    case 'subscribers': return `SELECT u.id FROM users u WHERE ${VISIBLE} AND u.plan_expires_at > now() AND $1::int >= 0`;
    case 'inactive': return `SELECT u.id FROM users u WHERE ${VISIBLE} AND (u.last_seen_at IS NULL OR u.last_seen_at < now() - ($1::int * interval '1 day'))`;
    case 'not_started': return `SELECT u.id FROM users u WHERE ${VISIBLE} AND $1::int >= 0 AND NOT EXISTS (SELECT 1 FROM user_kunlik_day_progress p WHERE p.user_id = u.id)`;
    case 'user': return `SELECT u.id FROM users u WHERE u.id = $1::bigint`;
    default: return `SELECT u.id FROM users u WHERE ${VISIBLE} AND $1::int >= 0`;
  }
}

export const SEGMENTS: Segment[] = ['all', 'subscribers', 'inactive', 'not_started', 'user'];
export const isSegment = (v: unknown): v is Segment => SEGMENTS.includes(v as Segment);

export async function ruleAudience(rule: Pick<Rule, 'trigger' | 'param'>, q?: Query): Promise<number[]> {
  const sql = triggerSql(rule.trigger);
  if (!sql) return [];
  const { rows } = await db(q)(`${sql} ORDER BY u.id LIMIT ${MAX_PER_RUN}`, [rule.param]);
  return rows.map((r) => Number(r.id));
}

export async function segmentAudience(segment: Segment, param: number, q?: Query): Promise<number[]> {
  const { rows } = await db(q)(segmentSql(segment), [param]);
  return rows.map((r) => Number(r.id));
}

/**
 * Xabarni kirish qutisiga yozadi va push yuboradi. Faqat YANGI yozilganlarga
 * push ketadi (dedupe_key takrori — jim o'tkazib yuboriladi).
 */
export async function deliver(
  userIds: number[],
  m: Message,
  meta: { dedupeKey: string; ruleId?: number | null; campaignId?: number | null; push?: boolean },
  pushers: Pushers,
  q?: Query,
): Promise<{ created: number; pushed: number }> {
  if (userIds.length === 0) return { created: 0, pushed: 0 };
  const run = db(q);
  const fresh: number[] = [];
  for (let i = 0; i < userIds.length; i += 1000) {
    const { rows } = await run(
      `INSERT INTO notifications (user_id, rule_id, campaign_id, title, body, url, audio_url, dedupe_key)
       SELECT uid, $2, $3, $4, $5, $6, $7, $8 FROM unnest($1::bigint[]) AS uid
       ON CONFLICT (user_id, dedupe_key) DO NOTHING RETURNING user_id`,
      [userIds.slice(i, i + 1000), meta.ruleId ?? null, meta.campaignId ?? null, m.title, m.body, m.url, m.audio_url, meta.dedupeKey],
    );
    for (const r of rows) fresh.push(Number(r.user_id));
  }
  if (fresh.length === 0 || meta.push === false) return { created: fresh.length, pushed: 0 };

  const reached = new Set<number>();
  const settle = async (fn: () => Promise<number[]>) => {
    try { for (const id of await fn()) reached.add(id); } catch (e) { console.error('[bildirishnoma] push:', (e as Error).message); }
  };
  await Promise.all([settle(() => pushers.web(fresh, m)), settle(() => pushers.app(fresh, m))]);
  if (reached.size) {
    await run(`UPDATE notifications SET pushed = 1 WHERE dedupe_key = $1 AND user_id = ANY($2::bigint[])`, [meta.dedupeKey, [...reached]]);
  }
  return { created: fresh.length, pushed: reached.size };
}

/** Haqiqiy push yuboruvchilar: web push + FCM. */
export async function livePushers(): Promise<Pushers> {
  const push = await import('./push.service.js');
  const fcm = await import('./fcm.service.js');
  return {
    web: async (ids, m) => (await push.foydalanuvchilargaYubor(ids, { title: m.title, body: m.body, url: m.url, tag: 'falarus-xabar', kind: 'xabar' })).odamlar,
    app: async (ids, m) => {
      if (!fcm.fcmSozlanganmi()) return [];
      const run = db();
      const { rows } = await run('SELECT user_id, token FROM push_devices WHERE user_id = ANY($1::bigint[])', [ids]);
      if (rows.length === 0) return [];
      const r = await fcm.fcmYubor(rows.map((x) => String(x.token)), { title: m.title, body: m.body, url: m.url, audioUrl: m.audio_url });
      if (r.olik.length) await run('DELETE FROM push_devices WHERE token = ANY($1::text[])', [r.olik]);
      const dead = new Set(r.olik);
      return [...new Set(rows.filter((x) => !dead.has(String(x.token))).map((x) => Number(x.user_id)))];
    },
  };
}

const ruleMessage = (r: Rule): Message => ({ title: r.title, body: r.body, url: safeUrl(r.url), audio_url: r.audio_url });

/** Soati kelgan yoqilgan qoidalarni yuritadi (har soatda chaqiriladi). */
export async function runScheduledRules(now = new Date(), pushers?: Pushers, q?: Query) {
  const run = db(q);
  const { rows } = await run(
    `SELECT * FROM notification_rules WHERE enabled AND trigger <> 'day_completed' AND send_hour = $1 ORDER BY id`,
    [tashkentHour(now)],
  );
  const results: { rule: string; created: number; pushed: number }[] = [];
  if (rows.length === 0) return results;
  const p = pushers ?? (await livePushers());
  for (const rule of rows as Rule[]) {
    const ids = await ruleAudience(rule, q);
    const r = await deliver(ids, ruleMessage(rule), { dedupeKey: `r${rule.id}:${tashkentDate(now)}`, ruleId: rule.id }, p, q);
    results.push({ rule: rule.code, ...r });
    console.log(`[bildirishnoma] ${rule.code}: ${r.created} ta yozildi, ${r.pushed} kishiga push`);
  }
  return results;
}

/**
 * Kun yopilganda — ilova ochiq, shuning uchun push emas: kirish qutisiga yoziladi
 * va ilova uni darhol ovozi bilan ko'rsatadi.
 */
export async function onDayCompleted(userId: number, dayNumber: number, q?: Query) {
  const run = db(q);
  const { rows } = await run(`SELECT * FROM notification_rules WHERE enabled AND trigger = 'day_completed' LIMIT 1`);
  const rule = rows[0] as Rule | undefined;
  if (!rule) return { created: 0, pushed: 0 };
  const m = ruleMessage(rule);
  const fill = (s: string) => s.replaceAll('{kun}', String(dayNumber));
  const noPush: Pushers = { web: async () => [], app: async () => [] };
  return deliver([userId], { ...m, title: fill(m.title), body: fill(m.body) }, { dedupeKey: `r${rule.id}:d${dayNumber}`, ruleId: rule.id, push: false }, noPush, q);
}

// ---------- foydalanuvchi: kirish qutisi ----------

export async function inbox(userId: number, q?: Query) {
  const { rows } = await db(q)(
    `SELECT id, title, body, url, audio_url, created_at, seen_at, opened_at FROM notifications
     WHERE user_id = $1 AND created_at > now() - interval '30 days' ORDER BY created_at DESC LIMIT 30`,
    [userId],
  );
  return {
    items: rows,
    // Ko'rsatiladigan karta: oxirgi 3 kundagi ko'rilmagan eng yangisi.
    unseen: rows.filter((r) => !r.seen_at && Date.parse(r.created_at) > Date.now() - 3 * 86_400_000).length,
  };
}

export async function markNotification(userId: number, id: number, what: 'seen' | 'opened', q?: Query) {
  const set = what === 'opened' ? 'seen_at = coalesce(seen_at, now()), opened_at = coalesce(opened_at, now())' : 'seen_at = coalesce(seen_at, now())';
  await db(q)(`UPDATE notifications SET ${set} WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function saveDevice(userId: number, platform: 'android' | 'ios', token: string, q?: Query) {
  await db(q)(
    `INSERT INTO push_devices (user_id, platform, token) VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_seen_at = now()`,
    [userId, platform, token.slice(0, 4096)],
  );
}

// ---------- ovoz ----------

/**
 * Matndan ovoz yaratadi (platformaning doska ovozi) va uploads/ ga saqlaydi.
 * Har matn bir marta: fayl nomi matn xeshidan.
 */
export async function generateVoice(text: string, uploadsDir: string): Promise<string> {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Ovoz matni bo‘sh');
  const { speak } = await import('./tts.service.js');
  const { audio, mime } = await speak(clean, { ohang: 'ustoz' });
  const ext = mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'mp3';
  return saveVoiceFile(audio, ext, uploadsDir, clean);
}

export async function saveVoiceFile(data: Buffer, ext: string, uploadsDir: string, seed = ''): Promise<string> {
  const name = `${createHash('sha256').update(seed || data).digest('hex').slice(0, 24)}.${ext}`;
  const dir = path.join(uploadsDir, 'bildirishnoma-ovoz');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), data);
  return `/uploads/bildirishnoma-ovoz/${name}`;
}

// ---------- admin ----------

export async function adminOverview(q?: Query) {
  const run = db(q);
  const [rules, stats, reach, campaigns] = await Promise.all([
    run(`SELECT * FROM notification_rules ORDER BY id`),
    run(`SELECT rule_id, count(*) FILTER (WHERE created_at >= ${TASHKENT_TODAY})::int today,
                count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int week,
                count(*) FILTER (WHERE created_at >= now() - interval '7 days' AND opened_at IS NOT NULL)::int opened
         FROM notifications WHERE created_at >= now() - interval '7 days' GROUP BY rule_id`),
    run(`SELECT (SELECT count(DISTINCT user_id) FROM push_subscriptions)::int web_people,
                (SELECT count(*) FROM push_subscriptions)::int web_devices,
                (SELECT count(DISTINCT user_id) FROM push_devices)::int app_people`),
    run(`SELECT c.*, (SELECT count(*) FROM notifications n WHERE n.campaign_id = c.id AND n.opened_at IS NOT NULL)::int opened
         FROM notification_campaigns c ORDER BY c.id DESC LIMIT 20`),
  ]);
  const byRule = new Map(stats.rows.map((r) => [r.rule_id === null ? null : Number(r.rule_id), r]));
  return {
    reach: reach.rows[0],
    rules: rules.rows.map((r) => ({ ...r, id: Number(r.id), stats: byRule.get(Number(r.id)) ?? { today: 0, week: 0, opened: 0 } })),
    campaigns: campaigns.rows.map((c) => ({ ...c, id: Number(c.id) })),
  };
}

export async function updateRule(id: number, b: Record<string, unknown>, q?: Query) {
  const run = db(q);
  const cur = (await run('SELECT * FROM notification_rules WHERE id = $1', [id])).rows[0] as Rule | undefined;
  if (!cur) throw Object.assign(new Error('Qoida topilmadi'), { status: 404 });
  const text = (v: unknown, max: number, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback);
  const int = (v: unknown, lo: number, hi: number, fallback: number) => {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) && v !== undefined && v !== null && v !== '' ? Math.min(hi, Math.max(lo, n)) : fallback;
  };
  const next = {
    title: text(b.title, 80, cur.title),
    body: text(b.body, 240, cur.body),
    url: b.url !== undefined ? safeUrl(b.url) : cur.url,
    voice_text: b.voice_text !== undefined ? (String(b.voice_text ?? '').trim().slice(0, 200) || null) : cur.voice_text,
    audio_url: b.audio_url !== undefined ? (b.audio_url === null ? null : String(b.audio_url).startsWith('/uploads/bildirishnoma-ovoz/') ? String(b.audio_url) : cur.audio_url) : cur.audio_url,
    send_hour: int(b.send_hour, 0, 23, cur.send_hour),
    param: int(b.param, 0, 365, cur.param),
    enabled: typeof b.enabled === 'boolean' ? b.enabled : cur.enabled,
  };
  const { rows } = await run(
    `UPDATE notification_rules SET title = $2, body = $3, url = $4, voice_text = $5, audio_url = $6, send_hour = $7, param = $8, enabled = $9, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, next.title, next.body, next.url, next.voice_text, next.audio_url, next.send_hour, next.param, next.enabled],
  );
  return rows[0] as Rule;
}

export async function getRule(id: number, q?: Query): Promise<Rule | undefined> {
  return (await db(q)('SELECT * FROM notification_rules WHERE id = $1', [id])).rows[0];
}

/** Admin qo'lda yuboradi: segment yoki bitta odam (sinov). */
export async function sendCampaign(
  input: { segment: Segment; param: number; title: string; body: string; url: string; audio_url: string | null; adminId: number | null },
  pushers?: Pushers,
  q?: Query,
) {
  const run = db(q);
  const ids = await segmentAudience(input.segment, input.param, q);
  const { rows } = await run(
    `INSERT INTO notification_campaigns (segment, param, title, body, url, audio_url, created_by, total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [input.segment, input.param, input.title, input.body, input.url, input.audio_url, input.adminId, ids.length],
  );
  const campaignId = Number(rows[0].id);
  const r = await deliver(ids, { title: input.title, body: input.body, url: input.url, audio_url: input.audio_url },
    { dedupeKey: `c${campaignId}`, campaignId }, pushers ?? (await livePushers()), q);
  await run('UPDATE notification_campaigns SET pushed = $2 WHERE id = $1', [campaignId, r.pushed]);
  return { campaignId, total: ids.length, ...r };
}
