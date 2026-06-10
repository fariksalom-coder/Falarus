import type { DbClient } from '../types/dbClient';

/** Foydalanuvchi uchun `support_chats` qatorini kafolatlaydi (mavjud bo‘lsa id qaytaradi). */
export async function ensureSupportChatForUser(supabase: DbClient, userId: number): Promise<number> {
  const { data: existing, error: existingErr } = await supabase
    .from('support_chats')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing?.id) return Number((existing as { id: number }).id);

  const now = new Date().toISOString();
  const { data: created, error: createErr } = await supabase
    .from('support_chats')
    .insert({
      user_id: userId,
      status: 'open',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (createErr || !created) throw createErr ?? new Error('Support chat yaratilmadi');
  return Number((created as { id: number }).id);
}
