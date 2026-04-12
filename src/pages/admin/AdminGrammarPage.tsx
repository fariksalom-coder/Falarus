import { useEffect, useMemo, useState } from 'react';
import {
  adminCreateGrammarQuestion,
  adminGetGrammarQuestion,
  adminListGrammarLessons,
  adminListGrammarQuestions,
  adminUpdateGrammarQuestion,
  type AdminGrammarLessonRow,
  type AdminGrammarQuestionRow,
} from '../../api/adminGrammar';

function taskNumberFromOrderIndex(orderIndex: number): number {
  return Math.floor(orderIndex / 1000);
}

export default function AdminGrammarPage() {
  const [lessons, setLessons] = useState<AdminGrammarLessonRow[]>([]);
  const [lessonId, setLessonId] = useState<number | ''>('');
  const [questions, setQuestions] = useState<AdminGrammarQuestionRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [type, setType] = useState('choice');
  const [prompt, setPrompt] = useState('');
  const [orderIndex, setOrderIndex] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [contentJson, setContentJson] = useState('{}');
  const [answerJson, setAnswerJson] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminListGrammarLessons()
      .then((r) => setLessons(r.lessons))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (lessonId === '') {
      setQuestions([]);
      return;
    }
    setLoading(true);
    adminListGrammarQuestions(lessonId)
      .then((r) => setQuestions(r.questions))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  const grouped = useMemo(() => {
    const m = new Map<number, AdminGrammarQuestionRow[]>();
    for (const q of questions) {
      const t = taskNumberFromOrderIndex(q.order_index);
      if (!m.has(t)) m.set(t, []);
      m.get(t)!.push(q);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [questions]);

  async function loadQuestion(id: number) {
    setError('');
    setSelectedId(id);
    try {
      const r = await adminGetGrammarQuestion(id);
      const q = r.question as AdminGrammarQuestionRow;
      setType(String(q.type));
      setPrompt(q.prompt ?? '');
      setOrderIndex(String(q.order_index));
      setIsActive(Boolean(q.is_active));
      setContentJson(JSON.stringify(r.content ?? {}, null, 2));
      setAnswerJson(JSON.stringify(r.answer ?? {}, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklash xato');
    }
  }

  async function handleSave() {
    if (selectedId == null) {
      setError('Avval savol tanlang');
      return;
    }
    let content: unknown;
    let answer: unknown;
    try {
      content = JSON.parse(contentJson);
      answer = JSON.parse(answerJson);
    } catch {
      setError('JSON noto‘g‘ri');
      return;
    }
    const oi = Number(orderIndex);
    if (!Number.isFinite(oi)) {
      setError('order_index raqam bo‘lishi kerak');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminUpdateGrammarQuestion(selectedId, {
        type,
        prompt,
        order_index: oi,
        is_active: isActive,
        content,
        answer,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlash xato');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateDraft() {
    if (lessonId === '') {
      setError('Dars tanlang');
      return;
    }
    const taskStr = window.prompt('Task raqami (masalan 3)?', '1');
    if (!taskStr) return;
    const taskNum = Number(taskStr);
    if (!Number.isFinite(taskNum) || taskNum <= 0) {
      setError('Task noto‘g‘ri');
      return;
    }
    const nextOrder = taskNum * 1000 + 1;
    setSaving(true);
    setError('');
    try {
      const { id } = await adminCreateGrammarQuestion(Number(lessonId), {
        type: 'choice',
        prompt: 'Yangi savol',
        order_index: nextOrder,
        is_active: true,
        content: { options: ['A', 'B', 'C'] },
        answer: { type: 'string', value: 'A', alternatives: [] },
      });
      const r = await adminListGrammarQuestions(Number(lessonId));
      setQuestions(r.questions);
      await loadQuestion(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yaratish xato');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Grammar (savollar)</h1>
      <p className="text-sm text-slate-600 mb-6">
        Dars → savollar ro‘yxati → tanlang → JSON tahrirlang → Saqlash. Yangi qator uchun banddagi order_index ni
        import skripti qoidasiga moslang (task × 1000 + tartib).
      </p>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">Dars</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Tanlang</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id}. {l.title} ({l.lesson_path})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void handleCreateDraft()}
            disabled={lessonId === '' || saving}
            className="mt-3 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Yangi (choice, draft)
          </button>

          {loading ? <p className="mt-4 text-sm text-slate-500">Yuklanmoqda…</p> : null}

          <div className="mt-4 max-h-[480px] space-y-4 overflow-y-auto text-sm">
            {grouped.map(([taskNum, rows]) => (
              <div key={taskNum}>
                <p className="font-semibold text-slate-800">Task {taskNum}</p>
                <ul className="mt-1 space-y-1 border-l border-slate-200 pl-2">
                  {rows.map((q) => (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => void loadQuestion(q.id)}
                        className={`text-left hover:underline ${selectedId === q.id ? 'font-bold text-indigo-700' : 'text-slate-700'}`}
                      >
                        #{q.id} [{q.type}] order={q.order_index}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-slate-600">
              type
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              order_index
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                value={orderIndex}
                onChange={(e) => setOrderIndex(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-slate-600">
            prompt
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            is_active
          </label>
          <label className="block text-xs font-medium text-slate-600">
            content (JSON)
            <textarea
              className="mt-1 w-full h-40 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
              value={contentJson}
              onChange={(e) => setContentJson(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            answer (JSON)
            <textarea
              className="mt-1 w-full h-40 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
              value={answerJson}
              onChange={(e) => setAnswerJson(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={selectedId == null || saving}
            onClick={() => void handleSave()}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
