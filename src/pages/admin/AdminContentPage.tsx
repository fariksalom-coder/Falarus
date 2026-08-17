/**
 * AdminContentPage — kunlik kurs kontentini boshqarish paneli.
 *
 * Bitta sahifada: kun tanlanadi → bo'lim tanlanadi (nazariya, testlar,
 * juftlik, gap tuzish, gapirish, lug'at, o'qish) → jadval chiqadi. Har qatorni
 * tahrirlash, o'chirish, tartibini yuqori/quyi ko'chirish, yangisini qo'shish
 * mumkin.
 *
 * Maydonlar SERVER SXEMASIDAN quriladi (`/api/admin/content/schema`) — jadvalga
 * yangi ustun qo'shilsa, bu sahifani o'zgartirish shart emas.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import {
  createContent,
  deleteContent,
  getContentSchema,
  getDayOverview,
  listContent,
  moveContent,
  updateContent,
  type ContentField,
  type ContentResource,
  type ContentRow,
} from '../../api/adminContent';
import { TOTAL_DAYS } from '../../data/dailyPlan';
import SqlConsole from '../../components/admin/SqlConsole';

/** Massiv maydonlari jadvalda va inputda "|" bilan ko'rsatiladi. */
function fieldToInput(field: ContentField, value: unknown): string {
  if (field.type === 'stringArray') return Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return value == null ? '' : String(value);
}

function cellText(field: ContentField, value: unknown): string {
  if (field.type === 'stringArray') return Array.isArray(value) ? value.join(' · ') : String(value ?? '');
  if (field.type === 'select') {
    const opt = field.options?.find((o) => String(o.value) === String(value));
    return opt ? opt.label : String(value ?? '');
  }
  return value == null ? '' : String(value);
}

export default function AdminContentPage() {
  const [resources, setResources] = useState<ContentResource[]>([]);
  const [activeKey, setActiveKey] = useState<string>('grammar-mcq');
  const [day, setDay] = useState(1);
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ row: ContentRow | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /** Maxsus tab: jadval o'rniga SQL konsoli ochiladi. */
  const SQL_TAB = 'sql';
  const sqlMode = activeKey === SQL_TAB;
  const active = useMemo(
    () => (sqlMode ? null : resources.find((r) => r.key === activeKey) ?? null),
    [resources, activeKey, sqlMode],
  );

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    getContentSchema()
      .then((s) => setResources(s.resources))
      .catch((e) => setError(e instanceof Error ? e.message : 'Sxemani olishda xato'));
  }, []);

  const reload = useCallback(async () => {
    if (!active) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, overview] = await Promise.all([
        listContent(active.key, { day: active.dayScoped ? day : undefined, q: search || undefined }),
        getDayOverview(day).catch(() => ({})),
      ]);
      setRows(list);
      setCounts(overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xato');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [active, day, search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const tableFields = useMemo(() => (active?.fields ?? []).filter((f) => f.inTable), [active]);

  async function onDelete(row: ContentRow) {
    if (!active) return;
    const id = row[active.pk];
    if (!window.confirm("Bu qatorni o'chirasizmi? Bu amalni qaytarib bo'lmaydi.")) return;
    try {
      await deleteContent(active.key, String(id));
      flash("O'chirildi");
      void reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "O'chirib bo'lmadi");
    }
  }

  async function onMove(row: ContentRow, dir: 'up' | 'down') {
    if (!active) return;
    try {
      await moveContent(active.key, String(row[active.pk]), dir);
      void reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Ko'chirib bo'lmadi");
    }
  }

  return (
    <div className="space-y-5">
      {/* Sarlavha + kun tanlash */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Kurs kontenti</h1>
          <p className="text-[13px] text-slate-500">
            Darslik, testlar va mashqlarni shu yerdan tahrirlaysiz
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDay((d) => Math.max(1, d - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200 transition active:scale-95"
            aria-label="Oldingi kun"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Kun</span>
            <input
              type="number"
              min={1}
              max={TOTAL_DAYS}
              value={day}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setDay(Math.min(TOTAL_DAYS, Math.max(1, Math.trunc(n))));
              }}
              className="w-16 bg-transparent text-center text-[16px] font-black text-slate-900 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setDay((d) => Math.min(TOTAL_DAYS, d + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200 transition active:scale-95"
            aria-label="Keyingi kun"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bo'limlar */}
      <div className="flex flex-wrap gap-2">
        {resources.map((r) => {
          const n = counts[r.key];
          const on = r.key === activeKey;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                setActiveKey(r.key);
                setSearch('');
              }}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 text-[13px] font-bold transition ${
                on ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {r.label}
              {n != null ? (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-black ${
                    on ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {n}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* SQL — jadval emas, konsol. Ko'p o'zgarishni bir vaqtda qilish uchun. */}
        <button
          type="button"
          onClick={() => setActiveKey(SQL_TAB)}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 text-[13px] font-black transition ${
            sqlMode ? 'bg-slate-900 text-white' : 'bg-slate-900/5 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-900/10'
          }`}
        >
          <Terminal className="h-4 w-4" /> SQL
        </button>
      </div>

      {sqlMode ? (
        <SqlConsole embedded />
      ) : (
      <>
      {/* Qidiruv + qo'shish */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-slate-200">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Matn bo'yicha qidirish…"
            className="min-h-[40px] w-full bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          {search ? (
            <button type="button" onClick={() => setSearch('')} aria-label="Tozalash">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          ) : null}
        </div>
        {active && !active.singleton ? (
          <button
            type="button"
            onClick={() => setEditing({ row: null })}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-bold text-white transition active:scale-95"
          >
            <Plus className="h-4 w-4" /> Yangi qo'shish
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : null}

      {/* Jadval */}
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Bu kunda ma'lumot yo'q.
            {active && !active.singleton ? " «Yangi qo'shish» bilan boshlang." : ''}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-3 py-2.5">#</th>
                  {tableFields.map((f) => (
                    <th key={f.name} className="px-3 py-2.5 font-black">
                      {f.label}
                    </th>
                  ))}
                  <th className="w-[132px] px-3 py-2.5 text-right font-black">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={String(row[active?.pk ?? 'id'])} className="border-b border-slate-50 align-top last:border-0">
                    <td className="px-3 py-3 text-[12px] font-bold text-slate-400">{i + 1}</td>
                    {tableFields.map((f) => (
                      <td key={f.name} className="max-w-[280px] px-3 py-3 text-slate-700">
                        <span className="line-clamp-3 whitespace-pre-wrap break-words">
                          {cellText(f, row[f.name])}
                        </span>
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {active?.orderable ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onMove(row, 'up')}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95"
                              aria-label="Yuqoriga"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMove(row, 'down')}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95"
                              aria-label="Pastga"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setEditing({ row })}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 ring-1 ring-blue-200 transition hover:bg-blue-50 active:scale-95"
                          aria-label="Tahrirlash"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {active && !active.singleton ? (
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 active:scale-95"
                            aria-label="O'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>
      )}

      {editing && active ? (
        <EditDrawer
          resource={active}
          row={editing.row}
          day={day}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            flash(msg);
            void reload();
          }}
        />
      ) : null}

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
          <div className="rounded-full bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Tahrirlash/qo'shish oynasi. */
function EditDrawer({
  resource,
  row,
  day,
  onClose,
  onSaved,
}: {
  resource: ContentResource;
  row: ContentRow | null;
  day: number;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of resource.fields) init[f.name] = fieldToInput(f, row?.[f.name]);
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of resource.fields) {
        const raw = values[f.name] ?? '';
        payload[f.name] = f.type === 'stringArray' ? raw.split('|').map((s) => s.trim()).filter(Boolean) : raw;
      }
      if (row) {
        await updateContent(resource.key, String(row[resource.pk]), payload);
        onSaved('Saqlandi');
      } else {
        await createContent(resource.key, resource.dayScoped ? day : null, payload);
        onSaved("Qo'shildi");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlab bo\'lmadi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-black text-slate-900">
              {row ? 'Tahrirlash' : "Yangi qo'shish"} · {resource.label}
            </h2>
            {resource.dayScoped ? <p className="text-[12px] text-slate-500">{day}-kun</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 ring-1 ring-slate-200"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          {resource.fields.map((f) => (
            <label key={f.name} className="block">
              <span className="mb-1 block text-[12px] font-black text-slate-600">
                {f.label}
                {f.required ? <span className="text-red-500"> *</span> : null}
              </span>
              {f.type === 'textarea' ? (
                <textarea
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-slate-900 outline-none focus:border-blue-500"
                />
              ) : f.type === 'select' ? (
                <select
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-500"
                >
                  <option value="">— tanlang —</option>
                  {(f.options ?? []).map((o) => (
                    <option key={String(o.value)} value={String(o.value)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === 'int' ? 'number' : 'text'}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 text-[14px] text-slate-900 outline-none focus:border-blue-500"
                />
              )}
              {f.type === 'stringArray' ? (
                <span className="mt-1 block text-[11px] text-slate-400">
                  So'zlarni <b>|</b> belgisi bilan ajrating. Masalan: Я | иду | в | магазин
                </span>
              ) : null}
            </label>
          ))}
        </div>

        {error ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">{error}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15px] font-black text-white transition active:scale-[0.99] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Saqlash
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] rounded-2xl px-5 text-[15px] font-bold text-slate-600 ring-1 ring-slate-200"
          >
            Bekor
          </button>
        </div>
      </div>
    </div>
  );
}
