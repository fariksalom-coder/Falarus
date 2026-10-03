import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SALES_LEDGER_TARIFFS,
  daysBetween,
  isIsoDate,
  rubForUzs,
  saleStatus,
  summarizeSalesDay,
  tashkentToday,
  uzsForRub,
  type SalesLedgerDay,
  type SalesLedgerSale,
} from '../shared/salesLedger';

const operators = [
  { id: 1, name: 'Алина', is_auto: false, active: true, sort_order: 1 },
  { id: 2, name: 'Дилшод', is_auto: false, active: true, sort_order: 2 },
  { id: 9, name: 'Автопродажи', is_auto: true, active: true, sort_order: 1000 },
];

function sale(partial: Partial<SalesLedgerSale>): SalesLedgerSale {
  return {
    id: 1, sale_date: '2026-10-01', client_name: 'Клиент', phone: '', operator_id: 1, operator_name: 'Алина',
    tariff: 'month', quantity: 1, price_rub: 3000, price_uzs: 400000, due_date: null, note: '',
    paid_rub: 3000, paid_uzs: 400000, debt_rub: 0, debt_uzs: 0, payments_count: 1, ...partial,
  };
}

test('tariffs come from the shared Russian price list', () => {
  assert.deepEqual(
    SALES_LEDGER_TARIFFS.map((t) => [t.label, t.priceRub, t.priceUzs]),
    [['1 месяц', 3000, 400000], ['3 месяца', 4000, 530000], ['6 месяцев', 6000, 790000]],
  );
});

test('status follows the ruble balance', () => {
  assert.equal(saleStatus({ paid_rub: 3000, debt_rub: 0 }), 'paid');
  assert.equal(saleStatus({ paid_rub: 1500, debt_rub: 1500 }), 'partial');
  assert.equal(saleStatus({ paid_rub: 0, debt_rub: 4000 }), 'waiting');
});

test('so‘m amount is proportional and the closing payment takes the remainder', () => {
  const fresh = { price_rub: 4000, price_uzs: 530000, debt_rub: 4000, debt_uzs: 530000 };
  assert.equal(uzsForRub(2000, fresh), 265000);
  assert.equal(rubForUzs(265000, fresh), 2000);
  // 1/3 to'langandan keyin qolgan qarzni yopish — yaxlitlash qoldig'i qolmaydi.
  const afterThird = { price_rub: 4000, price_uzs: 530000, debt_rub: 2667, debt_uzs: 353333 };
  assert.equal(uzsForRub(2667, afterThird), 353333);
  assert.equal(rubForUzs(353333, afterThird), 2667);
});

test('day summary splits new-sale money from collected debts per operator', () => {
  const day: SalesLedgerDay = {
    date: '2026-10-01',
    operators,
    sales: [
      sale({ id: 1 }),
      sale({ id: 2, operator_id: 2, operator_name: 'Дилшод', tariff: 'three_month', price_rub: 4000, price_uzs: 530000, paid_rub: 2000, paid_uzs: 265000, debt_rub: 2000, debt_uzs: 265000 }),
      sale({ id: 3, operator_id: 9, operator_name: 'Автопродажи', tariff: 'six_month', quantity: 2, price_rub: 12000, price_uzs: 1580000, paid_rub: 0, paid_uzs: 0, debt_rub: 12000, debt_uzs: 1580000 }),
    ],
    payments: [
      { id: 10, sale_id: 1, paid_on: '2026-10-01', amount_rub: 3000, amount_uzs: 400000, note: '', client_name: 'A', tariff: 'month', sale_date: '2026-10-01', operator_id: 1, operator_name: 'Алина' },
      { id: 11, sale_id: 2, paid_on: '2026-10-01', amount_rub: 2000, amount_uzs: 265000, note: '', client_name: 'B', tariff: 'three_month', sale_date: '2026-10-01', operator_id: 2, operator_name: 'Дилшод' },
      { id: 12, sale_id: 7, paid_on: '2026-10-01', amount_rub: 1500, amount_uzs: 200000, note: '', client_name: 'Old', tariff: 'month', sale_date: '2026-09-26', operator_id: 1, operator_name: 'Алина' },
    ],
    debts: [
      sale({ id: 2, operator_id: 2, operator_name: 'Дилшод', debt_rub: 2000, debt_uzs: 265000, paid_rub: 2000 }),
      sale({ id: 3, operator_id: 9, operator_name: 'Автопродажи', debt_rub: 12000, debt_uzs: 1580000, paid_rub: 0 }),
    ],
  };
  const s = summarizeSalesDay(day);
  assert.equal(s.salesCount, 3);
  assert.equal(s.units, 4);
  assert.deepEqual(s.byTariff, { month: 1, three_month: 1, six_month: 2 });
  assert.deepEqual([s.paidCount, s.partialCount, s.waitingCount], [1, 1, 1]);
  assert.deepEqual(s.received, { rub: 6500, uzs: 865000 });
  assert.deepEqual(s.receivedFromNewSales, { rub: 5000, uzs: 665000 });
  assert.deepEqual(s.collectedDebt, { rub: 1500, uzs: 200000 });
  assert.deepEqual(s.newDebt, { rub: 14000, uzs: 1845000 });
  assert.deepEqual(s.openDebt, { rub: 14000, uzs: 1845000 });

  const alina = s.perOperator.find((o) => o.operator.id === 1)!;
  assert.deepEqual(alina.received, { rub: 4500, uzs: 600000 });
  assert.deepEqual(alina.collectedDebt, { rub: 1500, uzs: 200000 });
  // Avtosotuv ro'yxat oxirida.
  assert.equal(s.perOperator.at(-1)!.operator.id, 9);
});

test('date helpers', () => {
  assert.equal(isIsoDate('2026-02-29'), false);
  assert.equal(isIsoDate('2026-10-01'), true);
  assert.equal(daysBetween('2026-10-01', '2026-10-06'), 5);
  assert.equal(daysBetween('2026-10-03', '2026-10-01'), -2);
  assert.equal(tashkentToday(new Date('2026-09-30T20:30:00Z')), '2026-10-01');
});
