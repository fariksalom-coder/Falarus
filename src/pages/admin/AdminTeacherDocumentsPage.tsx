import { useCallback, useEffect, useState } from 'react';
import {
  confirmPayment,
  getAdminTeacherReview,
  rejectPayment,
  setAdminTeacherDocumentStatus,
  updateTeacherStatus,
  type AdminTeacherReview,
} from '../../api/admin';

/**
 * O'QITUVCHI TEKSHIRUVI — hammasi bitta kartochkada.
 *
 * Ilgari bu sahifa faqat hujjat FAYLLARINI ro'yxatlardi: kim ekani, anketada
 * nima yozgani va to'lov qilgan-qilmagani ko'rinmasdi — admin qaror qabul
 * qila olmasdi. Endi har bir o'qituvchi uchun:
 *   • anketa ma'lumotlari (pasport, ta'lim, mutaxassislik, narx…);
 *   • hujjatlar va video — o'sha yerda ochiladi;
 *   • TO'LOV CHEKI — rasm bilan, tasdiqlash/rad etish tugmasi bilan;
 *   • profilni tasdiqlash yoki rad etish.
 */

const KIND_LABEL: Record<string, string> = {
  passport: 'Pasport',
  diploma: 'Diplom',
  certificate: 'Sertifikat',
  video: 'Video',
  other: 'Boshqa',
};

const TABS: Array<{ key: string; label: string }> = [
  { key: 'pending', label: 'Tekshiruv kutmoqda' },
  { key: 'active', label: 'Tasdiqlangan' },
  { key: 'all', label: 'Hammasi' },
];

function sana(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('uz-UZ');
}

function royxat(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join(', ') || '—';
  if (typeof v === 'string' && v.trim().startsWith('[')) {
    try {
      const a = JSON.parse(v);
      if (Array.isArray(a)) {
        return (
          a
            .map((x) =>
              x && typeof x === 'object'
                ? Object.values(x as Record<string, unknown>).filter(Boolean).join(' · ')
                : String(x)
            )
            .join(' | ') || '—'
        );
      }
    } catch {
      /* oddiy matn */
    }
  }
  return String(v ?? '') || '—';
}

export default function AdminTeacherDocumentsPage() {
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState<AdminTeacherReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState<Record<number, string>>({});
  /** To'liq ekranda ochilgan rasm (chek yoki hujjat). */
  const [katta, setKatta] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAdminTeacherReview(tab);
      setRows(r.teachers);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const amal = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Amal bajarilmadi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[980px] px-4 py-6">
      <h1 className="text-[22px] font-black text-slate-900">O‘qituvchilar tekshiruvi</h1>
      <p className="mt-1 text-[13px] font-semibold text-slate-500">
        Anketa, hujjatlar, video va to‘lov cheki — bitta joyda
      </p>

      <div className="mt-4 flex gap-2">
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setTab(x.key)}
            className={`rounded-full px-4 py-2 text-[12.5px] font-black ${
              tab === x.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {err ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">{err}</p>
      ) : null}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-[13.5px] font-semibold text-slate-500">
          Bu bo‘limda o‘qituvchi yo‘q
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {rows.map((tt) => {
            const p = tt.profile as Record<string, unknown>;
            const video = tt.documents.find((d) => d.kind === 'video') ?? null;
            const hujjatlar = tt.documents.filter((d) => d.kind !== 'video');
            const tolov = tt.payments[0] ?? null;
            const tolangan =
              (tt.listing_paid_until && new Date(tt.listing_paid_until) > new Date()) ||
              tt.payments.some((x) => x.status === 'approved');

            return (
              <li key={tt.user_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                {/* Sarlavha */}
                <div className="flex flex-wrap items-center gap-3">
                  {tt.avatar_url ? (
                    <img src={tt.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[13px] font-black text-slate-500">
                      {tt.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-slate-900">
                      {tt.name} <span className="text-[12px] font-bold text-slate-400">#{tt.user_id}</span>
                    </p>
                    <p className="text-[12px] font-semibold text-slate-500">
                      {tt.phone ?? '—'} · {tt.email ?? '—'}
                    </p>
                  </div>
                  <span
                    className={`ml-auto rounded-full px-3 py-1 text-[11px] font-black ${
                      tt.profile_status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : tt.profile_status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {tt.profile_status}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-black ${
                      tolangan ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {tolangan ? 'To‘lov bor' : 'To‘lov yo‘q'}
                  </span>
                </div>

                {/* Anketa ma'lumotlari */}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    ['Tug‘ilgan sana', String(p.birth_date ?? '—')],
                    ['Manzil', `${p.region ?? ''} ${p.city ?? ''}`.trim() || '—'],
                    ['Pasport', `${p.passport_number ?? '—'} · ${p.passport_issued_by ?? ''}`],
                    ['Tajriba', `${p.experience_years ?? 0} yil`],
                    ['Mutaxassislik', royxat(p.subjects)],
                    ['Darajalar', royxat(p.teaching_levels)],
                    ['Tillar', royxat(p.languages)],
                    ['Ta‘lim', royxat(p.education)],
                    ['Sertifikatlar', royxat(p.certificates)],
                    ['Kurs narxi', `${Number(p.monthly_course_price_amount ?? 0).toLocaleString('ru-RU')} so‘m`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-bold text-slate-400">{k}</p>
                      <p className="text-[12.5px] font-semibold text-slate-800">{v}</p>
                    </div>
                  ))}
                </div>
                {p.about ? (
                  <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-bold text-slate-400">O‘zi haqida</p>
                    <p className="whitespace-pre-line text-[12.5px] text-slate-800">{String(p.about)}</p>
                  </div>
                ) : null}

                {/* To'lov cheki */}
                <div className="mt-3 rounded-2xl border border-slate-200 p-3">
                  <p className="mb-2 text-[13px] font-black text-slate-900">To‘lov va chek</p>
                  {!tolov ? (
                    <p className="text-[12.5px] font-semibold text-slate-500">To‘lov yaratilmagan</p>
                  ) : (
                    <div className="flex flex-wrap items-start gap-3">
                      {tolov.proof_url ? (
                        <button
                          type="button"
                          onClick={() => setKatta(tolov.proof_url)}
                          className="shrink-0"
                          title="Chekni to‘liq ekranda ochish"
                        >
                          <img
                            src={tolov.proof_url}
                            alt="chek"
                            className="h-28 w-28 rounded-xl object-cover ring-1 ring-slate-200 transition hover:ring-slate-400"
                          />
                        </button>
                      ) : (
                        <span className="flex h-28 w-28 items-center justify-center rounded-xl bg-slate-50 text-center text-[11px] font-bold text-slate-400">
                          Chek yuklanmagan
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-black text-slate-900">
                          {Number(tolov.amount).toLocaleString('ru-RU')} {tolov.currency}
                        </p>
                        <p className="text-[12px] font-semibold text-slate-500">
                          Yaratildi: {sana(tolov.created_at)}
                        </p>
                        <p className="text-[12px] font-semibold text-slate-500">
                          Holat: <b>{tolov.status}</b>
                          {tolov.approved_at ? ` · ${sana(tolov.approved_at)}` : ''}
                        </p>
                        <p className="text-[12px] font-semibold text-slate-500">
                          Obuna: {tt.listing_paid_until ? sana(tt.listing_paid_until) + ' gacha' : '—'}
                        </p>
                        {tolov.status === 'pending' ? (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void amal(() => confirmPayment(tolov.id))}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-[12px] font-black text-white disabled:opacity-50"
                            >
                              To‘lovni tasdiqlash
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void amal(() => rejectPayment(tolov.id))}
                              className="rounded-xl bg-white px-3 py-2 text-[12px] font-black text-red-600 ring-1 ring-red-200 disabled:opacity-50"
                            >
                              Rad etish
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                {/* Video */}
                {video ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-[13px] font-black text-slate-900">Video-taqdimot</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {video.status}
                      </span>
                    </div>
                    <video src={video.file_url} controls preload="metadata" className="max-h-[300px] w-full rounded-xl bg-black" />
                    <TasdiqTugma
                      id={video.id}
                      busy={busy}
                      note={note[video.id] ?? ''}
                      onNote={(v) => setNote((n) => ({ ...n, [video.id]: v }))}
                      onSet={(st) => void amal(() => setAdminTeacherDocumentStatus(video.id, st, note[video.id] ?? ''))}
                    />
                  </div>
                ) : null}

                {/* Hujjatlar */}
                <div className="mt-3 rounded-2xl border border-slate-200 p-3">
                  <p className="mb-2 text-[13px] font-black text-slate-900">Hujjatlar</p>
                  {hujjatlar.length === 0 ? (
                    <p className="text-[12.5px] font-semibold text-slate-500">Hujjat yuklanmagan</p>
                  ) : (
                    <ul className="space-y-2">
                      {hujjatlar.map((d) => (
                        <li key={d.id} className="rounded-xl bg-slate-50 p-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
                              {KIND_LABEL[d.kind] ?? d.kind}
                            </span>
                            <a
                              href={d.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[12.5px] font-bold text-blue-600 underline"
                            >
                              {d.original_name || 'Faylni ochish'}
                            </a>
                            <span className="ml-auto text-[11px] font-black text-slate-500">{d.status}</span>
                          </div>
                          {/\.(png|jpe?g|webp)$/i.test(d.file_url) ? (
                            <button type="button" onClick={() => setKatta(d.file_url)} className="block">
                              <img src={d.file_url} alt="" className="mt-2 max-h-[220px] rounded-lg" />
                            </button>
                          ) : null}
                          <TasdiqTugma
                            id={d.id}
                            busy={busy}
                            note={note[d.id] ?? ''}
                            onNote={(v) => setNote((n) => ({ ...n, [d.id]: v }))}
                            onSet={(st) => void amal(() => setAdminTeacherDocumentStatus(d.id, st, note[d.id] ?? ''))}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Profil qarori */}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    disabled={busy || !tolangan}
                    title={tolangan ? '' : 'Avval to‘lov tasdiqlansin'}
                    onClick={() => void amal(() => updateTeacherStatus(tt.user_id, 'active', ''))}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-[12.5px] font-black text-white disabled:opacity-40"
                  >
                    Profilni tasdiqlash
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void amal(() =>
                        updateTeacherStatus(tt.user_id, 'rejected', note[tt.user_id] ?? 'Hujjatlar yetarli emas')
                      )
                    }
                    className="rounded-xl bg-white px-4 py-2.5 text-[12.5px] font-black text-red-600 ring-1 ring-red-200 disabled:opacity-50"
                  >
                    Profilni rad etish
                  </button>
                  <input
                    value={note[tt.user_id] ?? ''}
                    onChange={(e) => setNote((n) => ({ ...n, [tt.user_id]: e.target.value }))}
                    placeholder="Sabab / izoh"
                    className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[12.5px]"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* To'liq ekran ko'rinishi: chek va hujjat rasmlari shu yerda kattalashadi. */}
      {katta ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setKatta(null)}
          role="dialog"
        >
          <img
            src={katta}
            alt="chek"
            className="max-h-[92vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setKatta(null)}
            className="absolute right-4 top-4 h-10 w-10 rounded-full bg-white/90 text-[18px] font-black text-slate-800"
            aria-label="Yopish"
          >
            ✕
          </button>
          <a
            href={katta}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-[12.5px] font-black text-slate-800"
          >
            Yangi oynada ochish
          </a>
        </div>
      ) : null}
    </div>
  );
}

function TasdiqTugma({
  id,
  busy,
  note,
  onNote,
  onSet,
}: {
  id: number;
  busy: boolean;
  note: string;
  onNote: (v: string) => void;
  onSet: (status: 'approved' | 'rejected') => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => onSet('approved')}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11.5px] font-black text-white disabled:opacity-50"
      >
        Tasdiqlash
      </button>
      <button
        type="button"
        disabled={busy || !note.trim()}
        title={note.trim() ? '' : 'Rad etish uchun sabab yozing'}
        onClick={() => onSet('rejected')}
        className="rounded-lg bg-white px-3 py-1.5 text-[11.5px] font-black text-red-600 ring-1 ring-red-200 disabled:opacity-40"
      >
        Rad etish
      </button>
      <input
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Rad etish sababi"
        className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px]"
        aria-label={`Izoh ${id}`}
      />
    </div>
  );
}
