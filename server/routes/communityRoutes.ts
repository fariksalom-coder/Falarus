import { Router, type Request, type Response } from 'express';
import type { DbClient } from '../types/dbClient';
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
  opts: { beforeId?: number; limit?: number }
) {
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), 120);
  let query = supabase
    .from('community_group_messages')
    .select('id, group_code, sender_user_id, content, created_at, edited_at, deleted_at')
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

  return messages
    .map((m) => {
      const senderId = Number(m.sender_user_id);
      const user = userById.get(senderId) ?? {};
      return {
        id: Number(m.id),
        group_code: String(m.group_code),
        sender_user_id: senderId,
        sender_name: fullNameFromUser(user),
        content: String(m.content),
        created_at: String(m.created_at),
        edited_at: m.edited_at ? String(m.edited_at) : null,
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
      const messages = await fetchMessagesWithSenders(supabase, { beforeId });
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
      const { error } = await supabase
        .from('community_group_messages')
        .update({ deleted_at: new Date().toISOString(), moderated_by: mod.name })
        .eq('id', Number(req.params.id));
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      console.error('[DELETE /api/community/moderation/messages/:id]', e);
      res.status(500).json({ error: 'Xabar o\'chirilmadi' });
    }
  });

  return router;
}
