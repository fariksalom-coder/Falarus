import { useEffect, useState } from 'react';
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
} from '../ui';
import { useOpenLesson } from './Dashboard';

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
        <Card className="px-4 py-1 lg:px-5">
          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.9fr_1fr_auto] gap-3.5 border-b border-[#F1F0FA] py-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A8CAE] lg:grid">
            <span>{t.colStudent}</span>
            <span>{t.colDate}</span>
            <span>{t.colTime}</span>
            <span>{t.colDuration}</span>
            <span>{t.colType}</span>
            <span />
          </div>

          <ul className="divide-y divide-[#F6F5FC]">
            {lessons.map((l) => {
              const trialId = trialIdOf(l);
              const showReport = past || l.is_trial;
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center gap-3 py-3.5 lg:grid lg:grid-cols-[1.4fr_1fr_0.8fr_0.9fr_1fr_auto] lg:gap-3.5"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
                    <Avatar name={l.student_name} size={34} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-[#171A3D]">
                        {l.student_name}
                      </span>
                      <span className="block text-[11.5px] text-[#8A8CAE] lg:hidden">
                        {l.starts_at ? `${fmtDate(l.starts_at, lang)} · ${fmtTime(l.starts_at)}` : t.timeNotSet}
                      </span>
                    </span>
                  </span>

                  <span className="hidden text-[13px] text-[#3E4166] lg:block">
                    {l.starts_at ? fmtDate(l.starts_at, lang) : t.timeNotSet}
                  </span>
                  <span className="hidden text-[13px] text-[#3E4166] lg:block">
                    {l.starts_at ? fmtTime(l.starts_at) : t.dash}
                  </span>
                  <span className="hidden text-[13px] text-[#6E7191] lg:block">
                    {l.duration_minutes} {t.minutesShort}
                  </span>

                  <span>
                    <Tag tone={l.is_trial ? 'amber' : 'violet'}>
                      {l.is_trial ? t.trialTag : t.onlineTag}
                    </Tag>
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      showReport && trialId ? go('report', trialId) : openLesson(l)
                    }
                    className="min-h-[38px] shrink-0 rounded-[10px] bg-[#F5F5FB] px-3.5 text-[12px] font-semibold text-[#3E4166] transition hover:bg-[#EAE9F8]"
                  >
                    {showReport && trialId ? t.reportOpen : t.goToLesson}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
