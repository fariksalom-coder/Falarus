import { apiUrl } from '../api';
import { adminApi } from '../lib/adminApi';

/**
 * Parolni QO'LDA tiklash.
 *
 * NEGA KERAK: pochta (SMTP) sozlanmagan va SMS provayderi yo'q — shu sababli
 * `/api/auth/forgot-password` 503 qaytaradi. Parolini unutgan odam telefon
 * qiladi, support yoki admin bu yerdan yangi parol yaratadi va og'zaki aytadi.
 *
 * Ikki kirish nuqtasi bir xil xizmatga boradi:
 *   • admin  — `/api/admin/parol-tiklash` (admin JWT);
 *   • support — `/api/support/parol-tiklash` (oltin hisob).
 */

export type ParolTiklashNatija = {
  parol: string;
  foydalanuvchi: { id: number; ism: string; telefon: string | null; email: string | null };
};

/** Admin panelidan, qidiruv bo'yicha: `sorov` — telefon yoki email. */
export async function adminParolTiklash(sorov: string): Promise<ParolTiklashNatija> {
  return adminApi<ParolTiklashNatija>('/parol-tiklash', {
    method: 'POST',
    body: JSON.stringify({ sorov }),
  });
}

/**
 * Admin panelidagi foydalanuvchi sahifasidan — aniq `id` bo'yicha.
 * Telefoni yo'q (faqat email bilan kirgan) hisoblarda ham ishlaydi.
 */
export async function adminParolTiklashById(userId: number): Promise<ParolTiklashNatija> {
  return adminApi<ParolTiklashNatija>('/parol-tiklash', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

/** Support (oltin) hisobidan, ilova ichidan. */
export async function supportParolTiklash(token: string, sorov: string): Promise<ParolTiklashNatija> {
  const res = await fetch(apiUrl('/api/support/parol-tiklash'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sorov }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Parol tiklanmadi');
  return data as ParolTiklashNatija;
}
