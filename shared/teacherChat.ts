/**
 * Ustoz ↔ o'quvchi chati: server va ilova uchun umumiy, sof (DB'siz) qoidalar.
 *
 * - Server bitta so'rovda eng YANGI `TEACHER_CHAT_PAGE_SIZE` ta xabarni qaytaradi,
 *   lekin ekranda ular eskidan yangiga tartiblangan bo'lishi kerak.
 * - `?after=<id>` — so'rov (polling) faqat shu id'dan keyingi xabarlarni oladi.
 * - Ilova yuborilgan xabarni darhol qo'shadi, keyin polling o'sha xabarni yana
 *   olib keladi — shuning uchun birlashtirish id bo'yicha takrorni olib tashlaydi.
 */

export const TEACHER_CHAT_PAGE_SIZE = 100;

export type ChatMessageLike = {
  id: number;
  sender_user_id: number;
  created_at: string;
  read_at?: string | null;
};

/** `?after=` qiymati: faqat musbat butun son qabul qilinadi, aks holda `null` (birinchi yuklash). */
export function parseChatAfterId(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Eskidan yangiga: avval vaqt, teng bo'lsa id bo'yicha. */
export function toChronological<T extends ChatMessageLike>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const dt = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return dt !== 0 && Number.isFinite(dt) ? dt : a.id - b.id;
  });
}

/** O'quvchi/ustoz uchun suhbatdoshdan kelgan, hali o'qilmagan xabar bormi. */
export function hasUnreadFor(rows: readonly ChatMessageLike[], readerUserId: number): boolean {
  return rows.some((m) => !m.read_at && Number(m.sender_user_id) !== readerUserId);
}

/** Mavjud ro'yxatga yangi xabarlarni qo'shadi: id bo'yicha takrorsiz, xronologik tartibda. */
export function mergeChatMessages<T extends ChatMessageLike>(prev: readonly T[], incoming: readonly T[]): T[] {
  if (incoming.length === 0) return prev as T[];
  const byId = new Map<number, T>();
  for (const m of prev) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return toChronological(Array.from(byId.values()));
}

/** Polling kursori: ro'yxatdagi eng katta id (bo'sh bo'lsa `null`). */
export function lastChatMessageId(rows: readonly ChatMessageLike[]): number | null {
  let max: number | null = null;
  for (const m of rows) if (max === null || m.id > max) max = m.id;
  return max;
}
