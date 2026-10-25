/**
 * O'QITUVCHILAR → «O'zgarishlar»: tasdiqlangan o'qituvchi profilini o'zgartirsa, yangi
 * ma'lumot katalogga darhol chiqmaydi — shu yerda «oldin → keyin» ko'rinishida turadi.
 * Tasdiqlash — o'zgarish o'quvchilarga ko'rinadi; rad etish — izoh bilan, profil o'zgarmaydi.
 */
import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { resolveAssetUrl } from '../../../api';
import { dateTime, fmtSum } from './shared';

type Revision = {
  id: number; teacher_user_id: number; first_name: string; last_name: string; avatar_url: string | null;
  changes: Record<string, unknown>; before: Record<string, unknown>; status: string;
  review_comment: string | null; decided_by: string | null; created_at: string; updated_at: string; decided_at: string | null;
};

const FIELD_LABEL: Record<string, string> = {
  first_name: 'Ism', last_name: 'Familiya', birth_country: 'Tugʻilgan davlat', subject: 'Fan', proficiency: 'Bilish darajasi',
  onboarding_path: 'Yoʻl', contact_phone: 'Telefon (yopiq)', contact_telegram: 'Telegram (yopiq)', contact_whatsapp: 'WhatsApp (yopiq)',
  certificates: 'Sertifikatlar', education: 'Taʼlim', about_answers: 'Savollarga javoblar', about: 'Oʻzim haqimda', headline: 'Qisqa sarlavha',
  experience_years: 'Tajriba (yil)', experience_months: 'Tajriba (oy)', specializations: 'Yoʻnalishlar', languages: 'Tillar',
  avatar_url: 'Surat', video_url: 'Video-taqdimot', video_duration_sec: 'Video davomiyligi', lesson_price_uzs: 'Bir dars narxi',
};
// Yordamchi ustunlar alohida qator bo'lib chiqmaydi (asosiysi bilan birga o'zgaradi).
const HIDDEN = new Set(['headline', 'experience_months', 'video_duration_sec', 'about_answers']);

function Value({ field, v }: { field: string; v: unknown }) {
  if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return <span className="text-app-text-muted">—</span>;
  if (field === 'avatar_url') return <img src={resolveAssetUrl(String(v)) ?? undefined} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-app-border" />;
  if (field === 'video_url') return <video src={resolveAssetUrl(String(v)) ?? undefined} controls preload="metadata" className="aspect-video w-full max-w-[320px] rounded-xl bg-black" />;
  if (field === 'lesson_price_uzs') return <b>{fmtSum(Number(v))}</b>;
  if (field === 'education' || field === 'certificates') {
    return (
      <ul className="space-y-1">
        {(v as Array<Record<string, unknown>>).map((r, i) => (
          <li key={i}>{[r.title, r.institution, r.specialty, r.degree, [r.year_from, r.year_to].filter(Boolean).join('–')].filter(Boolean).join(' · ')}</li>
        ))}
      </ul>
    );
  }
  if (Array.isArray(v)) return <span>{v.join(', ')}</span>;
  return <span className="whitespace-pre-line break-words">{String(v)}</span>;
}

export default function ChangesTab({ onCounts }: { onCounts: (n: number) => void }) {
  const [rows, setRows] = useState<Revision[] | null>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    adminApi<{ rows: Revision[]; pending: number }>(`/teacher-revisions?status=${status}`)
      .then((r) => { setRows(r.rows); onCounts(r.pending); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [status, onCounts]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const decide = async (r: Revision, decision: 'approve' | 'reject') => {
    setBusy(r.id); setError('');
    try {
      await adminApi(`/teacher-revisions/${r.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, comment: comments[r.id] ?? '' }) });
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
      <p className="text-sm text-app-text-muted">Tasdiqlangan oʻqituvchining profil oʻzgarishlari. Tasdiqlanmaguncha oʻquvchilar eski maʼlumotni koʻradi. Jadval moderatsiyasiz yangilanadi.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {!rows ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />
        : rows.length === 0 ? <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-center text-sm text-app-text-muted">Hozircha yoʻq.</div>
        : rows.map((r) => {
          const fields = Object.keys(r.changes).filter((k) => !HIDDEN.has(k));
          // Faqat yordamchi ustun o'zgargan bo'lsa ham (masalan, javoblar) — ko'rsatamiz.
          const shown = fields.length ? fields : Object.keys(r.changes);
          return (
            <section key={r.id} className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
              <header className="mb-3 flex flex-wrap items-center gap-3">
                {r.avatar_url ? <img src={resolveAssetUrl(r.avatar_url) ?? undefined} alt="" className="h-11 w-11 rounded-full object-cover" />
                  : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{r.first_name.charAt(0)}</span>}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-app-text">{r.first_name} {r.last_name} <span className="text-xs font-normal text-app-text-muted">#{r.teacher_user_id}</span></p>
                  <p className="text-xs text-app-text-muted">{dateTime(r.updated_at)}{r.decided_at ? ` · qaror ${dateTime(r.decided_at)} (${r.decided_by ?? 'admin'})` : ''}</p>
                </div>
              </header>
              <div className="divide-y divide-app-border rounded-xl border border-app-border">
                {shown.map((k) => (
                  <div key={k} className="grid gap-2 p-3 text-sm sm:grid-cols-[160px_1fr_1fr]">
                    <p className="font-semibold text-app-text">{FIELD_LABEL[k] ?? k}</p>
                    <div className="min-w-0 text-app-text-muted"><p className="mb-1 text-[11px] font-bold uppercase tracking-wide">Oldin</p><Value field={k} v={r.before[k]} /></div>
                    <div className="min-w-0 text-app-text"><p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Keyin</p><Value field={k} v={r.changes[k]} /></div>
                  </div>
                ))}
              </div>
              {r.status === 'pending' ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="min-w-[220px] flex-1 text-xs font-semibold text-app-text-muted">Rad etish sababi (oʻqituvchiga boradi)
                    <input value={comments[r.id] ?? ''} onChange={(e) => setComments((c) => ({ ...c, [r.id]: e.target.value }))}
                      className="mt-1 min-h-11 w-full rounded-xl border border-app-border px-3 text-sm text-app-text" />
                  </label>
                  <button type="button" disabled={busy === r.id || (comments[r.id] ?? '').trim().length < 3} onClick={() => void decide(r, 'reject')}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-700 disabled:opacity-50">
                    <X className="h-4 w-4" />Rad etish
                  </button>
                  <button type="button" disabled={busy === r.id} onClick={() => void decide(r, 'approve')}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                    <Check className="h-4 w-4" />Tasdiqlash
                  </button>
                </div>
              ) : r.review_comment ? <p className="mt-3 text-sm text-app-text-muted">Izoh: {r.review_comment}</p> : null}
            </section>
          );
        })}
    </div>
  );
}
