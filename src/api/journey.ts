import { apiUrl } from '../api';
import { VIDEO_REPORT_INTERVAL_MS, type JourneyStep, type TrackedVideoKey } from '../../shared/userJourney';

/*
 * Foydalanuvchi yo'li — admin hisoboti uchun kuzatuv. Hammasi "otib
 * yubor va unut": tarmoq xatosi o'quvchiga hech qachon ko'rinmaydi.
 * `keepalive` sahifa yopilayotganda ham so'rov yetib borishi uchun.
 */
function send(token: string, path: string, body: unknown): void {
  try {
    void fetch(apiUrl(path), {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    /* kuzatuv ixtiyoriy */
  }
}

/** Bir sessiyada bir qadam bir marta yuboriladi — qayta ochishlar serverni band qilmasin. */
const sentSteps = new Set<string>();

export function trackJourneyStep(token: string | null | undefined, step: JourneyStep): void {
  if (!token || sentSteps.has(step)) return;
  sentSteps.add(step);
  send(token, '/api/journey/step', { step });
}

type VideoEvent = 'play' | 'progress' | 'pause' | 'ended';

/**
 * Video ko'rish hisoblagichi. Faqat haqiqatan ijro etilgan media
 * soniyalari sanaladi: oldinga o'tkazish (seek) hisobga kirmaydi, ortga
 * qaytib qayta ko'rish esa kiradi.
 */
export function createVideoTracker(getToken: () => string | null | undefined, video: TrackedVideoKey) {
  let lastTime: number | null = null;
  let pending = 0;
  let lastSent = 0;
  let el: HTMLVideoElement | null = null;

  const flush = (event: VideoEvent) => {
    const token = getToken();
    if (!token || !el) return;
    const watched = pending;
    pending = 0;
    lastSent = Date.now();
    send(token, '/api/journey/video', {
      video,
      event,
      position: el.currentTime,
      watched,
      duration: Number.isFinite(el.duration) ? el.duration : 0,
    });
  };

  return {
    attach(node: HTMLVideoElement | null) { el = node; },
    onPlay() { lastTime = el?.currentTime ?? null; flush('play'); },
    onSeeking() { lastTime = null; },
    onTimeUpdate() {
      if (!el || el.paused || el.seeking) return;
      const now = el.currentTime;
      if (lastTime !== null) {
        const delta = now - lastTime;
        // timeupdate har ~0.25 s keladi; katta sakrash — seek, hisobga kirmaydi.
        if (delta > 0 && delta < 4) pending += delta;
      }
      lastTime = now;
      if (Date.now() - lastSent >= VIDEO_REPORT_INTERVAL_MS) flush('progress');
    },
    onPause() { if (el && !el.ended) flush('pause'); lastTime = null; },
    onEnded() { flush('ended'); lastTime = null; },
    /** Sahifadan chiqishda qolgan soniyalarni yuboradi. */
    leave() { if (pending > 0.5) flush('pause'); },
  };
}
