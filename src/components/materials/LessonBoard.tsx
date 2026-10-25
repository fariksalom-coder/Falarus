import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FolderOpen, Loader2, MonitorUp, UploadCloud, WifiOff, X } from 'lucide-react';
import MaterialViewer from './MaterialViewer';
import { KIND_STYLE, PageNav, materialMeta } from './materialUi';
import { MATERIAL_ACCEPT } from '../../../shared/teacherMaterials';
import { getLessonMaterials, getMaterial, getMaterials, uploadMaterial, type TeacherMaterial } from '../../api/teacherMaterials';
import type { LessonKind, RoomRole, RoomState } from '../../../shared/lessonRoom';
import type { RoomStatus } from '../../hooks/useLessonRoom';

/**
 * Dars doskasi: o'qituvchi materialni chiqaradi va varaqlaydi, o'quvchi ekrani ergashadi.
 * Holat real vaqt kanalida (hooks/useLessonRoom) — bu yerda faqat ko'rinish.
 */

/** Video yonidagi doska maydoni. */
export function BoardStage({ token, kind, lessonId, board, role, onPage, onClose }: {
  token: string | null; kind: LessonKind; lessonId: number; board: RoomState; role: RoomRole;
  onPage: (page: number) => void; onClose: () => void;
}) {
  const m = board.material!;
  const pages = m.page_count ?? 0;
  const teacher = role === 'teacher';

  useEffect(() => {
    if (!teacher || m.kind !== 'pdf') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'ArrowRight' || e.key === 'PageDown') && board.page < pages) onPage(board.page + 1);
      if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && board.page > 1) onPage(board.page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [teacher, m.kind, board.page, pages, onPage]);

  const S = KIND_STYLE[m.kind];
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-white/[0.04] ring-1 ring-white/10"
      aria-label="Doska"
    >
      <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${S.bg} ${S.fg}`}>
          <S.icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-extrabold text-white">{m.title}</p>
          <p className="truncate text-[11.5px] font-semibold text-white/55">
            {teacher ? 'Oʻquvchi ham shuni koʻrmoqda' : 'Oʻqituvchi koʻrsatmoqda'}
          </p>
        </div>
        {teacher ? (
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] items-center gap-1.5 rounded-[12px] bg-white/10 px-3 text-[12.5px] font-bold text-white transition hover:bg-white/20 active:scale-95"
          >
            <X className="h-4 w-4" /> Yopish
          </button>
        ) : null}
      </div>
      <div className="relative min-h-0 flex-1">
        <MaterialViewer
          token={token}
          source={{ kind, lessonId, materialId: m.id }}
          kind={m.kind}
          title={m.title}
          page={board.page}
          pageCount={m.page_count}
          tone="dark"
        />
      </div>
      {m.kind === 'pdf' && pages > 1 ? (
        <div className="border-t border-white/10 px-3 py-2">
          {teacher ? (
            <PageNav page={board.page} pages={pages} setPage={onPage} label={`${board.page} / ${pages}`} dark />
          ) : (
            <p className="text-center text-[13px] font-extrabold tabular-nums text-white/80">{board.page} / {pages}</p>
          )}
        </div>
      ) : null}
    </motion.section>
  );
}

/** O'qituvchi uchun: «Shu dars uchun» tayyorlanganlar, butun kutubxona yoki darsning o'zida yangi fayl. */
export function MaterialsDrawer({ token, open, lessonKind, lessonId, currentId, onPick, onClose }: {
  token: string | null; open: boolean; lessonKind: LessonKind; lessonId: number; currentId: number | null;
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
