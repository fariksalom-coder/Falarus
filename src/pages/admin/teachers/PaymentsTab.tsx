/**
 * O'QITUVCHILAR → «To'lovlar»: o'quvchilar individual darslar uchun to'lagan pul
 * (munozarali — hal qilish, bekor qilingan — qaytarish) va o'qituvchilarning pul
 * yechish arizalari (pul qo'lda o'tkaziladi, keyin «O'tkazildi» bosiladi).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { LESSON_STATUS_LABEL, type LessonStatus } from '../../../../shared/teacherLessons';
import { dateTime as date, fmtSum as fmt } from './shared';

type Withdrawal = {
  id: number; teacher_user_id: number; first_name: string; last_name: string; phone: string | null; amount_uzs: number; card_number: string;
  card_holder: string; status: 'requested' | 'paid' | 'rejected'; admin_note: string | null; requested_at: string; processed_at: string | null; balance_after: number;
};
type Lesson = {
  id: number; starts_at: string; price_uzs: number; status: LessonStatus; dispute_reason: string | null; cancel_reason: string | null; refund_due: boolean; refunded_at: string | null;
  teacher_first_name: string; teacher_last_name: string; student_first_name: string; student_last_name: string; student_phone: string | null;
  commission_percent: number | null; teacher_amount_uzs: number | null; platform_amount_uzs: number | null; lesson_number: number | null;
};

const card = (c: string) => c.replace(/(\d{4})(?=\d)/g, '$1 ');

export default function PaymentsTab({ onCounts }: { onCounts?: (requested: number) => void }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('pay') === 'withdrawals' ? 'withdrawals' : 'students';
  const [requested, setRequested] = useState(0);
  useEffect(() => {
    adminApi<{ totals: { status: string; n: number }[] }>('/teacher-money/withdrawals?status=requested')
      .then((r) => { const n = r.totals.find((x) => x.status === 'requested')?.n ?? 0; setRequested(n); onCounts?.(n); }).catch(() => {});
  }, [onCounts, view]);
  const go = (v: string) => { const next = new URLSearchParams(params); next.set('pay', v); setParams(next, { replace: true }); };
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-2xl border border-app-border bg-app-surface p-1 sm:w-fit">
        {([['students', 'Oʻquvchilar toʻlovlari'], ['withdrawals', 'Pul yechish arizalari']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => go(k)} aria-pressed={view === k}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold ${view === k ? 'bg-blue-600 text-white' : 'text-app-text hover:bg-app-bg-muted'}`}>
            {l}
            {k === 'withdrawals' && requested > 0 && <span className={`rounded-full px-1.5 text-xs tabular-nums ${view === k ? 'bg-white/25' : 'bg-red-500 text-white'}`}>{requested}</span>}
          </button>
        ))}
      </div>
      {view === 'withdrawals' ? <Withdrawals /> : <Lessons />}
    </div>
  );
}

function Withdrawals() {
  const [status, setStatus] = useState('requested');
  const [data, setData] = useState<{ rows: Withdrawal[]; totals: { status: string; n: number; sum: number }[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    adminApi<{ rows: Withdrawal[]; totals: { status: string; n: number; sum: number }[] }>(`/teacher-money/withdrawals${status ? `?status=${status}` : ''}`)
      .then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const decide = async (w: Withdrawal, decision: 'paid' | 'reject') => {
    const note = decision === 'reject'
      ? window.prompt('Rad etish sababi (oʻqituvchiga koʻrinadi):')
      : window.prompt(`${fmt(w.amount_uzs)} → ${card(w.card_number)} (${w.card_holder})\nOʻtkazdingizmi? Izoh (ixtiyoriy):`, '');
    if (note === null) return;
    setBusy(`${decision}${w.id}`); setError('');
    try {
      await adminApi(`/teacher-money/withdrawals/${w.id}/${decision}`, { method: 'POST', body: JSON.stringify({ note }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  };
  const total = (s: string) => data?.totals.find((x) => x.status === s);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {([['requested', 'Kutilmoqda'], ['paid', 'Oʻtkazilgan'], ['rejected', 'Rad etilgan'], ['', 'Hammasi']] as const).map(([k, l]) => (
          <button key={l} type="button" onClick={() => setStatus(k)} aria-pressed={status === k}
            className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${status === k ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-app-border bg-app-surface text-app-text'}`}>
            {l}{k && total(k) ? ` · ${total(k)!.n} · ${fmt(total(k)!.sum)}` : ''}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!data ? <div className="h-32 animate-pulse rounded-2xl bg-slate-100" /> : !data.rows.length ? <p className="rounded-2xl border border-dashed border-app-border p-8 text-center text-app-text-muted">Ariza yoʻq</p> : (
        <ul className="space-y-2">
          {data.rows.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-app-text">{w.first_name} {w.last_name} <span className="text-sm font-normal text-app-text-muted">{w.phone ?? ''}</span></p>
                <p className="text-sm text-app-text-muted">#{w.id} · {date(w.requested_at)} · balans hozir {fmt(w.balance_after)}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-app-text">
                  <span className="font-mono font-semibold tabular-nums">{card(w.card_number)}</span>
                  <button type="button" aria-label="Nusxa olish" onClick={() => void navigator.clipboard.writeText(w.card_number)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-app-bg-muted"><Copy className="h-4 w-4" /></button>
                  <span>{w.card_holder}</span>
                </p>
                {w.admin_note && <p className="text-xs text-app-text-muted">Izoh: {w.admin_note}</p>}
              </div>
              <p className="text-lg font-bold tabular-nums text-app-text">{fmt(w.amount_uzs)}</p>
              {w.status === 'requested' ? (
                <div className="flex gap-2">
                  <button type="button" disabled={!!busy} onClick={() => void decide(w, 'paid')} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                    {busy === `paid${w.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Oʻtkazildi
                  </button>
                  <button type="button" disabled={!!busy} onClick={() => void decide(w, 'reject')} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-700 disabled:opacity-50">
                    <X className="h-4 w-4" />Rad etish
                  </button>
                </div>
              ) : (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${w.status === 'paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{w.status === 'paid' ? 'Oʻtkazilgan' : 'Rad etilgan'} · {date(w.processed_at)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Lessons() {
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState<{ rows: Lesson[]; sums: { completed: number; platform: number; teachers: number; attention: number } } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    adminApi<{ rows: Lesson[]; sums: { completed: number; platform: number; teachers: number; attention: number } }>(`/teacher-money/lessons?filter=${filter}`)
      .then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const act = async (l: Lesson, action: 'complete' | 'cancel' | 'refunded') => {
    const labels = { complete: 'Dars oʻtgan deb belgilansinmi? Oʻqituvchi balansiga pul yoziladi.', cancel: 'Dars bekor qilinsinmi? Toʻlangan boʻlsa — pul qaytarish roʻyxatiga tushadi.', refunded: 'Oʻquvchiga pul qaytarildimi?' };
    if (!window.confirm(labels[action])) return;
    const reason = action === 'cancel' ? (window.prompt('Sabab:') ?? '') : '';
    setBusy(`${action}${l.id}`); setError('');
    try {
      await adminApi(`/teacher-money/lessons/${l.id}/${action}`, { method: 'POST', body: JSON.stringify({ reason }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-3">
      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-app-border bg-app-surface p-4"><p className="text-xs text-app-text-muted">Oʻtkazilgan darslar</p><p className="text-xl font-bold tabular-nums">{data.sums.completed}</p></div>
          <div className="rounded-2xl border border-app-border bg-app-surface p-4"><p className="text-xs text-app-text-muted">Platforma komissiyasi</p><p className="text-xl font-bold tabular-nums text-emerald-700">{fmt(data.sums.platform)}</p></div>
          <div className="rounded-2xl border border-app-border bg-app-surface p-4"><p className="text-xs text-app-text-muted">Oʻqituvchilarga</p><p className="text-xl font-bold tabular-nums">{fmt(data.sums.teachers)}</p></div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {([['all', 'Hammasi'], ['upcoming', 'Toʻlangan, dars kutilmoqda'], ['completed', 'Dars oʻtgan'], ['attention', `Eʼtibor kerak${data?.sums.attention ? ` · ${data.sums.attention}` : ''}`]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
            className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${filter === k ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-app-border bg-app-surface text-app-text'}`}>{l}</button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!data ? <div className="h-32 animate-pulse rounded-2xl bg-slate-100" /> : !data.rows.length ? <p className="rounded-2xl border border-dashed border-app-border p-8 text-center text-app-text-muted">Dars yoʻq</p> : (
        <ul className="space-y-2">
          {data.rows.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-app-text">{l.teacher_first_name} {l.teacher_last_name} → {l.student_first_name} {l.student_last_name} <span className="text-sm font-normal text-app-text-muted">{l.student_phone ?? ''}</span></p>
                <p className="text-sm text-app-text-muted">#{l.id} · {date(l.starts_at)} · {fmt(l.price_uzs)} · {LESSON_STATUS_LABEL[l.status].uz}
                  {l.status === 'completed' ? ` · ${l.lesson_number}-dars, ${Number(l.commission_percent)}%: oʻqituvchiga ${fmt(l.teacher_amount_uzs ?? 0)}, platformaga ${fmt(l.platform_amount_uzs ?? 0)}` : ''}</p>
                {l.dispute_reason && <p className="text-sm text-amber-800">Oʻquvchi: «{l.dispute_reason}»</p>}
                {l.cancel_reason && <p className="text-sm text-app-text-muted">Bekor qilish sababi: {l.cancel_reason}</p>}
                {l.refund_due && !l.refunded_at && <p className="text-sm font-semibold text-red-700">Oʻquvchiga {fmt(l.price_uzs)} qaytarish kerak</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {(l.status === 'paid' || l.status === 'disputed') && (
                  <>
                    <button type="button" disabled={!!busy} onClick={() => void act(l, 'complete')} className="min-h-11 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50">Dars oʻtdi</button>
                    <button type="button" disabled={!!busy} onClick={() => void act(l, 'cancel')} className="min-h-11 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-700 disabled:opacity-50">Bekor + qaytarish</button>
                  </>
                )}
                {l.refund_due && !l.refunded_at && (
                  <button type="button" disabled={!!busy} onClick={() => void act(l, 'refunded')} className="min-h-11 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white disabled:opacity-50">Pul qaytarildi</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
