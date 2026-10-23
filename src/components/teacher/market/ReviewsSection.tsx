/**
 * Profil: umumiy baho, 4 mezon bo'yicha o'rtacha va sharhlar (avval 6 ta, keyin «Yana»).
 */
import { useState } from 'react';
import { Loader2, MessageSquareQuote } from 'lucide-react';
import { REVIEW_CRITERIA, type ReviewCriterion } from '../../../../shared/teacherLessons';
import { getMarketReviews, type MarketReview } from '../../../api/teacherMarket';
import { MONTHS, Stars, TeacherPhoto } from './parts';

const PAGE = 10;

function ReviewCard({ r }: { r: MarketReview }) {
  const d = new Date(r.created_at);
  return (
    <li className="rounded-2xl border border-app-border bg-app-surface p-4">
      <div className="flex items-center gap-3">
        <TeacherPhoto url={r.student_avatar_url} name={r.student_name} className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-app-text">{r.student_name}</p>
          <p className="text-xs font-medium text-app-text-secondary">{d.getDate()}-{MONTHS[d.getMonth()]} {d.getFullYear()}</p>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-black tabular-nums text-app-text"><Stars value={r.overall} size={13} />{r.overall.toFixed(1).replace('.', ',')}</span>
      </div>
      {r.comment && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-app-text">{r.comment}</p>}
    </li>
  );
}

export default function ReviewsSection({ teacherId, token, ratingAvg, total, criteria, initial }: {
  teacherId: number;
  token: string;
  ratingAvg: number | null;
  total: number;
  criteria: Record<ReviewCriterion, number> | null;
  initial: MarketReview[];
}) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const more = async () => {
    setBusy(true); setError('');
    try {
      const next = await getMarketReviews(token, teacherId, rows.length, PAGE);
      setRows((r) => [...r, ...next.filter((x) => !r.some((y) => y.id === x.id))]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  if (!total) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-app-bg-subtle px-6 py-8 text-center">
        <MessageSquareQuote className="h-8 w-8 text-app-text-secondary" />
        <p className="mt-2 font-bold text-app-text">Hali sharh yoʻq</p>
        <p className="mt-1 text-sm text-app-text-muted">Ustoz platformada yangi. Birinchi darsdan keyin oʻquvchilar baholaydi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-2xl bg-app-bg-subtle p-4 sm:grid-cols-[140px_1fr] sm:items-center">
        <div className="text-center">
          <p className="text-[44px] font-black leading-none tabular-nums text-app-text">{(ratingAvg ?? 0).toFixed(1).replace('.', ',')}</p>
          <div className="mt-1.5 flex justify-center"><Stars value={ratingAvg ?? 0} size={16} /></div>
          <p className="mt-1 text-xs font-semibold text-app-text-muted">{total} ta sharh</p>
        </div>
        {criteria && (
          <ul className="space-y-2.5">
            {REVIEW_CRITERIA.map((c) => (
              <li key={c.key}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-app-text">{c.uz}</span>
                  <span className="font-black tabular-nums text-app-text">{criteria[c.key].toFixed(1).replace('.', ',')}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-app-border">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${(criteria[c.key] / 5) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="space-y-3">{rows.map((r) => <ReviewCard key={r.id} r={r} />)}</ul>
      {error && <p role="alert" className="rounded-2xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">{error}</p>}
      {rows.length < total && (
        <button type="button" disabled={busy} onClick={() => void more()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-app-border bg-app-surface text-sm font-black text-app-text transition hover:bg-app-bg-subtle active:scale-[0.98] disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Yana koʻrsatish (${total - rows.length})`}
        </button>
      )}
    </div>
  );
}
