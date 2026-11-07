import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookText, CheckCircle2, ClipboardCheck, FileText, ListChecks, Loader2, Trophy } from 'lucide-react';
import QuestionCard, { type QuestionAnswer } from '../tests/QuestionCard';
import MaterialViewer from '../materials/MaterialViewer';
import { PageNav } from '../materials/materialUi';
import {
  answerHomework, finishHomework, getMyHomework, getMyHomeworkDetail, type Homework, type HomeworkDetail,
} from '../../api/teacherTests';
import type { PublicQuestion } from '../../../shared/teacherTests';

/**
 * O'quvchi: «Uy vazifasi». Ustoz bergan test (savolma-savol, javob darhol tekshiriladi),
 * so'zlar ro'yxati (kartochkalar, bosilsa tarjima ochiladi) va fayl (sahifama-sahifa).
 */

const KIND = {
  test: { icon: ListChecks, tone: 'bg-[#DCFCE7] text-[#166534]', label: 'Test' },
  words: { icon: BookText, tone: 'bg-[#FEF3C7] text-[#92400E]', label: 'Lugʻat' },
  file: { icon: FileText, tone: 'bg-[#DBEAFE] text-[#1E40AF]', label: 'Fayl' },
} as const;

const teacherName = (h: Homework) => `${h.teacher?.first_name ?? ''} ${h.teacher?.last_name ?? ''}`.trim() || 'Ustoz';
const dateUz = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', timeZone: 'Asia/Tashkent' });

export default function StudentHomeworkPanel({ token, onCount }: { token: string; onCount?: (n: number) => void }) {
  const [list, setList] = useState<Homework[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    getMyHomework(token)
      .then((r) => { setList(r.homework); setFailed(false); onCount?.(r.homework.filter((h) => h.status !== 'done').length); })
      .catch(() => setFailed(true));
  }, [token, onCount]);
  useEffect(() => { load(); }, [load]);

  if (openId !== null) {
    return <HomeworkView token={token} id={openId} onBack={() => { setOpenId(null); load(); }} />;
  }
  if (!list && failed) {
    return (
      <section role="alert" className="rounded-[24px] border border-app-border bg-app-surface px-6 py-10 text-center">
        <p className="text-lg font-black text-app-text">Vazifalar yuklanmadi</p>
        <button type="button" onClick={load} className="mt-4 h-12 rounded-2xl bg-app-primary-deep px-6 text-[15px] font-black text-white active:scale-[0.98]">Qayta urinish</button>
      </section>
    );
  }
  if (!list) return <div className="h-40 animate-pulse rounded-[24px] bg-app-surface" aria-busy="true" />;
  if (!list.length) {
    return (
      <section className="flex flex-col items-center rounded-[24px] border border-dashed border-app-border bg-app-surface px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-icon-bg text-app-primary-deep"><ClipboardCheck className="h-7 w-7" /></span>
        <p className="mt-3 text-lg font-black text-app-text">Hali uy vazifasi yoʻq</p>
        <p className="mt-1 max-w-xs text-sm text-app-text-muted">Ustozingiz test, soʻzlar yoki fayl bersa — shu yerda paydo boʻladi.</p>
      </section>
    );
  }
  return (
    <div className="space-y-2.5">
      {list.map((h, i) => {
        const K = KIND[h.kind];
        const done = h.status === 'done';
        return (
          <motion.button
            key={h.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 6) * 0.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setOpenId(h.id)}
            className="flex w-full items-center gap-3 rounded-[20px] border border-app-border bg-app-surface p-3.5 text-left shadow-app-soft"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${K.tone}`}><K.icon className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[15.5px] font-extrabold text-app-text">{h.title}</span>
                {!h.seen_at ? <span className="shrink-0 rounded-full bg-[#EF4444] px-2 py-0.5 text-[10.5px] font-black uppercase text-white">Yangi</span> : null}
              </span>
              <span className="block truncate text-[12.5px] font-semibold text-app-text-muted">
                {K.label} · {teacherName(h)}{h.due_at ? ` · ${dateUz(h.due_at)} gacha` : ''}
              </span>
            </span>
            {done ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[12px] font-extrabold text-[#166534]">
                <CheckCircle2 className="h-4 w-4" /> {h.kind === 'test' ? `${h.score ?? 0}/${h.total ?? h.question_count}` : 'Bajarildi'}
              </span>
            ) : h.kind === 'test' && h.answered ? (
              <span className="shrink-0 text-[12px] font-bold text-app-text-muted">{h.answered}/{h.question_count}</span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}

function HomeworkView({ token, id, onBack }: { token: string; id: number; onBack: () => void }) {
  const [h, setH] = useState<HomeworkDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getMyHomeworkDetail(token, id).then(setH).catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [token, id]);

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 flex min-h-11 items-center gap-2 rounded-xl px-1 text-[15px] font-bold text-app-primary-deep active:scale-[0.98]">
        <ArrowLeft className="h-5 w-5" /> Vazifalar
      </button>
      {error ? <p role="alert" className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B91C1C]">{error}</p> : null}
      {!h && !error ? <div className="h-60 animate-pulse rounded-[24px] bg-app-surface" aria-busy="true" /> : null}
      {h ? (
        <>
          <h2 className="text-[22px] font-black leading-tight text-app-text">{h.title}</h2>
          <p className="mt-0.5 text-[13px] font-semibold text-app-text-muted">{teacherName(h)}{h.due_at ? ` · ${dateUz(h.due_at)} gacha` : ''}</p>
          {h.note ? <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#EFF6FF] px-4 py-3 text-[14.5px] font-semibold leading-relaxed text-[#1E3A8A]">{h.note}</p> : null}
          <div className="mt-4">
            {h.kind === 'test' ? <TestRunner token={token} hw={h} /> : null}
            {h.kind === 'words' ? <WordCards token={token} hw={h} /> : null}
            {h.kind === 'file' ? <FileTask token={token} hw={h} /> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function TestRunner({ token, hw }: { token: string; hw: HomeworkDetail }) {
  const questions = (hw.questions ?? []) as PublicQuestion[];
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>(() => {
    const out: Record<number, QuestionAnswer> = {};
    for (const [k, v] of Object.entries(hw.answers ?? {})) out[Number(k)] = v;
    return out;
  });
  const firstOpen = questions.findIndex((_, i) => !answers[i]);
  const [q, setQ] = useState(firstOpen < 0 ? 0 : firstOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const done = questions.length > 0 && questions.every((_, i) => answers[i]?.correct !== undefined);
  const right = Object.values(answers).filter((a) => a.correct).length;
  const [showSummary, setShowSummary] = useState(done);

  const choose = async (choice: number) => {
    if (busy || answers[q]) return;
    setBusy(true); setError('');
    setAnswers((a) => ({ ...a, [q]: { choice } }));
    try {
      const r = await answerHomework(token, hw.id, q, choice);
      setAnswers((a) => ({ ...a, [q]: r }));
    } catch (e) {
      setAnswers((a) => { const { [q]: _x, ...rest } = a; return rest; });
      setError(e instanceof Error ? e.message : 'Javob yuborilmadi');
    } finally { setBusy(false); }
  };

  if (!questions.length) return <p className="text-sm text-app-text-muted">Testda savol yoʻq.</p>;
  if (showSummary && done) {
    const percent = Math.round((right / questions.length) * 100);
    return (
      <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center rounded-[24px] border border-app-border bg-app-surface px-6 py-8 text-center shadow-app-soft">
        <span className={`flex h-16 w-16 items-center justify-center rounded-full ${percent >= 70 ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEF3C7] text-[#D97706]'}`}><Trophy className="h-8 w-8" /></span>
        <p className="mt-3 text-[28px] font-black text-app-text">{right} / {questions.length}</p>
        <p className="text-[15px] font-semibold text-app-text-muted">{percent >= 70 ? 'Ajoyib natija! Vazifa bajarildi.' : 'Vazifa bajarildi. Xatolarni ustoz bilan koʻrib chiqing.'}</p>
        <button type="button" onClick={() => { setShowSummary(false); setQ(0); }} className="mt-5 h-12 rounded-2xl border border-app-border bg-app-surface px-6 text-[15px] font-black text-app-text active:scale-[0.98]">Javoblarni koʻrish</button>
      </motion.section>
    );
  }
  const answer = answers[q] ?? null;
  const last = q >= questions.length - 1;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[640px] gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {questions.map((_, i) => {
          const a = answers[i];
          const tone = a?.correct === true ? 'bg-[#16A34A] text-white' : a?.correct === false ? 'bg-[#EF4444] text-white' : 'bg-app-surface text-app-text-muted border border-app-border';
          return (
            <button key={i} type="button" onClick={() => setQ(i)} aria-label={`${i + 1}-savol`} aria-current={i === q}
              className={`flex h-9 min-w-[36px] shrink-0 items-center justify-center rounded-[10px] text-[13px] font-black ${tone} ${i === q ? 'ring-2 ring-app-primary ring-offset-1' : ''}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <QuestionCard index={q} total={questions.length} text={questions[q].text} options={questions[q].options} answer={answer} busy={busy} onChoose={(c) => void choose(c)} />
      {error ? <p role="alert" className="w-full max-w-[640px] rounded-2xl bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B91C1C]">{error}</p> : null}
      {answer?.correct !== undefined ? (
        <button type="button"
          onClick={() => {
            if (done && (last || questions.every((_, i) => answers[i]))) { setShowSummary(true); return; }
            const next = questions.findIndex((_, i) => i > q && !answers[i]);
            setQ(next >= 0 ? next : Math.min(q + 1, questions.length - 1));
          }}
          className="h-[52px] w-full max-w-[640px] rounded-2xl bg-app-primary text-[16px] font-black text-white shadow-[0_18px_44px_rgba(37,99,235,0.28)] active:scale-[0.98]">
          {done ? 'Natijani koʻrish' : 'Keyingi savol'}
        </button>
      ) : null}
    </div>
  );
}

function WordCards({ token, hw }: { token: string; hw: HomeworkDetail }) {
  const words = hw.words ?? [];
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(hw.status === 'done');
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-app-text-muted">Soʻzni bosing — tarjimasi ochiladi. {words.length} ta soʻz.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {words.map((w, i) => {
          const shown = open.has(i);
          return (
            <motion.button key={i} type="button" whileTap={{ scale: 0.98 }}
              onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
              className={`flex min-h-[64px] flex-col justify-center rounded-[18px] border px-4 py-3 text-left transition ${shown ? 'border-[#93C5FD] bg-[#EFF6FF]' : 'border-app-border bg-app-surface'}`}>
              <span className="text-[17px] font-extrabold text-app-text">{w.ru}</span>
              <span className={`text-[14px] font-semibold ${shown ? 'text-[#1E40AF]' : 'text-app-text-muted'}`}>{shown ? w.uz || '—' : 'Tarjimani koʻrish'}</span>
            </motion.button>
          );
        })}
      </div>
      <DoneButton done={done} busy={busy} label="Yodladim" onDone={async () => {
        setBusy(true);
        try { await finishHomework(token, hw.id); setDone(true); } finally { setBusy(false); }
      }} />
    </div>
  );
}

function FileTask({ token, hw }: { token: string; hw: HomeworkDetail }) {
  const m = hw.material;
  const pages = m?.kind === 'image' ? 1 : m?.page_count ?? 1;
  const [page, setPage] = useState(1);
  const [done, setDone] = useState(hw.status === 'done');
  const [busy, setBusy] = useState(false);
  if (!m) return <p className="text-sm text-app-text-muted">Fayl oʻchirilgan — ustozingizga yozing.</p>;
  return (
    <div>
      <div className="h-[62vh] min-h-[320px] overflow-hidden rounded-[20px] border border-app-border bg-app-bg-muted">
        <MaterialViewer token={token} source={{ homeworkId: hw.id }} kind={m.kind === 'image' ? 'image' : 'pdf'} title={m.title} page={page} pageCount={pages} />
      </div>
      {pages > 1 ? <div className="mt-3"><PageNav page={page} pages={pages} setPage={setPage} label={`${page} / ${pages}`} /></div> : null}
      <DoneButton done={done} busy={busy} label="Bajardim" onDone={async () => {
        setBusy(true);
        try { await finishHomework(token, hw.id); setDone(true); } finally { setBusy(false); }
      }} />
    </div>
  );
}

function DoneButton({ done, busy, label, onDone }: { done: boolean; busy: boolean; label: string; onDone: () => void }) {
  if (done) {
    return (
      <p className="mt-4 flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#DCFCE7] text-[16px] font-black text-[#166534]">
        <CheckCircle2 className="h-5 w-5" /> Bajarildi
      </p>
    );
  }
  return (
    <button type="button" onClick={onDone} disabled={busy}
      className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#16A34A] text-[16px] font-black text-white shadow-[0_14px_34px_rgba(22,163,74,0.28)] active:scale-[0.98] disabled:opacity-60">
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} {label}
    </button>
  );
}
