/**
 * AdminOnboardingPage — ro'yxatdan o'tish so'rovnomasi hisoboti.
 *
 * Ikki qism: yuqorida umumiy kesim (taqsimotlar), pastda javoblar ro'yxati.
 * «Aytgan manba» va haqiqiy UTM alohida ustunlarda — foydalanuvchi javobiga
 * ishonch past, haqiqiy manba reklama parametridan ko'rinadi.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

type Bucket = { value: string; count: number; pct: number };

type Summary = {
  totals: { started: number; completed: number; avg_skipped: number; full_answers: number };
  goal: Bucket[];
  level: Bucket[];
  daily_minutes: Bucket[];
  age_range: Bucket[];
  country: Bucket[];
  source: Bucket[];
  source_vs_utm: { said: string; real: string; count: number }[];
  daily: { day: string; count: number }[];
};

type Row = {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  age_range: string | null;
  country: string | null;
  region: string | null;
  goal: string | null;
  level: string | null;
  daily_minutes: number | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_path: string | null;
  device_type: string | null;
  skipped_count: number;
  completed_at: string | null;
};

/** Kod → o'qiladigan nom. Noma'lum qiymat o'z holicha ko'rsatiladi. */
const LABELS: Record<string, string> = {
  work_russia: 'Rossiyada ishlash',
  living_russia: 'Rossiyada yashash',
  patent: 'Patent / imtihon',
  study: "O'qish",
  career: 'Karyera',
  communication: 'Muloqot',
  zero: 'Umuman bilmaydi',
  words: "Ba'zi so'zlar",
  basic: 'Oddiy gaplar',
  intermediate: 'Erkin gaplashadi',
  '14_17': '14–17', '18_24': '18–24', '25_34': '25–34', '35_44': '35–44', '45_plus': '45+',
  UZ: "O'zbekiston", RU: 'Rossiya', KZ: "Qozog'iston", KG: "Qirg'iziston", TJ: 'Tojikiston',
  other: 'Boshqa',
  instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', telegram: 'Telegram',
  friend: "Do'sti aytgan", google: 'Google', ads: 'Reklama',
  mobile: 'Telefon', tablet: 'Planshet', desktop: 'Kompyuter',
};

const label = (v: string | null | undefined): string => {
  if (v == null || v === '') return '—';
  return LABELS[v] ?? v;
};

function DistCard({ title, items, suffix }: { title: string; items: Bucket[]; suffix?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-2xl border border-app-border bg-app-surface p-4">
      <p className="text-[13px] font-black uppercase tracking-wide text-app-text-muted">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Ma'lumot yo'q</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {items.map((b) => (
            <div key={b.value}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13.5px] font-bold text-app-text">
                  {label(b.value)}
                  {suffix ?? ''}
                </span>
                <span className="shrink-0 text-[12.5px] font-black tabular-nums text-app-text-muted">
                  {b.count} · {b.pct}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-app-bg-subtle">
                <div
                  className="h-full rounded-full bg-app-primary"
                  style={{ width: `${(b.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminOnboardingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<{ goal: string; source: string; country: string }>({
    goal: '', source: '', country: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const LIMIT = 50;

  const query = useMemo(() => {
    const q = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (filter.goal) q.set('goal', filter.goal);
    if (filter.source) q.set('source', filter.source);
    if (filter.country) q.set('country', filter.country);
    return q.toString();
  }, [offset, filter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, l] = await Promise.all([
        adminApi<Summary>('/onboarding/summary'),
        adminApi<{ rows: Row[]; total: number }>(`/onboarding/list?${query}`),
      ]);
      setSummary(s);
      setRows(l.rows ?? []);
      setTotal(l.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const t = summary?.totals;
  const completionPct = t && t.started > 0 ? Math.round((t.completed / t.started) * 1000) / 10 : 0;
  // So'rovnoma majburiy bo'lgach «o'tkazib yuborish» ko'rsatkichi ma'nosini
  // yo'qotdi — o'rniga oxirgi 7 kundagi oqim ko'rsatiladi.
  const last7 = (summary?.daily ?? [])
    .slice(-7)
    .reduce((sum, d) => sum + (Number(d.count) || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-app-text">So'rovnoma</h1>
        <p className="mt-1 text-sm font-medium text-app-text-muted">
          Ro'yxatdan o'tgandan keyingi savollar — javoblar va reklama manbasi
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {/* Umumiy raqamlar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "To'ldirgan", value: t?.completed ?? 0 },
          { label: 'Tugatish darajasi', value: `${completionPct}%` },
          { label: "So'nggi 7 kun", value: last7 },
          { label: 'Jami boshlagan', value: t?.started ?? 0 },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-app-border bg-app-surface p-4">
            <p className="text-[12px] font-black uppercase tracking-wide text-app-text-muted">
              {card.label}
            </p>
            <p className="mt-1 text-[26px] font-black tabular-nums text-app-text">{card.value}</p>
          </div>
        ))}
      </div>

      {loading && !summary ? (
        <div className="flex justify-center py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DistCard title="Maqsad" items={summary.goal} />
            <DistCard title="Daraja" items={summary.level} />
            <DistCard title="Kunlik vaqt" items={summary.daily_minutes} suffix=" daq" />
            <DistCard title="Yosh" items={summary.age_range} />
            <DistCard title="Davlat" items={summary.country} />
            <DistCard title="Manba (aytgan)" items={summary.source} />
          </div>

          {/* Aytgan vs haqiqiy */}
          <div className="rounded-2xl border border-app-border bg-app-surface p-4">
            <p className="text-[13px] font-black uppercase tracking-wide text-app-text-muted">
              Aytgan manba ↔ haqiqiy UTM
            </p>
            <p className="mt-1 text-[12.5px] font-medium text-app-text-muted">
              Foydalanuvchi javobi ko'pincha noaniq — haqiqiy manba reklama parametridan olinadi
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-app-border text-[12px] uppercase tracking-wide text-app-text-muted">
                    <th className="py-2 font-black">Aytgan</th>
                    <th className="py-2 font-black">Haqiqiy (UTM)</th>
                    <th className="py-2 text-right font-black">Soni</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.source_vs_utm.map((r, i) => (
                    <tr key={i} className="border-b border-app-border last:border-0">
                      <td className="py-2 font-bold text-app-text">{label(r.said)}</td>
                      <td className="py-2 font-bold text-app-text">{label(r.real)}</td>
                      <td className="py-2 text-right font-black tabular-nums text-app-text-muted">
                        {r.count}
                      </td>
                    </tr>
                  ))}
                  {summary.source_vs_utm.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400">
                        Ma'lumot yo'q
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* Javoblar ro'yxati */}
      <div className="rounded-2xl border border-app-border bg-app-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-app-border p-4">
          <p className="mr-auto text-[15px] font-black text-app-text">
            Javoblar <span className="text-slate-400">({total})</span>
          </p>
          {([
            ['goal', 'Maqsad', ['work_russia', 'living_russia', 'patent', 'study', 'career', 'communication']],
            ['source', 'Manba', ['instagram', 'youtube', 'tiktok', 'telegram', 'friend', 'google', 'ads', 'other']],
            ['country', 'Davlat', ['UZ', 'RU', 'KZ', 'KG', 'TJ', 'other']],
          ] as const).map(([key, name, opts]) => (
            <select
              key={key}
              value={filter[key]}
              onChange={(e) => {
                setOffset(0);
                setFilter((f) => ({ ...f, [key]: e.target.value }));
              }}
              className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-[13px] font-bold text-app-text"
            >
              <option value="">{name}: hammasi</option>
              {opts.map((o) => (
                <option key={o} value={o}>
                  {label(o)}
                </option>
              ))}
            </select>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-app-border bg-app-bg-muted text-[11.5px] uppercase tracking-wide text-app-text-muted">
                {['Foydalanuvchi', 'Maqsad', 'Daraja', 'Vaqt', 'Yosh', 'Davlat', 'Aytgan', 'UTM', 'Qurilma', 'Sana'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 font-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-b border-app-border last:border-0 hover:bg-app-bg-muted">
                  <td className="px-3 py-2.5">
                    <span className="block font-bold text-app-text">
                      {[r.first_name, r.last_name].filter(Boolean).join(' ') || `#${r.user_id}`}
                    </span>
                    <span className="block text-[12px] text-app-text-muted">{r.email || r.phone || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-app-text">{label(r.goal)}</td>
                  <td className="px-3 py-2.5 text-app-text">{label(r.level)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-app-text">
                    {r.daily_minutes ? `${r.daily_minutes} daq` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-app-text">{label(r.age_range)}</td>
                  <td className="px-3 py-2.5 text-app-text">{label(r.country)}</td>
                  <td className="px-3 py-2.5 text-app-text">{label(r.source)}</td>
                  <td className="px-3 py-2.5 text-app-text">
                    {r.utm_source ? (
                      <span title={`${r.utm_medium ?? ''} · ${r.utm_campaign ?? ''}`}>
                        {r.utm_source}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-app-text">{label(r.device_type)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-app-text-muted">
                    {r.completed_at ? new Date(r.completed_at).toLocaleDateString('uz-UZ') : '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                    Javob topilmadi
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {total > LIMIT ? (
          <div className="flex items-center justify-between gap-3 border-t border-app-border p-3">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              className="rounded-xl border border-app-border px-4 py-2 text-[13px] font-bold text-app-text disabled:opacity-40"
            >
              ← Oldingi
            </button>
            <span className="text-[13px] font-bold text-app-text-muted">
              {offset + 1}–{Math.min(offset + LIMIT, total)} / {total}
            </span>
            <button
              type="button"
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset((o) => o + LIMIT)}
              className="rounded-xl border border-app-border px-4 py-2 text-[13px] font-bold text-app-text disabled:opacity-40"
            >
              Keyingi →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
