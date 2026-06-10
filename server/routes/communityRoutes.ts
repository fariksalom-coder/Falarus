import { Router, type Request, type Response } from 'express';
import type { DbClient } from '../types/dbClient';

const GROUP_CODE = 'savol_javob';
const MAX_CONTENT = 2000;
const DEFAULT_LIMIT = 80;
const ONLINE_WINDOW_MS = 90_000;
const TYPING_WINDOW_MS = 8_000;

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

async function fetchMessagesWithSenders(
  supabase: DbClient,
  opts: { beforeId?: number; limit?: number }
) {
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), 120);
  let query = supabase
    .from('community_group_messages')
    .select('id, group_code, sender_user_id, content, created_at')
    .eq('group_code', GROUP_CODE)
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
      };
    })
    .reverse();
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
      });
    } catch (e) {
      console.error('[GET /api/community/savol-javob/summary]', e);
      res.status(500).json({ error: 'Guruh ma\'lumoti yuklanmadi' });
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
      const content = asString(req.body?.content);
      if (!content) return res.status(400).json({ error: 'Xabar bo\'sh bo\'lmasin' });
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

  return router;
}
