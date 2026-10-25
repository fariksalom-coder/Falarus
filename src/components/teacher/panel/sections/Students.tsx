import { useCallback, useEffect, useState } from 'react';
import {
  addStudentNote,
  getPanelStudents,
  getStudentDetail,
  removeStudentNote,
  type PanelStudent,
  type StudentDetail as StudentDetailData,
  type StudentFilter,
} from '../../../../api/teacherPanel';
import { usePanel } from '../panelContext';
import { tpl } from '../lang';
import {
  Avatar,
  Card,
  Empty,
  ErrorNote,
  GhostButton,
  PageHead,
  Pills,
  PrimaryButton,
  Skeleton,
  Tag,
  fmtDate,
  fmtDateTime,
  fmtTime,
  textareaClass,
  toneFor,
} from '../ui';
import { Search } from 'lucide-react';

const STATUS_TONE = { active: 'green', trial: 'amber', finished: 'grey' } as const;

function statusLabel(status: string, t: ReturnType<typeof usePanel>['t']): string {
  return status === 'active' ? t.statusActive : status === 'finished' ? t.statusFinished : t.statusTrial;
}

/* --------------------------------- Ro'yxat --------------------------------- */

export default function Students() {
  const { token, t, lang, go } = usePanel();
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [students, setStudents] = useState<PanelStudent[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPanelStudents(token, filter)
      .then((r) => {
        if (!alive) return;
        setStudents(r.students);
        setCounts(r.counts);
        setErr('');
      })
      .catch((e: Error) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token, filter]);

  const shown = students.filter((s) =>
    query.trim() ? s.name.toLowerCase().includes(query.trim().toLowerCase()) : true
  );

  return (
    <div>
      <PageHead
        title={t.studentsTitle}
        subtitle={tpl(t.studentsSummary, {
          total: counts.all ?? 0,
          active: counts.active ?? 0,
          new: counts.new ?? 0,
        })}
        actions={
          <label className="flex h-11 w-full items-center gap-2.5 rounded-[12px] border border-app-border-strong bg-app-surface px-3.5 text-app-text-muted sm:w-[280px]">
            <Search className="h-[18px] w-[18px] shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchStudent}
              aria-label={t.searchStudent}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-app-text outline-none"
            />
          </label>
        }
      />

      {err ? <ErrorNote text={err} /> : null}

      <Pills<StudentFilter>
        active={filter}
        onChange={setFilter}
        items={[
          { key: 'all', label: t.filterAll, count: counts.all },
          { key: 'new', label: t.filterNew, count: counts.new },
          { key: 'active', label: t.filterActive, count: counts.active },
          { key: 'trial', label: t.filterTrial, count: counts.trial },
          { key: 'finished', label: t.filterFinished, count: counts.finished },
        ]}
      />

      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <Empty text={query ? t.nothingFound : t.studentsEmpty} />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]">
          {shown.map((s) => (
            <button
              key={s.user_id}
              type="button"
              onClick={() => go('student', s.user_id)}
              className="flex flex-col gap-3 rounded-[20px] border border-app-border bg-app-surface p-4 text-left transition hover:border-app-border-strong hover:shadow-[0_14px_34px_rgba(148,163,184,0.12)] active:scale-[0.99]"
            >
              <span className="flex w-full items-center gap-3">
                <Avatar name={s.name} size={44} tone={toneFor(s.name)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold text-app-text">{s.name}</span>
                  <span className="block text-[12px] text-app-text-muted">
                    {s.level ? `${tpl(t.levelLabel, { level: s.level })} · ` : ''}
                    {s.lessons_done > 0 ? tpl(t.lessonsCount, { n: s.lessons_done }) : t.noLessonsYet}
                  </span>
                </span>
                <Tag tone={s.is_new ? 'teal' : STATUS_TONE[s.status]}>{s.is_new ? t.statusNew : statusLabel(s.status, t)}</Tag>
              </span>
              <span className="flex w-full justify-between gap-2 border-t border-app-bg-subtle pt-2.5 text-[13px]">
                <span className="text-app-text-muted">{t.nextLessonShort}</span>
                <b className="text-app-text">{s.next_lesson_at ? fmtDateTime(s.next_lesson_at, lang) : t.dash}</b>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Kartochka ------------------------------- */

export function StudentDetail({ studentId }: { studentId: number }) {
  const { token, t, lang, go } = usePanel();
  const [data, setData] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getStudentDetail(token, studentId));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [token, studentId, t.errorGeneric]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton rows={4} />;
  if (!data) return <Empty text={err || t.nothingFound} />;

  const s = data.student;

  const saveNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await addStudentNote(token, studentId, note.trim());
      setNote('');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => go('students')}
        className="min-h-[44px] text-[14px] font-bold text-app-primary"
      >
        {t.allStudents}
      </button>

      {err ? <ErrorNote text={err} /> : null}

      <Card as="section" className="flex flex-wrap items-center gap-4 p-5">
        <Avatar name={s.name} size={64} tone={toneFor(s.name)} />
        <div className="min-w-0 flex-[1_1_200px]">
          <h1 className="text-[22px] font-extrabold text-app-text lg:text-[24px]">{s.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-app-text-muted">
            <Tag tone={STATUS_TONE[s.status]}>{statusLabel(s.status, t)}</Tag>
            {s.level ? `${tpl(t.levelLabel, { level: s.level })} · ` : ''}
            {s.first_seen_at ? tpl(t.learningSince, { date: fmtDate(s.first_seen_at, lang) }) : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <GhostButton onClick={() => go('messages')}>{t.write}</GhostButton>
          <PrimaryButton onClick={() => go('class')}>{t.startLesson}</PrimaryButton>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MiniStat label={t.statTotal} value={data.stats.total} />
        <MiniStat label={t.statDone} value={data.stats.done} tone="text-[#166534]" />
        <MiniStat label={t.statUpcoming} value={data.stats.upcoming} tone="text-app-primary" />
        <MiniStat label={t.statCancelled} value={data.stats.cancelled} tone="text-[#B91C1C]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <Card className="p-5">
          {s.next_lesson_at ? (
            <div className="mb-3.5 flex items-center gap-3 rounded-[14px] bg-app-icon-bg px-3.5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-app-primary-deep">{t.nextLesson}</span>
                <b className="text-[14px] text-app-text">{fmtDateTime(s.next_lesson_at, lang)}</b>
              </span>
              <PrimaryButton onClick={() => go('lessons')} className="shrink-0">{t.goToLesson}</PrimaryButton>
            </div>
          ) : null}
          <h2 className="mb-1.5 text-[17px] font-extrabold text-app-text">{t.lessonHistory}</h2>
          {data.lessons.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-app-text-muted">{t.noHistory}</p>
          ) : (
            <ul>
              {data.lessons.map((l) => {
                const done = ['completed', 'completed_by_teacher'].includes(l.status);
                const cancelled = ['cancelled', 'refunded'].includes(l.status);
                return (
                  <li key={l.trial_id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-app-bg-subtle py-2.5">
                    <span className="w-[86px] shrink-0 text-[14px] font-bold text-app-text">
                      {fmtDate(l.starts_at ?? l.created_at, lang)}
                    </span>
                    <span className="w-[52px] shrink-0 text-[13px] text-app-text-muted">
                      {l.starts_at ? fmtTime(l.starts_at) : t.dash}
                    </span>
                    <span className="min-w-[120px] flex-1 truncate text-[14px] text-app-text-secondary">
                      {l.topic || t.noTopic}
                    </span>
                    <Tag tone={done ? 'green' : cancelled ? 'red' : 'violet'}>
                      {done ? t.doneTag : cancelled ? t.cancelledTag : t.trialTag}
                    </Tag>
                    <button
                      type="button"
                      onClick={() => go('report', l.trial_id)}
                      className="min-h-[36px] shrink-0 rounded-[10px] border border-app-border bg-app-surface px-3 text-[12px] font-bold text-app-text transition hover:border-app-border-strong"
                    >
                      {t.reportOpen}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[17px] font-extrabold text-app-text">{t.teacherNotes}</h2>
            <p className="mb-2.5 text-[12px] text-app-text-muted">{t.notesPrivate}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              rows={3}
              className={textareaClass}
            />
            <PrimaryButton onClick={saveNote} disabled={busy || !note.trim()} className="mt-2.5 w-full">
              {busy ? t.saving : t.addNote}
            </PrimaryButton>

            {data.notes.length === 0 ? (
              <p className="mt-3 text-center text-[12.5px] text-app-text-muted">{t.notesEmpty}</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {data.notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-[12px] border border-app-bg-subtle bg-[#F8FAFC] p-3"
                  >
                    <p className="text-[12.5px] leading-[1.65] text-app-text">{n.body}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-app-text-muted">{fmtDate(n.created_at, lang)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          void removeStudentNote(token, n.id)
                            .then(load)
                            .catch((e: Error) => setErr(e.message))
                        }
                        className="text-[11.5px] font-semibold text-[#C23A3F]"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = 'text-app-text' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-[16px] border border-app-border bg-app-surface p-3.5">
      <p className="text-[12px] font-semibold text-app-text-muted">{label}</p>
      <p className={`mt-1 text-[24px] font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}
