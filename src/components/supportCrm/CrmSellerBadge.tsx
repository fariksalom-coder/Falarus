import { BadgeDollarSign } from 'lucide-react';
import type { SupportCrmSeller } from '../../api/supportCrm';
import { formatCrmDate } from '../../utils/supportCrmFormat';

/** "Ali" / "Ali · Rahmat avtoto‘lov" / "Avtoto‘lov (Rahmat)" ... */
export function sellerLabel(seller: SupportCrmSeller | null): string {
  if (!seller) return 'Sotuvchi noma’lum';
  const name = seller.operator_name?.trim() || 'Operator';
  switch (seller.kind) {
    case 'operator':
      return name;
    case 'operator_rahmat':
      return `${name} · Rahmat avtoto‘lov`;
    case 'rahmat':
      return 'Avtoto‘lov (Rahmat)';
    case 'store':
      return 'Ilova do‘koni';
    default:
      return 'Qo‘lda (admin)';
  }
}

const TONE: Record<SupportCrmSeller['kind'] | 'unknown', string> = {
  operator: 'bg-violet-50 text-violet-800 ring-violet-100',
  operator_rahmat: 'bg-violet-50 text-violet-800 ring-violet-100',
  rahmat: 'bg-teal-50 text-teal-800 ring-teal-100',
  store: 'bg-teal-50 text-teal-800 ring-teal-100',
  manual: 'bg-slate-50 text-slate-700 ring-app-border',
  unknown: 'bg-slate-50 text-app-muted ring-app-border',
};

/** Support CRM cards: who sold the student's current subscription. */
export default function CrmSellerBadge({ seller }: { seller: SupportCrmSeller | null }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${TONE[seller?.kind ?? 'unknown']}`}
      title={seller?.sold_at ? `Sotilgan: ${formatCrmDate(seller.sold_at)}` : undefined}
    >
      <BadgeDollarSign size={13} className="shrink-0" aria-hidden="true" />
      <span className="font-medium opacity-70">Sotgan:</span>
      {sellerLabel(seller)}
    </span>
  );
}
