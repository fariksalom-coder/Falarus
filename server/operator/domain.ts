export function money(raw: unknown): string {
    const s = String(raw ?? '').trim().replace(',', '.');
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(s) || Number(s) <= 0)
        throw new Error('Musbat summa kiriting (ko‘pi bilan 2 kasr raqami).');
    return Number(s).toFixed(2);
}
export function dueDate(raw: string, now = Date.now()): string {
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw))
        throw new Error('Sana: 2026-09-20 15:30 (Toshkent vaqti).');
    const date = new Date(raw.replace(' ', 'T') + ':00+05:00');
    if (!Number.isFinite(+date) || +date <= now || new Date(+date + 5 * 3600000).toISOString().slice(0, 16) !== raw.replace(' ', 'T'))
        throw new Error('Kelajakdagi haqiqiy sana va vaqtni kiriting.');
    return date.toISOString();
}
export function cents(raw: unknown): bigint { return BigInt(Math.round(Number(raw) * 100)); }
export function paymentFits(amount: unknown, debt: unknown, pending: unknown = 0): boolean {
    return cents(amount) > 0n && cents(amount) <= cents(debt) - cents(pending);
}
export function receiptFile(m: any) {
    const f = m.photo?.at(-1) ?? m.document;
    const mime = m.photo ? 'image/jpeg' : m.document?.mime_type;
    if (!f?.file_id || !f.file_unique_id || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mime) || !f.file_size || f.file_size > 8 * 1024 * 1024)
        throw new Error('Chekni JPG, PNG, WEBP yoki PDF qilib yuboring (8 MB gacha).');
    return { file_id: String(f.file_id), file_unique_id: String(f.file_unique_id), mime };
}
