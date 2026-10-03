import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { salesLedgerApi } from '../../../api/salesLedger';
import {
  SALES_LEDGER_TARIFFS,
  addDays,
  salesLedgerTariff,
  uzsForRub,
  rubForUzs,
  type SalesLedgerOperator,
  type SalesLedgerSale,
  type SalesLedgerTariff,
} from '../../../../shared/salesLedger';
import { Field, Modal, OperatorBadge, chipButton, formatAmount, inputClass, primaryButton, rub, secondaryButton, uzs } from './ui';

/** Foydalanuvchi kiritgan summani songa: «3 000», «1500,5» ham qabul qilinadi. */
const parseAmount = (value: string) => {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const amountText = (value: number) => (value ? String(Math.round(value * 100) / 100) : '');

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-[13px] font-medium text-red-700">{message}</p>;
}

function useSubmit(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, submit };
}

type SaleForm = {
  sale_date: string;
  client_name: string;
  phone: string;
  operator_id: number;
  tariff: SalesLedgerTariff;
  quantity: number;
  price_rub: string;
  price_uzs: string;
  paid_rub: string;
  paid_uzs: string;
  due_date: string;
  note: string;
};

function initialSaleForm(date: string, operators: SalesLedgerOperator[], sale: SalesLedgerSale | null): SaleForm {
  if (sale) {
    return {
      sale_date: sale.sale_date,
      client_name: sale.client_name,
      phone: sale.phone,
      operator_id: sale.operator_id,
      tariff: sale.tariff,
      quantity: sale.quantity,
      price_rub: amountText(sale.price_rub),
      price_uzs: amountText(sale.price_uzs),
      paid_rub: '',
      paid_uzs: '',
      due_date: sale.due_date ?? '',
      note: sale.note,
    };
  }
  const tariff = SALES_LEDGER_TARIFFS[0];
  return {
    sale_date: date,
    client_name: '',
    phone: '',
    operator_id: operators.find((o) => o.active && !o.is_auto)?.id ?? operators.find((o) => o.active)?.id ?? 0,
    tariff: tariff.code,
    quantity: 1,
    price_rub: String(tariff.priceRub),
    price_uzs: String(tariff.priceUzs),
    paid_rub: String(tariff.priceRub),
    paid_uzs: String(tariff.priceUzs),
    due_date: addDays(date, 7),
    note: '',
  };
}

export function SaleModal({
  open,
  date,
  operators,
  sale,
  onClose,
  onSaved,
}: {
  open: boolean;
  date: string;
  operators: SalesLedgerOperator[];
  sale: SalesLedgerSale | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SaleForm>(() => initialSaleForm(date, operators, sale));
  const { busy, error, setError, submit } = useSubmit(onSaved);
  const editing = Boolean(sale);

  useEffect(() => {
    if (open) {
      setForm(initialSaleForm(date, operators, sale));
      setError('');
    }
    // Faqat oyna ochilganda formani qayta to'ldiramiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sale?.id]);

  const priceRub = parseAmount(form.price_rub);
  const priceUzs = parseAmount(form.price_uzs);
  const paidRub = editing ? (sale?.paid_rub ?? 0) : parseAmount(form.paid_rub);
  const remainingRub = Math.max(0, priceRub - paidRub);
  const pricing = { price_rub: priceRub, price_uzs: priceUzs, debt_rub: priceRub, debt_uzs: priceUzs };

  const setPricing = (tariff: SalesLedgerTariff, quantity: number) => {
    const plan = salesLedgerTariff(tariff);
    const nextRub = plan.priceRub * quantity;
    const nextUzs = plan.priceUzs * quantity;
    setForm((f) => {
      const wasFull = parseAmount(f.paid_rub) >= parseAmount(f.price_rub);
      return {
        ...f,
        tariff,
        quantity,
        price_rub: String(nextRub),
        price_uzs: String(nextUzs),
        ...(wasFull && !editing ? { paid_rub: String(nextRub), paid_uzs: String(nextUzs) } : {}),
      };
    });
  };

  const setPaidRub = (value: string) =>
    setForm((f) => ({ ...f, paid_rub: value, paid_uzs: amountText(uzsForRub(parseAmount(value), pricing)) }));
  const setPaidUzs = (value: string) =>
    setForm((f) => ({ ...f, paid_uzs: value, paid_rub: amountText(rubForUzs(parseAmount(value), pricing)) }));
  const setPaidShare = (share: number) => setPaidRub(amountText(Math.round(priceRub * share)));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.operator_id) return setError('Выберите оператора.');
    if (!editing && paidRub > priceRub) return setError('Оплата больше стоимости.');
    const draft = {
      sale_date: form.sale_date,
      client_name: form.client_name,
      phone: form.phone,
      operator_id: form.operator_id,
      tariff: form.tariff,
      quantity: form.quantity,
      price_rub: priceRub,
      price_uzs: priceUzs,
      due_date: remainingRub > 0 && form.due_date ? form.due_date : null,
      note: form.note,
    };
    void submit(() =>
      sale
        ? salesLedgerApi.updateSale(sale.id, draft)
        : salesLedgerApi.createSale({ ...draft, paid_rub: paidRub, paid_uzs: parseAmount(form.paid_uzs) }),
    );
  };

  const selectableOperators = operators.filter((o) => o.active || o.id === form.operator_id);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Изменить продажу' : 'Новая продажа'} subtitle={editing ? 'Оплаты меняются в блоке «Долги» и «Оплаты за день».' : 'Полная оплата или предоплата с долгом.'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Клиент">
            <input required autoFocus maxLength={120} className={inputClass} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Фамилия Имя" />
          </Field>
          <Field label="Контакт">
            <input maxLength={40} inputMode="tel" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 123 45 67" />
          </Field>
          <Field label="Оператор">
            <select required className={inputClass} value={form.operator_id || ''} onChange={(e) => setForm({ ...form, operator_id: Number(e.target.value) })}>
              <option value="" disabled>Выберите…</option>
              {selectableOperators.map((o) => (
                <option key={o.id} value={o.id}>{o.name}{o.active ? '' : ' (неактивен)'}</option>
              ))}
            </select>
          </Field>
          <Field label="Дата продажи">
            <input type="date" required className={inputClass} value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[12.5px] font-semibold text-slate-600">Тариф</legend>
          <div className="grid grid-cols-3 gap-2">
            {SALES_LEDGER_TARIFFS.map((t) => {
              const active = form.tariff === t.code;
              return (
                <button
                  key={t.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPricing(t.code, form.quantity)}
                  className={`flex min-h-[64px] flex-col items-start justify-center rounded-2xl border px-3 py-2 text-left transition active:scale-[0.98] ${
                    active ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`text-[13px] font-bold ${active ? 'text-blue-700' : 'text-slate-800'}`}>{t.label}</span>
                  <span className="text-[12px] tabular-nums text-slate-500">{rub(t.priceRub)}</span>
                  <span className="text-[11px] tabular-nums text-slate-400">{formatAmount(t.priceUzs)} сум</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-[88px_1fr_1fr] gap-3">
          <Field label="Кол-во">
            <input type="number" min={1} max={20} required className={inputClass} value={form.quantity} onChange={(e) => setPricing(form.tariff, Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
          </Field>
          <Field label="Стоимость, ₽">
            <input required inputMode="decimal" className={inputClass} value={form.price_rub} onChange={(e) => setForm({ ...form, price_rub: e.target.value })} />
          </Field>
          <Field label="Стоимость, сум">
            <input inputMode="decimal" className={inputClass} value={form.price_uzs} onChange={(e) => setForm({ ...form, price_uzs: e.target.value })} />
          </Field>
        </div>

        {!editing && (
          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-slate-700">Оплачено сейчас</span>
              <div className="flex gap-1.5">
                <button type="button" className={chipButton} onClick={() => setPaidShare(1)}>Полностью</button>
                <button type="button" className={chipButton} onClick={() => setPaidShare(0.5)}>50%</button>
                <button type="button" className={chipButton} onClick={() => setPaidShare(0)}>Без оплаты</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="₽">
                <input inputMode="decimal" className={inputClass} value={form.paid_rub} onChange={(e) => setPaidRub(e.target.value)} placeholder="0" />
              </Field>
              <Field label="сум">
                <input inputMode="decimal" className={inputClass} value={form.paid_uzs} onChange={(e) => setPaidUzs(e.target.value)} placeholder="0" />
              </Field>
            </div>
          </div>
        )}

        {remainingRub > 0 && (
          <div className="grid items-end gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 sm:grid-cols-2">
            <div>
              <p className="text-[12.5px] font-semibold text-amber-800">Остаток долга</p>
              <p className="text-[18px] font-bold tabular-nums text-amber-900">{rub(remainingRub)}</p>
              <p className="text-[12px] tabular-nums text-amber-800/80">{uzs(Math.max(0, priceUzs - (editing ? (sale?.paid_uzs ?? 0) : parseAmount(form.paid_uzs))))}</p>
            </div>
            <Field label="Когда доплатит">
              <input type="date" className={inputClass} value={form.due_date} min={form.sale_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
          </div>
        )}

        <Field label="Примечание">
          <input maxLength={500} className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Например: оплата через сайт, 2 курса" />
        </Field>

        <FormError message={error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButton} onClick={onClose}>Отмена</button>
          <button className={primaryButton} disabled={busy}>{busy ? 'Сохранение…' : editing ? 'Сохранить' : 'Добавить продажу'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function PaymentModal({
  sale,
  date,
  onClose,
  onSaved,
}: {
  sale: SalesLedgerSale | null;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amountRub, setAmountRub] = useState('');
  const [amountUzs, setAmountUzs] = useState('');
  const [paidOn, setPaidOn] = useState(date);
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, setError, submit } = useSubmit(onSaved);

  useEffect(() => {
    if (!sale) return;
    setAmountRub(amountText(sale.debt_rub));
    setAmountUzs(amountText(Math.max(0, sale.debt_uzs)));
    setPaidOn(date < sale.sale_date ? sale.sale_date : date);
    setDueDate(sale.due_date ?? '');
    setNote('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale?.id]);

  if (!sale) return <Modal open={false} title="" onClose={onClose}>{null}</Modal>;

  const rubValue = parseAmount(amountRub);
  const leftRub = Math.max(0, sale.debt_rub - rubValue);
  const onRub = (value: string) => {
    setAmountRub(value);
    setAmountUzs(amountText(uzsForRub(parseAmount(value), sale)));
  };
  const onUzs = (value: string) => {
    setAmountUzs(value);
    setAmountRub(amountText(rubForUzs(parseAmount(value), sale)));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (rubValue <= 0) return setError('Введите сумму оплаты.');
    if (rubValue > sale.debt_rub) return setError(`Сумма больше долга (${rub(sale.debt_rub)}).`);
    void submit(() =>
      salesLedgerApi.addPayment(sale.id, {
        paid_on: paidOn,
        amount_rub: rubValue,
        amount_uzs: parseAmount(amountUzs),
        due_date: leftRub > 0 && dueDate ? dueDate : null,
        note,
      }),
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Принять оплату долга"
      subtitle={<span>{sale.client_name} · {salesLedgerTariff(sale.tariff).label} · продажа от {new Date(`${sale.sale_date}T00:00:00Z`).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}</span>}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
          <div><p className="text-[11.5px] text-slate-500">Стоимость</p><p className="text-[14px] font-bold tabular-nums">{rub(sale.price_rub)}</p></div>
          <div><p className="text-[11.5px] text-slate-500">Оплачено</p><p className="text-[14px] font-bold tabular-nums text-emerald-700">{rub(sale.paid_rub)}</p></div>
          <div><p className="text-[11.5px] text-slate-500">Долг</p><p className="text-[14px] font-bold tabular-nums text-red-600">{rub(sale.debt_rub)}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Сумма, ₽">
            <input autoFocus required inputMode="decimal" className={inputClass} value={amountRub} onChange={(e) => onRub(e.target.value)} />
          </Field>
          <Field label="Сумма, сум">
            <input inputMode="decimal" className={inputClass} value={amountUzs} onChange={(e) => onUzs(e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-1.5">
          <button type="button" className={chipButton} onClick={() => onRub(amountText(sale.debt_rub))}>Весь долг</button>
          <button type="button" className={chipButton} onClick={() => onRub(amountText(Math.round(sale.debt_rub / 2)))}>Половина</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Дата оплаты">
            <input type="date" required min={sale.sale_date} className={inputClass} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          {leftRub > 0 && (
            <Field label="Следующая доплата" hint={`Останется ${rub(leftRub)}`}>
              <input type="date" min={paidOn} className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          )}
        </div>
        <Field label="Примечание">
          <input maxLength={300} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: перевод на карту" />
        </Field>
        <FormError message={error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButton} onClick={onClose}>Отмена</button>
          <button className={primaryButton} disabled={busy}>{busy ? 'Сохранение…' : 'Записать оплату'}</button>
        </div>
      </form>
    </Modal>
  );
}

function OperatorRow({ operator, onChanged }: { operator: SalesLedgerOperator; onChanged: () => void }) {
  const [name, setName] = useState(operator.name);
  const { busy, error, submit } = useSubmit(onChanged);
  useEffect(() => setName(operator.name), [operator.name]);
  const rename = () => {
    if (name.trim() && name.trim() !== operator.name) void submit(() => salesLedgerApi.updateOperator(operator.id, { name: name.trim() }));
  };
  return (
    <li className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-center gap-3">
        <OperatorBadge operator={operator} compact />
        <input
          className={`${inputClass} h-10 flex-1 ${operator.active ? '' : 'text-slate-400'}`}
          value={name}
          maxLength={60}
          aria-label="Имя оператора"
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), rename())}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit(() => salesLedgerApi.updateOperator(operator.id, { active: !operator.active }))}
          className={`min-h-[40px] w-[112px] shrink-0 rounded-xl text-[12.5px] font-semibold transition active:scale-[0.97] ${
            operator.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {operator.active ? 'Активен' : 'Отключён'}
        </button>
      </div>
      <FormError message={error} />
    </li>
  );
}

export function OperatorsModal({ open, operators, onClose, onChanged }: { open: boolean; operators: SalesLedgerOperator[]; onClose: () => void; onChanged: () => void }) {
  const [name, setName] = useState('');
  const { busy, error, submit } = useSubmit(() => {
    setName('');
    onChanged();
  });
  return (
    <Modal open={open} onClose={onClose} title="Операторы" subtitle="Отключённый оператор пропадает из выбора, но его продажи остаются в отчётах.">
      <ul className="divide-y divide-slate-100">
        {operators.map((o) => <OperatorRow key={o.id} operator={o} onChanged={onChanged} />)}
      </ul>
      <form
        className="mt-3 flex gap-2 border-t border-slate-100 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void submit(() => salesLedgerApi.createOperator(name.trim()));
        }}
      >
        <input className={inputClass} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Имя нового оператора" aria-label="Имя нового оператора" />
        <button className={`${primaryButton} shrink-0`} disabled={busy || !name.trim()}>
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </form>
      <div className="mt-2"><FormError message={error} /></div>
    </Modal>
  );
}
