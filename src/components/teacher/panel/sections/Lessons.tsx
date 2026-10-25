import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import {
  getPanelLessons,
  type LessonFilter,
  type PanelLesson,
} from '../../../../api/teacherPanel';
import { usePanel } from '../panelContext';
import { tpl } from '../lang';
import {
  Avatar,
  Card,
  Empty,
  ErrorNote,
  PageHead,
  Pills,
  Skeleton,
  Tag,
  fmtDate,
  fmtTime,
  toneFor,
} from '../ui';
import { useOpenLesson } from './Dashboard';
import LessonMaterialsModal from './LessonMaterialsModal';
import type { LessonKind } from '../../../../api/teacherMaterials';

/** Dars holati yorlig'i: tugagan, bekor, hozir ketmoqda yoki rejalashtirilgan. */
function lessonStatus(l: PanelLesson, t: ReturnType<typeof usePanel>['t']) {
  if (['completed', 'completed_by_teacher', 'ended'].includes(l.status)) return { label: t.doneTag, tone: 'green' as const, done: true };
  if (['cancelled', 'refunded'].includes(l.status)) return { label: t.cancelledTag, tone: 'red' as const, done: false };
  if (l.status === 'live') return { label: t.liveTag, tone: 'teal' as const, done: false };
  return { label: t.plannedTag, tone: 'blue' as const, done: false };
}

/** Material biriktirish mumkin bo'lgan dars: pullik (`lesson-5`) yoki sinov (`trial-12`). */
function roomOf(l: PanelLesson): { kind: LessonKind; id: number } | null {
  const [prefix, raw] = l.id.split('-');
  const id = Number(raw);
  if (!id) return null;
  return prefix === 'lesson' ? { kind: 'lesson', id } : prefix === 'trial' ? { kind: 'trial', id } : null;
}

/** `trial-12` → 12. Sessiyada hisobot bo'lmaydi. */
function trialIdOf(l: PanelLesson): number | null {
  return l.kind === 'trial' ? Number(l.id.replace('trial-', '')) || null : null;
}

export default function Lessons() {
  const { token, t, lang, go, summary } = usePanel();
  const openLesson = useOpenLesson();
  const [filter, setFilter] = useState<LessonFilter>('upcoming');
  const [lessons, setLessons] = useState<PanelLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [materialsFor, setMaterialsFor] = useState<{ kind: LessonKind; id: number; student: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPanelLessons(token, filter)
      .then((r) => {
        if (!alive) return;
        setLessons(r.lessons);
        setErr('');
      })
      .catch((e: Error) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token, filter]);

  const past = filter === 'completed' || filter === 'cancelled';

  return (
    <div>
      <PageHead
        title={t.lessonsTitle}
        subtitle={tpl(t.lessonsSummary, {
          done: summary?.lessons_done_total ?? 0,
          planned: summary?.lessons_planned ?? 0,
        })}
      />

      {err ? <ErrorNote text={err} /> : null}

      <Pills<LessonFilter>
        active={filter}
        onChange={setFilter}
        items={[
          { key: 'upcoming', label: t.filterUpcoming },
          { key: 'today', label: t.filterToday },
          { key: 'completed', label: t.filterCompleted },
          { key: 'trial', label: t.filterTrial },
          { key: 'cancelled', label: t.filterCancelled },
        ]}
      />

      {loading ? (
        <Skeleton rows={4} />
      ) : lessons.length === 0 ? (
        <Empty text={t.lessonsEmpty} />
      ) : (
        <Card as="section" className="px-4 pb-2.5 pt-1.5 lg:px-[18px]">
          <div className="hidden gap-2.5 py-3 text-[12px] font-bold text-app-text-muted lg:grid lg:grid-cols-[90px_64px_minmax(0,1.4fr)_100px_90px_130px_204px]">
            <span>{t.colDate}</span>
            <span>{t.colTime}</span>
            <span>{t.colStudent}</span>
            <span>{t.colType}</span>
            <span>{t.colDuration}</span>
            <span>{t.colStatus}</span>
            <span />
          </div>

          <ul>
            {lessons.map((l) => {
              const trialId = trialIdOf(l);
              const st = lessonStatus(l, t);
              // Hisobot dars o'tgach to'ldiriladi; kelayotgan sinov darsida — xonaga kirish.
              const showReport = (past || st.done) && trialId != null;
              const live = st.tone === 'teal';
              const room = !st.done && !['cancelled', 'refunded'].includes(l.status) ? roomOf(l) : null;
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-app-bg-subtle py-2.5 first:border-t-0 lg:grid lg:grid-cols-[90px_64px_minmax(0,1.4fr)_100px_90px_130px_204px] lg:gap-2.5 lg:first:border-t"
                >
                  <span className="hidden text-[14px] font-bold text-app-text lg:block">{l.starts_at ? fmtDate(l.starts_at, lang) : t.timeNotSet}</span>
                  <span className="hidden text-[14px] font-bold text-app-text lg:block">{l.starts_at ? fmtTime(l.starts_at) : t.dash}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-2.5 lg:flex-none">
                    <Avatar name={l.student_name} size={32} tone={toneFor(l.student_name)} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-app-text">{l.student_name}</span>
                      <span className="block text-[12px] text-app-text-muted lg:hidden">
                        {l.starts_at ? `${fmtDate(l.starts_at, lang)} · ${fmtTime(l.starts_at)}` : t.timeNotSet} · {l.duration_minutes} {t.minutesShort}
                      </span>
                    </span>
                  </span>
                  <span className="hidden lg:block">
                    <Tag tone={l.is_trial ? 'amber' : 'grey'}>{l.is_trial ? t.trialTag : t.onlineTag}</Tag>
                  </span>
                  <span className="hidden text-[14px] text-app-text-muted lg:block">{l.duration_minutes} {t.minutesShort}</span>
                  <span className="lg:block">
                    <Tag tone={st.tone}>{st.label}</Tag>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 lg:justify-self-start">
                  {room ? (
                    <button
                      type="button"
                      onClick={() => setMaterialsFor({ ...room, student: l.student_name })}
                      aria-label={t.navMaterials}
                      title={t.navMaterials}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-app-border bg-app-surface text-app-text-secondary transition hover:border-app-border-strong hover:text-app-text active:scale-[0.97]"
                    >
                      <FolderOpen className="h-[18px] w-[18px]" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => (showReport ? go('report', trialId!) : openLesson(l))}
                    className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-[10px] px-3.5 text-[13px] font-bold transition active:scale-[0.97] lg:justify-self-start ${
                      live ? 'bg-app-primary text-white hover:bg-app-primary-deep' : 'border border-app-border bg-app-surface text-app-text hover:border-app-border-strong'
                    }`}
                  >
                    {showReport ? t.reportOpen : t.goToLesson}
                  </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {materialsFor ? (
        <LessonMaterialsModal
          kind={materialsFor.kind}
          lessonId={materialsFor.id}
          studentName={materialsFor.student}
          onClose={() => setMaterialsFor(null)}
        />
      ) : null}
    </div>
  );
}
