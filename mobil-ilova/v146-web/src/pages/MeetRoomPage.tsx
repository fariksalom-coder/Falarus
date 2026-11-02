import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import JitsiRoom from '../components/meet/JitsiRoom';
import {
  MeetError,
  joinMeetRoom,
  joinMeetSession,
  type MeetJoinInfo,
  type RoomJoinInfo,
} from '../api/meet';
import { useAuth } from '../context/AuthContext';

type RoomView = {
  domain: string;
  roomSlug: string;
  title: string;
  role: 'teacher' | 'student';
  displayName: string;
  email: string | null;
  subtitle: string;
};

function formatWhen(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('uz-UZ', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Video dars sahifasi.
 *  /dars/:roomId    — o'qituvchining doimiy FalaRus xonasi
 *  /dars/s/:sessionId — belgilangan dars (vaqti kelmagan bo'lsa kiritmaydi)
 */
export default function MeetRoomPage() {
  const { roomId, sessionId } = useParams<{ roomId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [view, setView] = useState<RoomView | null>(null);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [opensAt, setOpensAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const backTo = user?.accountType === 'teacher' ? '/teacher-cabinet' : '/teachers';

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    setError('');
    setOpensAt(null);

    const run = async () => {
      if (sessionId) {
        const info: MeetJoinInfo = await joinMeetSession(token, Number(sessionId));
        if (!mounted) return;
        if (info.type === 'external') {
          setExternalUrl(info.url);
          // Tashqi havola (Google Meet / Zoom) — to'g'ridan-to'g'ri o'tkazamiz.
          window.location.replace(info.url);
          return;
        }
        setView({
          domain: info.domain,
          roomSlug: info.room_slug,
          title: info.title || 'Video dars',
          role: info.role,
          displayName: info.display_name,
          email: info.email,
          subtitle: info.role === 'teacher' ? 'Siz o‘qituvchisiz' : 'Dars davom etmoqda',
        });
        return;
      }

      const info: RoomJoinInfo = await joinMeetRoom(token, Number(roomId));
      if (!mounted) return;
      setView({
        domain: info.domain,
        roomSlug: info.room_slug,
        title: info.room_title || 'Video dars',
        role: info.role,
        displayName: info.display_name,
        email: info.email,
        subtitle: info.role === 'teacher' ? 'Siz o‘qituvchisiz' : `O‘qituvchi: ${info.teacher_name}`,
      });
    };

    run()
      .catch((e: unknown) => {
        if (!mounted) return;
        if (e instanceof MeetError) {
          setError(e.message);
          setOpensAt(e.opensAt ?? e.startsAt);
        } else {
          setError(e instanceof Error ? e.message : 'Darsga ulanib bo‘lmadi');
        }
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [token, roomId, sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-app-primary" />
      </div>
    );
  }

  // Tashqi havola — brauzer o'tkazmasa, qo'lda ochish tugmasi.
  if (externalUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg px-6">
        <div className="w-full max-w-sm rounded-[24px] bg-app-surface p-6 text-center shadow-app-card ring-1 ring-app-border">
          <p className="text-base font-black text-app-text">Dars havolasi ochilmoqda</p>
          <a
            href={externalUrl}
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-3 text-sm font-black text-white"
          >
            <ExternalLink className="h-4 w-4" /> Darsni ochish
          </a>
        </div>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg px-6">
        <div className="w-full max-w-sm rounded-[24px] bg-app-surface p-6 text-center shadow-app-card ring-1 ring-app-border">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-app-warning-bg text-app-warning">
            <Lock className="h-6 w-6" />
          </span>
          <p className="mt-3 text-base font-black text-app-text">{error || 'Darsga kira olmadingiz'}</p>
          {opensAt ? (
            <p className="mt-1 text-sm font-medium text-app-text-muted">
              Kirish {formatWhen(opensAt)} dan boshlab ochiladi.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(backTo, { replace: true })}
            className="mt-5 w-full rounded-2xl bg-app-primary px-4 py-3 text-sm font-black text-white transition active:scale-95"
          >
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[#0C1526]">
      <header className="flex items-center gap-3 px-4 py-3 pt-[max(env(safe-area-inset-top,0px),12px)]">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition active:scale-95"
          aria-label="Ortga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black text-white">{view.title}</p>
          <p className="truncate text-xs font-medium text-white/60">{view.subtitle}</p>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <JitsiRoom
          domain={view.domain}
          roomName={view.roomSlug}
          displayName={view.displayName}
          email={view.email}
          isModerator={view.role === 'teacher'}
          subject={view.title}
          onLeave={() => navigate(backTo, { replace: true })}
        />
      </div>
    </div>
  );
}
