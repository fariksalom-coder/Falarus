import type { DbClient } from '../types/dbClient';

/*
 * CHATDA BLOKLASH.
 *
 * Blok — o'chirish emas, O'QISH REJIMI: odam guruh chatini va sherik chatini
 * ko'raveradi, lekin yozolmaydi. Yagona ochiq kanal — Support (yordam chati):
 * bloklangan odam ham nima uchun bloklanganini so'ray olsin.
 *
 * Blokni admin panel yoki oltin support hisobi qo'yadi/oladi.
 */

export type ChatBlock = {
  id: number;
  user_id: number;
  reason: string | null;
  expires_at: string | null;
  blocked_by_name: string | null;
  created_at: string;
};

type BlockRow = {
  id: number | string;
  user_id: number | string;
  reason: string | null;
  expires_at: string | null;
  released_at: string | null;
  blocked_by_name: string | null;
  created_at: string;
};

const SELECT = 'id, user_id, reason, expires_at, released_at, blocked_by_name, created_at';

function toBlock(row: BlockRow): ChatBlock {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    reason: row.reason ?? null,
    expires_at: row.expires_at ?? null,
    blocked_by_name: row.blocked_by_name ?? null,
    created_at: String(row.created_at),
  };
}

/** Muddati o'tgan blok o'z-o'zidan tugaydi — alohida cron kerak emas. */
function faolmi(row: BlockRow): boolean {
  if (row.released_at) return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

/** Foydalanuvchining faol bloki (yo'q bo'lsa `null`). */
export async function getActiveBlock(
  supabase: DbClient,
  userId: number
): Promise<ChatBlock | null> {
  if (!Number.isFinite(userId) || userId <= 0) return null;
  const { data, error } = await supabase
    .from('chat_blocks')
    .select(SELECT)
    .eq('user_id', userId)
    .is('released_at', null)
    .maybeSingle();
  // Jadval hali yaratilmagan bo'lsa chat ishlashdan to'xtamasin.
  if (error || !data) return null;
  const row = data as BlockRow;
  return faolmi(row) ? toBlock(row) : null;
}

/** Yozishga ruxsat bormi. Bloklangan bo'lsa — javob matni bilan qaytadi. */
export async function checkCanWrite(
  supabase: DbClient,
  userId: number
): Promise<{ ok: true } | { ok: false; status: number; body: Record<string, unknown> }> {
  const block = await getActiveBlock(supabase, userId);
  if (!block) return { ok: true };
  return {
    ok: false,
    status: 403,
    body: {
      error: block.reason
        ? `Siz o'qish rejimidasiz: ${block.reason}. Savolingiz bo'lsa Support'ga yozing.`
        : "Siz o'qish rejimidasiz — chatlarda yozolmaysiz. Savolingiz bo'lsa Support'ga yozing.",
      blocked: true,
      reason: block.reason,
      expires_at: block.expires_at,
    },
  };
}

/**
 * Blok qo'yish yoki mavjudini yangilash (sabab/muddat).
 * `days` — necha kunga; `null` yoki 0 bo'lsa muddatsiz.
 */
export async function blockUser(
  supabase: DbClient,
  params: {
    userId: number;
    reason?: string | null;
    days?: number | null;
    byUserId?: number | null;
    byAdminId?: number | null;
    byName?: string | null;
  }
): Promise<ChatBlock> {
  const expiresAt =
    params.days && params.days > 0
      ? new Date(Date.now() + params.days * 24 * 60 * 60 * 1000).toISOString()
      : null;
  const now = new Date().toISOString();
  const mavjud = await getActiveBlockRow(supabase, params.userId);

  if (mavjud) {
    const { data, error } = await supabase
      .from('chat_blocks')
      .update({
        reason: params.reason ?? null,
        expires_at: expiresAt,
        blocked_by_user_id: params.byUserId ?? null,
        blocked_by_admin_id: params.byAdminId ?? null,
        blocked_by_name: params.byName ?? null,
        updated_at: now,
      })
      .eq('id', mavjud.id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return toBlock(data as BlockRow);
  }

  const { data, error } = await supabase
    .from('chat_blocks')
    .insert({
      user_id: params.userId,
      reason: params.reason ?? null,
      expires_at: expiresAt,
      blocked_by_user_id: params.byUserId ?? null,
      blocked_by_admin_id: params.byAdminId ?? null,
      blocked_by_name: params.byName ?? null,
      created_at: now,
      updated_at: now,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return toBlock(data as BlockRow);
}

/** Blokdan chiqarish. Yozuv tarix uchun qoladi. */
export async function unblockUser(supabase: DbClient, userId: number): Promise<boolean> {
  const mavjud = await getActiveBlockRow(supabase, userId);
  if (!mavjud) return false;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('chat_blocks')
    .update({ released_at: now, updated_at: now })
    .eq('id', mavjud.id);
  if (error) throw error;
  return true;
}

async function getActiveBlockRow(supabase: DbClient, userId: number): Promise<BlockRow | null> {
  const { data, error } = await supabase
    .from('chat_blocks')
    .select(SELECT)
    .eq('user_id', userId)
    .is('released_at', null)
    .maybeSingle();
  if (error || !data) return null;
  return data as BlockRow;
}

export type BlockListItem = ChatBlock & {
  full_name: string;
  phone: string | null;
  active: boolean;
};

/** Bloklanganlar ro'yxati (faollari yuqorida). */
export async function listBlocks(supabase: DbClient, limit = 100): Promise<BlockListItem[]> {
  const { data, error } = await supabase
    .from('chat_blocks')
    .select(SELECT)
    .is('released_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  const rows = (data ?? []) as BlockRow[];
  if (!rows.length) return [];

  const ids = [...new Set(rows.map((r) => Number(r.user_id)))];
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, phone')
    .in('id', ids);
  const byId = new Map<number, { first_name?: string; last_name?: string; phone?: string | null }>();
  for (const u of users ?? []) byId.set(Number((u as { id: number }).id), u as never);

  return rows.map((row) => {
    const u = byId.get(Number(row.user_id)) ?? {};
    return {
      ...toBlock(row),
      full_name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Foydalanuvchi',
      phone: u.phone ?? null,
      active: faolmi(row),
    };
  });
}
