/**
 * Dars materiallari: o'qituvchining shaxsiy kutubxonasi (PDF, rasm, audio, video).
 * Darsda «Materiallar» tugmasi bilan istalganini o'quvchi ekraniga chiqaradi.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Eye, Loader2, MonitorUp, Pencil, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { usePanel } from '../panelContext';
import { Card, ErrorNote, GhostButton, Modal, PageHead, Pills, PrimaryButton, ProgressBar, Skeleton, inputClass } from '../ui';
import MaterialViewer, { renderPdfThumb } from '../../../materials/MaterialViewer';
import { KIND_STYLE, PageNav } from '../../../materials/materialUi';
import { MATERIAL_ACCEPT, MATERIAL_TITLE_MAX, type MaterialKind } from '../../../../../shared/teacherMaterials';
import {
  deleteMaterial, fetchMaterialBlob, formatBytes, getMaterials, renameMaterial, uploadMaterial,
  type MaterialLibrary, type TeacherMaterial,
} from '../../../../api/teacherMaterials';

const TEXT = {
  uz: {
    title: 'Dars materiallari',
    subtitle: 'Taqdimot, darslik, rasm, audio va video — darsda bir bosishda oʻquvchi ekraniga chiqadi.',
    upload: 'Fayl yuklash',
    drop: 'Fayllarni shu yerga tashlang',
    dropOr: 'yoki kompyuterdan tanlang',
    formats: 'PDF · JPG, PNG · MP3, M4A · MP4 — har biri 100 MB gacha',
    officeTip: 'PowerPoint yoki Word? «Fayl → Eksport → PDF» qilib saqlang — darsda sahifama-sahifa varaqlanadi.',
    used: (u: string, q: string) => `${q} dan ${u} ishlatilgan`,
    all: 'Hammasi', pdf: 'PDF', image: 'Rasmlar', audio: 'Audio', video: 'Video',
    search: 'Material nomi boʻyicha qidirish',
    emptyTitle: 'Hali material yoʻq',
    emptyText: 'Birinchi darsingiz uchun taqdimot yoki mashqlar PDF faylini yuklang.',
    notFound: 'Hech narsa topilmadi',
    howTitle: 'Darsda qanday ishlaydi',
    how: [
      'Materialni shu yerga oldindan yuklang.',
      'Darsda yuqoridagi «Materiallar» tugmasini bosing va kerakli faylni tanlang.',
      'Oʻquvchi ekranida shu fayl ochiladi, siz varaqlagan sahifa unda ham almashadi.',
    ],
    preview: 'Koʻrish', rename: 'Nomini oʻzgartirish', remove: 'Oʻchirish',
    save: 'Saqlash', cancel: 'Bekor qilish', name: 'Nomi',
    removeTitle: 'Materialni oʻchirasizmi?',
    removeText: 'Fayl butunlay oʻchadi. Agar u hozir darsda ochiq boʻlsa, oʻquvchi ekranidan ham yopiladi.',
    removed: 'Material oʻchirildi', renamed: 'Nomi saqlandi', uploaded: (n: number) => (n > 1 ? `${n} ta fayl yuklandi` : 'Fayl yuklandi'),
    page: (p: number, n: number) => `${p} / ${n}`,
    loading: 'Yuklanmoqda…', openError: 'Faylni ochib boʻlmadi',
    kindLabel: { pdf: 'PDF', image: 'Rasm', audio: 'Audio', video: 'Video' } as Record<MaterialKind, string>,
    tooBig: (n: string) => `Fayl ${n} dan katta`,
    noSpace: 'Joy yetmaydi — keraksiz materiallarni oʻchiring',
  },
  ru: {
    title: 'Материалы к урокам',
    subtitle: 'Презентации, учебники, картинки, аудио и видео — на уроке выводятся ученику одним нажатием.',
    upload: 'Загрузить файл',
    drop: 'Перетащите файлы сюда',
    dropOr: 'или выберите на компьютере',
    formats: 'PDF · JPG, PNG · MP3, M4A · MP4 — до 100 МБ каждый',
    officeTip: 'PowerPoint или Word? Сохраните как PDF («Файл → Экспорт → PDF») — на уроке он листается постранично.',
    used: (u: string, q: string) => `Использовано ${u} из ${q}`,
    all: 'Все', pdf: 'PDF', image: 'Картинки', audio: 'Аудио', video: 'Видео',
    search: 'Поиск по названию',
    emptyTitle: 'Материалов пока нет',
    emptyText: 'Загрузите презентацию или PDF с упражнениями для первого урока.',
    notFound: 'Ничего не найдено',
    howTitle: 'Как это работает на уроке',
    how: [
      'Заранее загрузите материал сюда.',
      'На уроке нажмите кнопку «Материалы» вверху и выберите файл.',
      'Файл откроется у ученика, а страница будет листаться вместе с вами.',
    ],
    preview: 'Открыть', rename: 'Переименовать', remove: 'Удалить',
    save: 'Сохранить', cancel: 'Отмена', name: 'Название',
    removeTitle: 'Удалить материал?',
    removeText: 'Файл удалится навсегда. Если он сейчас открыт на уроке, у ученика он тоже закроется.',
    removed: 'Материал удалён', renamed: 'Название сохранено', uploaded: (n: number) => (n > 1 ? `Загружено файлов: ${n}` : 'Файл загружен'),
    page: (p: number, n: number) => `${p} / ${n}`,
    loading: 'Загрузка…', openError: 'Не удалось открыть файл',
    kindLabel: { pdf: 'PDF', image: 'Картинка', audio: 'Аудио', video: 'Видео' } as Record<MaterialKind, string>,
    tooBig: (n: string) => `Файл больше ${n}`,
    noSpace: 'Не хватает места — удалите ненужные материалы',
  },
};

type Filter = 'all' | MaterialKind;
type UploadItem = { key: string; name: string; size: number; progress: number; error: string; ctrl: AbortController };

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });

export default function Materials() {
  const { token, lang, toast } = usePanel();
  const t = TEXT[lang];
  const [lib, setLib] = useState<MaterialLibrary | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<TeacherMaterial | null>(null);
  const [renaming, setRenaming] = useState<TeacherMaterial | null>(null);
  const [removing, setRemoving] = useState<TeacherMaterial | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      setLib(await getMaterials(token));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t.openError);
    }
  }, [token, t.openError]);

  useEffect(() => { void load(); }, [load]);

  // Ketma-ket yuklanadi: bir vaqtda bitta katta fayl — sekin internetda ham barqaror.
  const addFiles = async (files: File[]) => {
    if (!files.length || !lib) return;
    const items: UploadItem[] = files.map((f) => ({
      key: `${f.name}-${f.size}-${Math.random()}`, name: f.name, size: f.size, progress: 0,
      error: f.size > lib.max_file_bytes ? t.tooBig(formatBytes(lib.max_file_bytes)) : '', ctrl: new AbortController(),
    }));
    setUploads((u) => [...items, ...u]);
    let done = 0;
    for (let i = 0; i < files.length; i++) {
      const item = items[i];
      if (item.error) continue;
      const patch = (p: Partial<UploadItem>) => setUploads((u) => u.map((x) => (x.key === item.key ? { ...x, ...p } : x)));
      try {
        const m = await uploadMaterial(token, files[i], (progress) => patch({ progress }), item.ctrl.signal);
        setLib((l) => (l ? { ...l, materials: [m, ...l.materials], used_bytes: l.used_bytes + m.size_bytes } : l));
        setUploads((u) => u.filter((x) => x.key !== item.key));
        done++;
      } catch (e) {
        if ((e as { status?: number }).status === -1) setUploads((u) => u.filter((x) => x.key !== item.key));
        else patch({ error: e instanceof Error ? e.message : t.openError });
      }
    }
    if (done) toast(t.uploaded(done));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void addFiles(Array.from(e.dataTransfer.files));
  };

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, pdf: 0, image: 0, audio: 0, video: 0 };
    for (const m of lib?.materials ?? []) { c.all++; c[m.kind]++; }
    return c;
  }, [lib]);

  const shown = useMemo(() => {
    const qq = query.trim().toLowerCase();
    return (lib?.materials ?? []).filter((m) => (filter === 'all' || m.kind === filter) && (!qq || m.title.toLowerCase().includes(qq)));
  }, [lib, filter, query]);

  const pick = () => inputRef.current?.click();

  return (
    <div>
      <PageHead
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <PrimaryButton onClick={pick} className="flex items-center gap-2">
            <UploadCloud className="h-[18px] w-[18px]" /> {t.upload}
          </PrimaryButton>
        }
      />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={MATERIAL_ACCEPT}
        className="hidden"
        onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
      />

      {error ? <ErrorNote text={error} /> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {/* Fayl tashlash maydoni */}
          <button
            type="button"
            onClick={pick}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`group mb-4 hidden w-full flex-col items-center gap-2 rounded-[22px] sm:flex border-2 border-dashed px-5 py-7 text-center transition active:scale-[0.99] ${
              dragging ? 'border-app-primary bg-app-icon-bg' : 'border-[#CBD5E1] bg-app-surface hover:border-app-primary hover:bg-[var(--app-row-hover)]'
            }`}
          >
            <span className={`flex h-14 w-14 items-center justify-center rounded-[18px] transition ${dragging ? 'scale-110 bg-app-primary text-white' : 'bg-app-icon-bg text-app-icon-fg group-hover:scale-105'}`}>
              <UploadCloud className="h-7 w-7" />
            </span>
            <span className="text-[15px] font-extrabold text-app-text">{t.drop}</span>
            <span className="text-[13px] font-semibold text-app-text-muted">{t.dropOr}</span>
            <span className="mt-1 text-[12px] font-bold text-app-text-muted">{t.formats}</span>
          </button>

          {uploads.length ? (
            <div className="mb-4 space-y-2">
              {uploads.map((u) => (
                <div key={u.key} className="flex items-center gap-3 rounded-[16px] border border-app-border bg-app-surface px-4 py-3">
                  {u.error ? <X className="h-5 w-5 shrink-0 text-[#B91C1C]" /> : <Loader2 className="h-5 w-5 shrink-0 animate-spin text-app-primary" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13.5px] font-bold text-app-text">{u.name}</p>
                      <span className="shrink-0 text-[12px] font-bold text-app-text-muted">{u.error ? formatBytes(u.size) : `${Math.round(u.progress * 100)}%`}</span>
                    </div>
                    {u.error ? <p className="mt-0.5 text-[12.5px] font-semibold text-[#B91C1C]">{u.error}</p> : <div className="mt-1.5"><ProgressBar percent={u.progress * 100} /></div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => (u.error ? setUploads((x) => x.filter((y) => y.key !== u.key)) : u.ctrl.abort())}
                    aria-label={t.cancel}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-app-text-muted transition hover:bg-[var(--app-row-hover)] active:scale-95"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {!lib && !error ? <Skeleton rows={3} /> : null}

          {lib && lib.materials.length > 0 ? (
            <>
              <div className="flex flex-wrap items-start gap-x-3">
                <div className="min-w-0 flex-1">
                  <Pills<Filter>
                    items={(['all', 'pdf', 'image', 'audio', 'video'] as const)
                      .filter((k) => k === 'all' || counts[k] > 0)
                      .map((k) => ({ key: k, label: t[k], count: counts[k] }))}
                    active={filter}
                    onChange={setFilter}
                  />
                </div>
                {lib.materials.length > 6 ? (
                  <label className="mb-4 flex h-11 w-full items-center gap-2 rounded-[12px] border border-app-border bg-app-surface px-3 text-app-text-muted sm:w-[240px]">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t.search}
                      aria-label={t.search}
                      className="min-w-0 flex-1 bg-transparent text-[13.5px] text-app-text outline-none"
                    />
                  </label>
                ) : null}
              </div>

              {shown.length === 0 ? (
                <p className="py-8 text-center text-[14px] font-semibold text-app-text-muted">{t.notFound}</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {shown.map((m, i) => (
                    <MaterialCard
                      key={m.id}
                      m={m}
                      index={i}
                      token={token}
                      kindLabel={t.kindLabel[m.kind]}
                      labels={{ preview: t.preview, rename: t.rename, remove: t.remove }}
                      onPreview={() => setPreview(m)}
                      onRename={() => setRenaming(m)}
                      onRemove={() => setRemoving(m)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}

          {lib && lib.materials.length === 0 && uploads.length === 0 ? (
            <div className="rounded-[22px] border border-app-border bg-app-surface px-5 py-9 text-center">
              <div className="mx-auto mb-3 flex w-fit -space-x-3">
                {(['pdf', 'image', 'audio', 'video'] as const).map((k, i) => {
                  const S = KIND_STYLE[k];
                  return (
                    <span key={k} style={{ rotate: `${(i - 1.5) * 8}deg` }} className={`flex h-12 w-12 items-center justify-center rounded-[14px] ring-4 ring-app-surface ${S.bg} ${S.fg}`}>
                      <S.icon className="h-6 w-6" />
                    </span>
                  );
                })}
              </div>
              <p className="text-[16px] font-extrabold text-app-text">{t.emptyTitle}</p>
              <p className="mx-auto mt-1 max-w-[380px] text-[13.5px] text-app-text-muted">{t.emptyText}</p>
            </div>
          ) : null}
        </div>

        {/* O'ng ustun: joy va qanday ishlashi */}
        <div className="flex flex-col gap-4">
          {lib ? (
            <Card className="p-4">
              <p className="mb-2 text-[13px] font-bold text-app-text-muted">{t.used(formatBytes(lib.used_bytes), formatBytes(lib.quota_bytes))}</p>
              <ProgressBar percent={Math.min(100, (lib.used_bytes / lib.quota_bytes) * 100)} />
            </Card>
          ) : null}
          <Card className="p-4">
            <p className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-app-text">
              <MonitorUp className="h-5 w-5 text-app-primary" /> {t.howTitle}
            </p>
            <ol className="space-y-3">
              {t.how.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-icon-bg text-[13px] font-extrabold text-app-icon-fg">{i + 1}</span>
                  <span className="pt-0.5 text-[13.5px] leading-[1.5] text-app-text-secondary">{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-[12px] bg-[#FEF3C7] px-3 py-2.5 text-[12.5px] font-semibold leading-[1.5] text-[#92400E]">{t.officeTip}</p>
          </Card>
        </div>
      </div>

      {preview ? <PreviewModal m={preview} token={token} t={t} onClose={() => setPreview(null)} /> : null}

      {renaming ? (
        <RenameModal
          m={renaming}
          t={t}
          onClose={() => setRenaming(null)}
          onSave={async (title) => {
            const m = await renameMaterial(token, renaming.id, title);
            setLib((l) => (l ? { ...l, materials: l.materials.map((x) => (x.id === m.id ? m : x)) } : l));
            setRenaming(null);
            toast(t.renamed);
          }}
        />
      ) : null}

      {removing ? (
        <ConfirmRemove
          t={t}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await deleteMaterial(token, removing.id);
            setLib((l) => (l ? { ...l, materials: l.materials.filter((x) => x.id !== removing.id), used_bytes: l.used_bytes - removing.size_bytes } : l));
            setRemoving(null);
            toast(t.removed);
          }}
        />
      ) : null}
    </div>
  );
}

function MaterialCard({ m, index, token, kindLabel, labels, onPreview, onRename, onRemove }: {
  m: TeacherMaterial; index: number; token: string; kindLabel: string;
  labels: { preview: string; rename: string; remove: string };
  onPreview: () => void; onRename: () => void; onRemove: () => void;
}) {
  const S = KIND_STYLE[m.kind];
  const thumb = useThumb(token, m);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, delay: Math.min(index, 8) * 0.03 }}
      className="group flex items-center overflow-hidden rounded-[20px] border border-app-border bg-app-surface transition sm:block hover:-translate-y-0.5 hover:border-app-border-strong hover:shadow-[0_14px_34px_rgba(148,163,184,0.16)]"
    >
      <button type="button" onClick={onPreview} aria-label={labels.preview} className={`relative m-2 flex h-[72px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] sm:m-0 sm:aspect-[16/9] sm:h-auto sm:w-full sm:rounded-none ${S.bg}`}>
        {thumb ? (
          <img src={thumb} alt="" className={`h-full w-full transition duration-300 group-hover:scale-[1.03] ${m.kind === 'pdf' ? 'object-contain p-1.5 sm:px-3 sm:pb-2 sm:pt-10 drop-shadow-[0_8px_18px_rgba(15,23,42,0.18)]' : 'object-cover'}`} />
        ) : (
          <S.icon className={`h-8 w-8 sm:h-12 sm:w-12 ${S.fg} transition duration-300 group-hover:scale-110`} strokeWidth={1.6} />
        )}
        <span className="absolute left-3 top-3 hidden rounded-full bg-white/90 sm:block px-2.5 py-[3px] text-[11.5px] font-extrabold text-app-text shadow-sm">{kindLabel}</span>
        <span className="absolute inset-0 flex items-center justify-center bg-[rgba(15,23,42,0.35)] opacity-0 transition group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-extrabold text-app-text">
            <Eye className="h-4 w-4" /> {labels.preview}
          </span>
        </span>
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-1 py-2 pr-2 sm:gap-2 sm:p-3 sm:pl-4">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-[14px] font-extrabold leading-[1.3] text-app-text" title={m.title}>{m.title}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-app-text-muted">{formatBytes(m.size_bytes)} · {fmtDay(m.created_at)}</p>
        </div>
        <IconButton label={labels.rename} onClick={onRename}><Pencil className="h-[17px] w-[17px]" /></IconButton>
        <IconButton label={labels.remove} onClick={onRemove} danger><Trash2 className="h-[17px] w-[17px]" /></IconButton>
      </div>
    </motion.div>
  );
}

function IconButton({ children, label, onClick, danger = false }: { children: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-app-text-muted transition active:scale-95 ${
        danger ? 'hover:bg-[#FEF2F2] hover:text-[#B91C1C]' : 'hover:bg-[var(--app-row-hover)] hover:text-app-text'
      }`}
    >
      {children}
    </button>
  );
}

/** Kartochka rasmi: rasmning o'zi yoki PDF ning birinchi sahifasi (audio/video — belgi). */
function useThumb(token: string, m: TeacherMaterial): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if ((m.kind !== 'image' && m.kind !== 'pdf') || m.size_bytes > 8 * 1024 * 1024) return;
    let alive = true;
    let objectUrl: string | null = null;
    fetchMaterialBlob(token, { materialId: m.id })
      .then(async (b) => {
        if (m.kind === 'pdf') {
          const data = await renderPdfThumb(b);
          if (alive) setUrl(data);
        } else if (alive) {
          objectUrl = URL.createObjectURL(b);
          setUrl(objectUrl);
        }
      })
      .catch(() => {});
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [token, m.id, m.kind, m.size_bytes]);
  return url;
}

function PreviewModal({ m, token, t, onClose }: { m: TeacherMaterial; token: string; t: (typeof TEXT)['uz']; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchMaterialBlob(token, { materialId: m.id }).then((b) => alive && setBlob(b)).catch((e) => alive && setError(e instanceof Error ? e.message : t.openError));
    return () => { alive = false; };
  }, [token, m.id, t.openError]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPage((p) => Math.min(pages || 1, p + 1));
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pages]);

  return (
    <Modal title={m.title} subtitle={`${t.kindLabel[m.kind]} · ${formatBytes(m.size_bytes)}`} onClose={onClose} width={960}>
      <div className="h-[62vh] overflow-hidden rounded-[16px] bg-app-bg-muted">
        {error ? (
          <p className="flex h-full items-center justify-center text-[14px] font-semibold text-app-text-muted">{error}</p>
        ) : (
          <MaterialViewer blob={blob} kind={m.kind} title={m.title} page={page} onPageCount={setPages} loadingText={t.loading} errorText={t.openError} />
        )}
      </div>
      {m.kind === 'pdf' && pages > 1 ? <PageNav page={page} pages={pages} setPage={setPage} label={t.page(page, pages)} /> : null}
    </Modal>
  );
}

function RenameModal({ m, t, onClose, onSave }: { m: TeacherMaterial; t: (typeof TEXT)['uz']; onClose: () => void; onSave: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState(m.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try { await onSave(title.trim()); } catch (e) { setError(e instanceof Error ? e.message : ''); setBusy(false); }
  };
  return (
    <Modal
      title={t.rename}
      onClose={onClose}
      footer={<><GhostButton onClick={onClose}>{t.cancel}</GhostButton><PrimaryButton onClick={() => void submit()} disabled={busy || !title.trim()}>{t.save}</PrimaryButton></>}
    >
      {error ? <ErrorNote text={error} /> : null}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-app-text-secondary">{t.name}</span>
        <input
          autoFocus
          value={title}
          maxLength={MATERIAL_TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          className={inputClass}
        />
      </label>
    </Modal>
  );
}

function ConfirmRemove({ t, onClose, onConfirm }: { t: (typeof TEXT)['uz']; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal
      title={t.removeTitle}
      onClose={onClose}
      footer={
        <>
          <GhostButton onClick={onClose}>{t.cancel}</GhostButton>
          <GhostButton
            tone="danger"
            disabled={busy}
            onClick={() => { setBusy(true); onConfirm().catch((e) => { setError(e instanceof Error ? e.message : ''); setBusy(false); }); }}
          >
            {t.remove}
          </GhostButton>
        </>
      }
    >
      {error ? <ErrorNote text={error} /> : null}
      <p className="text-[14px] leading-[1.55] text-app-text-secondary">{t.removeText}</p>
    </Modal>
  );
}
