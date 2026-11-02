import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Radio } from 'lucide-react';
import JitsiRoom from '../components/meet/JitsiRoom';
import { getLiveStreamState, type LiveStreamState } from '../api/liveStream';
import LiveStreamHostPanel, { type HostRoom } from '../components/live/LiveStreamHostPanel';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useLocale } from '../context/LocaleContext';

/**
 * JONLI EFIR — talaba tomoni (vebinar tomoshabini).
 *
 * Talaba mikrofon va kamerasiz kiradi (`mode="viewer"`), savolini yozma
 * chatda beradi. Xona nomi serverdan faqat efir jonli bo'lganda keladi —
 * shu sababli bu sahifa efir tugagach o'z-o'zidan "efir yo'q" holatiga
 * qaytadi.
 */

const TEKSHIRISH_ORALIGI_MS = 60_000;

function sana(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('uz-UZ', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LiveStreamPage() {
  const { token, user } = useAuth();
  const { access } = useAccess();
  const { t } = useLocale();
  const navigate = useNavigate();

  /** Oltin support hisobi — efirni shu odam ochadi va yuritadi. */
  const support = Boolean(access?.golden);

  const [state, setState] = useState<LiveStreamState | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  /** Support xonaga host sifatida kirgan bo'lsa. */
  const [hostRoom, setHostRoom] = useState<HostRoom | null>(null);

  const yukla = useCallback(async () => {
    if (!token) return;
    try {
      setState(await getLiveStreamState(token));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('liveStream.loadError'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void yukla();
    // Efir hali boshlanmagan bo'lsa, talaba sahifani ochiq qoldirishi mumkin —
    // boshlanganda o'zi paydo bo'lsin.
    const timer = setInterval(() => void yukla(), TEKSHIRISH_ORALIGI_MS);
    return () => clearInterval(timer);
  }, [yukla]);

  const live = state?.live ?? null;
  const upcoming = state?.upcoming ?? [];

  const ism =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.phone || "O'quvchi";

  /*
   * Xona ko'rinishlari `fixed inset-0 z-[60]`: pastki menyu `z-50` da turadi
   * va aks holda Jitsi tugmalarini (jumladan "chiqish") yopib qolardi.
   */
  // ── Support xonada (moderator) ──────────────────────────────────────
  if (hostRoom) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-[#0C1526]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setHostRoom(null)}
            aria-label={t('liveStream.back')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{hostRoom.title}</p>
            <p className="text-[11px] text-white/60">
              Siz moderatorsiz — mikrofonlarni siz boshqarasiz
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <JitsiRoom
            domain={hostRoom.domain}
            roomName={hostRoom.room_slug}
            displayName="FalaRus Support"
            isModerator
            subject={hostRoom.title}
            onLeave={() => setHostRoom(null)}
          />
        </div>
      </div>
    );
  }

  // ── Support boshqaruvi ──────────────────────────────────────────────
  if (support && token) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-app-text-muted transition hover:text-app-text"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          {t('liveStream.back')}
        </button>
        <h1 className="mb-4 text-2xl font-black text-app-text">{t('liveStream.title')}</h1>
        <LiveStreamHostPanel token={token} onEnterRoom={setHostRoom} />
      </div>
    );
  }

  // ── Efir jonli: xonani ochamiz ──────────────────────────────────────
  if (live && live.room_slug && state) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-[#0C1526]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('liveStream.back')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {t('liveStream.badge')}
              </span>
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-white">{live.title}</p>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <JitsiRoom
            domain={state.domain}
            roomName={live.room_slug}
            displayName={ism}
            subject={live.title}
            mode="viewer"
            onLeave={() => navigate(-1)}
          />
        </div>
        <p className="px-4 py-2 text-center text-[11.5px] text-white/60">
          {t('liveStream.watchingHint')}
        </p>
      </div>
    );
  }

  // ── Efir yo'q: kutish holati ────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 flex h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-app-text-muted transition hover:text-app-text"
      >
        <ArrowLeft className="h-4.5 w-4.5" />
        {t('liveStream.back')}
      </button>

      {err ? (
        <div className="mb-4 rounded-2xl bg-app-danger-bg px-4 py-3 text-sm font-semibold text-app-danger">
          {err}
        </div>
      ) : null}

      <section className="rounded-[24px] bg-app-surface p-8 text-center shadow-app-soft ring-1 ring-app-border">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-icon-bg">
          <Radio className="h-7 w-7 text-app-primary-deep" />
        </span>
        <h1 className="text-xl font-black text-app-text">
          {loading ? t('liveStream.title') : t('liveStream.noneTitle')}
        </h1>
        {!loading ? (
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-app-text-muted">
            {t('liveStream.noneSubtitle')}
          </p>
        ) : null}
      </section>

      {upcoming.length > 0 ? (
        <section className="mt-4 rounded-[24px] bg-app-surface p-5 shadow-app-soft ring-1 ring-app-border">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-icon-bg text-app-primary-deep">
              <CalendarClock className="h-5 w-5" />
            </span>
            <h2 className="text-base font-black text-app-text">{t('liveStream.upcomingTitle')}</h2>
          </div>
          <ul className="space-y-2.5">
            {upcoming.map((s) => (
              <li key={s.id} className="rounded-2xl border border-app-border bg-app-bg-muted p-3.5">
                <p className="font-bold leading-tight text-app-text">{s.title}</p>
                {s.description ? (
                  <p className="mt-1 text-sm text-app-text-muted">{s.description}</p>
                ) : null}
                <p className="mt-1.5 text-xs font-semibold text-app-text-secondary">
                  {sana(s.starts_at)} · {s.duration_minutes} daqiqa
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
