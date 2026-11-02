export type DebtDeferral = {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_due_at: string;
  reason: string;
  decision_reason: string | null;
};
