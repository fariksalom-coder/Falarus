/**
 * Testlar: o'qituvchi savol-javob testlarini tuzadi. Darsda «Materiallar → Testlar» dan doskaga
 * chiqaradi (o'quvchi variant tanlaydi, to'g'ri/noto'g'ri darhol ko'rinadi) yoki uy vazifasi qilib beradi.
 */
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ListChecks, Pencil, Plus, Trash2, X } from 'lucide-react';
import { usePanel } from '../panelContext';
import { Card, Empty, ErrorNote, GhostButton, Modal, PageHead, PrimaryButton, SegmentTabs, Skeleton, inputClass, textareaClass } from '../ui';
import Materials from './Materials';
import {
  EXPLANATION_MAX, OPTION_TEXT_MAX, QUESTION_TEXT_MAX, TEST_MAX_OPTIONS, TEST_MAX_QUESTIONS, TEST_MIN_OPTIONS, TEST_TITLE_MAX,
  normalizeTest, optionLetter, type TestQuestion,
} from '../../../../../shared/teacherTests';
import { deleteTest, getTest, getTests, saveTest, type TestSummary } from '../../../../api/teacherTests';

const TEXT = {
  uz: {
    files: 'Fayllar', tests: 'Testlar',
    title: 'Testlar',
    subtitle: 'Darsda doskaga chiqaring yoki uy vazifasi qilib bering — oʻquvchi javobi darhol tekshiriladi.',
    create: 'Yangi test',
    emptyTitle: 'Hali test yoʻq',
    emptyHint: 'Savol, variantlar (A, B, V, G) va toʻgʻri javobni belgilang. Izoh yozsangiz, oʻquvchi javobdan keyin koʻradi.',
    questions: (n: number) => `${n} ta savol`,
    edit: 'Tahrirlash', remove: 'Oʻchirish',
    removeAsk: (title: string) => `«${title}» testi oʻchirilsinmi?`,
    removeHint: 'Allaqachon berilgan uy vazifalari saqlanib qoladi.',
    cancel: 'Bekor qilish', save: 'Saqlash', saving: 'Saqlanmoqda…',
    newTitle: 'Yangi test', editTitle: 'Testni tahrirlash',
    name: 'Test nomi', namePh: 'Masalan: Salomlashish iboralari',
    question: (n: number) => `${n}-savol`,
    questionPh: 'Savol matni',
    optionPh: (l: string) => `${l} variant`,
    markRight: 'Toʻgʻri javob', isRight: 'Toʻgʻri',
    addOption: 'Variant qoʻshish',
    explanation: 'Izoh (ixtiyoriy)', explanationPh: 'Nega aynan shu javob toʻgʻri — oʻquvchi javobdan keyin koʻradi',
    addQuestion: 'Savol qoʻshish',
    removeQuestion: 'Savolni oʻchirish',
    saved: 'Test saqlandi', removed: 'Test oʻchirildi',
    loadError: 'Testlarni yuklab boʻlmadi',
  },
  ru: {
    files: 'Файлы', tests: 'Тесты',
    title: 'Тесты',
    subtitle: 'Откройте на доске во время урока или дайте домашним заданием — ответ ученика проверяется сразу.',
    create: 'Новый тест',
    emptyTitle: 'Тестов пока нет',
    emptyHint: 'Напишите вопрос, варианты (A, B, V, G) и отметьте правильный. Пояснение ученик увидит после ответа.',
    questions: (n: number) => `${n} вопр.`,
    edit: 'Изменить', remove: 'Удалить',
    removeAsk: (title: string) => `Удалить тест «${title}»?`,
    removeHint: 'Уже выданные домашние задания сохранятся.',
    cancel: 'Отмена', save: 'Сохранить', saving: 'Сохраняем…',
    newTitle: 'Новый тест', editTitle: 'Редактировать тест',
    name: 'Название теста', namePh: 'Например: фразы приветствия',
    question: (n: number) => `Вопрос ${n}`,
    questionPh: 'Текст вопроса',
    optionPh: (l: string) => `Вариант ${l}`,
    markRight: 'Правильный ответ', isRight: 'Верный',
    addOption: 'Добавить вариант',
    explanation: 'Пояснение (необязательно)', explanationPh: 'Почему именно этот ответ — ученик увидит после ответа',
    addQuestion: 'Добавить вопрос',
    removeQuestion: 'Удалить вопрос',
    saved: 'Тест сохранён', removed: 'Тест удалён',
    loadError: 'Не удалось загрузить тесты',
  },
} as const;

/** «Materiallar» bo'limi: fayllar va testlar bitta joyda (darsda ham ikkalasi bitta panelda). */
export function MaterialsHub() {
  const { lang } = usePanel();
  const t = TEXT[lang];
  const [tab, setTab] = useState<'files' | 'tests'>('files');
  return (
    <div>
      <SegmentTabs<'files' | 'tests'> items={[{ key: 'files', label: t.files }, { key: 'tests', label: t.tests }]} active={tab} onChange={setTab} />
      {tab === 'files' ? <Materials /> : <Tests />}
    </div>
  );
}

const blankQuestion = (): TestQuestion => ({ text: '', options: ['', '', ''], correct: -1 });

export default function Tests() {
  const { token, lang, toast } = usePanel();
  const t = TEXT[lang];
  const [list, setList] = useState<TestSummary[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ id?: number; title: string; questions: TestQuestion[] } | null>(null);
  const [removing, setRemoving] = useState<TestSummary | null>(null);

  const load = useCallback(async () => {
    try { setList(await getTests(token)); setError(''); } catch (e) { setError(e instanceof Error ? e.message : t.loadError); }
  }, [token, t.loadError]);
  useEffect(() => { void load(); }, [load]);

  const openEdit = async (id: number) => {
    try {
      const full = await getTest(token, id);
      setEditing({ id: full.id, title: full.title, questions: full.questions });
    } catch (e) { setError(e instanceof Error ? e.message : t.loadError); }
  };

  return (
    <div>
      <PageHead
        title={t.title}
        subtitle={t.subtitle}
        actions={<PrimaryButton onClick={() => setEditing({ title: '', questions: [blankQuestion()] })}><span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" />{t.create}</span></PrimaryButton>}
      />
      {error ? <ErrorNote text={error} /> : null}
      {!list && !error ? <Skeleton rows={3} /> : null}
      {list && !list.length ? <Empty text={t.emptyTitle} hint={t.emptyHint} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {list?.map((x) => (
          <Card key={x.id} className="flex items-center gap-3 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#DCFCE7] text-[#166534]"><ListChecks className="h-5 w-5" /></span>
            <button type="button" onClick={() => void openEdit(x.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-[15px] font-extrabold text-app-text">{x.title}</p>
              <p className="text-[12.5px] font-semibold text-app-text-muted">{t.questions(x.question_count)}</p>
            </button>
            <button type="button" onClick={() => void openEdit(x.id)} aria-label={t.edit} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-app-text-muted transition hover:bg-app-bg-subtle">
              <Pencil className="h-[18px] w-[18px]" />
            </button>
            <button type="button" onClick={() => setRemoving(x)} aria-label={t.remove} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[#B91C1C] transition hover:bg-[#FEF2F2]">
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          </Card>
        ))}
      </div>

      {editing ? (
        <TestEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); toast(t.saved); void load(); }}
        />
      ) : null}

      {removing ? (
        <Modal
          title={t.removeAsk(removing.title)}
          subtitle={t.removeHint}
          onClose={() => setRemoving(null)}
          footer={<>
            <GhostButton onClick={() => setRemoving(null)}>{t.cancel}</GhostButton>
            <GhostButton tone="danger" onClick={async () => {
              try { await deleteTest(token, removing.id); toast(t.removed); setRemoving(null); void load(); }
              catch (e) { setError(e instanceof Error ? e.message : t.loadError); setRemoving(null); }
            }}>{t.remove}</GhostButton>
          </>}
        >
          <span />
        </Modal>
      ) : null}
    </div>
  );
}

function TestEditor({ initial, onClose, onSaved }: {
  initial: { id?: number; title: string; questions: TestQuestion[] }; onClose: () => void; onSaved: () => void;
}) {
  const { token, lang } = usePanel();
  const t = TEXT[lang];
  const [title, setTitle] = useState(initial.title);
  const [questions, setQuestions] = useState<TestQuestion[]>(initial.questions.length ? initial.questions : [blankQuestion()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const patchQ = (i: number, p: Partial<TestQuestion>) => setQuestions((qs) => qs.map((q, k) => (k === i ? { ...q, ...p } : q)));
  const setOption = (i: number, o: number, v: string) => setQuestions((qs) => qs.map((q, k) => (k === i ? { ...q, options: q.options.map((x, j) => (j === o ? v : x)) } : q)));
  const removeOption = (i: number, o: number) => setQuestions((qs) => qs.map((q, k) => {
    if (k !== i || q.options.length <= TEST_MIN_OPTIONS) return q;
    const correct = q.correct === o ? -1 : q.correct > o ? q.correct - 1 : q.correct;
    return { ...q, options: q.options.filter((_, j) => j !== o), correct };
  }));

  const save = async () => {
    const checked = normalizeTest({ title, questions });
    if (typeof checked === 'string') { setError(checked); return; }
    setBusy(true);
    setError('');
    try { await saveTest(token, { id: initial.id, ...checked }); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Xatolik'); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      title={initial.id ? t.editTitle : t.newTitle}
      onClose={onClose}
      width={720}
      footer={<>
        <GhostButton onClick={onClose}>{t.cancel}</GhostButton>
        <PrimaryButton onClick={() => void save()} disabled={busy}>{busy ? t.saving : t.save}</PrimaryButton>
      </>}
    >
      {error ? <ErrorNote text={error} /> : null}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13.5px] font-bold text-app-text">{t.name}</span>
        <input className={inputClass} value={title} maxLength={TEST_TITLE_MAX} placeholder={t.namePh} onChange={(e) => setTitle(e.target.value)} />
      </label>

      {questions.map((q, i) => (
        <div key={i} className="rounded-[18px] border border-app-border bg-app-bg-muted p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.05em] text-app-primary">{t.question(i + 1)}</p>
            {questions.length > 1 ? (
              <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, k) => k !== i))} aria-label={t.removeQuestion}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[#B91C1C] transition hover:bg-[#FEF2F2]">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <textarea className={`${textareaClass} min-h-[64px]`} value={q.text} maxLength={QUESTION_TEXT_MAX} placeholder={t.questionPh}
            onChange={(e) => patchQ(i, { text: e.target.value })} />
          <div className="mt-2.5 grid gap-2">
            {q.options.map((opt, o) => {
              const right = q.correct === o;
              return (
                <div key={o} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => patchQ(i, { correct: o })}
                    aria-pressed={right}
                    aria-label={`${optionLetter(o)} — ${t.markRight}`}
                    title={t.markRight}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[15px] font-black transition ${right ? 'bg-[#16A34A] text-white' : 'border border-app-border-strong bg-app-surface text-app-text-secondary hover:border-[#16A34A]'}`}
                  >
                    {right ? <CheckCircle2 className="h-5 w-5" /> : optionLetter(o)}
                  </button>
                  <input className={`${inputClass} ${right ? 'border-[#16A34A] bg-[#F0FDF4]' : ''}`} value={opt} maxLength={OPTION_TEXT_MAX}
                    placeholder={t.optionPh(optionLetter(o))} onChange={(e) => setOption(i, o, e.target.value)} />
                  {q.options.length > TEST_MIN_OPTIONS ? (
                    <button type="button" onClick={() => removeOption(i, o)} aria-label={t.remove}
                      className="flex h-11 w-9 shrink-0 items-center justify-center rounded-[10px] text-app-text-muted transition hover:bg-app-bg-subtle">
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {q.options.length < TEST_MAX_OPTIONS ? (
              <button type="button" onClick={() => patchQ(i, { options: [...q.options, ''] })}
                className="flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-bold text-app-primary transition hover:bg-app-icon-bg">
                <Plus className="h-4 w-4" /> {t.addOption}
              </button>
            ) : null}
            <span className="text-[12px] font-semibold text-app-text-muted">{q.correct >= 0 ? `${t.isRight}: ${optionLetter(q.correct)}` : t.markRight + ' — ?'}</span>
          </div>
          <textarea className={`${textareaClass} mt-2 min-h-[52px] text-[13.5px]`} value={q.explanation ?? ''} maxLength={EXPLANATION_MAX} placeholder={t.explanationPh}
            aria-label={t.explanation} onChange={(e) => patchQ(i, { explanation: e.target.value })} />
        </div>
      ))}

      {questions.length < TEST_MAX_QUESTIONS ? (
        <button type="button" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-app-border-strong text-[14px] font-bold text-app-primary transition hover:bg-app-icon-bg">
          <Plus className="h-4 w-4" /> {t.addQuestion}
        </button>
      ) : null}
    </Modal>
  );
}
