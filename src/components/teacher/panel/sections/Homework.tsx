/**
 * Uy vazifalari (o'qituvchi): o'z o'quvchisiga test, lug'at ro'yxati yoki fayl beradi va natijani
 * kuzatadi — ko'rdimi, bajardimi, testda nechta to'g'ri.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookText, CheckCircle2, Eye, FileText, ListChecks, Plus, Trash2, XCircle } from 'lucide-react';
import { usePanel } from '../panelContext';
import { Card, Empty, ErrorNote, GhostButton, Modal, PageHead, Pills, PrimaryButton, SegmentTabs, Skeleton, fmtDate, inputClass, textareaClass } from '../ui';
import { HOMEWORK_NOTE_MAX, HOMEWORK_TITLE_MAX, optionLetter, parseWordList, type HomeworkKind, type TestQuestion } from '../../../../../shared/teacherTests';
import {
  createHomework, deleteHomework, getHomeworkStudents, getTeacherHomework, getTeacherHomeworkDetail, getTests,
  type Homework, type HomeworkDetail, type HomeworkStudent, type TestSummary,
} from '../../../../api/teacherTests';
import { getMaterials, type TeacherMaterial } from '../../../../api/teacherMaterials';

const TEXT = {
  uz: {
    title: 'Uy vazifalari',
    subtitle: 'Oʻquvchiga test, lugʻat yoki fayl bering — u ilovada bajaradi, natijani shu yerda koʻrasiz.',
    give: 'Vazifa berish', all: 'Hammasi',
    empty: 'Hali vazifa berilmagan', emptyHint: 'Darsdan keyin mustahkamlash uchun test yoki soʻzlar roʻyxatini bering.',
    noStudents: 'Vazifa berish uchun avval oʻquvchi bilan dars boʻlishi kerak.',
    kinds: { test: 'Test', words: 'Lugʻat', file: 'Fayl' } as Record<HomeworkKind, string>,
    status: { new: 'Yangi', seen: 'Koʻrdi', done: 'Bajarildi' },
    due: 'Muddat', score: (s: number, t: number) => `${s}/${t} toʻgʻri`, words: (n: number) => `${n} ta soʻz`,
    student: 'Oʻquvchi', pickStudent: 'Oʻquvchini tanlang', kind: 'Turi',
    test: 'Test', pickTest: 'Testni tanlang', noTests: 'Avval «Materiallar → Testlar» boʻlimida test tuzing.',
    wordsLabel: 'Soʻzlar (har qatorda: soʻz — tarjima)', wordsPh: 'привет — salom\nспасибо — rahmat\nдо свидания — xayr',
    wordsCount: (n: number) => `${n} ta soʻz tanildi`,
    file: 'Fayl', pickFile: 'Faylni tanlang', noFiles: 'Avval «Materiallar» boʻlimiga fayl yuklang.',
    name: 'Nomi (ixtiyoriy)', note: 'Izoh oʻquvchiga (ixtiyoriy)', notePh: 'Masalan: 5-sahifadagi mashqlarni bajaring',
    dueLabel: 'Muddat (ixtiyoriy)',
    cancel: 'Bekor qilish', send: 'Berish', sending: 'Yuborilmoqda…', given: 'Vazifa berildi', removed: 'Vazifa oʻchirildi',
    remove: 'Oʻchirish', removeAsk: 'Vazifa oʻchirilsinmi?', removeHint: 'Oʻquvchida ham yoʻqoladi.',
    answers: 'Javoblar', notAnswered: 'Javob berilmagan', view: 'Koʻrish',
  },
  ru: {
    title: 'Домашние задания',
    subtitle: 'Дайте ученику тест, слова или файл — он выполнит в приложении, а результат вы увидите здесь.',
    give: 'Дать задание', all: 'Все',
    empty: 'Заданий пока нет', emptyHint: 'После урока дайте тест или список слов для закрепления.',
    noStudents: 'Задание можно дать ученику, с которым был урок.',
    kinds: { test: 'Тест', words: 'Слова', file: 'Файл' } as Record<HomeworkKind, string>,
    status: { new: 'Новое', seen: 'Открыл', done: 'Выполнено' },
    due: 'Срок', score: (s: number, t: number) => `${s}/${t} верно`, words: (n: number) => `${n} слов`,
    student: 'Ученик', pickStudent: 'Выберите ученика', kind: 'Тип',
    test: 'Тест', pickTest: 'Выберите тест', noTests: 'Сначала создайте тест в «Материалы → Тесты».',
    wordsLabel: 'Слова (в каждой строке: слово — перевод)', wordsPh: 'привет — salom\nспасибо — rahmat\nдо свидания — xayr',
    wordsCount: (n: number) => `Распознано слов: ${n}`,
    file: 'Файл', pickFile: 'Выберите файл', noFiles: 'Сначала загрузите файл в «Материалы».',
    name: 'Название (необязательно)', note: 'Комментарий ученику (необязательно)', notePh: 'Например: сделайте упражнения на стр. 5',
    dueLabel: 'Срок (необязательно)',
    cancel: 'Отмена', send: 'Дать', sending: 'Отправляем…', given: 'Задание выдано', removed: 'Задание удалено',
    remove: 'Удалить', removeAsk: 'Удалить задание?', removeHint: 'У ученика оно тоже пропадёт.',
    answers: 'Ответы', notAnswered: 'Нет ответа', view: 'Смотреть',
  },
} as const;

const KIND_ICON = { test: ListChecks, words: BookText, file: FileText } as const;
const KIND_TONE = { test: 'bg-[#DCFCE7] text-[#166534]', words: 'bg-[#FEF3C7] text-[#92400E]', file: 'bg-[#DBEAFE] text-[#1E40AF]' } as const;
const nameOf = (s?: { first_name: string | null; last_name: string | null } | null) => `${s?.first_name ?? ''} ${s?.last_name ?? ''}`.trim() || '—';

export default function HomeworkSection() {
  const { token, lang, toast } = usePanel();
  const t = TEXT[lang];
  const [items, setItems] = useState<Homework[] | null>(null);
  const [students, setStudents] = useState<HomeworkStudent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Homework | null>(null);
  const [viewing, setViewing] = useState<HomeworkDetail | null>(null);

  const load = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([getTeacherHomework(token), getHomeworkStudents(token)]);
      setItems(h); setStudents(s); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Xatolik'); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => (items ?? []).filter((h) => filter === 'all' || String(h.student?.id) === filter), [items, filter]);

  const statusOf = (h: Homework) => (h.status === 'done' ? 'done' : h.seen_at ? 'seen' : 'new');

  return (
    <div>
      <PageHead
        title={t.title}
        subtitle={t.subtitle}
        actions={<PrimaryButton onClick={() => setCreating(true)} disabled={!students.length}><span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" />{t.give}</span></PrimaryButton>}
      />
      {error ? <ErrorNote text={error} /> : null}
      {items && !students.length ? <ErrorNote text={t.noStudents} /> : null}
      {students.length > 1 ? (
        <Pills<string>
          items={[{ key: 'all', label: t.all }, ...students.map((s) => ({ key: String(s.id), label: nameOf(s) }))]}
          active={filter}
          onChange={setFilter}
        />
      ) : null}
      {!items && !error ? <Skeleton rows={3} /> : null}
      {items && !shown.length ? <Empty text={t.empty} hint={t.emptyHint} /> : null}
      <div className="mt-3 grid gap-3">
        {shown.map((h) => {
          const Icon = KIND_ICON[h.kind];
          const st = statusOf(h);
          return (
            <Card key={h.id} className="flex items-center gap-3 p-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${KIND_TONE[h.kind]}`}><Icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold text-app-text">{h.title}</p>
                <p className="truncate text-[12.5px] font-semibold text-app-text-muted">
                  {nameOf(h.student)} · {t.kinds[h.kind]}
                  {h.kind === 'words' && h.words ? ` · ${t.words(h.words.length)}` : ''}
                  {h.due_at ? ` · ${t.due}: ${fmtDate(h.due_at, lang)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${st === 'done' ? 'bg-[#DCFCE7] text-[#166534]' : st === 'seen' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-app-bg-subtle text-app-text-muted'}`}>
                  {t.status[st]}
                </span>
                {h.kind === 'test' && h.answered ? <span className="text-[12px] font-bold text-app-text-secondary">{t.score(h.score ?? 0, h.total ?? h.question_count)}</span> : null}
              </div>
              {h.kind === 'test' && h.answered ? (
                <button type="button" aria-label={t.view} onClick={async () => setViewing(await getTeacherHomeworkDetail(token, h.id))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-app-text-muted transition hover:bg-app-bg-subtle">
                  <Eye className="h-[18px] w-[18px]" />
                </button>
              ) : null}
              <button type="button" aria-label={t.remove} onClick={() => setRemoving(h)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[#B91C1C] transition hover:bg-[#FEF2F2]">
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </Card>
          );
        })}
      </div>

      {creating ? (
        <CreateHomework
          students={students}
          initialStudent={filter !== 'all' ? Number(filter) : students[0]?.id}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); toast(t.given); void load(); }}
        />
      ) : null}

      {viewing ? (
        <Modal title={viewing.title} subtitle={`${nameOf(viewing.student)} · ${t.score(viewing.score ?? 0, viewing.total ?? 0)}`} onClose={() => setViewing(null)} width={620}>
          {((viewing.questions ?? []) as TestQuestion[]).map((q, i) => {
            const a = viewing.answers[String(i)];
            return (
              <div key={i} className="rounded-[16px] border border-app-border p-3">
                <p className="text-[14.5px] font-bold text-app-text">{i + 1}. {q.text}</p>
                {a ? (
                  <p className={`mt-1 flex items-center gap-1.5 text-[13.5px] font-semibold ${a.correct ? 'text-[#166534]' : 'text-[#B91C1C]'}`}>
                    {a.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {optionLetter(a.choice)}) {q.options[a.choice]}
                    {!a.correct ? <span className="text-app-text-muted"> · {optionLetter(q.correct)}) {q.options[q.correct]}</span> : null}
                  </p>
                ) : <p className="mt-1 text-[13px] text-app-text-muted">{t.notAnswered}</p>}
              </div>
            );
          })}
        </Modal>
      ) : null}

      {removing ? (
        <Modal title={t.removeAsk} subtitle={`${removing.title} · ${t.removeHint}`} onClose={() => setRemoving(null)}
          footer={<>
            <GhostButton onClick={() => setRemoving(null)}>{t.cancel}</GhostButton>
            <GhostButton tone="danger" onClick={async () => {
              try { await deleteHomework(token, removing.id); toast(t.removed); setRemoving(null); void load(); }
              catch (e) { setError(e instanceof Error ? e.message : 'Xatolik'); setRemoving(null); }
            }}>{t.remove}</GhostButton>
          </>}
        >
          <span />
        </Modal>
      ) : null}
    </div>
  );
}

function CreateHomework({ students, initialStudent, onClose, onCreated }: {
  students: HomeworkStudent[]; initialStudent?: number; onClose: () => void; onCreated: () => void;
}) {
  const { token, lang } = usePanel();
  const t = TEXT[lang];
  const [student, setStudent] = useState<number | ''>(initialStudent ?? '');
  const [kind, setKind] = useState<HomeworkKind>('test');
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  const [files, setFiles] = useState<TeacherMaterial[] | null>(null);
  const [testId, setTestId] = useState<number | ''>('');
  const [materialId, setMaterialId] = useState<number | ''>('');
  const [wordsText, setWordsText] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const words = useMemo(() => parseWordList(wordsText), [wordsText]);

  useEffect(() => {
    getTests(token).then(setTests).catch(() => setTests([]));
    getMaterials(token).then((l) => setFiles(l.materials.filter((m) => m.status === 'ready' && (m.kind === 'pdf' || m.kind === 'image')))).catch(() => setFiles([]));
  }, [token]);

  const submit = async () => {
    if (!student) { setError(t.pickStudent); return; }
    if (kind === 'test' && !testId) { setError(t.pickTest); return; }
    if (kind === 'file' && !materialId) { setError(t.pickFile); return; }
    if (kind === 'words' && !words.length) { setError(t.wordsLabel); return; }
    setBusy(true); setError('');
    try {
      await createHomework(token, {
        student_id: Number(student), kind, title: title.trim() || undefined, note: note.trim() || undefined,
        ...(kind === 'test' ? { test_id: Number(testId) } : kind === 'file' ? { material_id: Number(materialId) } : { words }),
        due_at: due ? new Date(`${due}T23:59:00+05:00`).toISOString() : null,
      });
      onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : 'Xatolik'); }
    finally { setBusy(false); }
  };

  const select = `${inputClass} appearance-none`;
  return (
    <Modal title={t.give} onClose={onClose} width={560}
      footer={<>
        <GhostButton onClick={onClose}>{t.cancel}</GhostButton>
        <PrimaryButton onClick={() => void submit()} disabled={busy}>{busy ? t.sending : t.send}</PrimaryButton>
      </>}
    >
      {error ? <ErrorNote text={error} /> : null}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-bold text-app-text">{t.student}</span>
        <select className={select} value={student} onChange={(e) => setStudent(e.target.value ? Number(e.target.value) : '')}>
          <option value="">{t.pickStudent}</option>
          {students.map((s) => <option key={s.id} value={s.id}>{nameOf(s)}</option>)}
        </select>
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-bold text-app-text">{t.kind}</span>
        <SegmentTabs<HomeworkKind> items={(['test', 'words', 'file'] as HomeworkKind[]).map((k) => ({ key: k, label: t.kinds[k] }))} active={kind} onChange={setKind} />
      </div>
      {kind === 'test' ? (
        tests && !tests.length ? <p className="text-[13.5px] font-semibold text-app-text-muted">{t.noTests}</p> : (
          <select className={select} value={testId} onChange={(e) => setTestId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{t.pickTest}</option>
            {tests?.map((x) => <option key={x.id} value={x.id}>{x.title} ({x.question_count})</option>)}
          </select>
        )
      ) : null}
      {kind === 'words' ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13.5px] font-bold text-app-text">{t.wordsLabel}</span>
          <textarea className={`${textareaClass} min-h-[150px]`} value={wordsText} placeholder={t.wordsPh} onChange={(e) => setWordsText(e.target.value)} />
          <span className="text-[12px] font-semibold text-app-text-muted">{t.wordsCount(words.length)}</span>
        </label>
      ) : null}
      {kind === 'file' ? (
        files && !files.length ? <p className="text-[13.5px] font-semibold text-app-text-muted">{t.noFiles}</p> : (
          <select className={select} value={materialId} onChange={(e) => setMaterialId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{t.pickFile}</option>
            {files?.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        )
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-bold text-app-text">{t.name}</span>
        <input className={inputClass} value={title} maxLength={HOMEWORK_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-bold text-app-text">{t.note}</span>
        <textarea className={`${textareaClass} min-h-[70px]`} value={note} maxLength={HOMEWORK_NOTE_MAX} placeholder={t.notePh} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-bold text-app-text">{t.dueLabel}</span>
        <input type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
    </Modal>
  );
}
