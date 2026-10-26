/**
 * O'QITUVCHILAR → «Sharhlar»: o'quvchi darsdan keyin qoldirgan baho va izoh shu yerda
 * tekshiriladi. Tasdiqlansa — ustoz sahifasida chiqadi va reytingga qo'shiladi;
 * rad etilsa — sabab o'quvchiga ko'rsatiladi, u sharhni tahrirlab qayta yuborishi mumkin.
 */
import { useCallback, useEffect, useState } from 'react';
import { Check, Star, X } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { resolveAssetUrl } from '../../../api';
import { REVIEW_CRITERIA } from '../../../../shared/teacherLessons';
import { dateTime } from './shared';

type Review = {
  id: number; lesson_id: number; teacher_user_id: number; student_user_id: number;
  support: number; honesty: number; progress: number; preparation: number; overall: number; comment: string;
  status: 'pending' | 'approved' | 'rejected'; moderation_note: string | null; moderated_at: string | null; moderated_by: string | null;
  created_at: string; updated_at: string; starts_at: string;
  student_first_name: string | null; student_last_name: string | null; student_phone: string | null;
  teacher_first_name: string | null; teacher_last_name: string | null; teacher_avatar_url: string | null;
};

const full = (a: string | null, b: string | null) => `${a ?? ''} ${b ?? ''}`.trim();

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />)}
    </span>
  );
}

export default function ReviewsTab({ onCounts }: { onCounts: (n: number) => void }) {
  const [rows, setRows] = useState<Review[] | null>(null);
  const [status, setStatus] = useState<Review['status']>('pending');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    adminApi<{ rows: Review[]; pending: number }>(`/teacher-money/reviews?status=${status}`)
      .then((r) => { setRows(r.rows); onCounts(r.pending); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [status, onCounts]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const decide = async (r: Review, decision: 'approve' | 'reject') => {
    setBusy(r.id); setError('');
    try {
      await adminApi(`/teacher-money/reviews/${r.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, note: notes[r.id] ?? '' }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([['pending', 'Kutilmoqda'], ['approved', 'Tasdiqlangan'], ['rejected', 'Rad etilgan']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setStatus(k)}
            className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${status === k ? 'bg-blue-600 text-white' : 'bg-app-surface text-app-text-muted ring-1 ring-app-border'}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="text-sm text-app-text-muted">Oʻquvchilarning darsdan keyingi sharhlari. Tasdiqlanmaguncha ustoz sahifasida koʻrinmaydi va reytingga qoʻshilmaydi.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {!rows ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />
        : rows.length === 0 ? <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-center text-sm text-app-text-muted">Hozircha yoʻq.</div>
        : rows.map((r) => (
          <section key={r.id} className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
            <header className="mb-3 flex flex-wrap items-center gap-3">
              {r.teacher_avatar_url ? <img src={resolveAssetUrl(r.teacher_avatar_url) ?? undefined} alt="" className="h-11 w-11 rounded-full object-cover" />
                : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{(r.teacher_first_name ?? 'U').charAt(0)}</span>}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-app-text">Ustoz: {full(r.teacher_first_name, r.teacher_last_name) || '—'} <span className="text-xs font-normal text-app-text-muted">#{r.teacher_user_id}</span></p>
                <p className="text-xs text-app-text-muted">
                  Oʻquvchi: {full(r.student_first_name, r.student_last_name) || '—'} #{r.student_user_id}{r.student_phone ? ` · ${r.student_phone}` : ''} · dars #{r.lesson_id} ({dateTime(r.starts_at)})
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-lg font-black text-amber-800">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />{r.overall.toFixed(1).replace('.', ',')}
              </span>
            </header>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {REVIEW_CRITERIA.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-2 rounded-xl bg-app-bg px-3 py-2">
                  <dt className="text-app-text-muted">{c.uz}</dt>
                  <dd className="flex items-center gap-2 font-semibold text-app-text"><Stars value={r[c.key as keyof Review] as number} />{r[c.key as keyof Review] as number}</dd>
                </div>
              ))}
            </dl>
            <p className={`mt-3 whitespace-pre-line break-words rounded-xl border border-app-border p-3 text-sm ${r.comment ? 'text-app-text' : 'italic text-app-text-muted'}`}>
              {r.comment || 'Izoh yozilmagan — faqat baho'}
            </p>
            <p className="mt-2 text-xs text-app-text-muted">Yuborilgan: {dateTime(r.updated_at)}{r.moderated_at ? ` · qaror ${dateTime(r.moderated_at)} (${r.moderated_by ?? 'admin'})` : ''}</p>
            {r.status === 'pending' ? (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="min-w-[220px] flex-1 text-xs font-semibold text-app-text-muted">Rad etish sababi (oʻquvchiga koʻrsatiladi)
                  <input value={notes[r.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} maxLength={500}
                    placeholder="Masalan: haqoratli soʻzlar bor"
                    className="mt-1 min-h-11 w-full rounded-xl border border-app-border px-3 text-sm text-app-text" />
                </label>
                <button type="button" disabled={busy === r.id || (notes[r.id] ?? '').trim().length < 3} onClick={() => void decide(r, 'reject')}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-700 disabled:opacity-50">
                  <X className="h-4 w-4" />Rad etish
                </button>
                <button type="button" disabled={busy === r.id} onClick={() => void decide(r, 'approve')}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                  <Check className="h-4 w-4" />Tasdiqlash
                </button>
              </div>
            ) : r.moderation_note ? <p className="mt-3 text-sm text-app-text-muted">Sabab: {r.moderation_note}</p> : null}
          </section>
        ))}
    </div>
  );
}
