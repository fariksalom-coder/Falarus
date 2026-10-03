import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { Pool, PoolClient } from 'pg';
import { pool } from '../lib/db';
import {
  isIsoDate,
  isSalesLedgerTariff,
  uzsForRub,
  type SalesLedgerDay,
  type SalesLedgerTariff,
} from '../../shared/salesLedger';

class LedgerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const fail = (message: string, status = 400): never => {
  throw new LedgerError(status, message);
};

const run = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler => (req, res, next) => {
  fn(req, res).catch(next);
};

function text(value: unknown, max: number, field: string, required = false): string {
  const result = typeof value === 'string' ? value.trim() : value == null ? '' : fail(`Поле «${field}» заполнено неверно.`);
  if (required && !result) fail(`Заполните поле «${field}».`);
  if (result.length > max) fail(`Поле «${field}» длиннее ${max} символов.`);
  return result;
}

function money(value: unknown, field: string, { positive = false } = {}): number {
  const amount = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value.replace(/\s/g, '').replace(',', '.')) : 0;
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000_000) fail(`Проверьте сумму «${field}».`);
  if (positive && amount <= 0) fail(`Сумма «${field}» должна быть больше нуля.`);
  return Math.round(amount * 100) / 100;
}

function date(value: unknown, field: string): string {
  if (!isIsoDate(value)) fail(`Проверьте дату «${field}».`);
  return value as string;
}

function optionalDate(value: unknown, field: string): string | null {
  return value == null || value === '' ? null : date(value, field);
}

/** Admin middleware yozgan ID — kim kiritganini saqlash uchun. */
const adminIdOf = (req: Request): number | null => (req as unknown as { adminId?: number }).adminId ?? null;

function id(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) fail('Некорректный ID.');
  return parsed;
}

type SaleInput = {
  sale_date: string;
  client_name: string;
  phone: string;
  operator_id: number;
  tariff: SalesLedgerTariff;
  quantity: number;
  price_rub: number;
  price_uzs: number;
  due_date: string | null;
  note: string;
};

function saleInput(body: Record<string, unknown>): SaleInput {
  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) fail('Количество — от 1 до 20.');
  if (!isSalesLedgerTariff(body.tariff)) fail('Выберите тариф.');
  const saleDate = date(body.sale_date, 'Дата продажи');
  const dueDate = optionalDate(body.due_date, 'Дата доплаты');
  if (dueDate && dueDate < saleDate) fail('Дата доплаты раньше даты продажи.');
  return {
    sale_date: saleDate,
    client_name: text(body.client_name, 120, 'Клиент', true),
    phone: text(body.phone, 40, 'Контакт'),
    operator_id: id(body.operator_id),
    tariff: body.tariff as SalesLedgerTariff,
    quantity,
    price_rub: money(body.price_rub, 'Стоимость ₽', { positive: true }),
    price_uzs: money(body.price_uzs, 'Стоимость сум'),
    due_date: dueDate,
    note: text(body.note, 500, 'Примечание'),
  };
}

const BALANCE_SELECT = `
  SELECT b.id, b.sale_date, b.client_name, b.phone, b.operator_id, o.name AS operator_name,
         b.tariff, b.quantity, b.price_rub, b.price_uzs, b.due_date, b.note,
         b.paid_rub, b.paid_uzs, b.debt_rub, b.debt_uzs, b.payments_count
  FROM sales_ledger_balances b
  JOIN sales_ledger_operators o ON o.id = b.operator_id`;

export function createAdminSalesLedgerRoutes(database: Pool | null = pool): Router {
  const router = Router();
  const db = () => database ?? fail('База данных недоступна.', 503);

  async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function assertOperator(client: PoolClient, operatorId: number) {
    const found = await client.query('SELECT active FROM sales_ledger_operators WHERE id = $1', [operatorId]);
    if (!found.rowCount) fail('Оператор не найден.');
  }

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.get('/day', run(async (req, res) => {
    const day = date(req.query.date, 'Дата');
    const [operators, sales, payments, debts] = await Promise.all([
      db().query('SELECT id, name, is_auto, active, sort_order FROM sales_ledger_operators ORDER BY is_auto, sort_order, id'),
      db().query(`${BALANCE_SELECT} WHERE b.sale_date = $1 ORDER BY b.id`, [day]),
      db().query(
        `SELECT p.id, p.sale_id, p.paid_on, p.amount_rub, p.amount_uzs, p.note,
                s.client_name, s.tariff, s.sale_date, s.operator_id, o.name AS operator_name
         FROM sales_ledger_payments p
         JOIN sales_ledger_sales s ON s.id = p.sale_id
         JOIN sales_ledger_operators o ON o.id = s.operator_id
         WHERE p.paid_on = $1
         ORDER BY p.id`,
        [day],
      ),
      db().query(`${BALANCE_SELECT} WHERE b.debt_rub > 0 AND b.sale_date <= $1 ORDER BY b.due_date NULLS LAST, b.sale_date, b.id`, [day]),
    ]);
    const body: SalesLedgerDay = {
      date: day,
      operators: operators.rows,
      sales: sales.rows,
      payments: payments.rows,
      debts: debts.rows,
    };
    res.json(body);
  }));

  router.post('/operators', run(async (req, res) => {
    const name = text(req.body?.name, 60, 'Имя оператора', true);
    const created = await db().query(
      `INSERT INTO sales_ledger_operators (name, sort_order)
       VALUES ($1, COALESCE((SELECT max(sort_order) + 1 FROM sales_ledger_operators WHERE NOT is_auto), 1))
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [name],
    );
    if (!created.rowCount) fail('Оператор с таким именем уже есть.');
    res.status(201).json({ id: created.rows[0].id });
  }));

  router.patch('/operators/:id', run(async (req, res) => {
    const operatorId = id(req.params.id);
    const name = req.body?.name === undefined ? null : text(req.body.name, 60, 'Имя оператора', true);
    const active = typeof req.body?.active === 'boolean' ? req.body.active : null;
    const updated = await db().query(
      `UPDATE sales_ledger_operators SET name = COALESCE($2, name), active = COALESCE($3, active)
       WHERE id = $1 RETURNING id`,
      [operatorId, name, active],
    ).catch((error: { code?: string }) => (error.code === '23505' ? fail('Оператор с таким именем уже есть.') : Promise.reject(error)));
    if (!updated.rowCount) fail('Оператор не найден.', 404);
    res.json({ ok: true });
  }));

  router.post('/sales', run(async (req, res) => {
    const sale = saleInput(req.body ?? {});
    const paidRub = money(req.body?.paid_rub, 'Оплачено ₽');
    if (paidRub > sale.price_rub) fail('Оплата больше стоимости продажи.');
    const paidUzs = req.body?.paid_uzs == null || req.body.paid_uzs === ''
      ? uzsForRub(paidRub, { ...sale, debt_rub: sale.price_rub, debt_uzs: sale.price_uzs })
      : money(req.body.paid_uzs, 'Оплачено сум');
    const saleId = await transaction(async (client) => {
      await assertOperator(client, sale.operator_id);
      const inserted = await client.query(
        `INSERT INTO sales_ledger_sales
           (sale_date, client_name, phone, operator_id, tariff, quantity, price_rub, price_uzs, due_date, note, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [sale.sale_date, sale.client_name, sale.phone, sale.operator_id, sale.tariff, sale.quantity,
          sale.price_rub, sale.price_uzs, paidRub >= sale.price_rub ? null : sale.due_date, sale.note, adminIdOf(req)],
      );
      const newId = Number(inserted.rows[0].id);
      if (paidRub > 0) {
        await client.query(
          'INSERT INTO sales_ledger_payments (sale_id, paid_on, amount_rub, amount_uzs, created_by) VALUES ($1, $2, $3, $4, $5)',
          [newId, sale.sale_date, paidRub, paidUzs, adminIdOf(req)],
        );
      }
      return newId;
    });
    res.status(201).json({ id: saleId });
  }));

  router.patch('/sales/:id', run(async (req, res) => {
    const saleId = id(req.params.id);
    const sale = saleInput(req.body ?? {});
    await transaction(async (client) => {
      await assertOperator(client, sale.operator_id);
      const current = (await client.query('SELECT id FROM sales_ledger_sales WHERE id = $1 FOR UPDATE', [saleId])).rows[0];
      if (!current) fail('Продажа не найдена.', 404);
      const balance = (await client.query('SELECT paid_rub, (SELECT min(paid_on) FROM sales_ledger_payments WHERE sale_id = $1) AS first_paid FROM sales_ledger_balances WHERE id = $1', [saleId])).rows[0];
      if (sale.price_rub < Number(balance.paid_rub)) fail('Стоимость не может быть меньше уже оплаченной суммы.');
      if (balance.first_paid && sale.sale_date > balance.first_paid) fail('Дата продажи не может быть позже первой оплаты.');
      await client.query(
        `UPDATE sales_ledger_sales SET sale_date = $2, client_name = $3, phone = $4, operator_id = $5, tariff = $6,
           quantity = $7, price_rub = $8, price_uzs = $9, due_date = $10, note = $11, updated_at = now()
         WHERE id = $1`,
        [saleId, sale.sale_date, sale.client_name, sale.phone, sale.operator_id, sale.tariff, sale.quantity,
          sale.price_rub, sale.price_uzs, sale.due_date, sale.note],
      );
    });
    res.json({ ok: true });
  }));

  router.delete('/sales/:id', run(async (req, res) => {
    const deleted = await db().query('DELETE FROM sales_ledger_sales WHERE id = $1', [id(req.params.id)]);
    if (!deleted.rowCount) fail('Продажа не найдена.', 404);
    res.json({ ok: true });
  }));

  router.post('/sales/:id/payments', run(async (req, res) => {
    const saleId = id(req.params.id);
    const paidOn = date(req.body?.paid_on, 'Дата оплаты');
    const amountRub = money(req.body?.amount_rub, 'Сумма ₽', { positive: true });
    const note = text(req.body?.note, 300, 'Примечание');
    const nextDueDate = optionalDate(req.body?.due_date, 'Следующая дата доплаты');
    await transaction(async (client) => {
      const locked = (await client.query('SELECT id, sale_date FROM sales_ledger_sales WHERE id = $1 FOR UPDATE', [saleId])).rows[0];
      if (!locked) fail('Продажа не найдена.', 404);
      if (paidOn < locked.sale_date) fail('Дата оплаты раньше даты продажи.');
      const balance = (await client.query('SELECT price_rub, price_uzs, debt_rub, debt_uzs FROM sales_ledger_balances WHERE id = $1', [saleId])).rows[0];
      if (amountRub > Number(balance.debt_rub)) fail(`Сумма больше долга (${Number(balance.debt_rub)} ₽).`);
      const amountUzs = req.body?.amount_uzs == null || req.body.amount_uzs === ''
        ? uzsForRub(amountRub, balance)
        : money(req.body.amount_uzs, 'Сумма сум');
      await client.query(
        'INSERT INTO sales_ledger_payments (sale_id, paid_on, amount_rub, amount_uzs, note, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
        [saleId, paidOn, amountRub, amountUzs, note, adminIdOf(req)],
      );
      const closesDebt = amountRub >= Number(balance.debt_rub);
      await client.query('UPDATE sales_ledger_sales SET due_date = $2, updated_at = now() WHERE id = $1', [saleId, closesDebt ? null : nextDueDate]);
    });
    res.status(201).json({ ok: true });
  }));

  router.delete('/payments/:id', run(async (req, res) => {
    const deleted = await db().query('DELETE FROM sales_ledger_payments WHERE id = $1', [id(req.params.id)]);
    if (!deleted.rowCount) fail('Оплата не найдена.', 404);
    res.json({ ok: true });
  }));

  router.use((error: unknown, _req: Request, res: Response, _next: () => void) => {
    if (error instanceof LedgerError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('[admin/sales-ledger]', error);
    res.status(500).json({ error: 'Не удалось выполнить действие. Попробуйте ещё раз.' });
  });

  return router;
}
