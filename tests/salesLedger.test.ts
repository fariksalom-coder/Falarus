import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAIN_TARIFFS,
  moneyInUzs,
  daysBetween,
  isIsoDate,
  saleStatus,
  summarizeAnalyticsDay,
  tashkentDate,
  tashkentToday,
  type AnalyticsDay,
  type AnalyticsPayment,
  type AnalyticsSale,
} from '../shared/salesLedger';

const operators = [
  { id: 1, name: 'Laziz', active: true },
  { id: 2, name: 'Sarvinoz', active: true },
  { id: 3, name: 'Old', active: false },
];

function sale(partial: Partial<AnalyticsSale>): AnalyticsSale {
  return {
    key: 'c:1', source: 'operator', sale_at: '2026-10-02T06:00:00Z', user_id: 10, client_name: 'Клиент', phone: '',
    operator_id: 1, operator_name: 'Laziz', tariff: 'three_month', currency: 'UZS', total: 530000,
    paid: 530000, pending: 0, debt: 0, due_at: null, lead_source: 'Instagram', ...partial,
  };
}

function payment(partial: Partial<AnalyticsPayment>): AnalyticsPayment {
  return {
    key: 'r:1', source: 'operator', status: 'approved', paid_at: '2026-10-02T06:00:00Z', user_id: 10, client_name: 'Клиент',
    operator_id: 1, operator_name: 'Laziz', tariff: 'three_month', currency: 'UZS', amount: 530000,
    sale_date: '2026-10-02', ...partial,
  };
}

test('main tariffs come from the shared Russian price list', () => {
  assert.deepEqual(
    MAIN_TARIFFS.map((t) => [t.code, t.label, t.priceRub, t.priceUzs]),
    [['month', '1 месяц', 3000, 400000], ['three_month', '3 месяца', 4000, 530000], ['six_month', '6 месяцев', 6000, 790000]],
  );
});

test('status: pending-only receipt is "checking", not a debt-paid sale', () => {
  assert.equal(saleStatus({ paid: 530000, debt: 0 }), 'paid');
  assert.equal(saleStatus({ paid: 200000, debt: 590000 }), 'partial');
  assert.equal(saleStatus({ paid: 0, debt: 4000 }), 'checking');
});

test('day summary keeps currencies apart and splits sources, debts and pending receipts', () => {
  const day: AnalyticsDay = {
    date: '2026-10-02',
    rub_uzs_rate: 150,
    operators,
    sales: [
      sale({ key: 'c:1' }),
      sale({ key: 'c:2', operator_id: 2, operator_name: 'Sarvinoz', tariff: 'six_month', currency: 'RUB', total: 6000, paid: 3000, debt: 3000 }),
      sale({ key: 'c:3', operator_id: 2, operator_name: 'Sarvinoz', currency: 'RUB', total: 4000, paid: 0, pending: 4000, debt: 4000 }),
      sale({ key: 'p:7', source: 'rahmat', operator_id: null, operator_name: '', total: 530000, paid: 530000 }),
      sale({ key: 'p:8', source: 'manual', operator_id: null, operator_name: '', tariff: 'year', currency: 'RUB', total: 7970, paid: 7970 }),
    ],
    payments: [
      payment({ key: 'r:1' }),
      payment({ key: 'r:2', operator_id: 2, operator_name: 'Sarvinoz', currency: 'RUB', amount: 3000 }),
      payment({ key: 'r:3', operator_id: 2, operator_name: 'Sarvinoz', currency: 'RUB', amount: 4000, status: 'pending' }),
      // Kecha tuzilgan shartnomaga bugungi to'lov — qarz undirish.
      payment({ key: 'r:4', amount: 250000, sale_date: '2026-09-30' }),
      payment({ key: 'p:7', source: 'rahmat', operator_id: null, operator_name: '' }),
      payment({ key: 'p:8', source: 'manual', operator_id: null, operator_name: '', currency: 'RUB', amount: 7970, tariff: 'year' }),
    ],
    debts: [
      sale({ key: 'c:2', operator_id: 2, operator_name: 'Sarvinoz', currency: 'RUB', total: 6000, paid: 3000, debt: 3000, due_at: '2026-10-10T10:00:00Z' }),
      sale({ key: 'c:9', debt: 280000, paid: 250000, due_at: '2026-10-01T10:00:00Z' }),
    ],
  };
  const s = summarizeAnalyticsDay(day, new Date('2026-10-02T12:00:00Z'));
  assert.equal(s.salesCount, 5);
  assert.equal(s.byTariff.three_month, 3);
  assert.equal(s.byTariff.six_month, 1);
  assert.equal(s.byTariff.year, 1);
  assert.deepEqual([s.paidCount, s.partialCount, s.checkingCount], [3, 1, 1]);
  assert.deepEqual(s.sold, { RUB: 17970, UZS: 1060000, USD: 0 });
  assert.deepEqual(s.received, { RUB: 10970, UZS: 1310000, USD: 0 });
  assert.deepEqual(s.collectedDebt, { RUB: 0, UZS: 250000, USD: 0 });
  assert.deepEqual(s.receivedFromNewSales, { RUB: 10970, UZS: 1060000, USD: 0 });
  assert.deepEqual(s.pendingReview, { RUB: 4000, UZS: 0, USD: 0 });
  assert.equal(s.pendingReviewCount, 1);
  assert.deepEqual(s.receivedBySource.rahmat, { RUB: 0, UZS: 530000, USD: 0 });
  assert.deepEqual(s.receivedBySource.manual, { RUB: 7970, UZS: 0, USD: 0 });
  assert.deepEqual(s.receivedBySource.operator, { RUB: 3000, UZS: 780000, USD: 0 });
  assert.deepEqual(s.openDebt, { RUB: 3000, UZS: 280000, USD: 0 });
  assert.deepEqual(s.overdueDebt, { RUB: 0, UZS: 280000, USD: 0 });

  // Operatorlar avval, keyin Rahmat, keyin qo'lda; nofaol operator ro'yxatga kirmaydi.
  assert.deepEqual(s.channels.map((c) => c.key), ['op:1', 'op:2', 'rahmat', 'manual']);
  const sarvinoz = s.channels.find((c) => c.key === 'op:2')!;
  assert.equal(sarvinoz.salesCount, 2);
  assert.deepEqual(sarvinoz.pendingReview, { RUB: 4000, UZS: 0, USD: 0 });
  const laziz = s.channels.find((c) => c.key === 'op:1')!;
  assert.equal(laziz.operatorId, 1);
  assert.equal(s.channels.find((c) => c.key === 'rahmat')!.operatorId, null);
  assert.deepEqual(laziz.collectedDebt, { RUB: 0, UZS: 250000, USD: 0 });
});

test('share of turnover converts rubles at the given rate and never invents a USD rate', () => {
  assert.equal(moneyInUzs({ RUB: 4000, UZS: 780000, USD: 0 }, 150), 1380000);
  assert.equal(moneyInUzs({ RUB: 4000, UZS: 780000, USD: 0 }, null), 780000);
  assert.equal(moneyInUzs({ RUB: 0, UZS: 0, USD: 100 }, 150), 0);
});

test('date helpers use Tashkent time', () => {
  assert.equal(isIsoDate('2026-02-29'), false);
  assert.equal(isIsoDate('2026-10-01'), true);
  assert.equal(daysBetween('2026-10-01', '2026-10-06'), 5);
  assert.equal(daysBetween('2026-10-03', '2026-10-01'), -2);
  assert.equal(tashkentToday(new Date('2026-09-30T20:30:00Z')), '2026-10-01');
  assert.equal(tashkentDate('2026-10-02T20:15:06Z'), '2026-10-03');
});
