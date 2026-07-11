import { useEffect, useRef } from 'react';
import { apiUrl } from '../api';

/**
 * Sends `POST /api/activity/heartbeat { seconds: 60 }` every 60 seconds while
 * the tab is visible and focused. Server-side this accumulates into
 * `user_daily_time` and `users.total_time_seconds`, and recomputes XP so the
 * time-bonus is reflected in `total_points`.
 *
 * Rules:
 *  - Beat only when `document.visibilityState === 'visible'` and window is focused.
 *  - First beat fires ~5s after mount (so page-hop doesn't count as engagement).
 *  - Payload always `seconds = 60` — server clamps to prevent replay.
 *  - Silent failures (network hiccups are fine; heartbeats resume next tick).
 */
export function useHeartbeat(token: string | null): void {
  const activeRef = useRef(true);

  useEffect(() => {
    if (!token) return;

    const onVis = () => {
      activeRef.current = document.visibilityState === 'visible' && document.hasFocus();
    };
    activeRef.current = document.visibilityState === 'visible' && document.hasFocus();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    window.addEventListener('blur', onVis);

    const send = () => {
      if (!activeRef.current) return;
      fetch(apiUrl('/api/activity/heartbeat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seconds: 60 }),
        keepalive: true,
      }).catch(() => {
        /* offline / server hiccup — next tick retries */
      });
    };

    const kick = window.setTimeout(send, 5_000);
    const iv = window.setInterval(send, 60_000);

    return () => {
      window.clearTimeout(kick);
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
      window.removeEventListener('blur', onVis);
    };
  }, [token]);
}
