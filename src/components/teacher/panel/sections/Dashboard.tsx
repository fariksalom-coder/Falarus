import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Video } from 'lucide-react';
import type { PanelLesson } from '../../../../api/teacherPanel';
import { getTeacherBalance } from '../../../../api/teacherLessons';
import { getCommission } from '../../../../api/teacherOnboarding';
import { usePanel } from '../panelContext';
import { WEEKDAYS, tpl } from '../lang';
import {
  Avatar,
  Card,
  GhostButton,
  ProgressBar,
  Skeleton,
  StatCard,
  Tag,
  fmtDate,
  fmtSum,
  fmtTime,
  minutesUntil,
  tashkentParts,
  toneFor,
} from '../ui';
import { AddTimeModal } from './scheduleModals';

/** Sinov darsi bo'lsa o'quvchi kartochkasiga, sessiya bo'lsa video xonaga. */
export function useOpenLesson() {
  const navigate = useNavigate();
  const { go } = usePanel();
  return (l: PanelLesson) => {
    if (l.kind === 'session') {
      navigate(`/dars/s/${l.id.replace('session-', '')}`);
      return;
    }
    // Sinov darsi ham FalaRus video xonasida.
    if (l.kind === 'trial') {
      navigate(`/dars/t/${l.id.replace('trial-', '')}`);
      return;
    }
    go('class');
  };
}

/** Dars havolasi — o'quvchiga yuborish uchun. Sessiya ham, sinov ham FalaRus xonasida. */
function lessonLink(l: PanelLesson): string | null {
  if (l.kind === 'session') return `${window.location.origin}/dars/s/${l.id.replace('session-', '')}`;
  if (l.kind === 'trial') return `${window.location.origin}/dars/t/${l.id.replace('trial-', '')}`;
  return null;
}

type MonthMoney = { balance: number | null; commission: Awaited<ReturnType<typeof getCommission>> | null };

export default function Dashboard() {
  const { token, t, lang, summary, cabinet, go, toast } = usePanel();
  const openLesson = useOpenLesson();
  // Keyingi darsgacha qolgan vaqt jonli ko'rinsin.
  const [now, setNow] = useState(() => Date.now());
  const [money, setMoney] = useState<MonthMoney>({ balance: null, commission: null });
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    let alive = true;
    void Promise.allSettled([getTeacherBalance(token), getCommission(token)]).then(([b, c]) => {
      if (!alive) return;
      setMoney({
        balance: b.status === 'fulfilled' ? b.value.balance : null,
        commission: c.status === 'fulfilled' ? c.value : null,
      });
    });
    return () => {
      alive = false;
    };
  }, [token]);

  if (!summary) return <Skeleton rows={4} />;
  const s = summary;

  const nowParts = tashkentParts(new Date(now));
  const greeting = nowParts.hour < 12 ? t.greetingMorning : nowParts.hour < 18 ? t.greetingDay : t.greetingEvening;
  const name = cabinet?.profile?.first_name || '';
  const weekday = WEEKDAYS[lang][new Date(now).getDay()];

  const next = s.next_lesson;
  const until = minutesUntil(next?.starts_at ?? null, now);
  const copy = (l: PanelLesson) => {
    const link = lessonLink(l);
    if (!link) return;
    void navigator.clipboard?.writeText(link).then(() => toast(t.linkCopied)).catch(() => toast(link));
  };
  const c = money.commission;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="mb-0.5 text-[13px] font-semibold text-app-text-muted">
            {weekday}, {fmtDate(new Date(now).toISOString(), lang)} · {t.tashkentTime}
          </p>
          <h1 className="text-[24px] font-extrabold leading-tight text-app-text lg:text-[26px]">
            {name ? `${greeting}, ${name}` : greeting}
          </h1>
        </div>
        <p className="text-[14px] text-app-text-muted">{tpl(t.todayHeadline, { lessons: s.today.lessons, trials: s.today.trials })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t.statLessonsToday}
          value={String(s.today.lessons)}
          hint={s.today.trials > 0 ? tpl(t.statTrialsToday, { n: s.today.trials }) : undefined}
          hintTone="amber"
          onClick={() => go('lessons')}
        />
        <StatCard
          label={t.statStudents}
          value={String(s.students.total)}
          hint={tpl(t.statActive, { n: s.students.active })}
          onClick={() => go('students')}
        />
        <StatCard
          label={t.statNewWeek}
          value={String(s.students.new_this_week)}
          hint={s.students.waiting_trial > 0 ? tpl(t.statWaitingTrial, { n: s.students.waiting_trial }) : undefined}
          hintTone="violet"
          onClick={() => go('students')}
        />
        <StatCard label={t.statLessonsDone} value={String(s.lessons_done_total)} hint={t.statAllTime} onClick={() => go('lessons')} />
      </div>

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="flex min-w-0 flex-[1.6_1_460px] flex-col gap-[18px]">
          {next ? (
            <section className="flex flex-col gap-[18px] rounded-[24px] bg-[#134E4A] p-[22px] text-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#A7DCD3]">{t.nextLesson}</span>
                <span className="flex items-center gap-2 rounded-full bg-white/12 px-3 py-[5px] text-[13px] font-bold">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#5EEAD4]" />
                  {until != null && until > 0 ? tpl(t.startsIn, { n: until }) : t.lessonNow}
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <Avatar name={next.student_name} size={56} tone="amber" />
                <div className="min-w-0">
                  <p className="text-[20px] font-extrabold leading-[1.15] sm:text-[24px]">
                    {fmtTime(next.starts_at)} · {next.student_name}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-[#CDEAE4]">
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${next.is_trial ? 'bg-[#FDE68A] text-[#78350F]' : 'bg-white/15 text-white'}`}>
                      {next.is_trial ? t.trialTag : t.regularTag}
                    </span>
                    {next.duration_minutes} {t.minutesShort} · {fmtDate(next.starts_at, lang)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openLesson(next)}
                  className="flex min-h-[48px] flex-[1_1_auto] items-center justify-center gap-2 rounded-[14px] bg-white px-[22px] text-[15px] font-extrabold text-[#134E4A] transition active:scale-[0.98]"
                >
                  <Video className="h-5 w-5" />
                  {t.goToLesson}
                </button>
                {next.student_user_id ? (
                  <HeroGhost onClick={() => go('student', next.student_user_id!)}>{t.openStudent}</HeroGhost>
                ) : null}
                {lessonLink(next) ? <HeroGhost onClick={() => copy(next)}>{t.copyLessonLink}</HeroGhost> : null}
              </div>
            </section>
          ) : (
            <Card as="section" className="px-5 py-8 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-app-icon-bg text-app-primary">
                <CalendarPlus className="h-6 w-6" />
              </span>
              <p className="text-[16px] font-extrabold text-app-text">{t.noNextLesson}</p>
              <p className="mx-auto mt-1 max-w-[420px] text-[13.5px] text-app-text-muted">{t.noNextLessonHint}</p>
              <GhostButton onClick={() => go('schedule')} className="mt-4">{t.openSchedule}</GhostButton>
            </Card>
          )}

          <Card as="section" className="px-5 py-[18px]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-extrabold text-app-text">{t.todaySchedule}</h2>
              <button type="button" onClick={() => go('schedule')} className="min-h-[44px] text-[14px] font-bold text-app-primary">
                {t.scheduleLink}
              </button>
            </div>
            {s.today.schedule.length === 0 ? (
              <p className="border-t border-app-bg-subtle py-6 text-center text-[13.5px] text-app-text-muted">{t.noLessonsToday}</p>
            ) : (
              <ul>
                {s.today.schedule.map((l) => {
                  const isNext = next?.id === l.id;
                  const left = minutesUntil(l.starts_at, now);
                  const done = !isNext && left != null && left + l.duration_minutes < 0;
                  const trialId = l.kind === 'trial' ? Number(l.id.replace('trial-', '')) || null : null;
                  return (
                    <li
                      key={l.id}
                      className={`flex items-center gap-3 py-2.5 ${
                        isNext ? '-mx-3 my-1 rounded-[14px] bg-app-icon-bg px-3' : 'border-t border-app-bg-subtle'
                      } ${done ? 'opacity-70' : ''}`}
                    >
                      <span className="w-12 shrink-0 text-[14px] font-extrabold text-app-text">{fmtTime(l.starts_at)}</span>
                      <Avatar name={l.student_name} size={36} tone={toneFor(l.student_name)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-app-text">{l.student_name}</span>
                        <span className={`block text-[12px] font-semibold ${done ? 'text-[#166534]' : isNext ? 'text-app-primary-deep' : 'text-app-text-muted'}`}>
                          {done
                            ? `${t.passedShort} · ${l.duration_minutes} ${t.minutesShort}`
                            : isNext && left != null && left > 0
                              ? `${l.duration_minutes} ${t.minutesShort} · ${tpl(t.minutesLater, { n: left })}`
                              : `${l.duration_minutes} ${t.minutesShort}`}
                        </span>
                      </span>
                      <span className="hidden sm:inline-flex">
                        <Tag tone={l.is_trial ? 'amber' : 'grey'}>{l.is_trial ? t.trialTag : t.regularTag}</Tag>
                      </span>
                      <button
                        type="button"
                        onClick={() => (done && trialId ? go('report', trialId) : isNext ? openLesson(l) : l.student_user_id ? go('student', l.student_user_id) : openLesson(l))}
                        className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-[10px] px-3.5 text-[13px] font-bold transition active:scale-[0.97] ${
                          isNext ? 'bg-app-primary text-white hover:bg-app-primary-deep' : 'border border-app-border bg-app-surface text-app-text hover:border-app-border-strong'
                        }`}
                      >
                        {isNext ? t.enterShort : done && trialId ? t.reportOpen : t.open}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-[18px]">
          <Card as="section" className="px-5 py-[18px]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-extrabold text-app-text">{t.thisMonth}</h2>
              {s.income.change_percent != null ? (
                <Tag tone={s.income.change_percent >= 0 ? 'green' : 'red'}>
                  {tpl(t.vsPrevMonth, { n: `${s.income.change_percent > 0 ? '+' : ''}${s.income.change_percent}` })}
                </Tag>
              ) : null}
            </div>
            <p className="mt-2.5 text-[28px] font-extrabold tracking-[-0.01em] text-app-text">
              {fmtSum(s.income.month_uzs)} <span className="text-[15px] font-bold text-app-text-muted">{t.sum}</span>
            </p>
            {money.balance != null ? (
              <p className="mt-0.5 text-[13px] text-app-text-muted">
                {t.canWithdraw}: <b className="text-app-text">{fmtSum(money.balance)} {t.sum}</b>
              </p>
            ) : null}
            {c ? (
              <div className="mt-3.5 border-t border-app-bg-subtle pt-3.5">
                <div className="flex justify-between gap-2 text-[14px] font-bold text-app-text">
                  <span>{tpl(t.commissionNowShort, { n: c.percent })}</span>
                  {c.lessons_until_next != null ? (
                    <span className="text-[12px] text-app-text-muted">
                      {c.completed} / {c.completed + c.lessons_until_next}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2">
                  <ProgressBar percent={c.lessons_until_next != null ? (c.completed / (c.completed + c.lessons_until_next)) * 100 : 100} />
                </div>
                {c.lessons_until_next != null && c.next_percent != null ? (
                  <p className="mt-2 text-[13px] text-app-text-muted">
                    {tpl(t.commissionNext, { n: c.lessons_until_next })}{' '}
                    <b className="text-app-primary">{c.next_percent}%</b>
                  </p>
                ) : null}
              </div>
            ) : null}
            <button type="button" onClick={() => go('income')} className="mt-1.5 min-h-[44px] text-[14px] font-bold text-app-primary">
              {t.balanceLink}
            </button>
          </Card>

          <Card as="section" className="px-5 py-[18px]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-extrabold text-app-text">{t.newStudents}</h2>
              <button type="button" onClick={() => go('students')} className="min-h-[44px] text-[14px] font-bold text-app-primary">
                {t.allArrow}
              </button>
            </div>
            {s.new_students.length === 0 ? (
              <p className="py-5 text-center text-[13.5px] text-app-text-muted">{t.noNewStudents}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {s.new_students.map((st) => {
                  const waiting = !st.scheduled_starts_at;
                  return (
                    <li key={st.user_id}>
                      <button
                        type="button"
                        onClick={() => go('student', st.user_id)}
                        className={`flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition active:scale-[0.99] ${
                          waiting ? 'border-[#FDE68A] bg-[#FFFBEB]' : 'border-app-border bg-app-surface hover:border-app-border-strong'
                        }`}
                      >
                        <Avatar name={st.name} size={40} tone={toneFor(st.name)} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold text-app-text">{st.name}</span>
                          <span className={`block text-[12px] font-semibold ${waiting ? 'text-[#92400E]' : 'text-app-text-muted'}`}>
                            {st.scheduled_starts_at
                              ? `${t.trialTag} · ${fmtDate(st.scheduled_starts_at, lang)}, ${fmtTime(st.scheduled_starts_at)}`
                              : t.waitingTime}
                          </span>
                        </span>
                        {st.level ? <span className="shrink-0 text-[12px] font-extrabold text-app-primary">{st.level}</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function HeroGhost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[48px] rounded-[14px] border border-white/30 px-[18px] text-[14px] font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

/** Bo'sh vaqt oynasini boshqa bo'limlar ham ocha oladi. */
export { AddTimeModal };
