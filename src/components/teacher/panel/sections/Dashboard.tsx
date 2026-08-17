import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, GraduationCap, UserRound, Video } from 'lucide-react';
import type { PanelLesson } from '../../../../api/teacherPanel';
import { usePanel } from '../panelContext';
import { tpl } from '../lang';
import {
  Avatar,
  Card,
  GhostButton,
  PageHead,
  PrimaryButton,
  Skeleton,
  StatCard,
  Tag,
  fmtDate,
  fmtSum,
  fmtTime,
  daysUntil,
  minutesUntil,
  tashkentParts,
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
    go('class');
  };
}

export default function Dashboard() {
  const { t, lang, summary, cabinet, go, refresh } = usePanel();
  const openLesson = useOpenLesson();
  const [addOpen, setAddOpen] = useState(false);
  // Keyingi darsgacha qolgan vaqt jonli ko'rinsin.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!summary) return <Skeleton rows={4} />;
  const s = summary;

  const hour = tashkentParts(new Date()).hour;
  const greeting = hour < 12 ? t.greetingMorning : hour < 18 ? t.greetingDay : t.greetingEvening;
  const name = cabinet?.profile?.first_name || '';

  const daysLeft = daysUntil(cabinet?.profile?.listing_paid_until ?? null);

  const next = s.next_lesson;
  const until = minutesUntil(next?.starts_at ?? null, now);

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHead
        title={name ? `${greeting}, ${name}` : greeting}
        subtitle={tpl(t.todaySummary, { lessons: s.today.lessons, trials: s.today.trials })}
        actions={
          <>
            <PrimaryButton onClick={() => setAddOpen(true)}>{t.addFreeTime}</PrimaryButton>
            <GhostButton onClick={() => go('schedule')}>{t.openSchedule}</GhostButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label={t.statLessonsToday}
          value={String(s.today.lessons)}
          hint={s.today.trials > 0 ? tpl(t.statTrialsToday, { n: s.today.trials }) : undefined}
          hintTone="green"
        />
        <StatCard
          label={t.statStudents}
          value={String(s.students.total)}
          hint={tpl(t.statActive, { n: s.students.active })}
        />
        <StatCard
          label={t.statNewWeek}
          value={String(s.students.new_this_week)}
          hint={
            s.students.waiting_trial > 0
              ? tpl(t.statWaitingTrial, { n: s.students.waiting_trial })
              : undefined
          }
          hintTone="violet"
        />
        <StatCard label={t.statLessonsDone} value={String(s.lessons_done_total)} hint={t.statAllTime} />
        <StatCard
          label={t.statIncome}
          value={`${fmtSum(s.income.month_uzs)} ${t.sum}`}
          hint={
            s.income.change_percent != null
              ? tpl(t.vsPrevMonth, {
                  n: `${s.income.change_percent > 0 ? '+' : ''}${s.income.change_percent}`,
                })
              : t.incomeTrialNote
          }
          hintTone={s.income.change_percent != null && s.income.change_percent >= 0 ? 'green' : 'muted'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4">
          {next ? (
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#12265F,#1D1B63)] p-5 text-white lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">
                  {t.nextLesson}
                </p>
                <span
                  className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
                    next.is_trial ? 'bg-[rgba(230,179,62,0.18)] text-[#F2C75C]' : 'bg-white/10 text-white/80'
                  }`}
                >
                  {next.is_trial ? t.trialTag : t.regularTag}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Avatar name={next.student_name} size={56} tone="light" />
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-semibold lg:text-[22px]">
                    {fmtTime(next.starts_at)} · {next.student_name}
                  </p>
                  <p className="mt-1 text-[12.5px] text-white/60 lg:text-[13.5px]">
                    {fmtDate(next.starts_at, lang)} · {next.duration_minutes} {t.minutesShort}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 rounded-full bg-white/10 px-4 py-2.5">
                  <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#6CE0A0]" />
                  <span className="text-[12.5px] font-medium">
                    {until != null && until > 0 ? tpl(t.startsIn, { n: until }) : t.lessonNow}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2.5">
                  {next.student_user_id ? (
                    <button
                      type="button"
                      onClick={() => go('student', next.student_user_id!)}
                      className="min-h-[44px] rounded-[12px] bg-white/12 px-4 text-[13px] font-medium text-white transition hover:bg-white/20"
                    >
                      {t.openStudent}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openLesson(next)}
                    className="min-h-[44px] rounded-[12px] bg-white px-5 text-[13px] font-semibold text-[#12265F] transition active:scale-[0.98]"
                  >
                    {t.goToLesson}
                  </button>
                </span>
              </div>
            </div>
          ) : (
            <Card className="px-5 py-8 text-center">
              <p className="text-[15px] font-semibold text-[#171A3D]">{t.noNextLesson}</p>
              <p className="mx-auto mt-1.5 max-w-[420px] text-[12.5px] text-[#6E7191]">
                {t.noNextLessonHint}
              </p>
              <PrimaryButton onClick={() => setAddOpen(true)} className="mt-4">
                {t.addFreeTime}
              </PrimaryButton>
            </Card>
          )}

          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[16px] font-semibold text-[#171A3D]">{t.todaySchedule}</p>
              <button
                type="button"
                onClick={() => go('lessons')}
                className="text-[12.5px] font-semibold text-[#4B3BE4]"
              >
                {t.wholeDay}
              </button>
            </div>
            {s.today.schedule.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#8A8CAE]">{t.noLessonsToday}</p>
            ) : (
              <ul>
                {s.today.schedule.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 border-t border-[#F1F0FA] py-3 first:border-t-0"
                  >
                    <span className="w-[52px] shrink-0 text-[14px] font-semibold text-[#171A3D]">
                      {fmtTime(l.starts_at)}
                    </span>
                    <Avatar name={l.student_name} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-[#171A3D]">
                        {l.student_name}
                      </span>
                      <span className="block text-[11.5px] text-[#8A8CAE]">
                        {l.duration_minutes} {t.minutesShort}
                      </span>
                    </span>
                    <Tag tone={l.is_trial ? 'amber' : 'violet'}>
                      {l.is_trial ? t.trialTag : t.regularTag}
                    </Tag>
                    <button
                      type="button"
                      onClick={() => openLesson(l)}
                      className="hidden min-h-[38px] rounded-[10px] bg-[#F5F5FB] px-3.5 text-[12px] font-semibold text-[#3E4166] transition hover:bg-[#EAE9F8] sm:block"
                    >
                      {t.open}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[16px] font-semibold text-[#171A3D]">{t.newStudents}</p>
              <button
                type="button"
                onClick={() => go('students')}
                className="text-[12.5px] font-semibold text-[#4B3BE4]"
              >
                {t.allArrow}
              </button>
            </div>
            {s.new_students.length === 0 ? (
              <p className="py-5 text-center text-[13px] text-[#8A8CAE]">{t.noNewStudents}</p>
            ) : (
              <ul className="space-y-2.5">
                {s.new_students.map((st) => (
                  <li key={st.user_id}>
                    <button
                      type="button"
                      onClick={() => go('student', st.user_id)}
                      className="flex w-full items-center gap-3 rounded-[14px] border border-[#F1F0FA] bg-[#FAFAFE] p-3 text-left transition hover:border-[#D8D5F6]"
                    >
                      <Avatar name={st.name} size={40} tone="green" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-[#171A3D]">
                          {st.name}
                        </span>
                        <span className="block text-[11.5px] text-[#8A8CAE]">
                          {st.scheduled_starts_at
                            ? `${t.trialTag} · ${fmtDate(st.scheduled_starts_at, lang)}, ${fmtTime(
                                st.scheduled_starts_at
                              )}`
                            : t.waitingTime}
                        </span>
                      </span>
                      {st.level ? (
                        <span className="shrink-0 text-[11.5px] font-semibold text-[#4B3BE4]">
                          {st.level}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="mb-3 text-[16px] font-semibold text-[#171A3D]">{t.quickActions}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction
                icon={<CalendarPlus className="h-[19px] w-[19px] text-[#4B3BE4]" />}
                label={t.qaFreeTime}
                accent
                onClick={() => setAddOpen(true)}
              />
              <QuickAction
                icon={<UserRound className="h-[19px] w-[19px] text-[#3E4166]" />}
                label={t.qaStudents}
                onClick={() => go('students')}
              />
              <QuickAction
                icon={<Video className="h-[19px] w-[19px] text-[#3E4166]" />}
                label={t.qaStartLesson}
                onClick={() => go('class')}
              />
              <QuickAction
                icon={<GraduationCap className="h-[19px] w-[19px] text-[#3E4166]" />}
                label={t.qaEditProfile}
                onClick={() => go('anketa')}
              />
            </div>
          </Card>

          {daysLeft != null && daysLeft <= 30 ? (
            <div className="rounded-[22px] border border-[#F5E3B8] bg-[#FFF8E9] p-5">
              <p className="text-[13.5px] font-semibold text-[#7A5B10]">
                {tpl(t.subEndsIn, { days: Math.max(0, daysLeft) })}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#8A7134]">{t.subEndsHint}</p>
              <button
                type="button"
                onClick={() => go('subscription')}
                className="mt-3 min-h-[42px] rounded-[11px] bg-[#E6B33E] px-4 text-[12.5px] font-semibold text-[#3A2A00]"
              >
                {t.subRenew}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {addOpen ? <AddTimeModal onClose={() => setAddOpen(false)} onSaved={refresh} /> : null}
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[76px] flex-col justify-between gap-2 rounded-[14px] p-3.5 text-left transition active:scale-[0.98] ${
        accent ? 'bg-[#F1EFFE] hover:bg-[#E8E4FD]' : 'bg-[#F5F5FB] hover:bg-[#EAE9F8]'
      }`}
    >
      {icon}
      <span className={`text-[12.5px] font-semibold ${accent ? 'text-[#2E2A6B]' : 'text-[#3E4166]'}`}>
        {label}
      </span>
    </button>
  );
}

/** Bo'sh vaqt oynasini boshqa bo'limlar ham ocha oladi. */
export { AddTimeModal };
