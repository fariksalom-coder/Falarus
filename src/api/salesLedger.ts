import { adminApi } from '../lib/adminApi';
import type { SalesLedgerDay, SalesLedgerTariff } from '../../shared/salesLedger';

export type SaleDraft = {
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

export type PaymentDraft = {
  paid_on: string;
  amount_rub: number;
  amount_uzs: number;
  due_date: string | null;
  note: string;
};

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const salesLedgerApi = {
  day: (date: string) => adminApi<SalesLedgerDay>(`/sales-ledger/day?date=${encodeURIComponent(date)}`),
  createSale: (draft: SaleDraft & { paid_rub: number; paid_uzs: number }) =>
    adminApi<{ id: number }>('/sales-ledger/sales', json('POST', draft)),
  updateSale: (id: number, draft: SaleDraft) => adminApi(`/sales-ledger/sales/${id}`, json('PATCH', draft)),
  deleteSale: (id: number) => adminApi(`/sales-ledger/sales/${id}`, { method: 'DELETE' }),
  addPayment: (saleId: number, draft: PaymentDraft) => adminApi(`/sales-ledger/sales/${saleId}/payments`, json('POST', draft)),
  deletePayment: (id: number) => adminApi(`/sales-ledger/payments/${id}`, { method: 'DELETE' }),
  createOperator: (name: string) => adminApi<{ id: number }>('/sales-ledger/operators', json('POST', { name })),
  updateOperator: (id: number, patch: { name?: string; active?: boolean }) =>
    adminApi(`/sales-ledger/operators/${id}`, json('PATCH', patch)),
};
