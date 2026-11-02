import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  PhoneCall,
  ShieldCheck,
  TrendingDown,
  UsersRound,
} from 'lucide-react';
import { salesCrmApi, type FunnelReport, type OperatorStatRow } from '../api';
import { useSalesCrmAuth } from '../auth';
import { SALES_FUNNEL_STAGES } from '../../../shared/salesCrm';

type Totals = {
  leads?: number;
  new?: number;
  to_call?: number;
  answered?: number;
  no_answer?: number;
  follow_up?: number;
  payment_pending?: number;
  paid?: number;
  not_interested?: number;
  no_next_action?: number;
};

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function currentMonth(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function paceOf(fact: number, plan: number | null, today: number | null, days: number): 'done' | 'on_track' | 'behind' | 'none' {
  if (!plan) return 'none';
  if (fact >= plan) return 'done';
  const expected = today == null ? plan : (plan * today) / days;
  return fact >= expected * 0.9 ? 'on_track' : 'behind';
}

function gapToPace(fact: number, plan: number | null, today: number | null, days: number): number {
  if (!plan) return 0;
  const expected = today == null ? plan : Math.ceil((plan * today) / days);
  return Math.max(0, expected - fact);
}

function expectedByToday(plan: number | null, today: number | null, days: number): number | null {
  if (!plan) return null;
  return today == null ? plan : Math.ceil((plan * today) / days);
}

export default function HomePage() {
  const { agent, tasks, refresh } = useSalesCrmAuth();
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [funnel, setFunnel] = useState<FunnelReport | null>(null);
  const [operators, setOperators] = useState<OperatorStatRow[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    void salesCrmApi
      .dashboard('30d')
      .then(setDash)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Xato'));
    void salesCrmApi
      .funnel(currentMonth(), null)
      .then(setFunnel)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Xato'));
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (agent?.role !== 'admin') return;
    void salesCrmApi
      .operatorStats('30d')
      .then((r) => setOperators(r.items))
      .catch(() => undefined);
  }, [agent?.role]);

  const totals = (dash?.totals ?? {}) as Totals;
  const conversion = (dash?.conversion ?? {}) as Record<string, number>;
  const overdue = tasks?.overdue ?? 0;
  const today = tasks?.today ?? 0;
  const noNext = num(totals.no_next_action);
  const paymentPending = num(totals.payment_pending);
  const paid = num(totals.paid);
  const leads = num(totals.leads);
  const answered = num(totals.answered);
  const noAnswer = num(totals.no_answer);
  const newLeads = num(totals.new) + num(totals.to_call);
  const urgentCount = overdue || today || paymentPending || noNext;
  const paidPlan = funnel?.stages.find((s) => s.key === 'paid')?.plan ?? null;
  const paidFact = funnel?.stages.find((s) => s.key === 'paid')?.fact ?? paid;
  const paidPace = funnel ? paceOf(paidFact, paidPlan, funnel.today, funnel.days) : 'none';
  const paidExpected = funnel ? expectedByToday(paidPlan, funnel.today, funnel.days) : null;
  const paidGap = funnel ? gapToPace(paidFact, paidPlan, funnel.today, funnel.days) : 0;
  const weakStage = useMemo(() => {
    if (!funnel) return null;
    return funnel.stages
      .map((stage, index) => ({
        stage,
        meta: SALES_FUNNEL_STAGES[index],
        pace: paceOf(stage.fact, stage.plan, funnel.today, funnel.days),
        gap: gapToPace(stage.fact, stage.plan, funnel.today, funnel.days),
      }))
      .filter((item) => item.pace === 'behind')
      .sort((a, b) => b.gap - a.gap)[0] ?? null;
  }, [funnel]);
  const operatorRisks = useMemo(
    () =>
      operators
        .map((op) => ({
          ...op,
          riskScore: num(op.overdue_tasks) * 3 + num(op.no_next_action) + (op.leads > 0 && op.process_rate < 0.65 ? 8 : 0),
        }))
        .filter((op) => op.riskScore > 0)
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 3),
    [operators],
  );

  const focus = useMemo(() => {
    if (overdue > 0) {
      return {
        tone: 'red' as const,
        label: 'Eng muhim',
        title: `${overdue} ta qo‘ng‘iroq muddati o‘tgan`,
        hint: 'Avval shu ro‘yxatni yoping. Kechikkan kontakt sotuvni sovitadi.',
        to: '/tasks?bucket=overdue',
        cta: 'Muddati o‘tganlarni ochish',
      };
    }
    if (today > 0) {
      return {
        tone: 'amber' as const,
        label: 'Bugungi ish',
        title: `${today} ta qo‘ng‘iroq bugun`,
        hint: 'Kun tugamasidan hammasiga aniq natija yoki keyingi vaqt qo‘ying.',
        to: '/tasks?bucket=today',
        cta: 'Bugungi ro‘yxat',
      };
    }
    if (paymentPending > 0) {
      return {
        tone: 'green' as const,
        label: 'Pulga yaqin',
        title: `${paymentPending} ta lid to‘lov kutmoqda`,
        hint: 'Bu eng issiq segment. Bugun yopish uchun alohida nazorat qiling.',
        to: '/leads?status=PAYMENT_PENDING',
        cta: 'To‘lov kutayotganlar',
      };
    }
    if (noNext > 0) {
      return {
        tone: 'blue' as const,
        label: 'Nazorat kerak',
        title: `${noNext} ta lidda keyingi amal yo‘q`,
        hint: 'Har bir faol lidda keyingi qadam bo‘lishi kerak.',
        to: '/leads?nextContact=none',
        cta: 'Keyingi amalsiz lidlar',
      };
    }
    return {
      tone: 'slate' as const,
      label: 'Holat yaxshi',
      title: 'Bugungi ishlar nazoratda',
      hint: 'Endi yangi lidlar va to‘lovga yaqin mijozlarni ko‘ring.',
      to: '/leads',
      cta: 'Voronkani ochish',
    };
  }, [noNext, overdue, paymentPending, today]);

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Oylik reja</p>
            <h2 className="mt-1 text-2xl font-black text-[#071B3A]">
              {paidPlan ? `${paidFact} / ${paidPlan}` : 'Reja qo‘yilmagan'}
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 xl:w-[48rem]">
            <TopStat label="Bajarilish" value={paidPlan ? pct(paidFact / paidPlan) : '—'} tone={paidPace === 'behind' ? 'bad' : 'good'} />
            <TopStat label="Bugungi temp" value={paidExpected == null ? '—' : String(paidExpected)} />
            <TopStat label="Farq" value={paidGap ? `-${paidGap}` : '0'} tone={paidGap ? 'bad' : 'good'} />
            <TopStat label="Zaif bosqich" value={weakStage ? weakStage.meta.label : 'Yo‘q'} tone={weakStage ? 'bad' : 'good'} />
          </div>
          <Link
            to="/plan"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#071B3A] px-4 text-sm font-black text-white"
          >
            Reja
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {err ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{err}</p> : null}

      <PlanFactOnHome report={funnel} />

      <section className="grid gap-3 md:grid-cols-4">
        <DayStat label="Kechikkan" value={overdue} to="/tasks?bucket=overdue" tone={overdue ? 'bad' : 'neutral'} />
        <DayStat label="Bugun" value={today} to="/tasks?bucket=today" />
        <DayStat label="To‘lov kutmoqda" value={paymentPending} to="/leads?status=PAYMENT_PENDING" tone="good" />
        <DayStat label="Keyingi qadam yo‘q" value={noNext} to="/leads?nextContact=none" tone={noNext ? 'bad' : 'neutral'} />
      </section>

    </div>
  );
}

function actionForDashboard(stage: string, gap: number): string {
  const prefix = gap ? `${gap} ta yetmayapti. ` : '';
  const text: Record<string, string> = {
    lead: 'Lid manbasi va reklama oqimini tekshiring: muammo kirishda.',
    attempt: 'Yangi lidlar tez birinchi qo‘ng‘iroqqa chiqmayapti. SLA va operator navbatini oching.',
    reached: 'Qo‘ng‘iroq qilinyapti, lekin aloqa yetarli emas. Qayta qo‘ng‘iroq vaqtlarini tartibga soling.',
    presentation: 'Aloqa bor, lekin kurs tushuntirish bosqichi past. Skript va demo sifatini tekshiring.',
    payment_pending: 'Qiziqish bor, ammo to‘lovga olib kelish sust. Issiq lidlar ro‘yxatini yoping.',
    paid: 'To‘lov kutilmoqda yoki follow-up lidlar yopilmayapti. Eng issiq segmentni ajrating.',
    access: 'To‘lovdan keyingi operatsiya kechikyapti. Kirish berish jarayonini tekshiring.',
    first_login: 'O‘quvchi to‘lagan, lekin platformaga kirmagan. Onboarding va qo‘llab-quvvatlash kerak.',
    support_group: 'Kirishdan keyingi qo‘llab-quvvatlash zanjiri to‘liq yopilmayapti.',
  };
  return `${prefix}${text[stage] ?? 'Bosqichni reja/fakt kesimida tekshiring.'}`;
}

function TopStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  const color = tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : 'text-slate-950';
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-lg font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function DayStat({
  label,
  value,
  to,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  to: string;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  const color = tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : 'text-[#071B3A]';
  return (
    <Link to={to} className="rounded-[20px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${color}`}>{value}</p>
    </Link>
  );
}

function ExecutiveMetric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'amber';
}) {
  const dot = {
    blue: 'bg-blue-300',
    green: 'bg-emerald-300',
    amber: 'bg-amber-300',
  }[tone];
  return (
    <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <p className="truncate text-[11px] font-bold uppercase text-slate-300">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function InsightRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof TrendingDown;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/8 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/18 text-blue-100">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
        <p className="truncate text-sm font-black text-white">{value}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

function CauseCard({ title, value, text, to }: { title: string; value: number; text: string; to: string }) {
  return (
    <Link to={to} className="block rounded-2xl bg-slate-50 p-4 transition hover:bg-blue-50">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-2 text-3xl font-black tabular-nums text-[#071B3A]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
    </Link>
  );
}

function OperatorRiskRow({ op }: { op: OperatorStatRow }) {
  const process = Math.round(num(op.process_rate) * 100);
  const conversion = Math.round(num(op.conversion) * 100);
  return (
    <Link to="/stats" className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 transition hover:bg-slate-100">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-900">{op.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Ishlov {process}% · Konversiya {conversion}%
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-black tabular-nums text-orange-700">{op.overdue_tasks + op.no_next_action}</p>
        <p className="text-[10px] font-bold uppercase text-slate-400">risk</p>
      </div>
    </Link>
  );
}

function ActionRow({
  icon: Icon,
  label,
  value,
  to,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  to: string;
  tone: 'red' | 'amber' | 'green' | 'blue';
}) {
  const colors = {
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
  }[tone];
  return (
    <Link to={to} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 transition hover:bg-slate-100">
      <span className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${colors}`}>
          <Icon size={18} />
        </span>
        <span className="min-w-0 text-sm font-bold text-slate-700">{label}</span>
      </span>
      <span className="text-lg font-black tabular-nums text-slate-950">{value}</span>
    </Link>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
  hint: string;
  tone: 'blue' | 'sky' | 'green' | 'slate';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    sky: 'bg-sky-50 text-sky-700',
    green: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  }[tone];
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${colors}`}>
        <Icon size={18} />
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function PlanFactOnHome({ report }: { report: FunnelReport | null }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = scrollRef.current;
    const cell = box?.querySelector<HTMLElement>('[data-today]');
    if (!box || !cell) return;
    box.scrollLeft = Math.max(0, cell.offsetLeft - box.clientWidth + cell.offsetWidth * 4);
  }, [report?.month, report?.today]);

  if (!report) {
    return (
      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  const dayNums = Array.from({ length: report.days }, (_, i) => i + 1);
  const riskCount = report.stages.filter((s) => paceOf(s.fact, s.plan, report.today, report.days) === 'behind').length;

  return (
    <section className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Oylik reja / fakt</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-2xl px-3 py-2 text-xs font-black ${riskCount ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
            Muammo {riskCount}
          </span>
          <Link to="/plan" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            Rejani tahrirlash
          </Link>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-[11px] font-black uppercase tracking-wide text-slate-500">
              <th className="sticky left-0 z-20 w-10 min-w-10 border-b border-slate-100 bg-white px-3 py-3 text-left">№</th>
              <th className="sticky left-10 z-20 w-60 min-w-60 border-b border-slate-100 bg-white px-3 py-3 text-left">Bosqich</th>
              <th className="sticky left-[17.5rem] z-20 w-20 min-w-20 border-b border-slate-100 bg-white px-2 py-3 text-right">Reja</th>
              <th className="sticky left-[22.5rem] z-20 w-20 min-w-20 border-b border-slate-100 bg-white px-2 py-3 text-right">Fakt</th>
              <th className="sticky left-[27.5rem] z-20 w-40 min-w-40 border-b border-r border-slate-100 bg-white px-3 py-3 text-left shadow-[6px_0_12px_-10px_rgba(15,23,42,0.22)]">Indeks</th>
              {dayNums.map((d) => (
                <th
                  key={d}
                  data-today={d === report.today ? '' : undefined}
                  className={`min-w-10 border-b border-slate-100 px-1 py-3 text-center tabular-nums ${
                    d === report.today ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.stages.map((stage, index) => {
              const meta = SALES_FUNNEL_STAGES[index];
              const pace = paceOf(stage.fact, stage.plan, report.today, report.days);
              const percent = stage.plan ? Math.round((stage.fact / stage.plan) * 100) : null;
              const barColor = pace === 'behind' ? 'bg-red-500' : pace === 'done' ? 'bg-emerald-500' : 'bg-blue-500';
              return (
                <tr key={stage.key} className="group">
                  <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-4 text-xs font-bold text-slate-400 group-hover:bg-slate-50">
                    {index + 1}
                  </td>
                  <td className="sticky left-10 z-10 border-b border-slate-100 bg-white px-3 py-4 group-hover:bg-slate-50">
                    <p className="font-black leading-tight text-slate-900">{meta.label}</p>
                  </td>
                  <td className="sticky left-[17.5rem] z-10 border-b border-slate-100 bg-white px-2 py-4 text-right font-bold tabular-nums text-slate-600 group-hover:bg-slate-50">
                    {stage.plan ?? '—'}
                  </td>
                  <td className="sticky left-[22.5rem] z-10 border-b border-slate-100 bg-white px-2 py-4 text-right text-base font-black tabular-nums text-slate-950 group-hover:bg-slate-50">
                    {stage.fact}
                  </td>
                  <td className="sticky left-[27.5rem] z-10 border-b border-r border-slate-100 bg-white px-3 py-4 group-hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className={`w-11 text-right text-xs font-black tabular-nums ${pace === 'behind' ? 'text-red-600' : 'text-emerald-700'}`}>
                        {percent == null ? '—' : `${percent}%`}
                      </span>
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, percent ?? 0)}%` }} />
                      </div>
                    </div>
                  </td>
                  {stage.daily.map((n, dayIndex) => {
                    const day = dayIndex + 1;
                    const future = report.today != null && day > report.today;
                    return (
                      <td
                        key={day}
                        className={`border-b border-slate-100 px-1 py-4 text-center tabular-nums ${
                          day === report.today ? 'bg-blue-50 font-black text-blue-700' : ''
                        } ${future ? 'text-slate-200' : n ? 'font-bold text-slate-800' : 'text-slate-300'}`}
                      >
                        {future ? '' : n || '·'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
