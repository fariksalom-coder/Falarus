import type { First1000PromoView } from '../../../shared/appConfig';

/** "First 1000 new students −50%" strip with the seats left; shown above plan cards. */
export default function First1000PromoBanner({ promo, className = '' }: { promo: First1000PromoView | null; className?: string }) {
  if (!promo) return null;
  const taken = promo.left === null ? null : Math.min(promo.limit, promo.limit - promo.left);
  return (
    <div className={`rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 p-3 text-left ${className}`} role="note">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-lg bg-rose-600 px-2 py-0.5 text-xs font-black text-white">−50%</span>
        <p className="min-w-0 text-sm font-extrabold text-slate-900">Aksiya: birinchi {promo.limit} ta yangi o‘quvchi uchun</p>
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-600">3 oy va 6 oylik tarif yarim narxda. Faqat birinchi to‘lov uchun.</p>
      {taken !== null && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-rose-100" aria-hidden="true">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(2, (taken / promo.limit) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs font-bold text-rose-700 tabular-nums">{promo.left} ta o‘rin qoldi</p>
        </div>
      )}
    </div>
  );
}
