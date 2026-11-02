import { adminApi } from '../lib/adminApi';
import type { AnalyticsPeriod } from '../../shared/salesLedger';

export const salesLedgerApi = {
  period: (from: string, to: string) =>
    adminApi<AnalyticsPeriod>(`/sales-ledger/period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
};
