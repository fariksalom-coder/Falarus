import { useCallback, useEffect, useState } from 'react';
import {
  addIncome,
  getIncome,
  removeIncome,
  type IncomeResponse,
} from '../../../../api/teacherPanel';
import { getMyPayments, submitPayment } from '../../../../api/payment';
import { openRahmatCheckout } from '../../../../api/rahmat';
import { getPaymentMethodByCurrency } from '../../../../api/publicPricing';
import {
  getTeacherListingPriceUzs,
  resolveTeacherListingPlanCode,
} from '../../../../../shared/paymentProducts';
import { adminContact } from '../../../../config/adminContact';
import { usePanel } from '../panelContext';
import { tpl } from '../lang';
import {
  Card,
  Empty,
  ErrorNote,
  Field,
  GhostButton,
  PageHead,
  PrimaryButton,
  Skeleton,
  StatCard,
  Tag,
  daysUntil,
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
        <p className="mb-3 text-[16px] font-semibold text-[#171A3D]">{t.incomeLast6}</p>
        <ul className="space-y-2.5">
          {(data?.months ?? []).map((m) => (
            <li key={m.month} className="flex items-center gap-3">
              <span className="w-[62px] shrink-0 text-[12px] font-medium text-[#8A8CAE]">{m.month}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F0EFF8]">
                <span
                  className="block h-full rounded-full bg-[#4B3BE4]"
                  style={{ width: `${Math.round((m.total_uzs / max) * 100)}%` }}
                />
              </span>
              <span className="w-[110px] shrink-0 text-right text-[12.5px] font-semibold text-[#171A3D]">
                {fmtSum(m.total_uzs)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[16px] font-semibold text-[#171A3D]">{t.incomeAdd}</p>
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
          <p className="mt-4 text-center text-[12.5px] text-[#8A8CAE]">{t.incomeEmpty}</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#F6F5FC]">
            {data!.entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <span className="w-[92px] shrink-0 text-[12.5px] text-[#6E7191]">
                  {fmtDate(e.earned_on, lang)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-[#3E4166]">
                  {e.note || e.student_name || '—'}
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-[#171A3D]">
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

/* ---------------------------------- Obuna ---------------------------------- */

export function Subscription() {
  const { token, t, lang, cabinet, refresh } = usePanel();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [created, setCreated] = useState<{ amount: number; currency: string } | null>(null);
  const [karta, setKarta] = useState<{ card_number: string; card_holder_name: string } | null>(null);
  const [oxirgiTolov, setOxirgiTolov] = useState<{ id: number; status: string; created_at: string } | null>(null);
  const [onlaynBusy, setOnlaynBusy] = useState(false);

  const p = cabinet?.profile;
  const paidUntil = p?.listing_paid_until ?? null;
  const daysLeft = daysUntil(paidUntil) ?? 0;
  const active = daysLeft > 0;
  const freeUsed = Number(p?.free_lessons_used ?? 0);
  const subs = cabinet?.listing_subscriptions ?? [];

  const planCode = resolveTeacherListingPlanCode(Boolean(p?.first_listing_discount_used));
  const narx = getTeacherListingPriceUzs(planCode);

  /*
   * IKKI TO'LOV YO'LI:
   *   A) ONLAYN (asosiy) — Rahmat/Multicard checkout. Multicard callback'i
   *      to'lovni tasdiqlaydi va listing obunasini o'zi faollashtiradi,
   *      admin aralashmaydi. O'quvchilar uchun ham xuddi shu yo'l ishlaydi.
   *   B) KARTAGA O'TKAZMA (zaxira) — o'qituvchi pul o'tkazib CHEKNI yuklaydi,
   *      chek bilan birga to'lov yozuvi ochiladi, admin ko'rib tasdiqlaydi.
   * Ikkalasi ham `teacher_listing` mahsulot kodi bilan bitta to'lov yozuvini
   * ochadi, shuning uchun bir vaqtda faqat bittasi pending bo'la oladi.
   */
  useEffect(() => {
    if (!token) return;
    let alive = true;
    void getPaymentMethodByCurrency('UZS')
      .then((m) => alive && setKarta(m as { card_number: string; card_holder_name: string } | null))
      .catch(() => undefined);
    void getMyPayments(token)
      .then((rows) => {
        if (!alive) return;
        const oxirgi = rows.find((r) => r.product_code === 'teacher_listing') ?? null;
        setOxirgiTolov(oxirgi as { id: number; status: string; created_at: string } | null);
      })
      .catch(() => undefined);
  }, [token, created]);

  const onlaynTola = async () => {
    setOnlaynBusy(true);
    setErr('');
    try {
      await openRahmatCheckout({
        token,
        productCode: 'teacher_listing',
        listingPlanCode: planCode,
        afterCreate: refresh,
      });
    } catch (e) {
      // Server pending to'lov bo'lsa PENDING_PAYMENT qaytaradi — matni foydalanuvchiga tushunarli.
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setOnlaynBusy(false);
    }
  };

  const chekniYubor = async (file: File) => {
    setBusy(true);
    setErr('');
    try {
      await submitPayment(token, {
        productCode: 'teacher_listing',
        currency: 'UZS',
        listingPlanCode: planCode,
        file,
      });
      setCreated({ amount: narx, currency: 'UZS' });
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHead title={t.subscriptionTitle} subtitle={t.subscriptionSubtitle} />
      {err ? <ErrorNote text={err} /> : null}

      <div
        className={`mb-4 rounded-[20px] border p-5 ${
          active ? 'border-[#C7E9D5] bg-[#F3FBF6]' : 'border-[#F5E3B8] bg-[#FFFBF0]'
        }`}
      >
        <p className={`text-[16px] font-semibold ${active ? 'text-[#12703A]' : 'text-[#7A5B10]'}`}>
          {active ? t.subActive : t.subInactive}
        </p>
        <p className={`mt-1 text-[13px] ${active ? 'text-[#12703A]/80' : 'text-[#8A7134]'}`}>
          {active && paidUntil
            ? tpl(t.subActiveUntil, { date: fmtDate(paidUntil, lang), days: daysLeft })
            : t.subInactiveText}
        </p>
        {/* Asosiy yo'l: onlayn to'lov — tasdiq avtomatik, admin kutilmaydi. */}
        <div className="mt-3 rounded-[14px] bg-white p-3.5 shadow-[0_6px_18px_rgba(75,59,228,0.10)]">
          <p className="text-[12.5px] font-semibold text-[#3E4166]">Onlayn toʻlash</p>
          <p className="mt-1 text-[12px] leading-[1.65] text-[#8A8CAE]">
            Karta orqali darhol — toʻlov oʻtishi bilan hisobingiz avtomatik 1 oyga faollashadi.
          </p>
          <PrimaryButton
            className="mt-2.5 w-full sm:w-auto"
            disabled={onlaynBusy}
            onClick={() => void onlaynTola()}
          >
            {onlaynBusy ? t.saving : `${narx.toLocaleString('ru-RU')} soʻm · Onlayn toʻlash`}
          </PrimaryButton>
        </div>

        <div className="my-2.5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#E4E3F2]" />
          <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[#A8AAC4]">
            yoki
          </span>
          <span className="h-px flex-1 bg-[#E4E3F2]" />
        </div>

        {/* Zaxira yo'l, 1-qadam: kartaga o'tkazma */}
        <div className="rounded-[14px] bg-white/70 p-3.5">
          <p className="text-[12.5px] font-semibold text-[#3E4166]">
            1. {narx.toLocaleString('ru-RU')} soʻmni kartaga oʻtkazing
          </p>
          {karta ? (
            <p className="mt-1 text-[15px] font-bold tracking-wide text-[#171A3D]">
              {karta.card_number}
              <span className="ml-2 text-[12px] font-semibold text-[#6E7191]">
                {karta.card_holder_name}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-[12.5px] text-[#8A8CAE]">Karta maʼlumoti yuklanmoqda…</p>
          )}
        </div>

        {/* 2-qadam: chekni yuklash */}
        <div className="mt-2.5 rounded-[14px] bg-white/70 p-3.5">
          <p className="text-[12.5px] font-semibold text-[#3E4166]">2. Chekni yuklang</p>
          <p className="mt-1 text-[12px] text-[#8A8CAE]">
            Toʻlov chekining rasmini yuklang — admin tekshirib tasdiqlaydi.
          </p>
          <label className="mt-2.5 inline-block min-h-[46px] cursor-pointer rounded-[12px] bg-[#4B3BE4] px-5 py-3 text-[13px] font-semibold text-white">
            {busy ? t.saving : 'Chekni yuklash'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void chekniYubor(f);
              }}
            />
          </label>

          {oxirgiTolov ? (
            <p className="mt-2.5 text-[12px] font-semibold text-[#6E7191]">
              Oxirgi chek: {fmtDate(oxirgiTolov.created_at, lang)} ·{' '}
              <span
                className={
                  oxirgiTolov.status === 'approved'
                    ? 'text-[#17A34A]'
                    : oxirgiTolov.status === 'rejected'
                      ? 'text-[#C23A3F]'
                      : 'text-[#C57A1F]'
                }
              >
                {oxirgiTolov.status === 'approved'
                  ? 'tasdiqlangan'
                  : oxirgiTolov.status === 'rejected'
                    ? 'rad etilgan'
                    : 'admin tekshiruvida'}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {created ? (
        <Card className="mb-4 p-5">
          <p className="text-[14px] font-semibold text-[#171A3D]">
            {fmtSum(created.amount)} {created.currency}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-[1.7] text-[#6E7191]">
            Chek yuborildi. Admin tasdiqlagach hisobingiz 1 oyga faollashadi.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <a
              href={adminContact.telegram}
              target="_blank"
              rel="noreferrer"
              className="min-h-[44px] rounded-[12px] bg-[#4B3BE4] px-4 py-3 text-[13px] font-semibold text-white"
            >
              Telegram
            </a>
            <a
              href={`mailto:${adminContact.email}`}
              className="min-h-[44px] rounded-[12px] border border-[#E4E3F2] bg-white px-4 py-3 text-[13px] font-semibold text-[#3E4166]"
            >
              {adminContact.email}
            </a>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-2 text-[16px] font-semibold text-[#171A3D]">
            {tpl(t.subFreeLessons, { used: freeUsed, limit: 3 })}
          </p>
          <p className="text-[12.5px] leading-[1.7] text-[#6E7191]">
            {tpl(t.subFreeHint, { limit: 3 })}
          </p>
        </Card>

        <Card className="p-5">
          <p className="mb-3 text-[16px] font-semibold text-[#171A3D]">{t.subHistory}</p>
          {subs.length === 0 ? (
            <p className="text-[12.5px] text-[#8A8CAE]">{t.subEmpty}</p>
          ) : (
            <ul className="divide-y divide-[#F6F5FC]">
              {subs.slice(0, 8).map((s, i) => {
                const row = s as Record<string, unknown>;
                const status = String(row.status ?? '');
                return (
                  <li key={String(row.id ?? i)} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#3E4166]">
                      {String(row.plan_code ?? '')}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-[#8A8CAE]">
                      {row.created_at ? fmtDate(String(row.created_at), lang) : ''}
                    </span>
                    <Tag tone={status === 'active' ? 'green' : status === 'pending' ? 'amber' : 'grey'}>
                      {status}
                    </Tag>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {!active && subs.length === 0 ? (
        <div className="mt-4">
          <Empty text={t.subInactiveText} hint={tpl(t.subFreeHint, { limit: 3 })} />
        </div>
      ) : null}

      <div className="mt-4 flex justify-center">
        <GhostButton onClick={() => window.open(adminContact.telegram, '_blank')}>
          {t.helpContact}
        </GhostButton>
      </div>
    </div>
  );
}
