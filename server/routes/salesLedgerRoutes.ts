import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { pool } from '../lib/db';
import { getRubToUzsRate } from '../services/rubUzsRate.service.js';
import {
  MAX_PERIOD_DAYS,
  daysBetween,
  isCurrency,
  isIsoDate,
  tashkentDate,
  type AnalyticsPeriod,
  type AnalyticsPayment,
  type AnalyticsSale,
  type Currency,
  type SaleSource,
} from '../../shared/salesLedger';

/** Davr chegarasi Toshkent vaqtida: [$1 00:00, $2+1 00:00). */
const inPeriod = (column: string) =>
  `${column} >= ($1::date::timestamp AT TIME ZONE 'Asia/Tashkent') AND ${column} < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Tashkent')`;

/** ISO (UTC) satr: pg TIMESTAMPTZ ni xom matn qilib qaytaradi, brauzerlar uni turlicha o'qiydi. */
const iso = (column: string) => `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

const CLIENT_COLUMNS = `u.id AS user_id, concat_ws(' ', u.first_name, u.last_name) AS client_name, COALESCE(u.phone, u.email, '') AS phone`;

/**
 * Shlyuz va admin to'lovlari — faqat rus tili kursi. 1 so'mlik va shunga
 * o'xshash sinov to'lovlari (amount <= 1) hisobga olinmaydi.
 */
const GATEWAY_PAYMENTS = `
  SELECT p.id, p.amount, p.currency, p.tariff_type, p.payment_channel, a.operator_id, o.name operator_name,
         ${iso('COALESCE(p.payment_time, p.created_at)')} AS paid_at, ${CLIENT_COLUMNS}
  FROM payments p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN operator_rahmat_sales a ON a.payment_id=p.id
  LEFT JOIN operator_accounts o ON o.id=a.operator_id
  WHERE p.status = 'approved'
    AND COALESCE(p.product_code, 'russian') = 'russian'
    AND p.amount > 1
    AND ${inPeriod('COALESCE(p.payment_time, p.created_at)')}
  ORDER BY paid_at`;

const CONTRACT_SELECT = `
  SELECT b.id, b.operator_id, o.name AS operator_name, b.tariff, b.currency, b.total, b.paid, b.pending, b.debt,
         ${iso('b.due_at')} AS due_at, b.source AS lead_source, ${iso('b.created_at')} AS created_at, ${CLIENT_COLUMNS}
  FROM operator_balances b
  JOIN operator_accounts o ON o.id = b.operator_id
  JOIN users u ON u.id = b.user_id`;

type Row = Record<string, unknown>;

const num = (value: unknown) => Number(value) || 0;
const currency = (value: unknown): Currency => (isCurrency(value) ? value : 'UZS');
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const clientName = (row: Row) => text(row.client_name) || `Клиент #${row.user_id}`;

function contractSale(row: Row): AnalyticsSale {
  return {
    key: `c:${row.id}`,
    source: 'operator',
    sale_at: String(row.created_at),
    user_id: num(row.user_id),
    client_name: clientName(row),
    phone: text(row.phone),
    operator_id: num(row.operator_id),
    operator_name: text(row.operator_name),
    tariff: text(row.tariff) || null,
    currency: currency(row.currency),
    total: num(row.total),
    paid: num(row.paid),
    pending: num(row.pending),
    debt: num(row.debt),
    due_at: row.due_at ? String(row.due_at) : null,
    lead_source: text(row.lead_source),
  };
}

const gatewaySource = (channel: unknown): SaleSource => (channel === 'rahmat' ? 'rahmat' : 'manual');

export function createAdminSalesLedgerRoutes(database: Pool | null = pool): Router {
  const router = Router();

  router.get('/period', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const { from, to } = req.query;
    if (!isIsoDate(from) || !isIsoDate(to) || to < from) {
      res.status(400).json({ error: 'Проверьте даты периода.' });
      return;
    }
    if (daysBetween(from, to) >= MAX_PERIOD_DAYS) {
      res.status(400).json({ error: `Период — не больше ${MAX_PERIOD_DAYS} дней.` });
      return;
    }
    const range = [from, to];
    if (!database) {
      res.status(503).json({ error: 'База данных недоступна.' });
      return;
    }
    try {
      const [rate, operators, contracts, gateway, receipts, debts] = await Promise.all([
        // Faqat ulush (%) hisobi uchun; kurs kelmasa diagramma so'mdagi qismini ko'rsatadi.
        getRubToUzsRate().then((info) => info.rate).catch(() => null),
        database.query('SELECT id, name, active FROM operator_accounts ORDER BY id'),
        // Barcha cheklari rad etilgan shartnoma sotuv emas (bot ham shunday hisoblaydi).
        database.query(`${CONTRACT_SELECT} WHERE ${inPeriod('b.created_at')} AND (b.paid > 0 OR b.pending > 0) ORDER BY b.created_at`, range),
        database.query(GATEWAY_PAYMENTS, range),
        database.query(
          `SELECT r.id, r.amount, r.status, ${iso('r.created_at')} AS created_at, r.operator_id, o.name AS operator_name,
                  c.tariff, c.currency, (c.created_at AT TIME ZONE 'Asia/Tashkent')::date::text AS contract_day, ${CLIENT_COLUMNS}
           FROM operator_receipts r
           JOIN operator_contracts c ON c.id = r.contract_id
           JOIN operator_accounts o ON o.id = r.operator_id
           JOIN users u ON u.id = c.user_id
           WHERE r.status IN ('approved', 'pending') AND ${inPeriod('r.created_at')}
           ORDER BY r.created_at`,
          range,
        ),
        database.query(
          `${CONTRACT_SELECT}
           WHERE b.debt > 0 AND (b.paid > 0 OR b.pending > 0)
             AND b.created_at < (($1::date + 1)::timestamp AT TIME ZONE 'Asia/Tashkent')
           ORDER BY b.due_at NULLS LAST, b.created_at`,
          [to],
        ),
      ]);

      // Shlyuz/admin to'lovi — bir martalik to'liq sotuv: ham sotuv, ham tushum.
      const gatewaySales: AnalyticsSale[] = gateway.rows.map((row: Row) => ({
        key: `p:${row.id}`,
        source: row.operator_id ? 'operator' : gatewaySource(row.payment_channel),
        sale_at: String(row.paid_at),
        user_id: num(row.user_id),
        client_name: clientName(row),
        phone: text(row.phone),
        operator_id: row.operator_id ? num(row.operator_id) : null,
        operator_name: text(row.operator_name),
        tariff: text(row.tariff_type) || null,
        currency: currency(row.currency),
        total: num(row.amount),
        paid: num(row.amount),
        pending: 0,
        debt: 0,
        due_at: null,
        lead_source: row.operator_id ? 'Rahmat' : '',
      }));

      const receiptPayments: AnalyticsPayment[] = receipts.rows.map((row: Row) => ({
        key: `r:${row.id}`,
        source: 'operator',
        status: row.status === 'pending' ? 'pending' : 'approved',
        paid_at: String(row.created_at),
        user_id: num(row.user_id),
        client_name: clientName(row),
        operator_id: num(row.operator_id),
        operator_name: text(row.operator_name),
        tariff: text(row.tariff) || null,
        currency: currency(row.currency),
        amount: num(row.amount),
        sale_date: String(row.contract_day),
      }));

      const gatewayPayments: AnalyticsPayment[] = gatewaySales.map((sale) => ({
        key: sale.key,
        source: sale.source,
        status: 'approved',
        paid_at: sale.sale_at,
        user_id: sale.user_id,
        client_name: sale.client_name,
        operator_id: sale.operator_id,
        operator_name: sale.operator_name,
        tariff: sale.tariff,
        currency: sale.currency,
        amount: sale.total,
        sale_date: tashkentDate(sale.sale_at),
      }));

      const body: AnalyticsPeriod = {
        from,
        to,
        rub_uzs_rate: rate,
        operators: operators.rows.map((row: Row) => ({ id: num(row.id), name: text(row.name), active: row.active === true })),
        sales: [...contracts.rows.map(contractSale), ...gatewaySales].sort((a, b) => a.sale_at.localeCompare(b.sale_at)),
        payments: [...receiptPayments, ...gatewayPayments].sort((a, b) => a.paid_at.localeCompare(b.paid_at)),
        debts: debts.rows.map(contractSale),
      };
      res.json(body);
    } catch (error) {
      console.error('[admin/sales-ledger]', error);
      res.status(500).json({ error: 'Не удалось загрузить аналитику. Попробуйте ещё раз.' });
    }
  });

  return router;
}
