import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ExternalLink, Pencil, Phone, Search, X } from 'lucide-react';
import {
  getAdminTeachers,
  setTeacherRecommended,
  updateTeacherProfile,
  updateTeacherStatus,
  type AdminTeacherRow,
} from '../../api/admin';

/**
 * O'QITUVCHILAR — ADMIN PANELI.
 *
 * Ro'yxat `users` (account_type='teacher') dan quriladi, anketa esa ustiga
 * qo'shiladi. Shuning uchun ANKETANI HALI BOSHLAMAGAN o'qituvchi ham shu
 * yerda ko'rinadi — ilgari u umuman tushmasdi va unga yordam berishning
 * iloji yo'q edi.
 *
 * Aloqa ustunida birinchi bo'lib RO'YXATDAN O'TGAN raqam turadi: anketadagi
 * `public_phone_e164` ixtiyoriy maydon, u bo'sh bo'lsa ham admin qo'ng'iroq
 * qila olishi kerak.
 */

function fmtDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isActive(value: string | null | undefined): boolean {
  return !!value && new Date(value) > new Date();
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Qoralama',
  pending_review: 'Tekshiruvda',
  active: 'Faol',
  paused: "To'xtatilgan",
  rejected: 'Rad etilgan',
};

const STATUS_TONES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending_review: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  paused: 'bg-amber-100 text-amber-700',
  draft: 'bg-slate-200 text-app-text',
};

/** Tahrir oynasidagi maydonlar. `kind` — qanday jo'natilishi. */
const FIELDS: ReadonlyArray<{
  key: string;
  label: string;
  kind: 'text' | 'area' | 'num' | 'list' | 'date';
  hint?: string;
}> = [
  { key: 'display_name', label: 'Ko‘rinadigan ism', kind: 'text' },
  { key: 'first_name', label: 'Ism', kind: 'text' },
  { key: 'last_name', label: 'Familiya', kind: 'text' },
  { key: 'age', label: 'Yosh', kind: 'num' },
  { key: 'birth_date', label: 'Tug‘ilgan sana', kind: 'date' },
  { key: 'region', label: 'Viloyat', kind: 'text' },
  { key: 'city', label: 'Shahar', kind: 'text' },
  { key: 'experience_years', label: 'Tajriba (yil)', kind: 'num' },
  { key: 'experience_months', label: 'Tajriba (oy)', kind: 'num' },
  { key: 'teaching_format', label: 'Dars formati', kind: 'text', hint: 'online / offline / aralash' },
  { key: 'monthly_course_price_amount', label: 'Oylik narx', kind: 'num' },
  { key: 'monthly_course_price_currency', label: 'Valyuta', kind: 'text', hint: 'UZS / RUB / USD' },
  { key: 'public_phone_e164', label: 'Ommaviy telefon', kind: 'text', hint: '+998…' },
  { key: 'whatsapp_phone_e164', label: 'WhatsApp', kind: 'text' },
  { key: 'telegram_username', label: 'Telegram', kind: 'text', hint: '@nomsiz' },
  { key: 'public_email', label: 'Email', kind: 'text' },
  { key: 'subjects', label: 'Fanlar', kind: 'list', hint: 'vergul bilan' },
  { key: 'teaching_levels', label: 'Darajalar', kind: 'list', hint: 'A1, A2, B1…' },
  { key: 'languages', label: 'Tillar', kind: 'list', hint: 'vergul bilan' },
  { key: 'headline', label: 'Qisqa tavsif', kind: 'text' },
  { key: 'about', label: 'Batafsil', kind: 'area' },
  { key: 'admin_note', label: 'Admin izohi', kind: 'area', hint: "faqat adminlar ko'radi" },
];

type Draft = Record<string, string>;

function rowToDraft(row: AdminTeacherRow): Draft {
  const d: Draft = {};
  for (const f of FIELDS) {
    const v = (row as unknown as Record<string, unknown>)[f.key];
    if (v == null) d[f.key] = '';
    else if (Array.isArray(v)) d[f.key] = v.join(', ');
    else d[f.key] = String(v);
  }
  return d;
}

export default function AdminTeachersPage() {
  const [rows, setRows] = useState<AdminTeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actioning, setActioning] = useState<number | null>(null);

  const [editing, setEditing] = useState<AdminTeacherRow | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    getAdminTeachers()
      .then((data) => setRows(data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Yuklash xatosi'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatus(userId: number, status: 'active' | 'paused' | 'rejected') {
    setError('');
    setNotice('');
    setActioning(userId);
    try {
      await updateTeacherStatus(userId, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Amal bajarilmadi');
    } finally {
      setActioning(null);
    }
  }

  async function handleRecommend(userId: number, recommended: boolean) {
    setError('');
    setActioning(userId);
    try {
      await setTeacherRecommended(userId, recommended);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Amal bajarilmadi');
    } finally {
      setActioning(null);
    }
  }

  function openEdit(row: AdminTeacherRow) {
    setError('');
    setNotice('');
    setEditing(row);
    setDraft(rowToDraft(row));
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      /*
       * Faqat O'ZGARGAN maydonlar jo'natiladi. Hammasini yuborish anketani
       * to'ldirmagan o'qituvchida bo'sh satrlar bilan to'ldirib yuborardi.
       */
      const asl = rowToDraft(editing);
      const patch: Record<string, unknown> = {};
      for (const f of FIELDS) {
        const yangi = (draft[f.key] ?? '').trim();
        if (yangi === (asl[f.key] ?? '').trim()) continue;
        if (f.kind === 'num') patch[f.key] = yangi === '' ? null : Number(yangi);
        else if (f.kind === 'list') patch[f.key] = yangi ? yangi.split(',').map((x) => x.trim()).filter(Boolean) : [];
        else patch[f.key] = yangi;
      }
      if (Object.keys(patch).length === 0) {
        setEditing(null);
        return;
      }
      const res = await updateTeacherProfile(editing.user_id, patch);
      setNotice(res.created ? 'Anketa yaratildi va saqlandi.' : 'Anketa yangilandi.');
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlanmadi');
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows;
    if (onlyIncomplete) list = list.filter((r) => !r.has_profile || !r.city || !r.headline);
    if (!needle) return list;
    return list.filter((row) =>
      [
        row.display_name,
        row.account_first_name,
        row.account_last_name,
        row.account_phone,
        row.account_email,
        row.region,
        row.city,
        row.profile_status,
        row.public_phone_e164,
        row.public_email,
        String(row.user_id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [q, rows, onlyIncomplete]);

  const anketasiz = rows.filter((r) => !r.has_profile).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">O'qituvchilar</h1>
          <p className="text-sm text-app-text-muted">
            Ro'yxatdan o'tgan hamma o'qituvchi — anketa to'ldirilgan yoki yo'q.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl bg-app-surface px-4 py-3 text-sm font-semibold text-app-text shadow-sm ring-1 ring-slate-200">
            Jami: {rows.length}
          </div>
          {anketasiz > 0 ? (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm ring-1 ring-amber-200">
              Anketasiz: {anketasiz}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-[280px] flex-1 items-center gap-2 rounded-xl bg-app-surface px-3 py-2 shadow-sm ring-1 ring-slate-200">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism, telefon, ID yoki status bo'yicha qidirish"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-app-surface px-3 py-2.5 text-sm font-semibold text-app-text shadow-sm ring-1 ring-slate-200">
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={(e) => setOnlyIncomplete(e.target.checked)}
            className="h-4 w-4"
          />
          Faqat to'liq to'ldirilmaganlar
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl bg-app-surface shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-app-bg-muted text-left text-xs font-bold uppercase text-app-text-muted">
              <tr>
                <th className="px-4 py-3">O'qituvchi</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3">Aloqa</th>
                <th className="px-4 py-3">Tajriba / Narx</th>
                <th className="px-4 py-3">Ro'yxat muddati</th>
                <th className="px-4 py-3">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-app-text-muted" colSpan={6}>Yuklanmoqda...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-app-text-muted" colSpan={6}>Ma'lumot yo'q.</td></tr>
              ) : (
                filtered.map((row) => {
                  const ism =
                    row.display_name ||
                    [row.account_first_name, row.account_last_name].filter(Boolean).join(' ') ||
                    'Ismsiz';
                  const status = row.profile_status ?? 'draft';
                  return (
                    <tr key={row.user_id} className={`hover:bg-app-bg-muted/70 ${row.has_profile ? '' : 'bg-amber-50/40'}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-app-text">{ism}</div>
                        <div className="text-xs text-app-text-muted">
                          ID: {row.user_id}
                          {row.age ? ` · ${row.age} yosh` : ''}
                          {row.registered_at ? ` · ${fmtDate(row.registered_at)}` : ''}
                        </div>
                        {row.headline ? (
                          <div className="mt-1 max-w-xs truncate text-xs text-app-text-muted">{row.headline}</div>
                        ) : null}
                        <div className="mt-1 text-xs text-app-text-muted">
                          {[row.region, row.city].filter(Boolean).join(', ') || 'Joylashuv kiritilmagan'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONES[status] ?? 'bg-slate-200 text-app-text'}`}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                        {!row.has_profile ? (
                          <div className="mt-1.5 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                            Anketa boshlanmagan
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-app-text">
                        {/* Ro'yxatdan o'tgan raqam — har doim bor, admin shu bilan bog'lanadi. */}
                        <div className="flex items-center gap-1.5 font-semibold text-app-text">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {row.account_phone ? (
                            <a href={`tel:${row.account_phone}`} className="hover:text-blue-700">{row.account_phone}</a>
                          ) : (
                            <span className="text-slate-400">raqam yo'q</span>
                          )}
                        </div>
                        {row.account_email ? <div className="text-xs text-app-text-muted">{row.account_email}</div> : null}
                        {row.public_phone_e164 && row.public_phone_e164 !== row.account_phone ? (
                          <div className="mt-1 text-xs text-app-text-muted">Anketada: {row.public_phone_e164}</div>
                        ) : null}
                        {row.telegram_username ? (
                          <div className="text-xs text-app-text-muted">{row.telegram_username}</div>
                        ) : null}
                        {row.telegram_url ? (
                          <a className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-700" href={row.telegram_url} target="_blank" rel="noreferrer">
                            Telegram <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-app-text">
                        <div>{row.experience_years ?? 0} yil {row.experience_months ?? 0} oy</div>
                        <div className="font-semibold text-app-text">
                          {Number(row.monthly_course_price_amount || 0).toLocaleString('ru-RU')}{' '}
                          {row.monthly_course_price_currency ?? ''}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className={isActive(row.listing_paid_until) ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>
                          {fmtDate(row.listing_paid_until)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {row.has_profile ? 'Tahrirlash' : "To'ldirish"}
                          </button>
                          {status !== 'active' ? (
                            <button
                              type="button"
                              disabled={actioning === row.user_id}
                              onClick={() => handleStatus(row.user_id, 'active')}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Tasdiqlash
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actioning === row.user_id}
                              onClick={() => handleStatus(row.user_id, 'paused')}
                              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                            >
                              To'xtatish
                            </button>
                          )}
                          {status !== 'rejected' ? (
                            <button
                              type="button"
                              disabled={actioning === row.user_id}
                              onClick={() => handleStatus(row.user_id, 'rejected')}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Rad etish
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={actioning === row.user_id}
                            onClick={() => handleRecommend(row.user_id, !row.is_recommended)}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                              row.is_recommended
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-app-bg-subtle text-app-text hover:bg-slate-200'
                            }`}
                          >
                            <BadgeCheck className="h-3.5 w-3.5" />
                            {row.is_recommended ? 'Tavsiyada' : 'Tavsiya'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tahrir oynasi — admin anketani o'zi to'ldiradi yoki tuzatadi. */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-app-surface shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-app-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-app-text">
                  Anketani {editing.has_profile ? 'tahrirlash' : "to'ldirish"}
                </h2>
                <p className="mt-0.5 text-sm text-app-text-muted">
                  ID {editing.user_id}
                  {editing.account_phone ? ` · ${editing.account_phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-app-bg-subtle hover:text-app-text"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <label key={f.key} className={f.kind === 'area' ? 'sm:col-span-2' : ''}>
                  <span className="block text-xs font-bold uppercase tracking-wide text-app-text-muted">
                    {f.label}
                    {f.hint ? <span className="ml-1 font-medium normal-case text-slate-400">({f.hint})</span> : null}
                  </span>
                  {f.kind === 'area' ? (
                    <textarea
                      rows={3}
                      value={draft[f.key] ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  ) : (
                    <input
                      type={f.kind === 'num' ? 'number' : f.kind === 'date' ? 'date' : 'text'}
                      value={draft[f.key] ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-app-border px-6 py-4">
              <p className="text-xs text-app-text-muted">
                Faqat o'zgartirilgan maydonlar saqlanadi. Status va to'lov muddati bu yerdan o'zgarmaydi.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg bg-app-bg-subtle px-4 py-2 text-sm font-bold text-app-text hover:bg-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveEdit}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
