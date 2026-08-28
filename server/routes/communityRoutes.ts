import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import type { DbClient } from '../types/dbClient';
import { ochirXabarMediasi } from '../services/mediaTozalash.service.js';
import {
  HAMMA_MENTION_ID,
  HAMMA_MENTION_NOMI,
  extractMentionUserIds,
  hammaMatniniBelgiga,
  hammaMentionBormi,
  hammaMentionToken,
  mentionToken,
  parseMentionParts,
} from '../../shared/communityMentions.js';
import {
  blockUser,
  checkCanWrite,
  getActiveBlock,
  listBlocks,
  unblockUser,
} from '../services/chatBlock.service.js';

const GROUP_CODE = 'savol_javob';
const MAX_CONTENT = 2000;
const DEFAULT_LIMIT = 80;
const ONLINE_WINDOW_MS = 90_000;
const TYPING_WINDOW_MS = 8_000;
const MEMBER_SUGGEST_LIMIT = 8;
const MAX_MENTIONS = 10;

/*
 * MEDIA XABARLAR.
 *
 * Fayl `uploads/storage/<bucket>/...` ga tushadi (postgresFacade ning
 * storage qatlami shu yerga yozadi) va `/uploads/...` orqali beriladi.
 *
 * Chegaralar ataylab turlicha: ovozli xabar qisqa bo'ladi, video esa
 * og'irroq. Ular serverda ham tekshiriladi — brauzerdagi tekshiruvga
 * ishonib bo'lmaydi.
 */
const MEDIA_BUCKET = 'community-media';
/** Maxsus reaksiya rasmlari shu yerda yashaydi. */
const REAKSIYA_BUCKET = 'reaction-emojis';

/**
 * Ommaviy URL dan bucket ichidagi yo'lni ajratadi (`reaksiya/nom-123.webp`).
 *
 * URL ko'rinishi `.../<bucket>/<yo'l>` bo'lgani uchun bucket nomidan
 * keyingi qism olinadi. Topilmasa bo'sh satr — o'chirish o'tkazib
 * yuboriladi, noto'g'ri yo'lni o'chirishga urinishdan ko'ra shunisi xavfsiz.
 */
function reaksiyaYoli(imageUrl: string): string {
  if (!imageUrl) return '';
  const belgi = `/${REAKSIYA_BUCKET}/`;
  const i = imageUrl.indexOf(belgi);
  if (i < 0) return '';
  return imageUrl.slice(i + belgi.length).split('?')[0];
}
/** Rels videolari. */
const RELS_BUCKET = 'community-reels';
const RELS_MAX_BAYT = 60 * 1024 * 1024;
const RELS_TURLARI = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
const RELS_SAHIFA = 12;

/*
 * REAKSIYALAR.
 *
 * Ro'yxat BAZADA (`community_reaction_emojis`) va uni support hisobi
 * boshqaradi. Ilgari u shu yerda qattiq yozilgan edi — yangi emoji
 * qo'shish uchun deploy kerak bo'lardi.
 *
 * Jadval bo'sh qolib ketsa chat reaksiyasiz qolmasin uchun zaxira
 * to'plam saqlanadi.
 */
const ZAXIRA_REAKSIYALAR = ['👍', '❤️', '🔥', '😁', '😮', '😢', '🙏', '👏'] as const;

export type ReaksiyaTuri = { emoji: string; image_url: string | null; label: string | null };

async function faolReaksiyalar(supabase: DbClient): Promise<ReaksiyaTuri[]> {
  const { data } = await supabase
    .from('community_reaction_emojis')
    .select('emoji, image_url, label, sort_order')
    .order('sort_order', { ascending: true });
  const royxat = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    emoji: String(r.emoji),
    image_url: r.image_url ? String(r.image_url) : null,
    label: r.label ? String(r.label) : null,
  }));
  return royxat.length
    ? royxat
    : ZAXIRA_REAKSIYALAR.map((e) => ({ emoji: e, image_url: null, label: null }));
}

/**
 * Kalit → rasm manzili xaritasi.
 *
 * Xabarlar ro'yxatida rasmli reaksiyani chizish uchun kerak. Ro'yxatdan
 * CHIQARILGAN reaksiyalar ham bo'lishi mumkin — ular chatda qolgani
 * uchun xarita to'liq jadvaldan quriladi, faol ro'yxatdan emas.
 */
async function reaksiyaRasmlari(supabase: DbClient): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('community_reaction_emojis')
    .select('emoji, image_url')
    .not('image_url', 'is', null);
  const xarita = new Map<string, string>();
  for (const r of (data ?? []) as Array<Record<string, unknown>>) {
    if (r.image_url) xarita.set(String(r.emoji), String(r.image_url));
  }
  return xarita;
}

/** Bitta odam bitta xabarga ko'pi bilan shuncha turli emoji qo'ya oladi. */
const MAX_REAKSIYA = 3;

/**
 * REAKSIYA KALITINING ENG KATTA UZUNLIGI — bazadagi cheklov bilan BIR XIL.
 *
 * Oddiy emoji qisqa, ammo rasm-reaksiya kaliti `:slug:` ko'rinishida bo'ladi
 * va slug 24 belgigacha kesiladi — ya'ni kalit 26 belgigacha. Ilgari bu
 * yerda 16 turardi: nomi 14 belgidan uzun rasm-reaksiya ro'yxatda KO'RINARDI
 * va tanlagichda chizilardi, bosilganda esa hamisha 400 "Reaksiya tanlanmadi"
 * qaytarardi. Migratsiya 167 bazada 32 ga ruxsat bergan — chegara ham shu.
 */
const REAKSIYA_MAX_UZUNLIK = 32;

type MediaKind = 'image' | 'video' | 'voice' | 'video_note';

const MEDIA_QOIDALARI: Record<MediaKind, { maxBayt: number; turlar: readonly string[] }> = {
  image: { maxBayt: 8 * 1024 * 1024, turlar: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  video: { maxBayt: 50 * 1024 * 1024, turlar: ['video/mp4', 'video/webm', 'video/quicktime'] },
  voice: { maxBayt: 10 * 1024 * 1024, turlar: ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'] },
  video_note: { maxBayt: 25 * 1024 * 1024, turlar: ['video/mp4', 'video/webm'] },
};

const MEDIA_KENGAYTMA: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/webm': 'weba', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav',
};

/*
 * Multer chegarasi eng KATTA turga qo'yiladi (rels videosi, 60 MB), aniq
 * chegara esa handlerda turga qarab tekshiriladi. Aks holda ovozli xabar
 * uchun ham 60 MB qabul qilinardi.
 */
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024, files: 1 },
});

/**
 * Multer xatosini TUSHUNARLI javobga aylantiradi.
 *
 * `mediaUpload.single()` to'g'ridan-to'g'ri qo'yilsa, chegaradan oshgan
 * fayl `MulterError: File too large` bilan ishlov berilmagan xatoga
 * aylanardi: klient bo'sh javob olardi va nima bo'lganini bilmasdi.
 * Endi u 400 va odam o'qiydigan matn bilan qaytadi.
 */
function faylQabul(maydon: string) {
  const middleware = mediaUpload.single(maydon);
  return (req: Request, res: Response, next: () => void) => {
    middleware(req as never, res as never, (err: unknown) => {
      if (!err) return next();
      const kod = (err as { code?: string }).code;
      if (kod === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Fayl juda katta (60 MB dan oshmasin)' });
        return;
      }
      if (kod === 'LIMIT_FILE_COUNT' || kod === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({ error: 'Bir vaqtda bitta fayl yuboring' });
        return;
      }
      console.error('[fayl qabul]', err);
      res.status(400).json({ error: 'Fayl qabul qilinmadi' });
    });
  };
}

function mediaTurimi(v: unknown): v is MediaKind {
  return v === 'image' || v === 'video' || v === 'voice' || v === 'video_note';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Ism va familiya — guruh chatida doim shu ko‘rinadi. */
function fullNameFromUser(row: Record<string, unknown>): string {
  const first = asString(row.first_name);
  const last = asString(row.last_name);
  const full = `${first} ${last}`.trim();
  return full || 'Foydalanuvchi';
}

function onlineSinceIso(): string {
  return new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
}

function typingSinceIso(): string {
  return new Date(Date.now() - TYPING_WINDOW_MS).toISOString();
}

async function touchPresence(supabase: DbClient, userId: number): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('community_group_presence').upsert(
    { user_id: userId, group_code: GROUP_CODE, last_seen_at: now },
    { onConflict: 'user_id,group_code' }
  );
}

async function fetchGroupStats(supabase: DbClient) {
  const sinceOnline = onlineSinceIso();
  const [{ count: memberCount }, { count: onlineCount }] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase
      .from('community_group_presence')
      .select('*', { count: 'exact', head: true })
      .eq('group_code', GROUP_CODE)
      .gt('last_seen_at', sinceOnline),
  ]);
  return {
    member_count: Number(memberCount ?? 0),
    online_count: Number(onlineCount ?? 0),
  };
}

async function fetchTypingUsers(supabase: DbClient, excludeUserId: number) {
  const sinceTyping = typingSinceIso();
  const { data: typingRows, error } = await supabase
    .from('community_group_typing')
    .select('user_id, updated_at')
    .eq('group_code', GROUP_CODE)
    .gt('updated_at', sinceTyping)
    .neq('user_id', excludeUserId);
  if (error) throw error;
  const ids = [...new Set((typingRows ?? []).map((r) => Number((r as any).user_id)).filter(Number.isFinite))];
  if (!ids.length) return [];

  const { data: users } = await supabase.from('users').select('id, first_name, last_name').in('id', ids);
  const byId = new Map<number, Record<string, unknown>>();
  for (const u of users ?? []) byId.set(Number((u as any).id), u as Record<string, unknown>);

  return ids.map((id) => ({
    user_id: id,
    full_name: fullNameFromUser(byId.get(id) ?? {}),
  }));
}

/**
 * Foydalanuvchini belgilagan o‘qilmagan xabarlar soni.
 * Token doim `...](ID)` bilan tugaydi, shuning uchun LIKE aniq ishlaydi.
 */
async function countUnreadMentions(
  supabase: DbClient,
  userId: number,
  lastReadAt: string | null
): Promise<number> {
  /*
   * IKKI XIL BELGI HISOBLANADI:
   *   `](42)` — shaxsan shu odam belgilangan;
   *   `](0)`  — support "Hammaga" deb yozgan, ya'ni bildirishnoma hammaga.
   *
   * Ikkitasi alohida so'rov bilan sanaladi: bitta so'rovda OR yozish uchun
   * PostgREST sintaksisiga tayanish kerak bo'lardi, bu esa `%` va qavslar
   * bo'lgan naqsh bilan mo'rt. Bir xabarda ikkalasi ham bo'lsa nishon
   * bittaga ko'p ko'rsatadi — bu zararsiz, xabar baribir bitta.
   */
  const sana = async (naqsh: string) => {
    let query = supabase
      .from('community_group_messages')
      .select('*', { count: 'exact', head: true })
      .eq('group_code', GROUP_CODE)
      .neq('sender_user_id', userId)
      .like('content', naqsh);
    if (lastReadAt) query = query.gt('created_at', lastReadAt);
    const { count } = await query;
    return Number(count ?? 0);
  };

  const [shaxsiy, hammaga] = await Promise.all([
    sana(`%](${userId})%`),
    sana(`%](${HAMMA_MENTION_ID})%`),
  ]);
  return shaxsiy + hammaga;
}

/** Qidiruv matnidan LIKE va PostgREST ajratuvchi belgilarini olib tashlaydi. */
function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[%_,()"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function toMember(row: Record<string, unknown>) {
  return { user_id: Number(row.id), full_name: fullNameFromUser(row) };
}

/** "@" bosilganda ko‘rsatiladigan boshlang‘ich ro‘yxat — guruhda yaqinda yozganlar. */
async function fetchRecentParticipants(supabase: DbClient, excludeUserId: number) {
  const { data: rows } = await supabase
    .from('community_group_messages')
    .select('sender_user_id, created_at')
    .eq('group_code', GROUP_CODE)
    .order('created_at', { ascending: false })
    .limit(150);

  const ordered: number[] = [];
  for (const row of rows ?? []) {
    const id = Number((row as any).sender_user_id);
    if (!Number.isFinite(id) || id === excludeUserId || ordered.includes(id)) continue;
    ordered.push(id);
    if (ordered.length >= MEMBER_SUGGEST_LIMIT) break;
  }
  if (!ordered.length) return [];

  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', ordered);
  const byId = new Map<number, Record<string, unknown>>();
  for (const u of users ?? []) byId.set(Number((u as any).id), u as Record<string, unknown>);
  return ordered.filter((id) => byId.has(id)).map((id) => toMember(byId.get(id)!));
}

async function searchMembers(supabase: DbClient, excludeUserId: number, term: string) {
  if (!term) return fetchRecentParticipants(supabase, excludeUserId);
  const like = `${term}%`;
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .or(`first_name.ilike.${like},last_name.ilike.${like}`)
    .limit(60);
  if (error) throw error;
  return (data ?? [])
    .map((row) => toMember(row as Record<string, unknown>))
    .filter((m) => m.user_id !== excludeUserId)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'uz'))
    .slice(0, MEMBER_SUGGEST_LIMIT);
}

/**
 * Belgilangan odamlar ismini bazadagi haqiqiy ism bilan almashtiradi —
 * shunda hech kim boshqa nom bilan soxta "mention" yasay olmaydi.
 * Mavjud bo‘lmagan foydalanuvchi oddiy matnga aylanadi.
 */
async function normalizeMentions(
  supabase: DbClient,
  xomMatn: string,
  /**
   * "Hammaga" belgisini ishlatishga ruxsat bormi (faqat support).
   *
   * Ruxsatsiz odam yozgan `@[Hammaga](0)` oddiy matnga aylanadi — ya'ni u
   * hech kimga bildirishnoma yubormaydi, lekin xabari ham yo'qolmaydi.
   */
  hammagaRuxsat = false,
): Promise<string> {
  // Support "@all" deb yozgan bo'lsa — uni haqiqiy belgiga aylantiramiz.
  const content = hammagaRuxsat ? hammaMatniniBelgiga(xomMatn) : xomMatn;

  const ids = extractMentionUserIds(content);
  const hammaBor = hammaMentionBormi(content);
  if (!ids.length && !hammaBor) return content;

  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', ids.slice(0, 50));
  const nameById = new Map<number, string>();
  for (const u of users ?? []) {
    nameById.set(Number((u as any).id), fullNameFromUser(u as Record<string, unknown>));
  }

  const kept = new Set<number>();
  return parseMentionParts(content)
    .map((part) => {
      if (part.type === 'text') return part.text;
      if (part.userId === HAMMA_MENTION_ID) {
        return hammagaRuxsat ? hammaMentionToken() : `@${HAMMA_MENTION_NOMI}`;
      }
      const name = nameById.get(part.userId);
      if (!name) return `@${part.name}`;
      if (!kept.has(part.userId) && kept.size >= MAX_MENTIONS) return `@${name}`;
      kept.add(part.userId);
      return mentionToken(part.userId, name);
    })
    .join('');
}

async function fetchMessagesWithSenders(
  supabase: DbClient,
  /** `viewerId` — reaksiyalarda "men bosganmanmi" ni aniqlash uchun. */
  opts: { beforeId?: number; limit?: number; viewerId?: number }
) {
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), 120);
  let query = supabase
    .from('community_group_messages')
    .select('id, group_code, sender_user_id, content, created_at, edited_at, deleted_at, media_url, media_kind, media_ms, media_deleted_at, reel_id')
    .eq('group_code', GROUP_CODE)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.beforeId && Number.isFinite(opts.beforeId)) {
    query = query.lt('id', opts.beforeId);
  }
  const { data: rows, error } = await query;
  if (error) throw error;
  const messages = (rows ?? []) as Array<Record<string, unknown>>;
  if (!messages.length) return [];

  const senderIds = [...new Set(messages.map((m) => Number(m.sender_user_id)).filter(Number.isFinite))];
  const { data: users } = await supabase.from('users').select('id, first_name, last_name').in('id', senderIds);
  const userById = new Map<number, Record<string, unknown>>();
  for (const u of users ?? []) userById.set(Number((u as any).id), u as Record<string, unknown>);

  /*
   * Reaksiyalar BITTA so'rov bilan olinadi va xotirada guruhlanadi.
   * Har bir xabar uchun alohida so'rov 120 ta so'rovga aylanardi.
   */
  const messageIds = messages.map((m) => Number(m.id)).filter(Number.isFinite);
  const { data: reactionRows } = await supabase
    .from('community_message_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', messageIds);

  const rasmlar = await reaksiyaRasmlari(supabase);
  type Yigma = { emoji: string; soni: number; meni: boolean; image_url: string | null };
  const reactionsByMessage = new Map<number, Map<string, Yigma>>();
  for (const r of (reactionRows ?? []) as Array<Record<string, unknown>>) {
    const mid = Number(r.message_id);
    const emoji = String(r.emoji);
    let xarita = reactionsByMessage.get(mid);
    if (!xarita) {
      xarita = new Map();
      reactionsByMessage.set(mid, xarita);
    }
    const bor = xarita.get(emoji) ?? {
      emoji,
      soni: 0,
      meni: false,
      image_url: rasmlar.get(emoji) ?? null,
    };
    bor.soni += 1;
    if (Number(r.user_id) === Number(opts.viewerId)) bor.meni = true;
    xarita.set(emoji, bor);
  }

  return messages
    .map((m) => {
      const senderId = Number(m.sender_user_id);
      const user = userById.get(senderId) ?? {};
      const yigma = reactionsByMessage.get(Number(m.id));
      return {
        id: Number(m.id),
        group_code: String(m.group_code),
        sender_user_id: senderId,
        sender_name: fullNameFromUser(user),
        content: String(m.content),
        created_at: String(m.created_at),
        edited_at: m.edited_at ? String(m.edited_at) : null,
        media_url: m.media_url ? String(m.media_url) : null,
        media_kind: m.media_kind ? String(m.media_kind) : null,
        media_ms: m.media_ms != null ? Number(m.media_ms) : null,
        media_deleted_at: m.media_deleted_at ? String(m.media_deleted_at) : null,
        reel_id: m.reel_id != null ? Number(m.reel_id) : null,
        reactions: yigma
          ? [...yigma.values()].sort((a, b) => b.soni - a.soni || a.emoji.localeCompare(b.emoji))
          : [],
      };
    })
    .reverse();
}

/**
 * Chat moderatori — hozircha OLTIN SUPPORT hisobi.
 * Admin panel o'zining alohida yo'llari orqali ishlaydi (adminRoutes).
 */
async function moderatormi(supabase: DbClient, userId: number): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('is_golden')
    .eq('id', userId)
    .maybeSingle();
  return (data as { is_golden?: boolean } | null)?.is_golden === true;
}

export function createCommunityRoutes(
  supabase: DbClient,
  authenticate: (req: Request, res: Response, next: () => void) => void
): Router {
  const router = Router();

  router.get('/community/savol-javob/summary', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      await touchPresence(supabase, userId);
      const [{ data: lastRows, error: lastErr }, { data: readRow }, stats] = await Promise.all([
        supabase
          .from('community_group_messages')
          .select('id, content, sender_user_id, created_at')
          .eq('group_code', GROUP_CODE)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('community_group_reads')
          .select('last_read_at')
          .eq('user_id', userId)
          .eq('group_code', GROUP_CODE)
          .maybeSingle(),
        fetchGroupStats(supabase),
      ]);
      if (lastErr) throw lastErr;
      const last = (lastRows?.[0] as Record<string, unknown> | undefined) ?? null;
      const lastReadAt = readRow ? String((readRow as any).last_read_at) : null;
      let unreadCount = 0;
      if (last) {
        if (!lastReadAt) {
          const { count } = await supabase
            .from('community_group_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_code', GROUP_CODE)
            .neq('sender_user_id', userId);
          unreadCount = Number(count ?? 0);
        } else {
          const { count } = await supabase
            .from('community_group_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_code', GROUP_CODE)
            .gt('created_at', lastReadAt)
            .neq('sender_user_id', userId);
          unreadCount = Number(count ?? 0);
        }
      }
      const mentionCount = last ? await countUnreadMentions(supabase, userId, lastReadAt) : 0;
      res.json({
        group_code: GROUP_CODE,
        title: 'SAVOL-JAVOB',
        member_count: stats.member_count,
        online_count: stats.online_count,
        last_message: last
          ? {
              id: Number(last.id),
              content: String(last.content),
              sender_user_id: Number(last.sender_user_id),
              created_at: String(last.created_at),
            }
          : null,
        unread_count: unreadCount,
        mention_count: mentionCount,
        // O'qish rejimi holati va moderator huquqi — chat kompozeri shunga qarab chiziladi.
        block: await getActiveBlock(supabase, userId),
        can_moderate: await moderatormi(supabase, userId),
      });
    } catch (e) {
      console.error('[GET /api/community/savol-javob/summary]', e);
      res.status(500).json({ error: 'Guruh ma\'lumoti yuklanmadi' });
    }
  });

  /**
   * Faqat belgilashlar soni — pastki menyudagi nishon uchun.
   * Ataylab yengil (2 ta so‘rov) va `touchPresence` chaqirmaydi:
   * aks holda ilovaning istalgan sahifasidagi odam "onlayn" bo‘lib qolardi.
   */
  router.get('/community/savol-javob/mentions', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const { data: readRow } = await supabase
        .from('community_group_reads')
        .select('last_read_at')
        .eq('user_id', userId)
        .eq('group_code', GROUP_CODE)
        .maybeSingle();
      const lastReadAt = readRow ? String((readRow as any).last_read_at) : null;
      res.json({ mention_count: await countUnreadMentions(supabase, userId, lastReadAt) });
    } catch (e) {
      console.error('[GET /api/community/savol-javob/mentions]', e);
      res.status(500).json({ error: 'Belgilashlar yuklanmadi' });
    }
  });

  router.get('/community/savol-javob/live', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      await touchPresence(supabase, userId);
      const [stats, typingUsers] = await Promise.all([
        fetchGroupStats(supabase),
        fetchTypingUsers(supabase, userId),
      ]);
      res.json({
        member_count: stats.member_count,
        online_count: stats.online_count,
        typing_users: typingUsers,
      });
    } catch (e) {
      console.error('[GET /api/community/savol-javob/live]', e);
      res.status(500).json({ error: 'Guruh holati yuklanmadi' });
    }
  });

  router.post('/community/savol-javob/presence', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      await touchPresence(supabase, userId);
      res.json({ success: true });
    } catch (e) {
      console.error('[POST /api/community/savol-javob/presence]', e);
      res.status(500).json({ error: 'Onlayn holat saqlanmadi' });
    }
  });

  router.post('/community/savol-javob/typing', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const typing = req.body?.typing === true;
      const now = new Date().toISOString();
      if (typing) {
        const { error } = await supabase.from('community_group_typing').upsert(
          { user_id: userId, group_code: GROUP_CODE, updated_at: now },
          { onConflict: 'user_id,group_code' }
        );
        if (error) throw error;
      } else {
        await supabase
          .from('community_group_typing')
          .delete()
          .eq('user_id', userId)
          .eq('group_code', GROUP_CODE);
      }
      await touchPresence(supabase, userId);
      res.json({ success: true });
    } catch (e) {
      console.error('[POST /api/community/savol-javob/typing]', e);
      res.status(500).json({ error: 'Yozish holati saqlanmadi' });
    }
  });

  router.get('/community/savol-javob/members', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const term = sanitizeSearchTerm(asString(req.query?.q));
      const members = await searchMembers(supabase, userId, term);
      res.json(members);
    } catch (e) {
      console.error('[GET /api/community/savol-javob/members]', e);
      res.status(500).json({ error: 'Aʼzolar topilmadi' });
    }
  });

  router.get('/community/savol-javob/messages', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      await touchPresence(supabase, userId);
      const beforeId = req.query.before_id != null ? Number(req.query.before_id) : undefined;
      const messages = await fetchMessagesWithSenders(supabase, { beforeId, viewerId: userId });
      res.json(messages);
    } catch (e) {
      console.error('[GET /api/community/savol-javob/messages]', e);
      res.status(500).json({ error: 'Xabarlar yuklanmadi' });
    }
  });

  router.post('/community/savol-javob/messages', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      // O'qish rejimidagi odam guruhga yozolmaydi (Support kanali ochiq qoladi).
      const ruxsat = await checkCanWrite(supabase, userId);
      if (ruxsat.ok === false) return res.status(ruxsat.status).json(ruxsat.body);
      const rawContent = asString(req.body?.content);
      if (!rawContent) return res.status(400).json({ error: 'Xabar bo\'sh bo\'lmasin' });
      if (rawContent.length > MAX_CONTENT) {
        return res.status(400).json({ error: `Xabar ${MAX_CONTENT} belgidan oshmasin` });
      }
      // "Hammaga" bildirishnomasini FAQAT support yubora oladi.
      const content = await normalizeMentions(
        supabase,
        rawContent,
        await moderatormi(supabase, userId),
      );
      if (content.length > MAX_CONTENT) {
        return res.status(400).json({ error: `Xabar ${MAX_CONTENT} belgidan oshmasin` });
      }
      const { data, error } = await supabase
        .from('community_group_messages')
        .insert({ group_code: GROUP_CODE, sender_user_id: userId, content })
        .select('id, group_code, sender_user_id, content, created_at')
        .single();
      if (error) throw error;
      await supabase
        .from('community_group_typing')
        .delete()
        .eq('user_id', userId)
        .eq('group_code', GROUP_CODE);
      await touchPresence(supabase, userId);
      const { data: user } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();
      res.status(201).json({
        id: Number((data as any).id),
        group_code: GROUP_CODE,
        sender_user_id: userId,
        sender_name: fullNameFromUser((user ?? {}) as Record<string, unknown>),
        content: String((data as any).content),
        created_at: String((data as any).created_at),
      });
    } catch (e) {
      console.error('[POST /api/community/savol-javob/messages]', e);
      res.status(500).json({ error: 'Xabar yuborilmadi' });
    }
  });

  /*
   * MEDIA XABAR YUBORISH.
   *
   * Matnli xabar bilan bir xil qoidalarga bo'ysunadi: bloklangan odam
   * yozolmaydi, mention'lar normallashtiriladi. Farqi — matn ixtiyoriy
   * bo'lib qoladi (faqat rasm yoki ovoz yuborish mumkin).
   */
  router.post(
    '/community/savol-javob/media',
    authenticate,
    yozishRuxsati,
    faylQabul('file'),
    async (req: any, res) => {
      try {
        const userId = Number(req.userId);

        const kind = req.body?.kind;
        if (!mediaTurimi(kind)) {
          return res.status(400).json({ error: 'Media turi noto‘g‘ri' });
        }
        const file = req.file as { buffer: Buffer; mimetype: string; size: number } | undefined;
        if (!file || !file.buffer?.length) {
          return res.status(400).json({ error: 'Fayl yuklanmadi' });
        }

        const qoida = MEDIA_QOIDALARI[kind];
        if (!qoida.turlar.includes(file.mimetype)) {
          return res.status(400).json({ error: `Bu format qabul qilinmaydi: ${file.mimetype}` });
        }
        if (file.size > qoida.maxBayt) {
          return res.status(400).json({
            error: `Fayl juda katta (${Math.round(qoida.maxBayt / 1024 / 1024)} MB dan oshmasin)`,
          });
        }

        // Ovoz va videoda uzunlik — faqat ko'rsatish uchun, ishonchsiz manba
        // bo'lgani uchun oqilona chegaraga siqiladi.
        const xomMs = Number(req.body?.ms);
        const mediaMs =
          Number.isFinite(xomMs) && xomMs > 0 ? Math.min(Math.round(xomMs), 60 * 60 * 1000) : null;

        const rawContent = asString(req.body?.content);
        if (rawContent.length > MAX_CONTENT) {
          return res.status(400).json({ error: `Xabar ${MAX_CONTENT} belgidan oshmasin` });
        }
        const content = rawContent
          ? await normalizeMentions(supabase, rawContent, await moderatormi(supabase, userId))
          : '';

        const ext = MEDIA_KENGAYTMA[file.mimetype] ?? 'bin';
        const yol = `${GROUP_CODE}/${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

        const { data: buckets } = await supabase.storage.listBuckets();
        if (!(buckets ?? []).some((b: { name: string }) => b.name === MEDIA_BUCKET)) {
          await supabase.storage.createBucket(MEDIA_BUCKET, { public: true });
        }
        const { error: uploadErr } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(yol, file.buffer, { contentType: file.mimetype, upsert: false });
        if (uploadErr) {
          console.error('[community media upload]', uploadErr);
          return res.status(500).json({ error: 'Fayl yuklanmadi' });
        }
        const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(yol);
        const mediaUrl = urlData?.publicUrl;
        if (!mediaUrl) return res.status(500).json({ error: 'Fayl manzili olinmadi' });

        const { data, error } = await supabase
          .from('community_group_messages')
          .insert({
            group_code: GROUP_CODE,
            sender_user_id: userId,
            content,
            media_url: mediaUrl,
            media_kind: kind,
            media_ms: mediaMs,
          })
          .select('id, created_at')
          .single();
        if (error) {
          /*
           * Yozuv yaratilmadi — fayl diskda YETIM qolmasin.
           *
           * Fayl INSERT dan oldin yuklanadi (manzil xabarga kerak). Agar
           * INSERT yiqilsa, fayl hech kimga tegishli bo'lmay qoladi va uni
           * hech narsa o'chirmaydi. Shuning uchun darhol olib tashlanadi.
           * O'chirishning o'zi yiqilsa ham asosiy xatoni yashirmaymiz.
           */
          await supabase.storage
            .from(MEDIA_BUCKET)
            .remove([yol])
            .catch(() => {});
          throw error;
        }

        await supabase
          .from('community_group_typing')
          .delete()
          .eq('user_id', userId)
          .eq('group_code', GROUP_CODE);
        await touchPresence(supabase, userId);

        const { data: user } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', userId)
          .maybeSingle();

        return res.status(201).json({
          id: Number((data as any).id),
          group_code: GROUP_CODE,
          sender_user_id: userId,
          sender_name: fullNameFromUser((user ?? {}) as Record<string, unknown>),
          content,
          created_at: String((data as any).created_at),
          edited_at: null,
          media_url: mediaUrl,
          media_kind: kind,
          media_ms: mediaMs,
        });
      } catch (e) {
        console.error('[POST /api/community/savol-javob/media]', e);
        return res.status(500).json({ error: 'Xabar yuborilmadi' });
      }
    },
  );

  /*
   * REAKSIYA QO'YISH / OLIB TASHLASH (toggle).
   *
   * Telegramdagi xulq: bosilgan emoji hali qo'yilmagan bo'lsa qo'yiladi,
   * qo'yilgan bo'lsa olib tashlanadi. Alohida "o'chirish" endpointi
   * kerak emas.
   *
   * O'qish rejimidagi odam reaksiya ham qo'ya olmaydi — bu ham chatga
   * aralashish. Bloklashning ma'nosi shu.
   */
  router.post(
    '/community/savol-javob/messages/:id/reactions',
    authenticate,
    async (req: any, res) => {
      try {
        const userId = Number(req.userId);
        const ruxsat = await checkCanWrite(supabase, userId);
        if (ruxsat.ok === false) return res.status(ruxsat.status).json(ruxsat.body);

        const messageId = Number(req.params.id);
        if (!Number.isFinite(messageId) || messageId < 1) {
          return res.status(400).json({ error: 'Xabar tanlanmadi' });
        }
        const emoji = asString(req.body?.emoji);
        if (!emoji || emoji.length > REAKSIYA_MAX_UZUNLIK) {
          return res.status(400).json({ error: 'Reaksiya tanlanmadi' });
        }

        // Xabar bor va o'chirilmaganmi.
        const { data: xabar } = await supabase
          .from('community_group_messages')
          .select('id, deleted_at')
          .eq('id', messageId)
          .maybeSingle();
        if (!xabar || (xabar as { deleted_at?: string | null }).deleted_at) {
          return res.status(404).json({ error: 'Xabar topilmadi' });
        }

        const { data: mavjud } = await supabase
          .from('community_message_reactions')
          .select('emoji')
          .eq('message_id', messageId)
          .eq('user_id', userId);
        const meniki = ((mavjud ?? []) as Array<{ emoji: string }>).map((r) => String(r.emoji));

        if (meniki.includes(emoji)) {
          await supabase
            .from('community_message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', userId)
            .eq('emoji', emoji);
        } else {
          /*
           * Ro'yxat tekshiruvi FAQAT qo'shishda.
           *
           * Support emojini ro'yxatdan chiqarsa, uni ilgari bosgan
           * odamlar o'z reaksiyasini olib tashlay olishi kerak — aks
           * holda u xabarda abadiy osilib qolardi. Shuning uchun
           * tekshiruv yuqorida emas, aynan shu yerda.
           */
          const ruxsatEtilgan = (await faolReaksiyalar(supabase)).map((r) => r.emoji);
          if (!ruxsatEtilgan.includes(emoji)) {
            return res.status(400).json({ error: 'Bunday reaksiya yo‘q' });
          }
          if (meniki.length >= MAX_REAKSIYA) {
            return res
              .status(400)
              .json({ error: `Bitta xabarga ${MAX_REAKSIYA} tagacha reaksiya qo‘yish mumkin` });
          }
          const { error } = await supabase
            .from('community_message_reactions')
            .insert({ message_id: messageId, user_id: userId, emoji });
          // Ikki marta tez bosilsa "duplicate key" kelishi mumkin — bu xato emas.
          if (error && !/duplicate key/i.test(String((error as { message?: string }).message ?? ''))) {
            throw error;
          }
        }

        // Yangilangan yig'ma — klient o'zi hisoblamasin.
        const { data: barchasi } = await supabase
          .from('community_message_reactions')
          .select('user_id, emoji')
          .eq('message_id', messageId);

        const rasmlar = await reaksiyaRasmlari(supabase);
        const xarita = new Map<
          string,
          { emoji: string; soni: number; meni: boolean; image_url: string | null }
        >();
        for (const r of (barchasi ?? []) as Array<Record<string, unknown>>) {
          const e = String(r.emoji);
          const bor = xarita.get(e) ?? {
            emoji: e,
            soni: 0,
            meni: false,
            image_url: rasmlar.get(e) ?? null,
          };
          bor.soni += 1;
          if (Number(r.user_id) === userId) bor.meni = true;
          xarita.set(e, bor);
        }

        await touchPresence(supabase, userId);
        return res.json({
          message_id: messageId,
          reactions: [...xarita.values()].sort(
            (a, b) => b.soni - a.soni || a.emoji.localeCompare(b.emoji),
          ),
        });
      } catch (e) {
        console.error('[POST /api/community/savol-javob/messages/:id/reactions]', e);
        return res.status(500).json({ error: 'Reaksiya saqlanmadi' });
      }
    },
  );

  /** Chatda ko'rsatiladigan emojilar — klient qattiq yozmasin. */
  router.get('/community/savol-javob/reactions/available', authenticate, async (_req, res) => {
    try {
      res.json({ emojis: await faolReaksiyalar(supabase), max: MAX_REAKSIYA });
    } catch (e) {
      console.error('[GET reactions/available]', e);
      res.json({
        emojis: ZAXIRA_REAKSIYALAR.map((x) => ({ emoji: x, image_url: null, label: null })),
        max: MAX_REAKSIYA,
      });
    }
  });

  /*
   * SUPPORT: reaksiya emojilarini boshqarish.
   *
   * Qo'shish va o'chirish. O'chirish faqat RO'YXATDAN olib tashlaydi —
   * odamlar ilgari qo'ygan reaksiyalar joyida qoladi, chunki tarixni
   * o'zgartirish emas, taklif ro'yxatini boshqarish nazarda tutilgan.
   */
  router.get('/community/moderation/reactions', authenticate, async (req: any, res) => {
    if (!(await moderatorGate(req, res))) return;
    try {
      const { data } = await supabase
        .from('community_reaction_emojis')
        .select('emoji, sort_order, created_at')
        .order('sort_order', { ascending: true });
      res.json(data ?? []);
    } catch (e) {
      console.error('[GET moderation/reactions]', e);
      res.status(500).json({ error: 'Ro‘yxat yuklanmadi' });
    }
  });

  router.post('/community/moderation/reactions', authenticate, async (req: any, res) => {
    const mod = await moderatorGate(req, res);
    if (!mod) return;
    try {
      const emoji = asString(req.body?.emoji);
      /*
       * Bo'sh joy va yangi qator qabul qilinmaydi: aks holda ro'yxatga
       * ko'rinmas yozuv tushib, chatda bo'sh tugma paydo bo'lardi.
       */
      if (!emoji || /\s/.test(emoji)) {
        return res.status(400).json({ error: 'Emoji kiriting' });
      }
      if (emoji.length > REAKSIYA_MAX_UZUNLIK) {
        return res.status(400).json({ error: 'Juda uzun — bu emoji emasga o‘xshaydi' });
      }
      const { data: bor } = await supabase
        .from('community_reaction_emojis')
        .select('emoji')
        .eq('emoji', emoji)
        .maybeSingle();
      if (bor) return res.status(400).json({ error: 'Bu emoji allaqachon bor' });

      const { data: oxirgi } = await supabase
        .from('community_reaction_emojis')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      const keyingi =
        Number(((oxirgi ?? [])[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 10;

      const { error } = await supabase
        .from('community_reaction_emojis')
        .insert({ emoji, sort_order: keyingi, created_by: mod.id });
      if (error) throw error;
      res.status(201).json({ emoji, sort_order: keyingi });
    } catch (e) {
      console.error('[POST moderation/reactions]', e);
      res.status(500).json({ error: 'Emoji qo‘shilmadi' });
    }
  });

  /*
   * SUPPORT: GALEREYADAN RASMLI REAKSIYA YUKLASH.
   *
   * Rasm `reaction-emojis` bucketiga tushadi va jadvalga `:nom:`
   * ko'rinishidagi kalit bilan yoziladi. Kalit `community_message_reactions`
   * ga yoziladi, ya'ni hisoblash mantig'i unicode emoji bilan bir xil.
   *
   * Rasm KICHIK bo'lishi shart: u chatda 18–20px da chiziladi va har bir
   * xabar ostida takrorlanadi. Shuning uchun 512 KB chegara va server
   * tomonida 128px ga siqish.
   */
  router.post(
    '/community/moderation/reactions/image',
    authenticate,
    moderatorRuxsati,
    faylQabul('file'),
    async (req: any, res) => {
      const mod = req.moderator as { id: number; name: string };
      try {
        const file = req.file as { buffer: Buffer; mimetype: string; size: number } | undefined;
        if (!file?.buffer?.length) return res.status(400).json({ error: 'Rasm yuklanmadi' });
        if (!['image/png', 'image/webp', 'image/jpeg', 'image/gif'].includes(file.mimetype)) {
          return res.status(400).json({ error: 'Faqat PNG, WEBP, JPEG yoki GIF' });
        }
        if (file.size > 512 * 1024) {
          return res.status(400).json({ error: 'Rasm 512 KB dan oshmasin' });
        }

        /*
         * Nomdan kalit yasaymiz. Faqat lotin harflari, raqam va chiziqcha —
         * kalit bazaga va URL'ga tushadi, shuning uchun kutilmagan belgilar
         * bo'lmasligi kerak.
         */
        const xomNom = asString(req.body?.name).toLowerCase();
        const slug = xomNom
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 24);
        if (!slug) return res.status(400).json({ error: 'Nom kiriting (lotin harflarida)' });
        const kalit = `:${slug}:`;

        const { data: bor } = await supabase
          .from('community_reaction_emojis')
          .select('emoji')
          .eq('emoji', kalit)
          .maybeSingle();
        if (bor) return res.status(400).json({ error: 'Bu nom allaqachon band' });

        const ext = file.mimetype === 'image/gif' ? 'gif' : 'webp';
        const yol = `reaksiya/${slug}-${Date.now()}.${ext}`;

        /*
         * GIF siqilmaydi — animatsiya yo'qolib qolmasin. Qolgani WEBP'ga
         * o'tkaziladi va 128px ga kichraytiriladi.
         */
        let bayt = file.buffer;
        if (file.mimetype !== 'image/gif') {
          const sharp = (await import('sharp')).default;
          bayt = await sharp(file.buffer)
            .resize({ width: 128, height: 128, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 88 })
            .toBuffer();
        }

        const { data: buckets } = await supabase.storage.listBuckets();
        if (!(buckets ?? []).some((b: { name: string }) => b.name === REAKSIYA_BUCKET)) {
          await supabase.storage.createBucket(REAKSIYA_BUCKET, { public: true });
        }
        const { error: upErr } = await supabase.storage
          .from(REAKSIYA_BUCKET)
          .upload(yol, bayt, { contentType: ext === 'gif' ? 'image/gif' : 'image/webp', upsert: false });
        if (upErr) {
          console.error('[reaction image upload]', upErr);
          return res.status(500).json({ error: 'Rasm yuklanmadi' });
        }
        const { data: urlData } = supabase.storage.from(REAKSIYA_BUCKET).getPublicUrl(yol);
        const imageUrl = urlData?.publicUrl;
        if (!imageUrl) return res.status(500).json({ error: 'Rasm manzili olinmadi' });

        const { data: oxirgi } = await supabase
          .from('community_reaction_emojis')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1);
        const keyingi =
          Number(((oxirgi ?? [])[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 10;

        const { error } = await supabase.from('community_reaction_emojis').insert({
          emoji: kalit,
          image_url: imageUrl,
          label: xomNom.slice(0, 40) || slug,
          sort_order: keyingi,
          created_by: mod.id,
        });
        if (error) {
          // Yozuv yaratilmadi — rasm yetim qolmasin.
          await supabase.storage.from(REAKSIYA_BUCKET).remove([yol]).catch(() => {});
          throw error;
        }

        res.status(201).json({ emoji: kalit, image_url: imageUrl, label: xomNom || slug });
      } catch (e) {
        console.error('[POST moderation/reactions/image]', e);
        res.status(500).json({ error: 'Rasm qo‘shilmadi' });
      }
    },
  );

  router.delete('/community/moderation/reactions/:emoji', authenticate, async (req: any, res) => {
    if (!(await moderatorGate(req, res))) return;
    try {
      const emoji = decodeURIComponent(String(req.params.emoji ?? ''));
      if (!emoji) return res.status(400).json({ error: 'Emoji tanlanmadi' });

      const { data: qolgan } = await supabase.from('community_reaction_emojis').select('emoji');
      if ((qolgan ?? []).length <= 1) {
        return res.status(400).json({ error: 'Kamida bitta reaksiya qolishi kerak' });
      }

      /*
       * RASM FAYLI HAM O'CHIRILADI.
       *
       * Ilgari faqat jadval qatori o'chirilardi va yuklangan rasm diskda
       * abadiy qolardi. Support reaksiyalarni bir necha marta qo'shib
       * o'chirsa, fayllar to'planib borardi — aynan `mediaTozalash`
       * xizmati oldini olish uchun yozilgan holat. Tozalovchi esa bu
       * papkani ko'rmaydi, shuning uchun o'chirish shu yerda bo'lishi kerak.
       */
      const { data: qator } = await supabase
        .from('community_reaction_emojis')
        .select('image_url')
        .eq('emoji', emoji)
        .maybeSingle();

      const { error } = await supabase
        .from('community_reaction_emojis')
        .delete()
        .eq('emoji', emoji);
      if (error) throw error;

      // Qator o'chgach faylni olib tashlaymiz: fayl o'chib, qator qolgandan
      // ko'ra teskarisi xavfsizroq — yetim fayl zararsiz, yetim qator esa
      // chatda buzuq rasm bo'lib chiqadi.
      const rasmUrl = (qator as { image_url?: string | null } | null)?.image_url ?? '';
      const yol = reaksiyaYoli(rasmUrl);
      if (yol) {
        const { error: rmErr } = await supabase.storage.from(REAKSIYA_BUCKET).remove([yol]);
        if (rmErr) console.error('[reaction image remove]', rmErr);
      }

      res.json({ ok: true, emoji });
    } catch (e) {
      console.error('[DELETE moderation/reactions]', e);
      res.status(500).json({ error: 'Emoji o‘chirilmadi' });
    }
  });

  router.post('/community/savol-javob/read', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const now = new Date().toISOString();
      const { error } = await supabase.from('community_group_reads').upsert(
        { user_id: userId, group_code: GROUP_CODE, last_read_at: now },
        { onConflict: 'user_id,group_code' }
      );
      if (error) throw error;
      await touchPresence(supabase, userId);
      res.json({ success: true });
    } catch (e) {
      console.error('[POST /api/community/savol-javob/read]', e);
      res.status(500).json({ error: 'O\'qilgan holat saqlanmadi' });
    }
  });

  /* ------------------------------------------------------------------ *
   * MODERATSIYA — faqat oltin support hisobi uchun.
   * Bloklash o'qish rejimini yoqadi; xabarni o'chirish/tahrirlash guruhda.
   * ------------------------------------------------------------------ */

  /*
   * FAYL QABUL QILISHDAN OLDINGI RUXSAT.
   *
   * `multer` xotiraga yozadi (60 MB gacha). Ruxsat tekshiruvi ishlov
   * beruvchining ICHIDA turganda butun fayl avval RAMga o'qilar, keyingina
   * 403 qaytarilardi — ya'ni kirgan istalgan foydalanuvchi (bloklangani
   * ham, moderator bo'lmagani ham) serverni har so'rovda 60 MB bilan
   * yuklay olardi. Endi tekshiruv `faylQabul` dan OLDIN turadi va
   * ruxsatsiz so'rovda bayt ham o'qilmaydi.
   */
  async function yozishRuxsati(req: any, res: any, next: () => void): Promise<void> {
    const ruxsat = await checkCanWrite(supabase, Number(req.userId));
    if (ruxsat.ok === false) {
      res.status(ruxsat.status).json(ruxsat.body);
      return;
    }
    next();
  }

  /** Moderator ekanini fayl o'qilishidan oldin tekshiradi. */
  async function moderatorRuxsati(req: any, res: any, next: () => void): Promise<void> {
    const mod = await moderatorGate(req, res);
    if (!mod) return;
    req.moderator = mod;
    next();
  }

  async function moderatorGate(req: any, res: any): Promise<{ id: number; name: string } | null> {
    const userId = Number(req.userId);
    if (!(await moderatormi(supabase, userId))) {
      res.status(403).json({ error: 'Ruxsat yo\'q' });
      return null;
    }
    const { data } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .maybeSingle();
    return { id: userId, name: fullNameFromUser((data ?? {}) as Record<string, unknown>) };
  }

  /*
   * RELS — suhbatlar panelidagi qisqa videolar.
   *
   * Joylash: har qanday foydalanuvchi (bloklanmagan bo'lsa).
   * O'chirish: muallif, support (oltin hisob) yoki admin.
   */
  router.get('/community/reels', authenticate, async (req: any, res) => {
    try {
      const beforeId = req.query.before_id != null ? Number(req.query.before_id) : undefined;
      let q = supabase
        .from('community_reels')
        .select('id, author_user_id, video_url, poster_url, caption, duration_ms, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(RELS_SAHIFA);
      if (beforeId && Number.isFinite(beforeId)) q = q.lt('id', beforeId);
      const { data, error } = await q;
      if (error) throw error;

      const qatorlar = (data ?? []) as Array<Record<string, unknown>>;
      const ids = [...new Set(qatorlar.map((r) => Number(r.author_user_id)).filter(Number.isFinite))];
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', ids);
      const byId = new Map<number, Record<string, unknown>>();
      for (const u of users ?? []) byId.set(Number((u as any).id), u as Record<string, unknown>);

      const meni = Number(req.userId);
      const mod = await moderatormi(supabase, meni);

      /*
       * Layk va kommentariya sonlari IKKITA so'rov bilan olinadi va
       * xotirada guruhlanadi. Har rels uchun alohida so'rov 12 ta relsda
       * 24 ta so'rovga aylanardi.
       */
      const relsIds = qatorlar.map((r) => Number(r.id)).filter(Number.isFinite);
      const { data: laykRows } = await supabase
        .from('community_reel_likes')
        .select('reel_id, user_id')
        .in('reel_id', relsIds);
      const laykSoni = new Map<number, number>();
      const menLayk = new Set<number>();
      for (const l of (laykRows ?? []) as Array<Record<string, unknown>>) {
        const rid = Number(l.reel_id);
        laykSoni.set(rid, (laykSoni.get(rid) ?? 0) + 1);
        if (Number(l.user_id) === meni) menLayk.add(rid);
      }

      const { data: kommRows } = await supabase
        .from('community_group_messages')
        .select('reel_id')
        .in('reel_id', relsIds)
        .is('deleted_at', null);
      const kommSoni = new Map<number, number>();
      for (const k of (kommRows ?? []) as Array<Record<string, unknown>>) {
        const rid = Number(k.reel_id);
        kommSoni.set(rid, (kommSoni.get(rid) ?? 0) + 1);
      }

      res.json(
        qatorlar.map((r) => ({
          id: Number(r.id),
          author_user_id: Number(r.author_user_id),
          author_name: fullNameFromUser(byId.get(Number(r.author_user_id)) ?? {}),
          video_url: String(r.video_url),
          poster_url: r.poster_url ? String(r.poster_url) : null,
          caption: String(r.caption ?? ''),
          duration_ms: r.duration_ms != null ? Number(r.duration_ms) : null,
          created_at: String(r.created_at),
          /** Shu foydalanuvchi bu relsni o'chira oladimi. */
          can_delete: mod || Number(r.author_user_id) === meni,
          likes_count: laykSoni.get(Number(r.id)) ?? 0,
          liked_by_me: menLayk.has(Number(r.id)),
          comments_count: kommSoni.get(Number(r.id)) ?? 0,
        })),
      );
    } catch (e) {
      console.error('[GET /api/community/reels]', e);
      res.status(500).json({ error: 'Relslar yuklanmadi' });
    }
  });

  router.post(
    '/community/reels',
    authenticate,
    yozishRuxsati,
    faylQabul('file'),
    async (req: any, res) => {
      try {
        const userId = Number(req.userId);

        const file = req.file as { buffer: Buffer; mimetype: string; size: number } | undefined;
        if (!file?.buffer?.length) return res.status(400).json({ error: 'Video yuklanmadi' });
        if (!(RELS_TURLARI as readonly string[]).includes(file.mimetype)) {
          return res.status(400).json({ error: 'Faqat MP4, WEBM yoki MOV' });
        }
        if (file.size > RELS_MAX_BAYT) {
          return res
            .status(400)
            .json({ error: `Video ${Math.round(RELS_MAX_BAYT / 1024 / 1024)} MB dan oshmasin` });
        }

        const caption = asString(req.body?.caption).slice(0, 500);
        const xomMs = Number(req.body?.ms);
        const durationMs =
          Number.isFinite(xomMs) && xomMs > 0 ? Math.min(Math.round(xomMs), 10 * 60 * 1000) : null;

        const ext =
          file.mimetype === 'video/mp4' ? 'mp4' : file.mimetype === 'video/webm' ? 'webm' : 'mov';
        const yol = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

        const { data: buckets } = await supabase.storage.listBuckets();
        if (!(buckets ?? []).some((b: { name: string }) => b.name === RELS_BUCKET)) {
          await supabase.storage.createBucket(RELS_BUCKET, { public: true });
        }
        const { error: upErr } = await supabase.storage
          .from(RELS_BUCKET)
          .upload(yol, file.buffer, { contentType: file.mimetype, upsert: false });
        if (upErr) {
          console.error('[reels upload]', upErr);
          return res.status(500).json({ error: 'Video yuklanmadi' });
        }
        const { data: urlData } = supabase.storage.from(RELS_BUCKET).getPublicUrl(yol);
        const videoUrl = urlData?.publicUrl;
        if (!videoUrl) return res.status(500).json({ error: 'Video manzili olinmadi' });

        const { data, error } = await supabase
          .from('community_reels')
          .insert({
            author_user_id: userId,
            video_url: videoUrl,
            caption,
            duration_ms: durationMs,
          })
          .select('id, created_at')
          .single();
        if (error) {
          // Yozuv yaratilmadi — video yetim qolmasin.
          await supabase.storage.from(RELS_BUCKET).remove([yol]).catch(() => {});
          throw error;
        }

        const { data: user } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', userId)
          .maybeSingle();

        res.status(201).json({
          id: Number((data as any).id),
          author_user_id: userId,
          author_name: fullNameFromUser((user ?? {}) as Record<string, unknown>),
          video_url: videoUrl,
          poster_url: null,
          caption,
          duration_ms: durationMs,
          created_at: String((data as any).created_at),
          can_delete: true,
          likes_count: 0,
          liked_by_me: false,
          comments_count: 0,
        });
      } catch (e) {
        console.error('[POST /api/community/reels]', e);
        res.status(500).json({ error: 'Rels joylanmadi' });
      }
    },
  );

  /** Layk qo'yish / olib tashlash (toggle). */
  router.post('/community/reels/:id/like', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const ruxsat = await checkCanWrite(supabase, userId);
      if (ruxsat.ok === false) return res.status(ruxsat.status).json(ruxsat.body);

      const relsId = Number(req.params.id);
      if (!Number.isFinite(relsId) || relsId < 1) {
        return res.status(400).json({ error: 'Rels tanlanmadi' });
      }
      const { data: rels } = await supabase
        .from('community_reels')
        .select('id, deleted_at')
        .eq('id', relsId)
        .maybeSingle();
      if (!rels || (rels as { deleted_at?: string | null }).deleted_at) {
        return res.status(404).json({ error: 'Rels topilmadi' });
      }

      const { data: bor } = await supabase
        .from('community_reel_likes')
        .select('user_id')
        .eq('reel_id', relsId)
        .eq('user_id', userId)
        .maybeSingle();

      if (bor) {
        await supabase
          .from('community_reel_likes')
          .delete()
          .eq('reel_id', relsId)
          .eq('user_id', userId);
      } else {
        const { error } = await supabase
          .from('community_reel_likes')
          .insert({ reel_id: relsId, user_id: userId });
        // Tez ikki marta bosilsa "duplicate key" kelishi mumkin — xato emas.
        if (error && !/duplicate key/i.test(String((error as { message?: string }).message ?? ''))) {
          throw error;
        }
      }

      const { data: barchasi } = await supabase
        .from('community_reel_likes')
        .select('user_id')
        .eq('reel_id', relsId);
      const qatorlar = (barchasi ?? []) as Array<{ user_id: number }>;

      res.json({
        reel_id: relsId,
        likes_count: qatorlar.length,
        liked_by_me: qatorlar.some((l) => Number(l.user_id) === userId),
      });
    } catch (e) {
      console.error('[POST /api/community/reels/:id/like]', e);
      res.status(500).json({ error: 'Layk saqlanmadi' });
    }
  });

  /** Bitta relsning kommentariyalari — eskidan yangiga. */
  router.get('/community/reels/:id/comments', authenticate, async (req: any, res) => {
    try {
      const relsId = Number(req.params.id);
      if (!Number.isFinite(relsId)) return res.status(400).json({ error: 'Rels tanlanmadi' });

      const { data, error } = await supabase
        .from('community_group_messages')
        .select('id, sender_user_id, content, created_at')
        .eq('reel_id', relsId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;

      const qatorlar = (data ?? []) as Array<Record<string, unknown>>;
      const ids = [...new Set(qatorlar.map((r) => Number(r.sender_user_id)).filter(Number.isFinite))];
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', ids);
      const byId = new Map<number, Record<string, unknown>>();
      for (const u of users ?? []) byId.set(Number((u as any).id), u as Record<string, unknown>);

      res.json(
        qatorlar.map((r) => ({
          id: Number(r.id),
          author_user_id: Number(r.sender_user_id),
          author_name: fullNameFromUser(byId.get(Number(r.sender_user_id)) ?? {}),
          content: String(r.content),
          created_at: String(r.created_at),
        })),
      );
    } catch (e) {
      console.error('[GET /api/community/reels/:id/comments]', e);
      res.status(500).json({ error: 'Kommentariyalar yuklanmadi' });
    }
  });

  /*
   * KOMMENTARIYA — guruh xabari sifatida saqlanadi.
   *
   * Shuning uchun u savol-javob guruhida ham ko'rinadi (talab shunday),
   * moderatsiya, tahrirlash va o'chirish esa oddiy xabar bilan bir xil
   * yo'ldan ketadi — alohida mantiq yozilmaydi.
   */
  router.post('/community/reels/:id/comments', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const ruxsat = await checkCanWrite(supabase, userId);
      if (ruxsat.ok === false) return res.status(ruxsat.status).json(ruxsat.body);

      const relsId = Number(req.params.id);
      if (!Number.isFinite(relsId) || relsId < 1) {
        return res.status(400).json({ error: 'Rels tanlanmadi' });
      }
      const { data: rels } = await supabase
        .from('community_reels')
        .select('id, deleted_at')
        .eq('id', relsId)
        .maybeSingle();
      if (!rels || (rels as { deleted_at?: string | null }).deleted_at) {
        return res.status(404).json({ error: 'Rels topilmadi' });
      }

      const xom = asString(req.body?.content);
      if (!xom) return res.status(400).json({ error: 'Kommentariya bo‘sh bo‘lmasin' });
      if (xom.length > MAX_CONTENT) {
        return res.status(400).json({ error: `Kommentariya ${MAX_CONTENT} belgidan oshmasin` });
      }
      const content = await normalizeMentions(supabase, xom, await moderatormi(supabase, userId));

      const { data, error } = await supabase
        .from('community_group_messages')
        .insert({ group_code: GROUP_CODE, sender_user_id: userId, content, reel_id: relsId })
        .select('id, created_at')
        .single();
      if (error) throw error;

      await touchPresence(supabase, userId);
      const { data: user } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();

      res.status(201).json({
        id: Number((data as any).id),
        author_user_id: userId,
        author_name: fullNameFromUser((user ?? {}) as Record<string, unknown>),
        content,
        created_at: String((data as any).created_at),
      });
    } catch (e) {
      console.error('[POST /api/community/reels/:id/comments]', e);
      res.status(500).json({ error: 'Kommentariya yuborilmadi' });
    }
  });

  router.delete('/community/reels/:id', authenticate, async (req: any, res) => {
    try {
      const userId = Number(req.userId);
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: 'Rels tanlanmadi' });

      const { data: rels } = await supabase
        .from('community_reels')
        .select('id, author_user_id, video_url, deleted_at')
        .eq('id', id)
        .maybeSingle();
      if (!rels) return res.status(404).json({ error: 'Rels topilmadi' });
      const r = rels as { author_user_id: number; video_url: string; deleted_at?: string | null };
      if (r.deleted_at) return res.json({ ok: true, id });

      const mod = await moderatormi(supabase, userId);
      if (!mod && Number(r.author_user_id) !== userId) {
        return res.status(403).json({ error: "Ruxsat yo'q" });
      }

      /*
       * Yozuv YUMSHOQ o'chiriladi (kim olib tashlagani bilinsin), fayl
       * esa diskdan darhol ketadi — joyni aynan u egallaydi.
       */
      await supabase
        .from('community_reels')
        .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
        .eq('id', id);

      const belgi = '/uploads/storage/' + RELS_BUCKET + '/';
      const i = String(r.video_url).indexOf(belgi);
      if (i !== -1) {
        const nisbiy = String(r.video_url).slice(i + belgi.length);
        await supabase.storage.from(RELS_BUCKET).remove([nisbiy]).catch(() => {});
      }

      res.json({ ok: true, id });
    } catch (e) {
      console.error('[DELETE /api/community/reels/:id]', e);
      res.status(500).json({ error: "Rels o'chirilmadi" });
    }
  });

  router.get('/community/moderation/blocks', authenticate, async (req: any, res) => {
    const mod = await moderatorGate(req, res);
    if (!mod) return;
    try {
      res.json(await listBlocks(supabase));
    } catch (e) {
      console.error('[GET /api/community/moderation/blocks]', e);
      res.status(500).json({ error: "Ro'yxat yuklanmadi" });
    }
  });

  router.post('/community/moderation/blocks', authenticate, async (req: any, res) => {
    const mod = await moderatorGate(req, res);
    if (!mod) return;
    try {
      const targetId = Number(req.body?.user_id);
      if (!Number.isFinite(targetId) || targetId <= 0) {
        return res.status(400).json({ error: "Foydalanuvchi tanlanmadi" });
      }
      if (targetId === mod.id) {
        return res.status(400).json({ error: "O'zingizni bloklay olmaysiz" });
      }
      // Oltin hisobni hech kim bloklay olmaydi.
      if (await moderatormi(supabase, targetId)) {
        return res.status(403).json({ error: 'Bu hisobni bloklab bo\'lmaydi' });
      }
      const daysRaw = req.body?.days;
      const days = daysRaw == null || daysRaw === '' ? null : Number(daysRaw);
      const block = await blockUser(supabase, {
        userId: targetId,
        reason: asString(req.body?.reason) || null,
        days: Number.isFinite(days as number) ? (days as number) : null,
        byUserId: mod.id,
        byName: mod.name,
      });
      res.status(201).json(block);
    } catch (e) {
      console.error('[POST /api/community/moderation/blocks]', e);
      res.status(500).json({ error: 'Blok saqlanmadi' });
    }
  });

  router.delete('/community/moderation/blocks/:userId', authenticate, async (req: any, res) => {
    const mod = await moderatorGate(req, res);
    if (!mod) return;
    try {
      const ok = await unblockUser(supabase, Number(req.params.userId));
      res.json({ success: ok });
    } catch (e) {
      console.error('[DELETE /api/community/moderation/blocks/:userId]', e);
      res.status(500).json({ error: 'Blok olinmadi' });
    }
  });

  router.patch('/community/moderation/messages/:id', authenticate, async (req: any, res) => {
    const mod = await moderatorGate(req, res);
    if (!mod) return;
    try {
      const id = Number(req.params.id);
      const content = asString(req.body?.content);
      if (!content) return res.status(400).json({ error: 'Matn bo\'sh bo\'lmasin' });
      if (content.length > MAX_CONTENT) {
        return res.status(400).json({ error: `Xabar ${MAX_CONTENT} belgidan oshmasin` });
      }
      const { error } = await supabase
        .from('community_group_messages')
        .update({
          // Tahrirlovchi — moderator, ya'ni "Hammaga" belgisi unga ochiq.
          content: await normalizeMentions(supabase, content, true),
          edited_at: new Date().toISOString(),
          moderated_by: mod.name,
        })
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      console.error('[PATCH /api/community/moderation/messages/:id]', e);
      res.status(500).json({ error: 'Xabar tahrirlanmadi' });
    }
  });

  router.delete('/community/moderation/messages/:id', authenticate, async (req: any, res) => {
    const mod = await moderatorGate(req, res);
    if (!mod) return;
    try {
      const id = Number(req.params.id);
      const { error } = await supabase
        .from('community_group_messages')
        .update({ deleted_at: new Date().toISOString(), moderated_by: mod.name })
        .eq('id', id);
      if (error) throw error;
      // Fayl darhol ketadi; yozuvning o'zini soatlik tozalash muhlatdan keyin oladi.
      await ochirXabarMediasi(supabase, id);
      res.json({ success: true });
    } catch (e) {
      console.error('[DELETE /api/community/moderation/messages/:id]', e);
      res.status(500).json({ error: 'Xabar o\'chirilmadi' });
    }
  });

  /**
   * FOYDALANUVCHI KARTASI — support chatda ismga bosganda ochiladi.
   *
   * FAQAT SUPPORT (oltin hisob) uchun. Admin paneliga bu ataylab
   * ULANMAGAN: `adminRoutes` da bunday endpoint yo'q va qo'shilmasligi
   * kerak. `moderatorGate` esa faqat `users.is_golden` ni tekshiradi,
   * ya'ni admin sessiyasi bu yerga umuman yeta olmaydi.
   *
   * Oddiy foydalanuvchi ham boshqa odamning telefoni va pochtasini
   * ko'ra olmaydi — tekshiruv birinchi qatorda turadi.
   *
   * PAROL QAYTARILMAYDI va qaytarilishi ham mumkin emas: u bazada
   * bcrypt xeshi sifatida yotadi, ya'ni asl matn hech qayerda saqlanmagan.
   * Support parolni "ko'rish" o'rniga uni QAYTA TIKLASHI kerak.
   */
  router.get('/community/moderation/users/:userId', authenticate, async (req: any, res) => {
    const mod = await moderatorGate(req, res);
    if (!mod) return;
    try {
      const id = Number(req.params.userId);
      if (!Number.isFinite(id) || id < 1) {
        return res.status(400).json({ error: 'Foydalanuvchi tanlanmadi' });
      }

      const { data: u } = await supabase
        .from('users')
        .select(
          'id, first_name, last_name, email, phone, avatar_url, age, gender, account_type, last_seen_at, ' +
            'level, created_at, plan_name, plan_expires_at, is_golden, points, total_points, ' +
            'best_streak_days, total_time_seconds, learning_goal, onboarding_completed',
        )
        .eq('id', id)
        .maybeSingle();
      if (!u) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
      const r = u as Record<string, unknown>;

      /*
       * OXIRGI KO'RINISH — ikki manba, kattasi olinadi.
       *
       * `users.last_seen_at` butun platformani qamraydi va asosiy manba.
       * Chat presence'i esa u qo'shilishidan OLDINGI davr uchun qoladi:
       * eski hisoblarda `users.last_seen_at` bo'sh, ammo chatda ko'ringan
       * payti ma'lum. Faqat yangisiga tayansak, o'sha tarix yo'qolardi.
       */
      const { data: pres } = await supabase
        .from('community_group_presence')
        .select('last_seen_at')
        .eq('user_id', id)
        .eq('group_code', GROUP_CODE)
        .maybeSingle();
      const chatKorinish = (pres as { last_seen_at?: string } | null)?.last_seen_at ?? null;
      const platformaKorinish = r.last_seen_at ? String(r.last_seen_at) : null;
      const lastSeen =
        platformaKorinish && chatKorinish
          ? new Date(platformaKorinish) > new Date(chatKorinish)
            ? platformaKorinish
            : chatKorinish
          : (platformaKorinish ?? chatKorinish);

      /*
       * Oxirgi faoliyat — "qaysi kunda, nimani, qachon". `done_at` bo'yicha
       * teskari tartibda, chunki supportga eng yangisi kerak.
       */
      /*
       * MANBA: `user_kunlik_day_progress`.
       *
       * Ilgari bu yerda `user_kunlik_progress` o'qilardi — u esa
       * `136b_kunlik_day_progress.sql` da O'CHIRILGAN eski jadval. Ya'ni
       * so'rov hech qachon qator qaytarmasdi va supportda "Oxirgi
       * faoliyati" bo'limi hamisha "Hali darsga kirmagan" deb turardi.
       *
       * Yangi jadvalda har kun BITTA qator va bloklar ustunlarda. Shuning
       * uchun qator bloklarga yoyiladi. Vaqt esa butun kunniki
       * (`updated_at`) — yangi jadvalda har blokning o'z vaqti yo'q.
       */
      const { data: kunlik } = await supabase
        .from('user_kunlik_day_progress')
        .select(
          'day_number, grammar_1, grammar_2, grammar_3, words_match, oqish_done, speaking_level, suhbat_done, updated_at',
        )
        .eq('user_id', id)
        .order('updated_at', { ascending: false })
        .limit(8);

      const faoliyat: Array<{ day_number: number; block_kind: string; done_at: string }> = [];
      for (const xom of (kunlik ?? []) as Array<Record<string, unknown>>) {
        const kun = Number(xom.day_number);
        const vaqt = String(xom.updated_at ?? '');
        const qosh = (blok: string) => faoliyat.push({ day_number: kun, block_kind: blok, done_at: vaqt });
        if (xom.grammar_1 && xom.grammar_2 && xom.grammar_3) qosh('grammar');
        if (xom.words_match) qosh('vocabulary');
        if (xom.oqish_done) qosh('text');
        if (Number(xom.speaking_level ?? 0) > 0) qosh('speaking');
        if (xom.suhbat_done) qosh('suhbat');
        if (faoliyat.length >= 15) break;
      }
      faoliyat.length = Math.min(faoliyat.length, 15);

      // Faol kunlar — streak va "qachondan beri yo'q" uchun.
      const { data: kunlar } = await supabase
        .from('user_activity_dates')
        .select('activity_date')
        .eq('user_id', id)
        .order('activity_date', { ascending: false })
        .limit(30);
      const faolKunlar = ((kunlar ?? []) as Array<{ activity_date: string }>).map((k) =>
        String(k.activity_date),
      );

      // Muloqotdagi ishtiroki — support uchun kontekst.
      const { data: xabarlar } = await supabase
        .from('community_group_messages')
        .select('id')
        .eq('sender_user_id', id)
        .is('deleted_at', null);

      // Faol blok: `released_at` bo'sh bo'lgani. Tarixdagi eski bloklar kerak emas.
      const { data: bloklar } = await supabase
        .from('chat_blocks')
        .select('id, reason, expires_at, blocked_by_name, created_at')
        .eq('user_id', id)
        .is('released_at', null)
        .limit(1);
      const blok = ((bloklar ?? []) as Array<Record<string, unknown>>)[0] ?? null;

      res.json({
        id: Number(r.id),
        name: fullNameFromUser(r),
        avatar_url: r.avatar_url ? String(r.avatar_url) : null,
        // Aloqa — supportning asosiy ehtiyoji.
        phone: r.phone ? String(r.phone) : null,
        email: r.email ? String(r.email) : null,
        age: r.age != null ? Number(r.age) : null,
        gender: r.gender ? String(r.gender) : null,
        account_type: r.account_type ? String(r.account_type) : null,
        level: r.level ? String(r.level) : null,
        learning_goal: r.learning_goal ? String(r.learning_goal) : null,
        onboarding_completed: r.onboarding_completed === true,
        registered_at: r.created_at ? String(r.created_at) : null,
        // Obuna holati.
        plan_name: r.plan_name ? String(r.plan_name) : null,
        plan_expires_at: r.plan_expires_at ? String(r.plan_expires_at) : null,
        is_golden: r.is_golden === true,
        // Faollik.
        last_seen_at: lastSeen,
        /** Chatdagi va platformadagi ko'rinish alohida — support farqini bilsin. */
        last_seen_chat: chatKorinish,
        last_seen_platform: platformaKorinish,
        points: Number(r.points ?? 0),
        total_points: Number(r.total_points ?? 0),
        best_streak_days: Number(r.best_streak_days ?? 0),
        total_time_seconds: Number(r.total_time_seconds ?? 0),
        message_count: (xabarlar ?? []).length,
        recent_activity: faoliyat,
        active_dates: faolKunlar,
        block: blok ?? null,
        /*
         * Parol ataylab YO'Q. Bu maydon shuning uchun turibdi: aks holda
         * "ko'rsatish unutilgan" deb o'ylanib, keyinroq qo'shib qo'yilishi
         * mumkin edi.
         */
        password_note: 'Parol bcrypt xeshi sifatida saqlanadi — uni ko\'rib bo\'lmaydi.',
      });
    } catch (e) {
      console.error('[GET /api/community/moderation/users/:userId]', e);
      res.status(500).json({ error: "Ma'lumot yuklanmadi" });
    }
  });

  return router;
}
