/**
 * O'QITUVCHILAR — admin panelidagi yagona bo'lim (2026-10-23 dan eski 5 ta
 * sahifa o'rniga): tekshiruv → katalog tumbleri → darslar jadvali → to'lovlar.
 * Tab URL'da (?tab=…), shuning uchun havola bilan aynan kerakli joy ochiladi.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, GraduationCap, Wallet } from 'lucide-react';

const ReviewTab = lazy(() => import('./teachers/ReviewTab'));
const CatalogTab = lazy(() => import('./teachers/CatalogTab'));
const ScheduleTab = lazy(() => import('./teachers/ScheduleTab'));
const PaymentsTab = lazy(() => import('./teachers/PaymentsTab'));

const TABS = [
  { key: 'review', label: 'Tekshiruv', hint: 'Yangi arizalar va tarix', icon: ClipboardCheck },
  { key: 'teachers', label: 'Oʻqituvchilar', hint: 'Katalogda koʻrsatish', icon: GraduationCap },
  { key: 'lessons', label: 'Darslar', hint: 'Kim qachon dars oʻtadi', icon: CalendarDays },
  { key: 'payments', label: 'Toʻlovlar', hint: 'Oʻquvchilar va pul yechish', icon: Wallet },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function AdminTeacherHubPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = TABS.some((t) => t.key === params.get('tab')) ? (params.get('tab') as TabKey) : 'review';
  const [badges, setBadges] = useState<Partial<Record<TabKey, number>>>({});
  const onReview = useCallback((n: number) => setBadges((b) => ({ ...b, review: n })), []);
  const onPayments = useCallback((n: number) => setBadges((b) => ({ ...b, payments: n })), []);

  // Belgichalar: qaysi tab ochiq bo'lishidan qat'i nazar — kutayotgan ariza va pul yechish so'rovlari.
  useEffect(() => {
    adminApi<{ counts: Record<string, number> }>('/teacher-applications?status=pending_review').then((r) => onReview(r.counts.pending_review ?? 0)).catch(() => {});
    adminApi<{ totals: { status: string; n: number }[] }>('/teacher-money/withdrawals?status=requested')
      .then((r) => onPayments(r.totals.find((x) => x.status === 'requested')?.n ?? 0)).catch(() => {});
  }, [onReview, onPayments]);

  // Tab almashganda faqat `tab` qoladi — boshqa tabning filtrlari aralashmasin.
  const go = (key: TabKey) => setParams({ tab: key }, { replace: false });

  return (
    <div className="max-w-7xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-app-text">Oʻqituvchilar</h1>
        <p className="mt-1 text-sm text-app-text-muted">Arizani tekshiring, tasdiqlang, keyin katalogda tumbler bilan koʻrsating. Darslar va toʻlovlar ham shu yerda.</p>
      </header>

      <nav className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Oʻqituvchilar boʻlimlari">
        {TABS.map((t) => {
          const on = tab === t.key;
          const n = badges[t.key] ?? 0;
          return (
            <button key={t.key} type="button" onClick={() => go(t.key)} aria-current={on ? 'page' : undefined}
              className={`flex min-h-[64px] items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${on ? 'border-blue-600 bg-blue-600 text-white shadow-[0_18px_44px_-20px_rgba(37,99,235,0.6)]' : 'border-app-border bg-app-surface text-app-text hover:border-slate-300'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-white/20' : 'bg-blue-50 text-blue-700'}`}><t.icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-bold">{t.label}
                  {n > 0 && <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? 'bg-white/25' : 'bg-red-500 text-white'}`}>{n}</span>}
                </span>
                <span className={`block truncate text-xs ${on ? 'text-white/80' : 'text-app-text-muted'}`}>{t.hint}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />}>
        {tab === 'review' ? <ReviewTab onCounts={onReview} />
          : tab === 'teachers' ? <CatalogTab />
          : tab === 'lessons' ? <ScheduleTab />
          : <PaymentsTab onCounts={onPayments} />}
      </Suspense>
    </div>
  );
}
