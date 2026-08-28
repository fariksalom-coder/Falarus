/**
 * Guruh chatida odamni "@" bilan belgilash.
 *
 * Xabar matnida belgilangan odam `@[Ism Familiya](42)` ko‘rinishida saqlanadi —
 * ism o‘zgarsa ham `42` orqali aynan o‘sha foydalanuvchi topiladi.
 */

const MENTION_PATTERN = '@\\[([^\\]\\n]{1,80})\\]\\((\\d{1,12})\\)';

/** Har chaqiruvda yangi regex — global regex `lastIndex` ni saqlab qolmasin. */
function mentionRegex(): RegExp {
  return new RegExp(MENTION_PATTERN, 'g');
}

export type MentionPart =
  | { type: 'text'; text: string }
  | { type: 'mention'; userId: number; name: string };

/** Token ichida `]` yoki `(` bo‘lsa matn buziladi — shuning uchun tozalanadi. */
export function sanitizeMentionName(name: string): string {
  return name.replace(/[[\]()\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function mentionToken(userId: number, name: string): string {
  return `@[${sanitizeMentionName(name) || 'Foydalanuvchi'}](${userId})`;
}

/**
 * "HAMMAGA" belgisi — guruhdagi BARCHA odamga bildirishnoma.
 *
 * Oddiy "mention" bilan bir xil ko'rinishda saqlanadi, faqat id `0`: bazada
 * bunday foydalanuvchi yo'q, ya'ni u hech kimning shaxsiy belgisi bilan
 * chalkashmaydi va eski xabarlar ham buzilmaydi.
 *
 * Faqat SUPPORT (oltin hisob) yubora oladi — server tekshiradi. Aks holda har
 * kim butun guruhni bezovta qila olardi.
 */
export const HAMMA_MENTION_ID = 0;
export const HAMMA_MENTION_NOMI = 'Hammaga';

export function hammaMentionToken(): string {
  return `@[${HAMMA_MENTION_NOMI}](${HAMMA_MENTION_ID})`;
}

/**
 * Qo'lda yozilgan `@all` ni haqiqiy belgiga aylantiradi.
 *
 * Support ro'yxatdan tanlashni kutib o'tirmay, odatdagidek `@all` deb yozadi.
 * Shuning uchun matnda uchraydigan `@all`, `@hamma`, `@hammaga` (registr
 * farq qilmaydi) belgiga almashtiriladi.
 *
 * Almashtirish FAQAT oddiy matn bo'laklarida bo'ladi: allaqachon mavjud
 * `@[Ism](42)` belgilarining ichiga tegilmaydi, aks holda ism ichidagi "all"
 * so'zi xabarni buzib yuborardi.
 */
export function hammaMatniniBelgiga(content: string): string {
  const soz = /(^|[^\w@])@(all|hamma|hammaga)\b/gi;
  return parseMentionParts(content)
    .map((part) =>
      part.type === 'text'
        ? part.text.replace(soz, (_m, oldin: string) => `${oldin}${hammaMentionToken()}`)
        : mentionToken(part.userId, part.name),
    )
    .join('');
}

/** Xabarda "hammaga" belgisi bormi. */
export function hammaMentionBormi(content: string): boolean {
  return parseMentionParts(content).some(
    (p) => p.type === 'mention' && p.userId === HAMMA_MENTION_ID,
  );
}

/** Matnni oddiy bo‘laklar va belgilangan odamlarga ajratadi (render uchun). */
export function parseMentionParts(content: string): MentionPart[] {
  const parts: MentionPart[] = [];
  const re = mentionRegex();
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'mention', userId: Number(match[2]), name: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) });
  }
  return parts;
}

export function extractMentionUserIds(content: string): number[] {
  const ids = new Set<number>();
  const re = mentionRegex();
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const id = Number(match[2]);
    if (Number.isFinite(id) && id > 0) ids.add(id);
  }
  return [...ids];
}

