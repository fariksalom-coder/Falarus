import { useCallback, useEffect, useRef, useState } from 'react';
import { getSavolJavobMentionCount } from '../api/communityChat';
import { useAuth } from '../context/AuthContext';

const POLL_MS = 60_000;
/** Sahifadan sahifaga o'tishda ketma-ket so'rov bo'lmasin. */
const REFRESH_THROTTLE_MS = 10_000;

/**
 * Guruh chatida foydalanuvchini "@" bilan belgilagan o'qilmagan xabarlar soni.
 * Pastki menyudagi nishon uchun — shuning uchun kamdan-kam va faqat
 * ilova ko'rinib turganda so'raladi.
 */
export function useSavolJavobMentions(): { count: number; refresh: () => void } {
  const { token } = useAuth();
  const [count, setCount] = useState(0);
  const lastFetchRef = useRef(0);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!token) return;
    lastFetchRef.current = Date.now();
    try {
      const next = await getSavolJavobMentionCount(token);
      if (mountedRef.current) setCount(next);
    } catch {
      /* nishon — ikkinchi darajali ma'lumot, xatoni ko'rsatmaymiz */
    }
  }, [token]);

  const refresh = useCallback(() => {
    if (Date.now() - lastFetchRef.current < REFRESH_THROTTLE_MS) return;
    void load();
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    if (!token) {
      setCount(0);
      return () => {
        mountedRef.current = false;
      };
    }

    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, load, refresh]);

  return { count, refresh };
}
