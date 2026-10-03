import { adminApi } from '../lib/adminApi';
import type { AnalyticsDay } from '../../shared/salesLedger';

export const salesLedgerApi = {
  day: (date: string) => adminApi<AnalyticsDay>(`/sales-ledger/day?date=${encodeURIComponent(date)}`),
};
