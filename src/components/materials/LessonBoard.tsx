import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, FolderOpen, Loader2, Mic, MicOff, MonitorUp, StickyNote, UploadCloud, Video, VideoOff, WifiOff, X,
} from 'lucide-react';
import MaterialViewer from './MaterialViewer';
import { KIND_STYLE, materialMeta } from './materialUi';
import type { JitsiControls, JitsiMediaState } from '../meet/JitsiRoom';
import { MATERIAL_ACCEPT } from '../../../shared/teacherMaterials';
import { getLessonMaterials, getMaterial, getMaterials, uploadMaterial, type TeacherMaterial } from '../../api/teacherMaterials';
import type { LessonKind } from '../../../shared/lessonRoom';
import type { LessonRoom, RoomStatus } from '../../hooks/useLessonRoom';
import { InkLayer } from './InkLayer';
import { InkBar, TextSheet } from './BoardTools';
import { useBoardInk } from './useBoardInk';
import { SyncedMedia } from './SyncedMedia';

/**
 * Dars doskasi: o'qituvchi materialni chiqaradi va varaqlaydi, o'quvchi ekrani ergashadi.
 * Holat real vaqt kanalida (hooks/useLessonRoom) — bu yerda faqat ko'rinish.
 */

export type CallBar = {
  /** Video kichik oynada — mikrofon/kamera tugmalari shu panelda. */
  compact: boolean;
  media: JitsiMediaState;
  controls: MutableRefObject<JitsiControls | null>;
};

/**
 * Doska: material yoki oq varaq, ustida chizmalar, chizish asboblari va pastki panel.
 * Telefonda u butun ekranni egallaydi (video tepada kichik oynada), kompyuterda — video yonida.
 */
export function BoardStage({ token, kind, lessonId, room, onClose, onOpenMaterials, onBack, call }: {
  token: string | null; kind: LessonKind; lessonId: number; room: LessonRoom;
  onClose: () => void; onOpenMaterials: () => void;
  /** Telefon yotiq turganda xona sarlavhasi yashiriladi — «ortga» shu qatorda. */
  onBack: () => void;
  call: CallBar;
}) {
  const board = room.state!;
  const { send } = room;
  const teacher = room.role === 'teacher';
  const m = board.material;
  const blank = board.blank;
  const page = blank ?? board.page;
  const pages = blank !== null ? board.blankCount : m?.kind === 'pdf' ? m.page_count ?? 0 : 0;
  const paged = pages > 1;
  const [jumpOpen, setJumpOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const ink = useBoardInk(room, board, overlayRef);
  const onPage = useCallback((p: number) => send({ type: 'page', page: p }), [send]);
  const playable = blank === null && (m?.kind === 'audio' || m?.kind === 'video');

  // Audio/video yangrayotganda mikrofon vaqtincha o'chadi: aks holda karnaydan chiqqan ovoz
  // mikrofonga kirib, suhbatdoshga aks-sado bo'lib qaytadi. Tugagach — avvalgi holatiga.
  const callRef = useRef(call);
  callRef.current = call;
  const autoMuted = useRef(false);
  const [micNotice, setMicNotice] = useState(false);
  const onAudible = useCallback((audible: boolean) => {
    const c = callRef.current;
    if (!c.media.joined || !c.controls.current) return;
    if (audible && !c.media.audioMuted && !autoMuted.current) {
      autoMuted.current = true;
      c.controls.current.toggleAudio();
      setMicNotice(true);
    } else if (!audible && autoMuted.current) {
      autoMuted.current = false;
      setMicNotice(false);
      if (c.media.audioMuted) c.controls.current.toggleAudio();
    }
  }, []);
  // Foydalanuvchi ijro paytida mikrofonni o'zi yoqsa — keyin uni o'chirib qo'ymaymiz.
  useEffect(() => {
    if (autoMuted.current && !call.media.audioMuted) { autoMuted.current = false; setMicNotice(false); }
  }, [call.media.audioMuted]);
  useEffect(() => {
    if (!micNotice) return;
    const t = window.setTimeout(() => setMicNotice(false), 4000);
    return () => window.clearTimeout(t);
  }, [micNotice]);

  useEffect(() => {
    if (!teacher || !paged) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'ArrowRight' || e.key === 'PageDown') && page < pages) onPage(page + 1);
      if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && page > 1) onPage(page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [teacher, paged, page, pages, onPage]);

  // O'quvchiga ruxsat berilganda bir marta eslatma.
  const [granted, setGranted] = useState(false);
  const wasAllowed = useRef(board.studentCanDraw);
  useEffect(() => {
    if (!teacher && board.studentCanDraw && !wasAllowed.current) {
      setGranted(true);
      const t = window.setTimeout(() => setGranted(false), 3500);
      wasAllowed.current = true;
      return () => window.clearTimeout(t);
    }
    wasAllowed.current = board.studentCanDraw;
  }, [teacher, board.studentCanDraw]);

  const swipe = teacher && paged && ink.tool === 'view'
    ? (dir: 1 | -1) => { const next = page + dir; if (next >= 1 && next <= pages) onPage(next); }
    : undefined;

  const S = blank !== null || !m ? null : KIND_STYLE[m.kind];
  const title = blank !== null ? `Oq varaq ${blank}` : m?.title ?? '';
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0C1526] lg:rounded-[20px] lg:bg-white/[0.04] lg:ring-1 lg:ring-white/10"
      aria-label="Doska"
    >
      <div className="flex items-center gap-2.5 px-3 py-1.5 max-lg:landscape:pt-[max(env(safe-area-inset-top,0px),6px)] lg:border-b lg:border-white/10 lg:py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Ortga"
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/10 text-white active:scale-95 max-lg:landscape:flex"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {S ? (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${S.bg} ${S.fg}`}>
            <S.icon className="h-[18px] w-[18px]" />
          </span>
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#0F172A]">
            <StickyNote className="h-[18px] w-[18px]" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-extrabold text-white">{title}</p>
          <p className="truncate text-[11.5px] font-semibold text-white/55">
            {teacher ? 'Oʻquvchi ham shuni koʻrmoqda' : board.studentCanDraw ? 'Siz ham chiza olasiz' : 'Oʻqituvchi koʻrsatmoqda'}
          </p>
        </div>
        {teacher && blank !== null && m ? (
          <button
            type="button"
            onClick={() => send({ type: 'blank', n: null })}
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-[12px] bg-white/10 px-3 text-[12.5px] font-bold text-white transition hover:bg-white/20 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="max-w-[90px] truncate sm:max-w-[160px]">Materialga</span>
          </button>
        ) : null}
        {teacher ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Doskani yopish"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-[12px] bg-white/10 px-3 text-[12.5px] font-bold text-white transition hover:bg-white/20 active:scale-95"
          >
            <X className="h-4 w-4" /> <span className="hidden sm:inline">Yopish</span>
          </button>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1">
        {playable && m ? (
          <SyncedMedia
            token={token}
            source={{ kind, lessonId, materialId: m.id }}
            kind={m.kind as 'audio' | 'video'}
            title={m.title}
            media={board.media}
            teacher={teacher}
            serverNow={room.serverNow}
            send={send}
            onAudible={onAudible}
          />
        ) : (
          <MaterialViewer
            token={token}
            source={blank !== null || !m ? null : { kind, lessonId, materialId: m.id }}
            kind={m && blank === null ? m.kind : 'pdf'}
            title={title}
            page={page}
            pageCount={blank !== null ? board.blankCount : m?.page_count ?? null}
            tone="dark"
            onSwipe={swipe}
            draw={ink.draw}
            overlay={ink.key ? (r) => <InkLayer ratio={r} strokes={ink.strokes} live={ink.live} laser={ink.laser} rootRef={overlayRef} /> : undefined}
          />
        )}
        <AnimatePresence>
          {granted ? (
            <motion.p
              key="granted"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              role="status"
              className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-[#16A34A] px-4 py-2 text-[13px] font-bold text-white shadow-lg"
            >
              Oʻqituvchi chizishga ruxsat berdi
            </motion.p>
          ) : null}
          {micNotice ? (
            <motion.p
              key="mic"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              role="status"
              className="pointer-events-none absolute bottom-3 left-1/2 w-max max-w-[calc(100%-24px)] -translate-x-1/2 rounded-[14px] bg-[#0F172A]/90 px-4 py-2 text-center text-[12.5px] font-bold text-white shadow-lg ring-1 ring-white/15"
            >
              Ovoz paytida mikrofon oʻchiq — tugagach yoqiladi
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {ink.allowed ? (
        <InkBar
          ink={ink}
          teacher={teacher}
          studentCanDraw={board.studentCanDraw}
          onPermit={(on) => send({ type: 'permit', studentCanDraw: on })}
          onBlank={() => send({ type: 'blank', n: board.blankCount + 1 })}
        />
      ) : null}
      <RoomToolbar
        teacher={teacher}
        page={page}
        pages={paged ? pages : 0}
        onPage={onPage}
        onJump={() => setJumpOpen(true)}
        onOpenMaterials={onOpenMaterials}
        call={call}
      />
      <JumpSheet open={jumpOpen} page={page} pages={pages} onGo={(p) => { onPage(p); setJumpOpen(false); }} onClose={() => setJumpOpen(false)} />
      <TextSheet open={Boolean(ink.textAt)} color={ink.color} onCommit={ink.commitText} onCancel={ink.cancelText} />
    </motion.section>
  );
}

/** Pastki panel: barmoq uchun katta tugmalar (44 px dan kam emas), telefonning pastki chetidan yuqorida. */
function RoomToolbar({ teacher, page, pages, onPage, onJump, onOpenMaterials, call }: {
  teacher: boolean; page: number; pages: number; onPage: (p: number) => void; onJump: () => void; onOpenMaterials: () => void; call: CallBar;
}) {
  // 375 px da ham 6 ta tugma sig'adi: 44 px (barmoq uchun eng kami), kengroq ekranda 48 px.
  const btn = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white transition active:scale-95 disabled:opacity-35 disabled:active:scale-100 sm:h-12 sm:w-12';
  return (
    <div className="flex items-center justify-between gap-1.5 border-t border-white/10 bg-[#0C1526]/95 px-2.5 pb-[max(env(safe-area-inset-bottom,0px),8px)] pt-2 backdrop-blur sm:gap-2 sm:px-3 lg:bg-transparent lg:pb-2">
      <div className="flex shrink-0 items-center sm:min-w-0 sm:flex-1">
        {teacher ? (
          <button type="button" onClick={onOpenMaterials} aria-label="Materiallar" className={`${btn} bg-white/10 hover:bg-white/20`}>
            <FolderOpen className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {pages ? (
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {teacher ? (
            <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Oldingi sahifa" className={`${btn} bg-white/10 hover:bg-white/20`}>
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={teacher ? onJump : undefined}
            disabled={!teacher}
            aria-label={teacher ? 'Sahifaga oʻtish' : undefined}
            className="flex h-11 min-w-[62px] items-center justify-center rounded-[14px] px-2 text-[15px] font-extrabold tabular-nums text-white transition enabled:bg-white/[0.06] enabled:hover:bg-white/[0.12] enabled:active:scale-95 sm:h-12 sm:min-w-[76px] sm:px-3"
          >
            {page}<span className="mx-1 text-white/45">/</span>{pages}
          </button>
          {teacher ? (
            <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Keyingi sahifa" className={`${btn} bg-[#2563EB] hover:bg-[#1D4ED8]`}>
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex shrink-0 items-center justify-end gap-1.5 sm:min-w-0 sm:flex-1 sm:gap-2">
        {call.compact && call.media.joined ? (
          <>
            <button
              type="button"
              onClick={() => call.controls.current?.toggleAudio()}
              aria-label={call.media.audioMuted ? 'Mikrofonni yoqish' : 'Mikrofonni oʻchirish'}
              aria-pressed={!call.media.audioMuted}
              className={`${btn} ${call.media.audioMuted ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {call.media.audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => call.controls.current?.toggleVideo()}
              aria-label={call.media.videoMuted ? 'Kamerani yoqish' : 'Kamerani oʻchirish'}
              aria-pressed={!call.media.videoMuted}
              className={`${btn} ${call.media.videoMuted ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {call.media.videoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Katta kitobda kerakli sahifaga tez o'tish: surgich + raqam. */
function JumpSheet({ open, page, pages, onGo, onClose }: {
  open: boolean; page: number; pages: number; onGo: (p: number) => void; onClose: () => void;
}) {
  const [value, setValue] = useState(page);
  useEffect(() => { if (open) setValue(page); }, [open, page]);
  const clampPage = (n: number) => Math.max(1, Math.min(pages || 1, Math.round(n) || 1));
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="jump"
          className="fixed inset-0 z-[65] flex items-end justify-center bg-[rgba(2,6,23,0.55)] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Sahifaga oʻtish"
            className="w-full max-w-[420px] rounded-t-[24px] bg-[#111C30] p-5 pb-[max(env(safe-area-inset-bottom,0px),20px)] text-white ring-1 ring-white/10 sm:rounded-[24px]"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[16px] font-extrabold">Sahifaga oʻtish</p>
              <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:scale-95">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); onGo(clampPage(value)); }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-baseline justify-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={pages}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  aria-label="Sahifa raqami"
                  className="w-[120px] rounded-[14px] bg-white/[0.08] py-2 text-center text-[34px] font-black tabular-nums text-white outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-[#3B82F6]"
                />
                <span className="text-[17px] font-bold text-white/55">/ {pages}</span>
              </div>
              <input
                type="range"
                min={1}
                max={pages}
                value={clampPage(value)}
                onChange={(e) => setValue(Number(e.target.value))}
                aria-label="Sahifa"
                className="h-10 w-full accent-[#3B82F6]"
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onGo(1)} className="min-h-[48px] rounded-[14px] bg-white/10 text-[14px] font-bold active:scale-[0.98]">Boshiga</button>
                <button type="button" onClick={() => onGo(pages)} className="min-h-[48px] rounded-[14px] bg-white/10 text-[14px] font-bold active:scale-[0.98]">Oxiriga</button>
              </div>
              <button type="submit" className="min-h-[52px] rounded-[14px] bg-[#2563EB] text-[15px] font-extrabold transition hover:bg-[#1D4ED8] active:scale-[0.98]">
                {clampPage(value)}-sahifaga oʻtish
              </button>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** O'qituvchi uchun: «Shu dars uchun» tayyorlanganlar, butun kutubxona yoki darsning o'zida yangi fayl. */
export function MaterialsDrawer({ token, open, lessonKind, lessonId, currentId, blankCount, onBlank, onPick, onClose }: {
  token: string | null; open: boolean; lessonKind: LessonKind; lessonId: number; currentId: number | null;
  /** Shu darsda ochilgan oq varaqlar; `onBlank(n)` — ochish (blankCount + 1 — yangisi). */
  blankCount: number; onBlank: (n: number) => void;
  onPick: (m: TeacherMaterial) => void; onClose: () => void;
}) {
  const [items, setItems] = useState<TeacherMaterial[] | null>(null);
  const [forLesson, setForLesson] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [upload, setUpload] = useState<{ name: string; progress: number } | null>(null);
  /** Yuklangan PowerPoint tayyor bo'lishi bilan doskaga chiqariladi. */
  const [pickWhenReady, setPickWhenReady] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !token) return;
    let alive = true;
    getMaterials(token)
      .then((l) => { if (alive) { setItems(l.materials); setError(''); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Xatolik'); });
    getLessonMaterials(token, lessonKind, lessonId)
      .then((r) => { if (alive) setForLesson(r.material_ids); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [open, token, lessonKind, lessonId]);

  // PowerPoint/Word aylantirilayotgan bo'lsa — holatini so'rab turamiz.
  const processing = (items ?? []).filter((m) => m.status === 'processing').map((m) => m.id);
  const processingKey = processing.join(',');
  useEffect(() => {
    if (!token || !processingKey) return;
    const timer = window.setInterval(() => {
      for (const id of processingKey.split(',').map(Number)) {
        getMaterial(token, id)
          .then((m) => setItems((list) => list?.map((x) => (x.id === m.id ? m : x)) ?? list))
          .catch(() => undefined);
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [token, processingKey]);

  useEffect(() => {
    if (pickWhenReady == null) return;
    const m = items?.find((x) => x.id === pickWhenReady);
    if (m?.status === 'ready') { setPickWhenReady(null); onPick(m); }
    if (m?.status === 'failed') { setPickWhenReady(null); setError(m.error ?? 'Faylni ochib boʻlmadi'); }
  }, [items, pickWhenReady, onPick]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onFile = async (file: File | undefined) => {
    if (!file || !token) return;
    setUpload({ name: file.name, progress: 0 });
    setError('');
    try {
      const m = await uploadMaterial(token, file, (progress) => setUpload({ name: file.name, progress }));
      setItems((x) => [m, ...(x ?? [])]);
      if (m.status === 'ready') onPick(m);
      else setPickWhenReady(m.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklab boʻlmadi');
    } finally {
      setUpload(null);
    }
  };

  const prepared = forLesson.map((id) => items?.find((m) => m.id === id)).filter((m): m is TeacherMaterial => Boolean(m));
  const rest = (items ?? []).filter((m) => !forLesson.includes(m.id));
  const row = (m: TeacherMaterial) => <DrawerItem key={m.id} m={m} on={m.id === currentId} onPick={() => onPick(m)} />;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="drawer"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(2,6,23,0.55)] sm:items-stretch sm:justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Dars materiallari"
            className="flex max-h-[80vh] w-full flex-col rounded-t-[24px] bg-[#111C30] text-white ring-1 ring-white/10 sm:m-3 sm:max-h-none sm:w-[380px] sm:rounded-[24px]"
          >
            <div className="flex items-center gap-3 px-5 pb-3 pt-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10"><FolderOpen className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-extrabold">Dars materiallari</p>
                <p className="text-[12px] font-semibold text-white/55">Tanlang — oʻquvchi ekranida ochiladi</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 active:scale-95">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 pb-3">
              <input ref={inputRef} type="file" accept={MATERIAL_ACCEPT} className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
              <button
                type="button"
                disabled={Boolean(upload)}
                onClick={() => inputRef.current?.click()}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-white/25 text-[13.5px] font-bold text-white/85 transition hover:border-white/50 hover:bg-white/[0.04] active:scale-[0.99] disabled:opacity-60"
              >
                {upload ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {Math.round(upload.progress * 100)}% · <span className="max-w-[180px] truncate">{upload.name}</span></>
                ) : (
                  <><UploadCloud className="h-[18px] w-[18px]" /> Yangi fayl yuklash</>
                )}
              </button>
              {pickWhenReady != null ? (
                <p className="mt-2 flex items-center gap-2 text-[12.5px] font-semibold text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" /> PDF ga aylantirilmoqda — tayyor boʻlishi bilan ochiladi
                </p>
              ) : null}
              {error ? <p role="alert" className="mt-2 rounded-[12px] bg-[#7F1D1D]/40 px-3 py-2 text-[12.5px] font-semibold text-[#FECACA]">{error}</p> : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(env(safe-area-inset-bottom,0px),16px)]">
              <p className="px-2.5 pb-1.5 pt-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-white/45">Oq varaq</p>
              <div className="mb-2 flex flex-wrap gap-1.5 px-1">
                <button
                  type="button"
                  onClick={() => onBlank(blankCount + 1)}
                  className="flex min-h-[44px] items-center gap-2 rounded-[12px] bg-white px-3.5 text-[13px] font-extrabold text-[#0F172A] transition active:scale-95"
                >
                  <StickyNote className="h-4 w-4" /> Yangi oq varaq
                </button>
                {Array.from({ length: blankCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onBlank(n)}
                    aria-label={`Oq varaq ${n}`}
                    className="flex h-11 min-w-[44px] items-center justify-center rounded-[12px] bg-white/10 px-3 text-[13px] font-bold text-white transition hover:bg-white/20 active:scale-95"
                  >
                    {n}
                  </button>
                ))}
              </div>
              {!items && !error ? (
                <div className="space-y-2 px-2">{[0, 1, 2].map((i) => <div key={i} className="h-[60px] animate-pulse rounded-[14px] bg-white/[0.06]" />)}</div>
              ) : null}
              {items && items.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13.5px] font-semibold leading-[1.5] text-white/60">
                  Hali material yoʻq. Fayl yuklang yoki kabinetdagi «Materiallar» boʻlimiga oldindan qoʻshing.
                </p>
              ) : null}
              {prepared.length ? (
                <>
                  <p className="px-2.5 pb-1.5 pt-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#93C5FD]">Shu dars uchun</p>
                  {prepared.map(row)}
                  {rest.length ? <p className="px-2.5 pb-1.5 pt-3 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-white/45">Barcha materiallar</p> : null}
                </>
              ) : null}
              {rest.map(row)}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DrawerItem({ m, on, onPick }: { m: TeacherMaterial; on: boolean; onPick: () => void }) {
  const S = KIND_STYLE[m.kind];
  const ready = m.status === 'ready';
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!ready}
      className={`mb-1 flex min-h-[60px] w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left transition active:scale-[0.99] disabled:active:scale-100 ${
        on ? 'bg-[#2563EB]/25 ring-1 ring-[#3B82F6]/60' : ready ? 'hover:bg-white/[0.06]' : 'opacity-60'
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${S.bg} ${S.fg}`}><S.icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-bold">{m.title}</span>
        <span className="block text-[11.5px] font-semibold text-white/50">
          {m.status === 'processing' ? 'PDF ga aylantirilmoqda…' : m.status === 'failed' ? 'Ochilmadi' : materialMeta(m)}
        </span>
      </span>
      {m.status === 'processing' ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/60" /> : null}
      {on ? <span className="shrink-0 rounded-full bg-[#2563EB] px-2.5 py-1 text-[11px] font-extrabold">Doskada</span> : null}
    </button>
  );
}

/** Xona sarlavhasidagi tugma (faqat o'qituvchi). */
export function MaterialsButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[13.5px] font-bold text-white transition active:scale-95 ${
        active ? 'bg-[#2563EB] hover:bg-[#1D4ED8]' : 'bg-white/10 hover:bg-white/20'
      }`}
    >
      <MonitorUp className="h-[18px] w-[18px]" />
      <span className="hidden sm:inline">Materiallar</span>
    </button>
  );
}

/** Aloqa holati: faqat muammo bo'lganda ko'rinadi (yashil «ulandi» — shovqin). */
export function RoomStatusPill({ status, closedText }: { status: RoomStatus; closedText: string }) {
  if (status === 'online') return null;
  const view = status === 'closed'
    ? { text: closedText || 'Aloqa yopildi', cls: 'bg-[#7F1D1D]/60 text-[#FECACA]' }
    : status === 'offline'
      ? { text: 'Internet uzildi — qayta ulanmoqda', cls: 'bg-[#78350F]/70 text-[#FDE68A]' }
      : { text: 'Ulanmoqda…', cls: 'bg-white/10 text-white/80' };
  return (
    <motion.span
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className={`flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold ${view.cls}`}
    >
      {status === 'connecting' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
      <span className="max-w-[180px] truncate sm:max-w-none">{view.text}</span>
    </motion.span>
  );
}
