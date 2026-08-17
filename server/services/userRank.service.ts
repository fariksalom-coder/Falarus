/**
 * userRank.service — foydalanuvchining XP bo'yicha platformadagi o'rni.
 *
 * O'rin JONLI hisoblanadi: `total_points` dan katta foydalanuvchilar soni + 1.
 * Shuning uchun `leaderboard` jadvalidagi cron yangilaydigan `rank` ustuniga
 * bog'liq emas va hech qachon eskirmaydi — XP o'zgargan zahoti to'g'ri raqam
 * chiqadi.
 *
 * Alohida servis, chunki uni IKKI joy chaqiradi: `GET /api/my-rank` va
 * iboralarni yakunlash endpointi (natijani darhol qaytarish uchun).
 */
import type { DbClient } from '../types/dbClient';

/** Platforma egasining test hisobi ommaviy reytingga kirmaydi. */
export const LEADERBOARD_EXCLUDED_USER_ID = 1;

export type UserRank = {
  /** 1 dan boshlanadi. `null` — XP yo'q, ya'ni hali o'rin yo'q. */
  rank: number | null;
  points: number;
  /** Reytingda qatnashayotganlar soni. */
  total: number;
  /** Bugungi boshlang'ich o'ringa nisbatan o'zgarish (+ ko'tarildi, − tushdi). */
  delta: number;
};

export async function getUserRank(
  supabase: DbClient,
  userId: number,
  today: string,
  options: { updateSnapshot?: boolean } = {},
): Promise<UserRank> {
  if (userId === LEADERBOARD_EXCLUDED_USER_ID) {
    return { rank: null, points: 0, total: 0, delta: 0 };
  }

  const { data: me, error: meErr } = await supabase
    .from('users')
    .select('total_points, rank_snapshot, rank_snapshot_date')
    .eq('id', userId)
    .single();
  if (meErr) throw meErr;

  const meRow = me as {
    total_points?: number;
    rank_snapshot?: number | null;
    rank_snapshot_date?: string | null;
  } | null;
  const points = Number(meRow?.total_points ?? 0);

  // XP yo'q — o'rin ham yo'q. Aks holda hali hech narsa qilmaganlarning
  // hammasi 0 ballda tenglashib, "#1" ko'rinardi.
  if (points <= 0) {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('id', LEADERBOARD_EXCLUDED_USER_ID)
      .gt('total_points', 0);
    return { rank: null, points: 0, total: count ?? 0, delta: 0 };
  }

  const [aheadRes, totalRes] = await Promise.all([
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('id', LEADERBOARD_EXCLUDED_USER_ID)
      .gt('total_points', points),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('id', LEADERBOARD_EXCLUDED_USER_ID)
      .gt('total_points', 0),
  ]);
  if (aheadRes.error) throw aheadRes.error;

  const rank = (aheadRes.count ?? 0) + 1;

  /*
   * Taqqoslash nuqtasi — SHU KUNNING birinchi tekshiruvidagi o'rin. Har
   * so'rovda yangilansa, farq doim 0 bo'lardi (o'zini o'zi bilan solishtirish).
   */
  const snapDate = meRow?.rank_snapshot_date ? String(meRow.rank_snapshot_date).slice(0, 10) : null;
  const snapRank = meRow?.rank_snapshot != null ? Number(meRow.rank_snapshot) : null;

  if (snapDate === today && snapRank != null) {
    return { rank, points, total: totalRes.count ?? 0, delta: snapRank - rank };
  }

  // Kun ichidagi birinchi tekshiruv — bugungi boshlang'ich o'rinni yozamiz.
  // XP olgandan KEYINGI chaqiruvda yozib qo'ymaymiz (`updateSnapshot: false`),
  // aks holda ko'tarilish darrov "o'zgarishsiz" bo'lib qolardi.
  if (options.updateSnapshot !== false) {
    await supabase
      .from('users')
      .update({ rank_snapshot: rank, rank_snapshot_date: today })
      .eq('id', userId);
  }

  return { rank, points, total: totalRes.count ?? 0, delta: 0 };
}
