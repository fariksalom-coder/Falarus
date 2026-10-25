import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import JitsiRoom, { type JitsiControls, type JitsiMediaState } from '../components/meet/JitsiRoom';
import VideoDock, { type DockMode } from '../components/meet/VideoDock';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BoardStage, MaterialsButton, MaterialsDrawer, RoomStatusPill } from '../components/materials/LessonBoard';
import { useLessonRoom } from '../hooks/useLessonRoom';
import { boardOpen } from '../../shared/lessonRoom';
import { roomMaterialOf, type TeacherMaterial } from '../api/teacherMaterials';
import { MeetError, joinLessonRoom, type MeetJoinInfo } from '../api/meet';
import { useAuth } from '../context/AuthContext';
import { TEACHERS_LIST_PATH, TEACHER_CABINET_PATH } from '../constants/teacherPaths';

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
 *  /dars/l/:lessonId — platforma orqali to'langan dars
 *  /dars/t/:trialId  — sinov darsi
 * Vaqti kelmagan bo'lsa server kiritmaydi va ochilish vaqtini qaytaradi.
 */
export default function MeetRoomPage() {
  const { lessonId, trialId } = useParams<{ lessonId: string; trialId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [view, setView] = useState<RoomView | null>(null);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [opensAt, setOpensAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const backTo = user?.accountType === 'teacher' ? TEACHER_CABINET_PATH : TEACHERS_LIST_PATH;

  // Dars xonasining real vaqt kanali: videoga kirish ruxsati olingandan keyin ulanadi.
  const lessonKind = lessonId ? 'lesson' : 'trial';
  const roomLessonId = Number(lessonId ?? trialId) || 0;
  const room = useLessonRoom(token, lessonKind, roomLessonId, Boolean(view));
  const board = room.state;
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Telefonda video kichik oynaga o'tadi va mikrofon/kamera doska panelidan boshqariladi.
  const desktop = useMediaQuery('(min-width: 1024px)');
  const jitsiControls = useRef<JitsiControls | null>(null);
  const [media, setMedia] = useState<JitsiMediaState>({ joined: false, audioMuted: true, videoMuted: false });
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const { send } = room;
  const pickMaterial = useCallback((m: TeacherMaterial) => {
    send({ type: 'show', material: roomMaterialOf(m), page: 1 });
    setDrawerOpen(false);
  }, [send]);
  // Server rad etgan amal haqida qisqa xabar (masalan, material o'chirilgan).
  const { error: roomError, clearError } = room;
  useEffect(() => {
    if (!roomError) return;
    const timer = window.setTimeout(clearError, 4000);
    return () => window.clearTimeout(timer);
  }, [roomError, clearError]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    setError('');
    setOpensAt(null);

    const run = async () => {
      const info: MeetJoinInfo = await joinLessonRoom(token, lessonId ? 'lesson' : 'trial', Number(lessonId ?? trialId));
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
  }, [token, lessonId, trialId]);

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

  // Doska ochiq: material yoki oq varaq (oq varaqni material yo'q paytda ham ochish mumkin).
  const boardShown = Boolean(board && boardOpen(board));
  const dockMode: DockMode = !boardShown ? 'full' : desktop ? 'side' : 'pip';

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0C1526]">
      {/* Telefon yotiq turganda (doska ochiq) balandlik tor — sarlavha yashiriladi, «ortga» doska qatorida. */}
      <header className={`flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top,0px),10px)] ${boardShown ? 'pb-1.5 max-lg:landscape:hidden lg:pb-3' : 'pb-3'}`}>
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
        <RoomStatusPill status={room.status} closedText={room.closedText} />
        {view.role === 'teacher' && (!boardShown || desktop) ? (
          <MaterialsButton onClick={() => setDrawerOpen(true)} active={boardShown} />
        ) : null}
      </header>
      {roomError ? (
        <p role="alert" className="mx-4 mb-2 rounded-[14px] bg-[#7F1D1D]/50 px-4 py-2.5 text-[13px] font-semibold text-[#FECACA]">{roomError}</p>
      ) : null}
      {/* Jitsi daraxtdagi o'rnini hech qachon o'zgartirmaydi (VideoDock ichida) — aks holda qo'ng'iroq uziladi. */}
      <div className={`flex min-h-0 flex-1 flex-col lg:flex-row ${boardShown ? 'lg:gap-3 lg:px-3 lg:pb-3' : ''}`}>
        {boardShown ? (
          <BoardStage
            token={token}
            kind={lessonKind}
            lessonId={roomLessonId}
            room={room}
            onClose={() => send({ type: 'close' })}
            onOpenMaterials={() => setDrawerOpen(true)}
            onBack={() => navigate(backTo)}
            call={{ compact: dockMode === 'pip', media, controls: jitsiControls }}
          />
        ) : null}
        <VideoDock mode={dockMode}>
          <JitsiRoom
            domain={view.domain}
            roomName={view.roomSlug}
            displayName={view.displayName}
            email={view.email}
            isModerator={view.role === 'teacher'}
            subject={view.title}
            onLeave={() => navigate(backTo, { replace: true })}
            compact={dockMode === 'pip'}
            controlsRef={jitsiControls}
            onMediaState={setMedia}
          />
        </VideoDock>
      </div>
      {view.role === 'teacher' ? (
        <MaterialsDrawer
          token={token}
          open={drawerOpen}
          currentId={board?.blank === null ? board?.material?.id ?? null : null}
          blankCount={board?.blankCount ?? 0}
          onBlank={(n) => { send({ type: 'blank', n }); setDrawerOpen(false); }}
          lessonKind={lessonKind}
          lessonId={roomLessonId}
          onPick={pickMaterial}
          onClose={closeDrawer}
        />
      ) : null}
    </div>
  );
}
