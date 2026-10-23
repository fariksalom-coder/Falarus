import { useCallback, useEffect, useState } from 'react';
import {
  addIncome,
  getIncome,
  removeIncome,
  type IncomeResponse,
} from '../../../../api/teacherPanel';
import { usePanel } from '../panelContext';
import {
  Card,
  ErrorNote,
  Field,
  PageHead,
  PrimaryButton,
  Skeleton,
  StatCard,
  fmtDate,
  fmtSum,
  inputClass,
  tashkentDate,
} from '../ui';

/* --------------------------------- Daromad --------------------------------- */

export default function Income() {
  const { token, t, lang } = usePanel();
  const [data, setData] = useState<IncomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ amount: '', date: tashkentDate(), note: '' });

  const load = useCallback(async () => {
    try {
      setData(await getIncome(token, 6));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [token, t.errorGeneric]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton rows={3} />;

  const max = Math.max(1, ...(data?.months ?? []).map((m) => m.total_uzs));

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHead title={t.incomeTitle} subtitle={t.incomeManualHint} />
      {err ? <ErrorNote text={err} /> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={t.incomeMonth} value={`${fmtSum(data?.current_month?.total_uzs ?? 0)}`} />
        <StatCard
          label={t.incomeFromTrials}
          value={`${fmtSum(data?.current_month?.trial_uzs ?? 0)}`}
          hint={t.incomeAuto}
        />
        <StatCard
          label={t.incomeManual}
          value={`${fmtSum(data?.current_month?.manual_uzs ?? 0)}`}
          hint={t.incomeManualHint}
        />
      </div>

      <Card className="mb-4 p-5">
        <p className="mb-3 text-[16px] font-semibold text-app-text">{t.incomeLast6}</p>
        <ul className="space-y-2.5">
          {(data?.months ?? []).map((m) => (
            <li key={m.month} className="flex items-center gap-3">
              <span className="w-[62px] shrink-0 text-[12px] font-medium text-app-text-muted">{m.month}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-app-bg-subtle">
                <span
                  className="block h-full rounded-full bg-app-primary"
                  style={{ width: `${Math.round((m.total_uzs / max) * 100)}%` }}
                />
              </span>
              <span className="w-[110px] shrink-0 text-right text-[12.5px] font-semibold text-app-text">
                {fmtSum(m.total_uzs)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[16px] font-semibold text-app-text">{t.incomeAdd}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t.incomeAmount}>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label={t.incomeDate}>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label={t.incomeNote}>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className={inputClass}
            />
          </Field>
        </div>
        <PrimaryButton
          className="mt-3 w-full sm:w-auto"
          disabled={busy || !form.amount || !form.date}
          onClick={() =>
            void act(async () => {
              await addIncome(token, {
                amount_uzs: Number(form.amount),
                earned_on: form.date,
                note: form.note,
              });
              setForm({ amount: '', date: tashkentDate(), note: '' });
            })
          }
        >
          {t.add}
        </PrimaryButton>

        {(data?.entries ?? []).length === 0 ? (
          <p className="mt-4 text-center text-[12.5px] text-app-text-muted">{t.incomeEmpty}</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#F6F5FC]">
            {data!.entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <span className="w-[92px] shrink-0 text-[12.5px] text-app-text-muted">
                  {fmtDate(e.earned_on, lang)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-app-text">
                  {e.note || e.student_name || '—'}
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-app-text">
                  {fmtSum(e.amount_uzs)}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(() => removeIncome(token, e.id))}
                  className="shrink-0 text-[12px] font-semibold text-[#C23A3F] disabled:opacity-50"
                >
                  {t.delete}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
