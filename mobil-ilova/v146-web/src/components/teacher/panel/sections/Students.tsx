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
  ProgressBar,
  Skeleton,
  Tag,
  fmtDate,
  fmtDateTime,
  fmtTime,
  inputClass,
  textareaClass,
} from '../ui';

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
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchStudent}
            className={`${inputClass} sm:w-[280px]`}
          />
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
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => {
            const total = Math.max(s.trials_total, 1);
            return (
              <button
                key={s.user_id}
                type="button"
                onClick={() => go('student', s.user_id)}
                className="flex flex-col gap-3.5 rounded-[20px] border border-app-border bg-app-surface p-4 text-left transition hover:border-app-border-strong"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={s.name} size={46} tone={s.status === 'active' ? 'green' : 'violet'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold text-app-text">
                      {s.name}
                    </span>
                    <span className="block text-[11.5px] text-app-text-muted">
                      {s.level ? `${s.level} · ` : ''}
                      {s.lessons_done > 0 ? tpl(t.lessonsCount, { n: s.lessons_done }) : t.noLessonsYet}
                    </span>
                  </span>
                  <Tag tone={s.is_new ? 'violet' : STATUS_TONE[s.status]}>
                    {s.is_new ? t.statusNew : statusLabel(s.status, t)}
                  </Tag>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-[11.5px] text-app-text-muted">
                    <span>{t.statDone}</span>
                    <span className="font-semibold text-app-text">
                      {s.lessons_done} / {s.trials_total}
                    </span>
                  </div>
                  <ProgressBar percent={(s.lessons_done / total) * 100} />
                </div>

                <div className="flex items-center justify-between border-t border-app-border pt-3">
                  <span className="text-[11.5px] text-app-text-muted">{t.nextLessonShort}</span>
                  <span className="text-[12.5px] font-semibold text-app-text">
                    {s.next_lesson_at ? fmtDateTime(s.next_lesson_at, lang) : t.dash}
                  </span>
                </div>
              </button>
            );
          })}
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
        className="text-[13px] font-medium text-app-text-muted hover:text-app-brand"
      >
        {t.allStudents}
      </button>

      {err ? <ErrorNote text={err} /> : null}

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <Avatar name={s.name} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[20px] font-semibold tracking-[-0.01em] text-app-text">{s.name}</p>
            <Tag tone={STATUS_TONE[s.status]}>{statusLabel(s.status, t)}</Tag>
          </div>
          <p className="mt-1 text-[13px] text-app-text-muted">
            {s.level ? `${tpl(t.levelLabel, { level: s.level })} · ` : ''}
            {s.first_seen_at ? tpl(t.learningSince, { date: fmtDate(s.first_seen_at, lang) }) : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <GhostButton onClick={() => go('messages')}>{t.write}</GhostButton>
          <PrimaryButton onClick={() => go('class')}>{t.startLesson}</PrimaryButton>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label={t.statTotal} value={data.stats.total} />
        <MiniStat label={t.statDone} value={data.stats.done} tone="text-[#17A34A]" />
        <MiniStat label={t.statCancelled} value={data.stats.cancelled} tone="text-[#E9474D]" />
        <MiniStat label={t.statUpcoming} value={data.stats.upcoming} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <Card className="p-5">
          <p className="mb-3 text-[16px] font-semibold text-app-text">{t.lessonHistory}</p>
          {data.lessons.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-app-text-muted">{t.noHistory}</p>
          ) : (
            <ul className="divide-y divide-[#F6F5FC]">
              {data.lessons.map((l) => {
                const done = ['completed', 'completed_by_teacher'].includes(l.status);
                const cancelled = ['cancelled', 'refunded'].includes(l.status);
                return (
                  <li key={l.trial_id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="w-[92px] shrink-0 text-[13px] font-medium text-app-text">
                      {fmtDate(l.starts_at ?? l.created_at, lang)}
                    </span>
                    <span className="w-[52px] shrink-0 text-[13px] text-app-text-muted">
                      {l.starts_at ? fmtTime(l.starts_at) : t.dash}
                    </span>
                    <span className="min-w-[120px] flex-1 truncate text-[13px] text-app-text">
                      {l.topic || t.noTopic}
                    </span>
                    <Tag tone={done ? 'green' : cancelled ? 'red' : 'violet'}>
                      {done ? t.doneTag : cancelled ? t.cancelledTag : t.trialTag}
                    </Tag>
                    <button
                      type="button"
                      onClick={() => go('report', l.trial_id)}
                      className="min-h-[36px] shrink-0 rounded-[10px] bg-app-bg-muted px-3 text-[12px] font-semibold text-app-text transition hover:bg-[#EAE9F8]"
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
            <p className="mb-3 text-[16px] font-semibold text-app-text">{t.teacherNotes}</p>
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
                    className="rounded-[13px] border border-app-border bg-app-bg-muted px-3.5 py-3"
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

          <Card className="p-5">
            <p className="mb-3 text-[16px] font-semibold text-app-text">{t.nextLesson}</p>
            {s.next_lesson_at ? (
              <div className="rounded-[16px] bg-app-icon-bg p-4">
                <p className="text-[17px] font-semibold text-[#2E2A6B]">
                  {fmtDateTime(s.next_lesson_at, lang)}
                </p>
                <PrimaryButton onClick={() => go('class')} className="mt-3 w-full">
                  {t.goToLesson}
                </PrimaryButton>
              </div>
            ) : (
              <p className="py-3 text-center text-[12.5px] text-app-text-muted">{t.noNextLesson}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = 'text-app-text' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-[16px] border border-app-border bg-app-surface p-4">
      <p className="text-[12px] text-app-text-muted">{label}</p>
      <p className={`mt-1.5 text-[22px] font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
