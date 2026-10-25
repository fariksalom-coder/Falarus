/**
 * Darsga materiallarni oldindan biriktirish: darsda «Materiallar» ochilganda ular
 * «Shu dars uchun» bo'limida birinchi turadi. Kutubxonada yo'q faylni shu yerning o'zida yuklash mumkin.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, UploadCloud } from 'lucide-react';
import { usePanel } from '../panelContext';
import { ErrorNote, GhostButton, Modal, PrimaryButton, Skeleton } from '../ui';
import { KIND_STYLE, materialMeta } from '../../../materials/materialUi';
import { MATERIAL_ACCEPT } from '../../../../../shared/teacherMaterials';
import {
  getLessonMaterials, getMaterials, setLessonMaterials, uploadMaterial, type LessonKind, type TeacherMaterial,
} from '../../../../api/teacherMaterials';

const TEXT = {
  uz: {
    title: 'Dars materiallari', subtitle: (who: string) => `${who} bilan dars uchun`,
    hint: 'Belgilanganlari darsda «Materiallar» tugmasi ostida birinchi turadi.',
    upload: 'Yangi fayl yuklash', save: 'Saqlash', cancel: 'Bekor qilish', saved: 'Dars materiallari saqlandi',
    empty: 'Kutubxonangiz hali boʻsh — fayl yuklang.', processing: 'PDF ga aylantirilmoqda…', failed: 'Ochilmadi',
  },
  ru: {
    title: 'Материалы к уроку', subtitle: (who: string) => `Для урока с учеником: ${who}`,
    hint: 'Отмеченные будут первыми под кнопкой «Материалы» на уроке.',
    upload: 'Загрузить файл', save: 'Сохранить', cancel: 'Отмена', saved: 'Материалы урока сохранены',
    empty: 'Библиотека пока пуста — загрузите файл.', processing: 'Превращаем в PDF…', failed: 'Не открылся',
  },
};

export default function LessonMaterialsModal({ kind, lessonId, studentName, onClose }: {
  kind: LessonKind; lessonId: number; studentName: string; onClose: () => void;
}) {
  const { token, lang, toast } = usePanel();
  const t = TEXT[lang];
  const [items, setItems] = useState<TeacherMaterial[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getMaterials(token), getLessonMaterials(token, kind, lessonId)])
      .then(([lib, linked]) => { if (alive) { setItems(lib.materials); setPicked(linked.material_ids); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : ''); });
    return () => { alive = false; };
  }, [token, kind, lessonId]);

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUpload(0);
    setError('');
    try {
      const m = await uploadMaterial(token, file, setUpload);
      setItems((x) => [m, ...(x ?? [])]);
      setPicked((p) => [...p, m.id]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '');
    } finally {
      setUpload(null);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await setLessonMaterials(token, kind, lessonId, picked);
      toast(t.saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '');
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t.title}
      subtitle={t.subtitle(studentName)}
      onClose={onClose}
      width={520}
      footer={<><GhostButton onClick={onClose}>{t.cancel}</GhostButton><PrimaryButton onClick={() => void save()} disabled={busy || !items}>{t.save}</PrimaryButton></>}
    >
      {error ? <ErrorNote text={error} /> : null}
      <p className="text-[13.5px] text-app-text-muted">{t.hint}</p>
      <input ref={inputRef} type="file" accept={MATERIAL_ACCEPT} className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <button
        type="button"
        disabled={upload !== null}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#CBD5E1] text-[14px] font-bold text-app-text-secondary transition hover:border-app-primary hover:text-app-primary active:scale-[0.99] disabled:opacity-60"
      >
        {upload !== null ? <><Loader2 className="h-4 w-4 animate-spin" /> {Math.round(upload * 100)}%</> : <><UploadCloud className="h-[18px] w-[18px]" /> {t.upload}</>}
      </button>
      {!items && !error ? <Skeleton rows={3} /> : null}
      {items && items.length === 0 ? <p className="py-4 text-center text-[13.5px] font-semibold text-app-text-muted">{t.empty}</p> : null}
      {items && items.length ? (
        <ul className="-mx-1 max-h-[46vh] overflow-y-auto">
          {items.map((m) => {
            const S = KIND_STYLE[m.kind];
            const on = picked.includes(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  aria-pressed={on}
                  className={`flex min-h-[60px] w-full items-center gap-3 rounded-[14px] px-2 py-2 text-left transition active:scale-[0.99] ${on ? 'bg-app-icon-bg' : 'hover:bg-[var(--app-row-hover)]'}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${S.bg} ${S.fg}`}><S.icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-app-text">{m.title}</span>
                    <span className={`block text-[12px] font-semibold ${m.status === 'failed' ? 'text-[#B91C1C]' : 'text-app-text-muted'}`}>
                      {m.status === 'processing' ? t.processing : m.status === 'failed' ? t.failed : materialMeta(m)}
                    </span>
                  </span>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border-2 transition ${on ? 'border-app-primary bg-app-primary text-white' : 'border-app-border-strong'}`}>
                    {on ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Modal>
  );
}
