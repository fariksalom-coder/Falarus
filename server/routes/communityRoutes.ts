import { Router, type Request, type Response } from 'express';
import type { DbClient } from '../types/dbClient';

const GROUP_CODE = 'savol_javob';
const MAX_CONTENT = 2000;
const DEFAULT_LIMIT = 80;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function displayNameFromRow(row: Record<string, unknown>): string {
  const partner = asString(row.partner_display_name);
  if (partner) return partner;
  const first = asString(row.first_name);
  const last = asString(row.last_name);
  const full = `${first} ${last}`.trim();
  return full || 'Foydalanuvchi';
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
  const [{ data: users }, { data: profiles }] = await Promise.all([
    supabase.from('users').select('id, first_name, last_name').in('id', senderIds),
    supabase.from('partner_profiles').select('user_id, display_name').in('user_id', senderIds),
  ]);
  const userById = new Map<number, Record<string, unknown>>();
  for (const u of users ?? []) userById.set(Number((u as any).id), u as Record<string, unknown>);
  const profileById = new Map<number, string>();
  for (const p of profiles ?? []) profileById.set(Number((p as any).user_id), asString((p as any).display_name));

  return messages
    .map((m) => {
      const senderId = Number(m.sender_user_id);
      const user = userById.get(senderId) ?? {};
      return {
        id: Number(m.id),
        group_code: String(m.group_code),
        sender_user_id: senderId,
        sender_name: displayNameFromRow({
          ...user,
          partner_display_name: profileById.get(senderId) ?? '',
        }),
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
      const [{ data: lastRows, error: lastErr }, { data: readRow }] = await Promise.all([
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

  router.get('/community/savol-javob/messages', authenticate, async (req: any, res) => {
    try {
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
      const { data: user } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();
      const { data: profile } = await supabase
        .from('partner_profiles')
        .select('display_name')
        .eq('user_id', userId)
        .maybeSingle();
      res.status(201).json({
        id: Number((data as any).id),
        group_code: GROUP_CODE,
        sender_user_id: userId,
        sender_name: displayNameFromRow({
          ...(user ?? {}),
          partner_display_name: (profile as any)?.display_name ?? '',
        }),
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
      res.json({ success: true });
    } catch (e) {
      console.error('[POST /api/community/savol-javob/read]', e);
      res.status(500).json({ error: 'O\'qilgan holat saqlanmadi' });
    }
  });

  return router;
}
