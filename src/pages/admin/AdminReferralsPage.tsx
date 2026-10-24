import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Crown, RefreshCw, ShoppingBag, UserPlus, Users } from 'lucide-react';
import { adminPath } from '../../constants/adminPath';
import {
  referralAdmin,
  type AdminReferralFlag,
  type AdminReferralLeader,
  type AdminReferralLeaders,
  type AdminReferralLedgerRow,
  type AdminReferralLink,
  type AdminReferralOverview,
  type AdminReferralWithdrawal,
  type ReferralCurrency,
} from '../../api/admin';

type Tab = 'overview' | 'leaders' | 'withdrawals' | 'links' | 'ledger' | 'flags' | 'refund';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'leaders', label: 'Лучшие приглашающие' },
  { id: 'links', label: 'Приглашения' },
  { id: 'withdrawals', label: 'Заявки на вывод' },
  { id: 'ledger', label: 'Журнал' },
  { id: 'flags', label: 'Сигналы' },
  { id: 'refund', label: 'Возврат' },
];
const money = (n: number, c: ReferralCurrency | string) => `${Number(n).toLocaleString('ru-RU', { maximumFractionDigits: c === 'UZS' ? 0 : 2 })} ${c}`;
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const WD_STATUS: Record<string, string> = { pending: 'Новая', approved: 'Одобрена, не выплачена', paid: 'Выплачена', rejected: 'Отклонена' };
const ENTRY: Record<string, string> = {
  reward: 'Начисление', hold_release: 'Снято с проверки', hold_cancel: 'Отменено проверкой', reversal: 'Сторно (возврат)',
  withdrawal_reserve: 'Резерв вывода', withdrawal_release: 'Возврат резерва', withdrawal_payout: 'Выплата', spend: 'Курс за бонусы', spend_release: 'Отмена покупки за бонусы',
};
const OUTCOME: Record<string, string> = { eligible: 'Первая покупка засчитана', not_eligible: 'Без бонуса' };
const REVIEW: Record<string, string> = { none: '—', pending: 'На проверке', cleared: 'Проверено', rejected: 'Отклонено' };

const btn = 'min-h-9 rounded-lg px-3 text-sm font-semibold disabled:opacity-40';
const input = 'min-h-9 rounded-lg border border-app-border bg-app-surface px-2 text-sm text-app-text';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function Avatar({ name, tone = 'blue' }: { name: string; tone?: 'blue' | 'emerald' | 'slate' }) {
  const cls = tone === 'emerald' ? 'bg-emerald-100 text-emerald-800' : tone === 'slate' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-800';
  return <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${cls}`}>{initials(name)}</span>;
}

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-[24px] border border-app-border bg-app-surface p-4 shadow-app-card">
      <div className="flex items-center justify-between gap-2"><p className="text-sm text-app-text-muted">{label}</p><Icon className="h-5 w-5 text-blue-600" /></div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-app-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-app-text-muted">{hint}</p>}
    </div>
  );
}

function LeaderCard({ l, rank }: { l: AdminReferralLeader; rank: number }) {
  const name = l.name || `Пользователь #${l.user_id}`;
  const medal = rank === 1 ? 'bg-amber-400 text-white' : rank === 2 ? 'bg-slate-400 text-white' : rank === 3 ? 'bg-orange-400 text-white' : 'bg-app-bg-muted text-app-text-muted';
  return (
    <Link to={adminPath(`/users/${l.user_id}`)} className="group flex flex-col rounded-[24px] border border-app-border bg-app-surface p-4 shadow-app-card transition hover:-translate-y-0.5 hover:border-blue-200 active:scale-[0.99]">
      <div className="flex items-center gap-3">
        <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${medal}`}>{rank}</span>
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-app-text">{name}</p>
          <p className="truncate text-xs text-app-text-muted">{l.phone ?? `#${l.user_id}`}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-blue-50 px-2 py-2.5"><p className="text-xl font-bold tabular-nums text-blue-800">{l.invited}</p><p className="text-[11px] font-medium text-blue-800/70">пригласил</p></div>
        <div className="rounded-2xl bg-emerald-50 px-2 py-2.5"><p className="text-xl font-bold tabular-nums text-emerald-800">{l.purchased}</p><p className="text-[11px] font-medium text-emerald-800/70">купили · {pct(l.purchased, l.invited)}%</p></div>
      </div>
      <p className="mt-3 text-xs text-app-text-muted">
        {l.balances.length ? `Бонус: ${l.balances.map((b) => money(b.earned, b.currency)).join(', ')}` : 'Бонусов пока нет'}
        {l.last_at ? ` · последнее ${dt(l.last_at)}` : ''}
      </p>
    </Link>
  );
}

function useLeaders(sort: 'invited' | 'purchased' | 'recent') {
  const [data, setData] = useState<AdminReferralLeaders | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    referralAdmin.leaders(sort).then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'));
  }, [sort]);
  return { data, error };
}

function Leaders() {
  const [sort, setSort] = useState<'invited' | 'purchased' | 'recent'>('invited');
  const { data, error } = useLeaders(sort);
  const SORT_LABELS = { invited: 'Больше всего приглашений', purchased: 'Больше всего покупок', recent: 'Недавние' } as const;
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Сортировка">
        {(Object.keys(SORT_LABELS) as (keyof typeof SORT_LABELS)[]).map((k) => (
          <button key={k} type="button" aria-pressed={sort === k} className={`${btn} min-h-10 ${sort === k ? 'bg-blue-600 text-white' : 'border border-app-border bg-app-surface text-app-text hover:bg-blue-50'}`} onClick={() => setSort(k)}>{SORT_LABELS[k]}</button>
        ))}
      </div>
      {error && <p className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</p>}
      {!data && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-[24px] bg-slate-100" />)}</div>
      ) : data && data.leaders.length === 0 ? (
        <p className="rounded-[24px] border border-dashed border-app-border p-8 text-center text-sm text-app-text-muted">Пока никто никого не пригласил.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data?.leaders.map((l, i) => <LeaderCard key={l.user_id} l={l} rank={i + 1} />)}</div>
      )}
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold text-app-text">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

function useAction(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(''); setOk('');
    try { await fn(); setOk(success); onDone(); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка'); } finally { setBusy(false); }
  };
  const messages = (
    <>
      {error && <p className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</p>}
      {ok && <p className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{ok}</p>}
    </>
  );
  return { busy, run, messages };
}

function Overview({ openLeaders }: { openLeaders: () => void }) {
  const leaders = useLeaders('invited').data;
  const [data, setData] = useState<AdminReferralOverview | null>(null);
  const [confirm, setConfirm] = useState('');
  const load = useCallback(() => { referralAdmin.overview().then(setData).catch(() => setData(null)); }, []);
  useEffect(load, [load]);
  const { busy, run, messages } = useAction(load);
  if (!data) return <div className="h-48 animate-pulse rounded-[24px] bg-slate-100" aria-busy="true" />;
  const s = data.settings;
  const t = leaders?.totals;
  return (
    <div className="space-y-4">
      {messages}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={UserPlus} label="Приглашено всего" value={t?.invited ?? '…'} hint={t ? `+${t.invited_30d} за 30 дней` : undefined} />
        <Kpi icon={ShoppingBag} label="Купили курс" value={t?.purchased ?? '…'} hint={t ? `${pct(t.purchased, t.invited)}% от приглашённых` : undefined} />
        <Kpi icon={Users} label="Приглашающих" value={t?.inviters ?? '…'} />
        <Kpi icon={Crown} label="Заявки на вывод" value={data.withdrawals.filter((w) => w.status === 'pending').reduce((n, w) => n + w.count, 0)} hint="новые, ждут решения" />
      </div>
      {leaders && leaders.leaders.length > 0 && (
        <section className="rounded-[24px] border border-app-border bg-app-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-app-text">Топ приглашающих</h2>
            <button type="button" onClick={openLeaders} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-blue-700">Все <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">{leaders.leaders.slice(0, 3).map((l, i) => <LeaderCard key={l.user_id} l={l} rank={i + 1} />)}</div>
        </section>
      )}
      <Panel title="Статус программы">
        <p className="text-sm text-app-text">
          {s.enabled ? <b className="text-emerald-700">Включена</b> : <b className="text-amber-700">Выключена</b>}
          {s.launch_at && <> · дата запуска {dt(s.launch_at)}</>} · ставка {s.reward_percent}% · минимум вывода {s.min_withdrawal_rub} ₽ (эквивалент)
        </p>
        {!s.enabled ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-app-text-muted">
              Включение — отдельное решение владельца. Начисления пойдут за подтверждённые оплаты начиная с даты запуска;
              {s.launch_at ? ' дата запуска уже зафиксирована и не меняется.' : ' дата запуска будет зафиксирована сейчас и больше не изменится.'}
              {' '}Покупки до запуска не дают бонусов и учитываются при определении первой покупки.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Введите ENABLE" />
              <button className={`${btn} bg-emerald-600 text-white`} disabled={busy || confirm !== 'ENABLE'} onClick={() => run(() => referralAdmin.setEnabled(true, confirm), 'Программа включена')}>Включить программу</button>
            </div>
          </div>
        ) : (
          <button className={`${btn} mt-3 bg-red-50 text-red-700`} disabled={busy} onClick={() => run(() => referralAdmin.setEnabled(false, ''), 'Программа выключена: новые начисления остановлены')}>Выключить</button>
        )}
      </Panel>
      <Panel title="Балансы по валютам">
        {data.totals.length === 0 ? <p className="text-sm text-app-text-muted">Операций пока нет.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-app-text-muted"><th className="p-2">Валюта</th><th className="p-2">Доступно</th><th className="p-2">На проверке</th><th className="p-2">В заявках</th><th className="p-2">Долг</th><th className="p-2">Начислено</th><th className="p-2">Выплачено</th><th className="p-2">Потрачено на курсы</th></tr></thead>
              <tbody>{data.totals.map((t) => (
                <tr key={t.currency} className="border-t border-app-border tabular-nums">
                  <td className="p-2 font-semibold">{t.currency}</td><td className="p-2">{money(t.available, t.currency)}</td><td className="p-2">{money(t.pending, t.currency)}</td>
                  <td className="p-2">{money(t.reserved, t.currency)}</td><td className="p-2 text-red-700">{money(t.debt, t.currency)}</td><td className="p-2">{money(t.earned, t.currency)}</td>
                  <td className="p-2">{money(t.paid_out, t.currency)}</td><td className="p-2">{money(t.spent, t.currency)}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="Контроль" action={<button className={`${btn} bg-app-bg-muted text-app-text`} disabled={busy} onClick={() => run(() => referralAdmin.reconcile(), 'Сверка выполнена')}><RefreshCw className="mr-1 inline h-4 w-4" />Сверка</button>}>
        <ul className="space-y-1 text-sm text-app-text">
          <li>Расхождения баланса и журнала: <b className={data.ledger_mismatches ? 'text-red-700' : 'text-emerald-700'}>{data.ledger_mismatches}</b></li>
          <li>Зависшие события (&gt; 5 мин): <b className={data.stuck_events ? 'text-red-700' : ''}>{data.stuck_events}</b></li>
          <li>События: {data.events.map((e) => `${e.status} ${e.n}`).join(' · ') || '—'}</li>
          <li>Открытые сигналы проверки: <b>{data.open_flags}</b></li>
          <li>Заявки: {data.withdrawals.map((w) => `${WD_STATUS[w.status]} ${w.count} (${money(w.amount, w.currency)})`).join(' · ') || '—'}</li>
        </ul>
      </Panel>
    </div>
  );
}

function Withdrawals() {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState<AdminReferralWithdrawal[]>([]);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [details, setDetails] = useState<Record<number, string>>({});
  const load = useCallback(() => { referralAdmin.withdrawals(status || undefined).then(setRows).catch(() => setRows([])); }, [status]);
  useEffect(load, [load]);
  const { busy, run, messages } = useAction(load);
  const value = (id: number) => (inputs[id] ?? '').trim();
  return (
    <div>
      {messages}
      <div className="mb-3 flex flex-wrap gap-2">
        {['pending', 'approved', 'paid', 'rejected', ''].map((s) => (
          <button key={s} className={`${btn} ${status === s ? 'bg-app-primary text-white' : 'bg-app-bg-muted text-app-text'}`} onClick={() => setStatus(s)}>{s ? WD_STATUS[s] : 'Все'}</button>
        ))}
      </div>
      {rows.length === 0 ? <p className="text-sm text-app-text-muted">Заявок нет.</p> : (
        <div className="space-y-3">
          {rows.map((w) => (
            <div key={w.id} className="rounded-lg border border-app-border bg-app-surface p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">#{w.id} · {w.user_name || `Пользователь ${w.user_id}`} · {money(w.amount, w.currency)}</p>
                <span className="rounded bg-app-bg-muted px-2 py-0.5 text-xs">{WD_STATUS[w.status]}</span>
              </div>
              <p className="mt-1 text-app-text-muted">
                Карта {details[w.id] ?? w.card} · {w.full_name ?? '—'} · создана {dt(w.created_at)}
                {w.min_amount ? ` · минимум ${money(w.min_amount, w.currency)} (курс ЦБ ${w.rate_as_of})` : ''}
              </p>
              {w.flagged && <p className="mt-1 font-semibold text-amber-700">Эта карта уже встречалась у другого пользователя — проверьте перед выплатой.</p>}
              {w.debt > 0 && <p className="mt-1 font-semibold text-red-700">У пользователя есть долг — заявку нужно отклонить.</p>}
              {w.paid_at && <p className="mt-1 text-emerald-700">Выплачено {dt(w.paid_at)} · {w.payout_reference}</p>}
              {w.reject_reason && <p className="mt-1 text-red-700">Причина: {w.reject_reason}</p>}
              {(w.status === 'pending' || w.status === 'approved') && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {details[w.id] === undefined && (
                    <button className={`${btn} bg-app-bg-muted text-app-text`} onClick={() => referralAdmin.withdrawalDetails(w.id).then((d) => setDetails((x) => ({ ...x, [w.id]: d.card_number }))).catch(() => {})}>Показать карту</button>
                  )}
                  <input className={`${input} min-w-[200px] flex-1`} value={inputs[w.id] ?? ''} onChange={(e) => setInputs((x) => ({ ...x, [w.id]: e.target.value }))}
                    placeholder={w.status === 'approved' ? 'ID перевода (обязательно)' : 'Причина отказа'} />
                  {w.status === 'pending' && <button className={`${btn} bg-blue-600 text-white`} disabled={busy} onClick={() => run(() => referralAdmin.approve(w.id), 'Заявка одобрена. Деньги ещё не выплачены.')}>Одобрить</button>}
                  {w.status === 'approved' && <button className={`${btn} bg-emerald-600 text-white`} disabled={busy || value(w.id).length < 3} onClick={() => run(() => referralAdmin.paid(w.id, value(w.id)), 'Выплата зафиксирована')}>Деньги отправлены</button>}
                  <button className={`${btn} bg-red-50 text-red-700`} disabled={busy || value(w.id).length < 3} onClick={() => run(() => referralAdmin.reject(w.id, value(w.id)), 'Заявка отклонена, резерв возвращён на баланс')}>Отклонить</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Links() {
  const [review, setReview] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminReferralLink[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const load = useCallback(() => { referralAdmin.links(review || undefined, q || undefined).then(setRows).catch(() => setRows([])); }, [review, q]);
  useEffect(load, [load]);
  const { busy, run, messages } = useAction(load);
  const note = (id: number) => (notes[id] ?? '').trim();
  return (
    <div>
      {messages}
      <div className="mb-3 flex flex-wrap gap-2">
        <input className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Телефон или ID" />
        {['', 'pending', 'cleared', 'rejected'].map((s) => (
          <button key={s} className={`${btn} ${review === s ? 'bg-app-primary text-white' : 'bg-app-bg-muted text-app-text'}`} onClick={() => setReview(s)}>{s ? REVIEW[s] : 'Все'}</button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-[20px] border border-app-border bg-app-surface p-4 text-sm shadow-app-card">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar name={r.referrer_name || '#'} />
                <div className="min-w-0"><p className="truncate font-semibold">{r.referrer_name || `#${r.referrer_id}`}</p><p className="truncate text-xs text-app-text-muted">{r.referrer_phone ?? `#${r.referrer_id}`} · пригласил</p></div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar name={r.referred_name || '#'} tone={r.outcome === 'eligible' ? 'emerald' : 'slate'} />
                <div className="min-w-0"><p className="truncate font-semibold">{r.referred_name || `#${r.referred_user_id}`}</p><p className="truncate text-xs text-app-text-muted">{r.referred_phone ?? `#${r.referred_user_id}`} · {dt(r.created_at)}</p></div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.outcome === 'eligible' ? 'bg-emerald-50 text-emerald-700' : r.outcome ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>
                {r.outcome ? OUTCOME[r.outcome] : 'Ещё не купил'}
              </span>
            </div>
            <p className="mt-2 text-xs text-app-text-muted">
              {r.outcome_reason === 'purchase_before_launch' ? 'Покупка до запуска · ' : ''}
              {r.first_source_type ? `Первая покупка: ${r.first_source_type === 'payment' ? 'платёж' : 'договор оператора'} #${r.first_source_id}${r.rewards?.length ? ' · ' : ''}` : ''}
              {r.rewards?.length ? `Начислено ${r.rewards.map((x) => money(x.amount, x.currency)).join(', ')}` : ''}
              {r.review_status !== 'none' ? `${r.rewards?.length ? ' · ' : ''}Проверка: ${REVIEW[r.review_status]}` : ''}
            </p>
            {r.review_note && <p className="text-app-text-muted">Заметка: {r.review_note}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input className={`${input} min-w-[200px] flex-1`} value={notes[r.id] ?? ''} onChange={(e) => setNotes((x) => ({ ...x, [r.id]: e.target.value }))} placeholder="Комментарий к решению" />
              {r.review_status === 'pending' ? (
                <>
                  <button className={`${btn} bg-emerald-600 text-white`} disabled={busy || note(r.id).length < 3} onClick={() => run(() => referralAdmin.review(r.id, 'cleared', note(r.id)), 'Проверено: удержанные бонусы зачислены')}>Подтвердить</button>
                  <button className={`${btn} bg-red-50 text-red-700`} disabled={busy || note(r.id).length < 3} onClick={() => run(() => referralAdmin.review(r.id, 'rejected', note(r.id)), 'Отклонено: удержанные бонусы отменены')}>Отклонить</button>
                </>
              ) : r.review_status !== 'rejected' && (
                <button className={`${btn} bg-amber-50 text-amber-700`} disabled={busy || note(r.id).length < 3} onClick={() => run(() => referralAdmin.flagLink(r.id, note(r.id)), 'Отправлено на проверку')}>На проверку</button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-app-text-muted">Связей не найдено.</p>}
      </div>
    </div>
  );
}

function Ledger() {
  const [userId, setUserId] = useState('');
  const [rows, setRows] = useState<AdminReferralLedgerRow[]>([]);
  const load = useCallback(() => { referralAdmin.ledger(Number(userId) || undefined).then(setRows).catch(() => setRows([])); }, [userId]);
  useEffect(load, [load]);
  return (
    <div>
      <input className={`${input} mb-3`} value={userId} onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))} placeholder="ID пользователя" />
      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-app-text-muted"><th className="p-2">#</th><th className="p-2">Дата</th><th className="p-2">Пользователь</th><th className="p-2">Операция</th><th className="p-2">Сумма</th><th className="p-2">Основание</th><th className="p-2">Админ</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-app-border tabular-nums">
              <td className="p-2">{r.id}</td><td className="p-2">{dt(r.created_at)}</td><td className="p-2">{r.user_name || r.user_id}</td>
              <td className="p-2">{ENTRY[r.entry_type] ?? r.entry_type}</td><td className="p-2">{money(r.amount, r.currency)}</td>
              <td className="p-2">{r.source_type ? `${r.source_type} #${r.source_id}` : '—'}{r.base_amount ? ` · ${r.rate_percent ?? ''}% от ${money(r.base_amount, r.currency)}` : ''}{r.note ? ` · ${r.note}` : ''}</td>
              <td className="p-2">{r.actor_admin_id ?? '—'}</td>
            </tr>))}</tbody>
        </table>
        {rows.length === 0 && <p className="p-3 text-sm text-app-text-muted">Операций нет.</p>}
      </div>
    </div>
  );
}

function Flags() {
  const [rows, setRows] = useState<AdminReferralFlag[]>([]);
  const load = useCallback(() => { referralAdmin.flags().then(setRows).catch(() => setRows([])); }, []);
  useEffect(load, [load]);
  const { busy, run, messages } = useAction(load);
  const KIND: Record<string, string> = { reward_burst: 'Много начислений за сутки', shared_payout_card: 'Одна карта у разных пользователей', referral_cycle: 'Взаимное приглашение', manual: 'Ручная проверка' };
  return (
    <div>
      {messages}
      <p className="mb-3 text-xs text-app-text-muted">Сигнал — повод для проверки, а не доказательство мошенничества. Бонусы по связи на проверке удерживаются до решения во вкладке «Связи».</p>
      <div className="space-y-2">
        {rows.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-app-border bg-app-surface p-3 text-sm">
            <div><b>{KIND[f.kind] ?? f.kind}</b> · пользователь {f.user_id ?? '—'}{f.referral_id ? ` · связь #${f.referral_id}` : ''}{f.withdrawal_id ? ` · заявка #${f.withdrawal_id}` : ''} · {dt(f.created_at)}
              <p className="text-xs text-app-text-muted">{JSON.stringify(f.details)}</p></div>
            <div className="flex gap-2">
              <button className={`${btn} bg-emerald-50 text-emerald-700`} disabled={busy} onClick={() => run(() => referralAdmin.closeFlag(f.id, 'cleared', 'ok'), 'Сигнал закрыт')}>Всё в порядке</button>
              <button className={`${btn} bg-red-50 text-red-700`} disabled={busy} onClick={() => run(() => referralAdmin.closeFlag(f.id, 'confirmed', 'confirmed'), 'Нарушение подтверждено')}>Нарушение</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-app-text-muted">Открытых сигналов нет.</p>}
      </div>
    </div>
  );
}

function Refund() {
  const [form, setForm] = useState({ source_type: 'payment' as 'payment' | 'operator_receipt', source_id: '', amount: '', reference: '', note: '' });
  const [bonusId, setBonusId] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const { busy, run, messages } = useAction(() => {});
  return (
    <div className="space-y-4">
      {messages}
      <Panel title="Зарегистрировать возврат денег">
        <p className="mb-3 text-xs text-app-text-muted">
          Только для фактически вернувшихся денег (Rahmat/Multicard, оператор, ручной платёж). Бонус отменяется пропорционально; если он уже выплачен — образуется долг. Один и тот же
          идентификатор возврата повторно не учитывается. Статус самого платежа эта форма не меняет.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select className={input} value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value as 'payment' | 'operator_receipt' })}>
            <option value="payment">Платёж (payments)</option>
            <option value="operator_receipt">Чек оператора</option>
          </select>
          <input className={input} value={form.source_id} onChange={(e) => setForm({ ...form, source_id: e.target.value.replace(/\D/g, '') })} placeholder="ID платежа или чека" />
          <input className={input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Сумма возврата (в валюте платежа)" />
          <input className={input} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="ID возврата у провайдера / в банке" />
          <input className={`${input} sm:col-span-2`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Комментарий" />
        </div>
        <button className={`${btn} mt-3 bg-red-600 text-white`} disabled={busy || !form.source_id || !Number(form.amount) || form.reference.trim().length < 3}
          onClick={() => run(async () => {
            const r = await referralAdmin.refund({ source_type: form.source_type, source_id: Number(form.source_id), amount: Number(form.amount), reference: form.reference, note: form.note });
            if (r.duplicate) throw new Error('Этот возврат уже был зарегистрирован');
          }, 'Возврат зарегистрирован')}>Зарегистрировать возврат</button>
      </Panel>
      <Panel title="Отменить покупку курса за бонусы">
        <p className="mb-3 text-xs text-app-text-muted">Бонусы вернутся на баланс один раз. Доступ к курсу при необходимости отзовите отдельно в карточке пользователя.</p>
        <div className="flex flex-wrap gap-2">
          <input className={input} value={bonusId} onChange={(e) => setBonusId(e.target.value.replace(/\D/g, ''))} placeholder="ID платежа (referral_bonus)" />
          <input className={`${input} flex-1`} value={bonusReason} onChange={(e) => setBonusReason(e.target.value)} placeholder="Причина" />
          <button className={`${btn} bg-red-50 text-red-700`} disabled={busy || !bonusId || bonusReason.trim().length < 3} onClick={() => run(() => referralAdmin.cancelBonusPurchase(Number(bonusId), bonusReason), 'Покупка отменена, бонусы возвращены')}>Отменить</button>
        </div>
      </Panel>
    </div>
  );
}

export default function AdminReferralsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <div>
      <h1 className="text-2xl font-semibold text-app-text">Реферальная программа</h1>
      <p className="mb-4 mt-1 text-sm text-app-text-muted">Кто кого пригласил, кто купил курс, бонусы и их выплата.</p>
      <div className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-pressed={tab === t.id} className={`${btn} min-h-10 shrink-0 ${tab === t.id ? 'bg-app-primary text-white' : 'border border-app-border bg-app-surface text-app-text hover:bg-blue-50'}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'overview' && <Overview openLeaders={() => setTab('leaders')} />}
      {tab === 'leaders' && <Leaders />}
      {tab === 'withdrawals' && <Withdrawals />}
      {tab === 'links' && <Links />}
      {tab === 'ledger' && <Ledger />}
      {tab === 'flags' && <Flags />}
      {tab === 'refund' && <Refund />}
    </div>
  );
}
