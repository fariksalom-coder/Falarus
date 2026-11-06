import { apiUrl } from '../api';
import type { DailyCourseDayBundle } from '../../shared/dailyCourseDay';
import { isNetworkError, isOffline } from '../offline/outbox';
import { loadDayBundle, saveDayBundle } from '../offline/courseCache';

/**
 * Kun materiallari. Internet bor — serverdan (va qurilmaga saqlanadi);
 * internet yo'q — qurilmadagi nusxadan. Shu sababli bir marta ochilgan yoki
 * oldindan yuklab olingan kun internetsiz ham ishlaydi.
 */
export async function getDailyCourseDay(token: string, dayNumber: number): Promise<DailyCourseDayBundle> {
  const fromCache = () => {
    const cached = loadDayBundle(dayNumber);
    if (cached) return cached.bundle;
    throw new Error('Internet yo‘q. Bu kun hali qurilmaga yuklab olinmagan — internetga ulanib bir marta oching.');
  };
  if (isOffline()) return fromCache();

  let res: Response;
  try {
    res = await fetch(apiUrl(`/api/daily-course/day/${dayNumber}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    if (isNetworkError(e)) return fromCache();
    throw e;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Server vaqtincha ishlamasa ham saqlangan nusxa ochilsin.
    if (res.status >= 500 && loadDayBundle(dayNumber)) return fromCache();
    throw new Error((body as { error?: string })?.error || 'Kunlik materiallar yuklanmadi');
  }
  const bundle = body as DailyCourseDayBundle;
  saveDayBundle(dayNumber, bundle);
  return bundle;
}
