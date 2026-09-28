import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Target } from 'lucide-react';
import { salesCrmApi, type FunnelReport, type OperatorRow } from '../api';
import { useSalesCrmAuth } from '../auth';
import { SALES_FUNNEL_STAGES, type SalesFunnelStage } from '../../../shared/salesCrm';

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

function currentMonth(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_UZ[m - 1]} ${y}`;
}

type Pace = 'done' | 'on_track' | 'behind' | 'none';
type StageFilter = 'all' | 'risk' | 'no_plan';

/** Compares fact with the share of the plan expected by today. */
function paceOf(fact: number, plan: number | null, today: number | null, days: number): Pace {
  if (!plan) return 'none';
  if (fact >= plan) return 'done';
  const expected = today == null ? plan : (plan * today) / days;
  return fact >= expected * 0.9 ? 'on_track' : 'behind';
}

const PACE_STYLE: Record<Pace, { bar: string; text: string; chip: string }> = {
  done: { bar: 'bg-emerald-500', text: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700' },
  on_track: { bar: 'bg-blue-500', text: 'text-blue-700', chip: 'bg-blue-50 text-blue-700' },
  behind: { bar: 'bg-red-500', text: 'text-red-600', chip: 'bg-red-50 text-red-600' },
  none: { bar: 'bg-slate-300', text: 'text-slate-400', chip: 'bg-slate-100 text-slate-500' },
};

function pct(fact: number, plan: number | null): string {
  if (!plan) return '—';
  return `${Math.round((fact / plan) * 100)}%`;
}

function expectedByToday(plan: number | null, today: number | null, days: number): number | null {
  if (!plan) return null;
  return today == null ? plan : Math.ceil((plan * today) / days);
}

function gapToPace(fact: number, plan: number | null, today: number | null, days: number): number {
  const expected = expectedByToday(plan, today, days);
  return expected == null ? 0 : Math.max(0, expected - fact);
}

function paceLabel(pace: Pace): string {
  if (pace === 'done') return 'Bajarildi';
  if (pace === 'on_track') return 'Tempda';
  if (pace === 'behind') return 'Ortga qolgan';
  return 'Rejasiz';
}

function actionForStage(stage: SalesFunnelStage, gap: number, pace: Pace): string {
  if (pace === 'none') return 'Avval bu bosqichga oylik reja qo‘ying.';
  if (pace !== 'behind') return 'Temp yaxshi. Hozircha nazorat kifoya.';
  const prefix = gap ? `${gap} ta yetmayapti. ` : '';
  const actions: Record<SalesFunnelStage, string> = {
    lead: 'Lid manbalarini tekshiring va bugungi oqimni oshiring.',
    attempt: 'Yangi lidlarga birinchi qo‘ng‘iroq vaqtini qisqartiring.',
    reached: 'Ko‘tarmagan lidlar uchun qayta qo‘ng‘iroq oynasini belgilang.',
    presentation: 'Skript, demo va e’tirozlar bilan ishlashni operatorlar bilan ko‘rib chiqing.',
    payment_pending: 'To‘lovga tayyor lidlarni bugun yopish ro‘yxatiga oling.',
    paid: 'To‘lov kutilayotgan va follow-up lidlarni qayta yoping.',
    access: 'To‘lovdan keyin kirish berish jarayonini kechiktirmang.',
    first_login: 'To‘lagan o‘quvchilarni platformaga birinchi kirishga olib kiring.',
    support_group: 'Kirish olganlarni qo‘llab-quvvatlash guruhiga qo‘shishni tekshiring.',
  };
  return `${prefix}${actions[stage]}`;
}

function stageMatchesFilter(
  filter: StageFilter,
  stage: { fact: number; plan: number | null },
  report: FunnelReport,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'no_plan') return stage.plan == null;
  return paceOf(stage.fact, stage.plan, report.today, report.days) === 'behind';
}

function operatorRiskCount(report: FunnelReport, operator: FunnelReport['operators'][number]): number {
  return SALES_FUNNEL_STAGES.filter((s) =>
    paceOf(operator.stages[s.key].fact, operator.stages[s.key].plan, report.today, report.days) === 'behind'
  ).length;
}

function operatorMainGap(report: FunnelReport, operator: FunnelReport['operators'][number]): number {
  return SALES_FUNNEL_STAGES.reduce((sum, s) => {
    const cell = operator.stages[s.key];
    return sum + gapToPace(cell.fact, cell.plan, report.today, report.days);
  }, 0);
}

export default function FunnelPage() {
  const { agent } = useSalesCrmAuth();
  const isAdmin = agent?.role === 'admin';
  const [month, setMonth] = useState(currentMonth);
  const [operatorId, setOperatorId] = useState<number | null>(null);
  const [ops, setOps] = useState<OperatorRow[]>([]);
  const [report, setReport] = useState<FunnelReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<SalesFunnelStage, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      setReport(await salesCrmApi.funnel(month, isAdmin ? operatorId : null));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Xato');
    } finally {
      setLoading(false);
    }
  }, [month, operatorId, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    void salesCrmApi
      .operators()
      .then((r) => setOps(r.items.filter((o) => o.role === 'operator')))
      .catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    setEditing(false);
    setSaved('');
  }, [month, operatorId]);

  const scopeName = useMemo(() => {
    if (!isAdmin) return agent?.name ?? '';
    if (operatorId == null) return 'Butun jamoa';
    return ops.find((o) => o.id === operatorId)?.name ?? 'Operator';
  }, [isAdmin, agent?.name, operatorId, ops]);

  function startEditing() {
    if (!report) return;
    const next: Partial<Record<SalesFunnelStage, string>> = {};
    for (const s of report.stages) next[s.key] = s.plan == null ? '' : String(s.plan);
    setDraft(next);
    setSaved('');
    setEditing(true);
  }

  async function savePlans() {
    setSaving(true);
    setErr('');
    try {
      const targets: Partial<Record<SalesFunnelStage, number | null>> = {};
      for (const s of SALES_FUNNEL_STAGES) {
        const raw = (draft[s.key] ?? '').trim();
        targets[s.key] = raw === '' ? null : Number(raw);
      }
      await salesCrmApi.setFunnelPlans(month, operatorId, targets);
      setEditing(false);
      setSaved('Reja saqlandi');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Xato');
    } finally {
      setSaving(false);
    }
  }

  const paid = report?.stages.find((s) => s.key === 'paid');
  const leads = report?.stages.find((s) => s.key === 'lead');
  const conversion = leads && paid && leads.fact ? Math.round((paid.fact / leads.fact) * 100) : null;
  const behindCount =
    report?.stages.filter((s) => paceOf(s.fact, s.plan, report.today, report.days) === 'behind')
      .length ?? 0;
  const stageAlerts = useMemo(() => {
    if (!report) return [];
    return report.stages
      .map((s, index) => ({
        ...s,
        meta: SALES_FUNNEL_STAGES[index],
        pace: paceOf(s.fact, s.plan, report.today, report.days),
        gap: gapToPace(s.fact, s.plan, report.today, report.days),
      }))
      .filter((s) => s.pace === 'behind')
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3);
  }, [report]);
  const stageFilterCounts = useMemo(() => {
    if (!report) return { all: 0, risk: 0, no_plan: 0 };
    return {
      all: report.stages.length,
      risk: report.stages.filter((s) => paceOf(s.fact, s.plan, report.today, report.days) === 'behind').length,
      no_plan: report.stages.filter((s) => s.plan == null).length,
    };
  }, [report]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Reja / Fakt</h2>
          <p className="text-sm text-slate-500">Voronka bosqichlari bo‘yicha oylik reja · {scopeName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-2xl bg-white ring-1 ring-slate-200">
            <button
              type="button"
              aria-label="Oldingi oy"
              className="inline-flex h-11 w-11 items-center justify-center rounded-l-2xl text-slate-500 transition hover:bg-slate-50 active:scale-95"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[8.5rem] text-center text-sm font-bold">{monthLabel(month)}</span>
            <button
              type="button"
              aria-label="Keyingi oy"
              className="inline-flex h-11 w-11 items-center justify-center rounded-r-2xl text-slate-500 transition hover:bg-slate-50 active:scale-95 disabled:opacity-30"
              disabled={month >= currentMonth()}
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {isAdmin ? (
            <select
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold"
              value={operatorId ?? ''}
              onChange={(e) => setOperatorId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Butun jamoa</option>
              {ops.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.active ? '' : ' (nofaol)'}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="To‘ladi"
          value={paid ? `${paid.fact}${paid.plan ? ` / ${paid.plan}` : ''}` : '—'}
          hint={paid?.plan ? `Reja bajarildi: ${pct(paid.fact, paid.plan)}` : 'Reja qo‘yilmagan'}
        />
        <Kpi label="Yangi lid" value={leads ? String(leads.fact) : '—'} hint={leads?.plan ? `Reja: ${leads.plan}` : 'Reja qo‘yilmagan'} />
        <Kpi label="Lid → to‘lov" value={conversion == null ? '—' : `${conversion}%`} hint="Oy ichidagi konversiya" />
        <Kpi
          label="Ortda qolgan bosqich"
          value={report ? String(behindCount) : '—'}
          hint={report?.today ? `${report.today}-kun holatiga` : 'Oy yakuni bo‘yicha'}
          alert={behindCount > 0}
        />
      </div>

      {err ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{err}</p> : null}

      {report ? (
        <section className="rounded-[24px] bg-slate-900 p-4 text-white shadow-[0_18px_42px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-100">
                {stageAlerts.length ? <AlertTriangle size={18} className="text-amber-300" /> : <CheckCircle2 size={18} className="text-emerald-300" />}
                ROP nazorati
              </div>
              <p className="mt-2 text-xl font-black leading-tight">
                {stageAlerts.length
                  ? `${stageAlerts[0].meta.label}: tempdan ${stageAlerts[0].gap} ta kam`
                  : 'Reja bo‘yicha xavfli bosqich yo‘q'}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {report.today ? `${report.today}-kun uchun kerakli temp bilan solishtirildi.` : 'Oy yakuni bo‘yicha reja bilan solishtirildi.'}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:w-[34rem]">
              {(stageAlerts.length ? stageAlerts : report.stages.slice(0, 3).map((s, index) => ({
                ...s,
                meta: SALES_FUNNEL_STAGES[index],
                pace: paceOf(s.fact, s.plan, report.today, report.days),
                gap: gapToPace(s.fact, s.plan, report.today, report.days),
              }))).map((s) => (
                <div key={s.key} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                  <p className="truncate text-xs font-semibold text-slate-300">{s.meta.label}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="text-lg font-black tabular-nums">{s.fact}{s.plan ? <span className="text-sm text-slate-400"> / {s.plan}</span> : null}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${s.pace === 'behind' ? 'bg-amber-300 text-slate-950' : 'bg-emerald-300 text-slate-950'}`}>
                      {s.pace === 'behind' ? `-${s.gap}` : paceLabel(s.pace)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_14px_34px_rgba(148,163,184,0.12)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-blue-600" />
            <h3 className="text-sm font-black">Bosqichlar</h3>
            {saved ? <span className="text-xs font-semibold text-emerald-600">{saved}</span> : null}
          </div>
          {isAdmin ? (
            editing ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-2xl px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                  onClick={() => setEditing(false)}
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="min-h-11 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-95 disabled:opacity-60"
                  onClick={() => void savePlans()}
                >
                  {saving ? 'Saqlanmoqda…' : 'Saqlash'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!report}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-95 disabled:opacity-40"
                onClick={startEditing}
              >
                <Pencil size={15} /> Reja qo‘yish
              </button>
            )
          ) : null}
        </div>

        {editing && operatorId == null ? (
          <p className="border-b border-slate-100 bg-blue-50/60 px-4 py-2 text-xs text-blue-800">
            Jamoa rejasi. Bo‘sh qoldirilsa, operatorlar rejalarining yig‘indisi olinadi.
          </p>
        ) : null}

        {loading && !report ? (
          <div className="space-y-2 p-4">
            {SALES_FUNNEL_STAGES.map((s) => (
              <div key={s.key} className="h-10 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : report ? (
          <>
            <StageFilterControls value={stageFilter} counts={stageFilterCounts} onChange={setStageFilter} />
            <FunnelTable report={report} editing={editing} draft={draft} setDraft={setDraft} filter={stageFilter} />
          </>
        ) : null}
      </section>

      {isAdmin && operatorId == null && report ? (
        <OperatorsTable report={report} onPick={setOperatorId} />
      ) : null}
    </div>
  );
}

function Kpi({ label, value, hint, alert }: { label: string; value: string; hint: string; alert?: boolean }) {
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)] ring-1 ring-slate-200">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function StageFilterControls({
  value,
  counts,
  onChange,
}: {
  value: StageFilter;
  counts: Record<StageFilter, number>;
  onChange: (value: StageFilter) => void;
}) {
  const items: { value: StageFilter; label: string }[] = [
    { value: 'all', label: 'Hammasi' },
    { value: 'risk', label: 'Muammo' },
    { value: 'no_plan', label: 'Rejasiz' },
  ];
  return (
    <div className="border-b border-slate-100 px-3 py-3">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={value === item.value}
            className={`min-h-10 rounded-xl px-2 text-xs font-black transition ${
              value === item.value
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            onClick={() => onChange(item.value)}
          >
            {item.label} <span className="tabular-nums">{counts[item.value]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FunnelTable({
  report,
  editing,
  draft,
  setDraft,
  filter,
}: {
  report: FunnelReport;
  editing: boolean;
  draft: Partial<Record<SalesFunnelStage, string>>;
  setDraft: (fn: (d: Partial<Record<SalesFunnelStage, string>>) => Partial<Record<SalesFunnelStage, string>>) => void;
  filter: StageFilter;
}) {
  const dayNums = Array.from({ length: report.days }, (_, i) => i + 1);
  const visibleStages = report.stages
    .map((stage, index) => ({ stage, index }))
    .filter(({ stage }) => stageMatchesFilter(filter, stage, report));
  // Whole left block (№ → Indeks) stays pinned on md+; on phones only the stage name.
  const col = {
    num: 'sticky left-0 z-10 w-10 min-w-10 bg-white',
    stage: 'sticky left-10 z-10 w-48 min-w-48 md:w-72 md:min-w-72 bg-white border-r md:border-r-0',
    plan: 'w-24 min-w-24 bg-white md:sticky md:left-[328px] md:z-10',
    fact: 'w-20 min-w-20 bg-white md:sticky md:left-[424px] md:z-10',
    index: 'w-40 min-w-40 bg-white border-r border-r-slate-200 md:sticky md:left-[504px] md:z-10 md:shadow-[6px_0_12px_-8px_rgba(15,23,42,0.18)]',
  };
  const scrollRef = useRef<HTMLDivElement>(null);

  // Bring today's column into view instead of the empty start of the month.
  useEffect(() => {
    const box = scrollRef.current;
    const cell = box?.querySelector<HTMLElement>('[data-today]');
    // Phones pin only the stage name, so jumping ahead would hide plan/fact.
    if (!box || !cell || window.innerWidth < 768) return;
    box.scrollLeft = Math.max(0, cell.offsetLeft - box.clientWidth + cell.offsetWidth * 4);
  }, [report.month, report.today]);

  return (
    <>
      {!visibleStages.length ? (
        <div className="p-6 text-center">
          <p className="text-sm font-bold text-slate-700">Bu filtrda bosqich yo‘q</p>
          <p className="mt-1 text-xs text-slate-500">Boshqa filtrni tanlang yoki rejalarni tekshiring.</p>
        </div>
      ) : null}
      <div className="space-y-3 p-3 md:hidden">
        {visibleStages.map(({ stage: st, index: i }) => {
          const meta = SALES_FUNNEL_STAGES[i];
          const pace = paceOf(st.fact, st.plan, report.today, report.days);
          const style = PACE_STYLE[pace];
          const expected = expectedByToday(st.plan, report.today, report.days);
          const gap = gapToPace(st.fact, st.plan, report.today, report.days);
          const width = st.plan ? Math.min(100, (st.fact / st.plan) * 100) : 0;
          const lastDays = st.daily
            .map((n, di) => ({ day: di + 1, n }))
            .filter((d) => report.today == null || d.day <= report.today)
            .slice(-7);
          return (
            <article key={st.key} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black leading-tight text-slate-900">{meta.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{meta.hint}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${style.chip}`}>
                  {paceLabel(pace)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Reja</p>
                  <p className="mt-1 text-base font-black tabular-nums">{st.plan ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Fakt</p>
                  <p className="mt-1 text-base font-black tabular-nums">{st.fact}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Temp</p>
                  <p className={`mt-1 text-base font-black tabular-nums ${style.text}`}>{pct(st.fact, st.plan)}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${width}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {gap ? `Bugungi tempga yetish uchun yana ${gap} ta kerak.` : expected ? `Bugungi temp: ${expected} ta.` : 'Bu bosqichga reja qo‘yilmagan.'}
                </p>
                <p className={`mt-2 rounded-xl px-3 py-2 text-xs font-semibold ${pace === 'behind' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
                  {actionForStage(st.key, gap, pace)}
                </p>
              </div>
              {editing ? (
                <label className="mt-3 block text-xs font-bold text-slate-600">
                  Rejani o‘zgartirish
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label={`${meta.label} rejasi`}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    value={draft[st.key] ?? ''}
                    placeholder="—"
                    onChange={(e) => setDraft((d) => ({ ...d, [st.key]: e.target.value }))}
                  />
                </label>
              ) : null}
              <div className="mt-3 flex gap-1 overflow-hidden">
                {lastDays.map((d) => (
                  <div
                    key={d.day}
                    className={`min-w-0 flex-1 rounded-lg px-1 py-1.5 text-center ${d.day === report.today ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500'}`}
                  >
                    <p className="text-[10px] font-bold tabular-nums">{d.day}</p>
                    <p className="text-xs font-black tabular-nums">{d.n || '·'}</p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <div ref={scrollRef} className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <th className={`${col.num} border-b border-slate-100 px-3 py-2 text-left`}>№</th>
            <th className={`${col.stage} border-b border-slate-100 px-2 py-2 text-left`}>Bosqich</th>
            <th className={`${col.plan} border-b border-slate-100 px-2 py-2 text-right`}>Reja</th>
            <th className={`${col.fact} border-b border-slate-100 px-2 py-2 text-right`}>Fakt</th>
            <th className={`${col.index} border-b border-slate-100 px-3 py-2 text-left`}>Indeks</th>
            {dayNums.map((d) => (
              <th
                key={d}
                data-today={d === report.today ? '' : undefined}
                className={`min-w-[2.25rem] border-b border-slate-100 px-1 py-2 text-center tabular-nums ${
                  d === report.today ? 'bg-blue-600 text-white' : ''
                }`}
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleStages.map(({ stage: st, index: i }) => {
            const meta = SALES_FUNNEL_STAGES[i];
            const pace = paceOf(st.fact, st.plan, report.today, report.days);
            const style = PACE_STYLE[pace];
            const prev = i > 0 ? report.stages[i - 1] : null;
            // Above 100% the step is fed by other paths (e.g. self-serve payment), not a conversion.
            const stepConv =
              prev && prev.fact && st.fact <= prev.fact ? Math.round((st.fact / prev.fact) * 100) : null;
            const width = st.plan ? Math.min(100, (st.fact / st.plan) * 100) : 0;
            return (
              <tr key={st.key} className="group">
                <td className={`${col.num} border-b border-slate-100 px-3 py-2.5 text-xs font-bold text-slate-400 group-hover:bg-slate-50`}>
                  {i + 1}
                </td>
                <td className={`${col.stage} border-b border-slate-100 px-2 py-2.5 group-hover:bg-slate-50`}>
                  <p className="font-semibold leading-tight">{meta.label}</p>
                  <p className="text-[11px] text-slate-400">
                    {meta.hint}
                    {stepConv != null ? ` · ${stepConv}% oldingidan` : ''}
                  </p>
                </td>
                <td className={`${col.plan} border-b border-slate-100 px-2 py-2.5 text-right tabular-nums group-hover:bg-slate-50`}>
                  {editing ? (
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`${meta.label} rejasi`}
                      className="h-10 w-20 rounded-xl border border-slate-200 px-2 text-right text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      value={draft[st.key] ?? ''}
                      placeholder="—"
                      onChange={(e) => setDraft((d) => ({ ...d, [st.key]: e.target.value }))}
                    />
                  ) : (
                    <span className="text-slate-600">{st.plan ?? '—'}</span>
                  )}
                </td>
                <td className={`${col.fact} border-b border-slate-100 px-2 py-2.5 text-right text-base font-black tabular-nums group-hover:bg-slate-50`}>
                  {st.fact}
                </td>
                <td className={`${col.index} border-b border-slate-100 px-3 py-2.5 group-hover:bg-slate-50`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-10 text-right text-xs font-bold tabular-nums ${style.text}`}>{pct(st.fact, st.plan)}</span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full transition-[width] duration-500 ${style.bar}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                    <p className="max-w-[9rem] text-[10px] leading-tight text-slate-400">{actionForStage(st.key, gapToPace(st.fact, st.plan, report.today, report.days), pace)}</p>
                  </div>
                </td>
                {st.daily.map((n, di) => {
                  const day = di + 1;
                  const future = report.today != null && day > report.today;
                  return (
                    <td
                      key={day}
                      className={`border-b border-slate-100 px-1 py-2.5 text-center tabular-nums ${
                        day === report.today ? 'bg-blue-50 font-bold text-blue-700' : ''
                      } ${future ? 'text-slate-200' : n ? 'font-semibold text-slate-800' : 'text-slate-300'}`}
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
    </>
  );
}

function OperatorsTable({ report, onPick }: { report: FunnelReport; onPick: (id: number) => void }) {
  const sortedOperators = [...report.operators].sort((a, b) => {
    const riskDiff = operatorRiskCount(report, b) - operatorRiskCount(report, a);
    if (riskDiff) return riskDiff;
    const gapDiff = operatorMainGap(report, b) - operatorMainGap(report, a);
    if (gapDiff) return gapDiff;
    return a.name.localeCompare(b.name);
  });
  const topRisk = sortedOperators.find((o) => operatorRiskCount(report, o) > 0) ?? null;

  if (!sortedOperators.length) {
    return (
      <p className="rounded-[24px] bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
        Operatorlar yo‘q
      </p>
    );
  }
  return (
    <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_14px_34px_rgba(148,163,184,0.12)] ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-black">Operatorlar bo‘yicha</h3>
            <p className="text-xs text-slate-500">Avval eng ko‘p ortda qolgan operatorlar ko‘rsatiladi.</p>
          </div>
          {topRisk ? (
            <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              Nazorat: {topRisk.name} · {operatorRiskCount(report, topRisk)} bosqich
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              Operatorlar tempda
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2 p-3 md:hidden">
        {sortedOperators.map((o) => {
          const paid = o.stages.paid;
          const lead = o.stages.lead;
          const behind = operatorRiskCount(report, o);
          const gap = operatorMainGap(report, o);
          return (
            <button
              key={o.id}
              type="button"
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition active:scale-[0.99]"
              onClick={() => onPick(o.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900">
                    {o.name}
                    {o.active ? null : <span className="ml-1 text-xs font-normal text-slate-400">(nofaol)</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {behind ? `${behind} bosqich ortda · ${gap} ta yetmayapti` : 'Temp yaxshi'}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${behind ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                  {behind ? 'Nazorat' : 'OK'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Lid</p>
                  <p className="mt-1 text-base font-black tabular-nums">{lead.fact}{lead.plan != null ? <span className="text-xs text-slate-400"> / {lead.plan}</span> : null}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">To‘ladi</p>
                  <p className="mt-1 text-base font-black tabular-nums">{paid.fact}{paid.plan != null ? <span className="text-xs text-slate-400"> / {paid.plan}</span> : null}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="sticky left-0 z-10 min-w-[9rem] border-b border-slate-100 bg-white px-4 py-2 text-left">Operator</th>
              {SALES_FUNNEL_STAGES.map((s) => (
                <th key={s.key} className="min-w-[6rem] border-b border-slate-100 px-2 py-2 text-center normal-case">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedOperators.map((o) => (
              <tr
                key={o.id}
                className="cursor-pointer transition hover:bg-slate-50"
                onClick={() => onPick(o.id)}
              >
                <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 font-semibold">
                  <p>
                    {o.name}
                    {o.active ? null : <span className="ml-1 text-xs font-normal text-slate-400">(nofaol)</span>}
                  </p>
                  {operatorRiskCount(report, o) ? (
                    <p className="mt-0.5 text-[11px] font-semibold text-red-600">
                      {operatorRiskCount(report, o)} bosqich ortda
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">Temp yaxshi</p>
                  )}
                </td>
                {SALES_FUNNEL_STAGES.map((s) => {
                  const cell = o.stages[s.key];
                  const pace = paceOf(cell.fact, cell.plan, report.today, report.days);
                  return (
                    <td key={s.key} className="border-b border-slate-100 px-2 py-3 text-center tabular-nums">
                      <span className="font-bold">{cell.fact}</span>
                      <span className="text-slate-400">{cell.plan != null ? ` / ${cell.plan}` : ''}</span>
                      {cell.plan ? (
                        <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${PACE_STYLE[pace].chip}`}>
                          {pct(cell.fact, cell.plan)}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
