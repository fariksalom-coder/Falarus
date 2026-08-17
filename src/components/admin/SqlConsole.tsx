/**
 * SqlConsole — kurs kontenti uchun SQL konsoli.
 *
 * "Kurs kontenti" panelining "SQL" tabida va alohida `/sql` sahifasida —
 * bitta komponent, ikki joyda. Shu sababli mantiq bir joyda turadi.
 *
 * Ish tartibi ATAYIN ikki qadamli:
 *   1) "Tekshirish" — skript bajariladi, nechta qator o'zgarishi ko'rsatiladi,
 *      so'ng ROLLBACK. Bazada hech narsa qolmaydi.
 *   2) "Bajarish" — o'sha skript COMMIT bilan qo'llanadi.
 *
 * Chegara serverda: konsol alohida, faqat kontent jadvallariga huquqi bor
 * PostgreSQL roli orqali ishlaydi. `users`, `payments` va DDL — baza darajasida
 * rad etiladi.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, Database, History, Loader2, Play, ShieldCheck, Upload } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';

type SqlResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  command: string;
};

type RunResult = {
  dryRun: boolean;
  results: SqlResult[];
  totalChanged: number;
  durationMs: number;
  truncated: boolean;
  /** Skriptdan olib tashlangan BEGIN;/COMMIT; kabi buyruqlar. */
  ignoredCommands?: string[];
  transactionEscaped?: boolean;
};

type HistoryRow = {
  id: number;
  admin_email: string | null;
  sql_text: string;
  dry_run: boolean;
  ok: boolean;
  rows_changed: number;
  error: string | null;
  created_at: string;
};

const NAMUNALAR: { label: string; sql: string }[] = [
  {
    label: 'Kun bo\'yicha testlar',
    sql: 'SELECT id, sort_order, question_text, correct_index\nFROM daily_grammar_mcqs\nWHERE day_number = 5\nORDER BY sort_order;',
  },
  {
    label: "Savol matnini almashtirish",
    sql: "UPDATE daily_grammar_mcqs\nSET question_text = replace(question_text, 'eski matn', 'yangi matn')\nWHERE question_text LIKE '%eski matn%';",
  },
  {
    label: "So'z bankiga so'z qo'shish",
    sql: "UPDATE daily_grammar_sentence_arrange\nSET word_bank = word_bank || ARRAY['yangi']\nWHERE id = 1796;",
  },
  {
    label: "Ko'p buyruq (bir vaqtda)",
    sql: "-- Nuqtali vergul bilan ajratilgan har bir buyruq bajariladi.\n-- Bittasi xato bo'lsa, hammasi bekor qilinadi.\nUPDATE daily_vocab_words SET word_ru = trim(word_ru) WHERE day_number = 1;\nUPDATE daily_reading_lexemes SET translation_uz = trim(translation_uz)\n  WHERE text_id = (SELECT text_id FROM daily_reading_passages WHERE day_number = 1);\nSELECT count(*) AS lugat FROM daily_vocab_words WHERE day_number = 1;",
  },
  {
    // Kun skriptlarida eng ko'p uchraydigan xato: matndagi bir so'z ikki marta
    // yozilib qoladi (masalan "Меня" va "меня") — cheklov butun skriptni bekor qiladi.
    label: "Matn so'zlari (takrordan himoyalangan)",
    sql:
      "-- daily_reading_lexemes da (text_id, word_ru_normalized) TAKRORLANMASLIGI shart.\n" +
      "-- ON CONFLICT ... DO NOTHING bo'lsa, bir so'z ikki marta yozilgan bo'lsa ham\n" +
      "-- skript to'xtamaydi (DO UPDATE emas: u bitta skriptdagi takrorda xato beradi).\n" +
      "INSERT INTO daily_reading_lexemes (word_ru, translation_uz, text_id, word_ru_normalized)\n" +
      "VALUES\n" +
      "  ('Меня','meni','kunlik-oqish-110','меня'),\n" +
      "  ('зовут','ismi (chaqirishadi)','kunlik-oqish-110','зовут')\n" +
      'ON CONFLICT (text_id, word_ru_normalized) DO NOTHING;',
  },
  {
    label: "O'qish so'zini tuzatish",
    sql: "UPDATE daily_reading_lexemes\nSET translation_uz = 'yangi tarjima'\nWHERE word_ru_normalized = 'книга'\n  AND text_id = (SELECT text_id FROM daily_reading_passages WHERE day_number = 12);",
  },
  {
    label: "Lug'atdagi tarjimani tuzatish",
    sql: "UPDATE daily_vocab_words\nSET word_ru = 'to''g''ri tarjima'\nWHERE day_number = 3 AND word_uz = 'so''z';",
  },
];

export default function SqlConsole({ embedded = false }: { embedded?: boolean } = {}) {
  const [sql, setSql] = useState(NAMUNALAR[0].sql);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [running, setRunning] = useState<false | 'dry' | 'apply'>(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  /** "Bajarish" faqat muvaffaqiyatli tekshiruvdan keyin ochiladi. */
  const [checkedSql, setCheckedSql] = useState<string | null>(null);

  useEffect(() => {
    adminApi<{ enabled: boolean }>('/sql/status')
      .then((s) => setEnabled(s.enabled))
      .catch(() => setEnabled(false));
  }, []);

  async function loadHistory() {
    try {
      const h = await adminApi<{ rows: HistoryRow[] }>('/sql/history');
      setHistory(h.rows);
    } catch {
      /* jurnal bo'lmasa ham konsol ishlayveradi */
    }
  }

  async function run(dryRun: boolean) {
    setRunning(dryRun ? 'dry' : 'apply');
    setError(null);
    setResult(null);
    try {
      const out = await adminApi<RunResult>('/sql/run', {
        method: 'POST',
        body: JSON.stringify({ sql, dryRun }),
      });
      setResult(out);
      if (dryRun) setCheckedSql(sql);
      else {
        setCheckedSql(null);
        void loadHistory();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      setCheckedSql(null);
    } finally {
      setRunning(false);
    }
  }

  const canApply = checkedSql === sql && !running;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {embedded ? (
            <p className="text-[13px] text-slate-500">
              Ko'p o'zgarishni bir vaqtda qilish uchun. Avval tekshiring, keyin bajaring.
            </p>
          ) : (
            <>
              <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <Database className="h-5 w-5 text-slate-400" /> SQL konsoli
              </h1>
              <p className="text-[13px] text-slate-500">
                Ko'p o'zgarishni bir vaqtda qilish uchun. Avval tekshiring, keyin bajaring.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setShowHistory((v) => !v);
            if (!showHistory) void loadHistory();
          }}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-white px-3.5 text-[13px] font-bold text-slate-700 ring-1 ring-slate-200"
        >
          <History className="h-4 w-4" /> Jurnal
        </button>
      </div>

      {/* Chegaralar haqida — admin nima mumkinligini bilib tursin */}
      <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-[13px] leading-snug text-emerald-900">
          Konsol <b>faqat kurs kontenti</b> jadvallariga tegadi: nazariya, testlar, juftlik,
          gap tuzish, gapirish, lug'at, o'qish matni va so'z izohlari. Foydalanuvchilar,
          to'lovlar va jadval tuzilmasi (DROP/ALTER) <b>baza darajasida</b> yopilgan — bu yerda
          qanday buyruq yozilishidan qat'i nazar.
          <br />
          Skriptda <b>nechta buyruq bo'lsa, hammasi bajariladi</b> (nuqtali vergul bilan
          ajrating). Bittasi xato bo'lsa — <b>hammasi bekor qilinadi</b>, ya'ni baza yarim
          o'zgargan holatda qolmaydi.
        </p>
      </div>

      {enabled === false ? (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[13px] text-amber-900">
            Konsol sozlanmagan: serverdagi <code className="font-mono">.env</code> da{' '}
            <code className="font-mono">SQL_CONSOLE_DATABASE_URL</code> yo'q (cheklangan rol).
          </p>
        </div>
      ) : null}

      {/* Namunalar + fayl yuklash */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-[12.5px] font-bold text-white transition active:scale-95">
          <Upload className="h-4 w-4" /> .sql faylni yuklash
          <input
            type="file"
            accept=".sql,text/plain"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 200_000) {
                setError('Fayl juda katta (maksimum 200 KB)');
                return;
              }
              setSql(await f.text());
              setCheckedSql(null);
              setResult(null);
              setError(null);
              e.target.value = '';
            }}
          />
        </label>
        {NAMUNALAR.map((n) => (
          <button
            key={n.label}
            type="button"
            onClick={() => {
              setSql(n.sql);
              setCheckedSql(null);
              setResult(null);
            }}
            className="rounded-xl bg-white px-3 py-2 text-[12.5px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            {n.label}
          </button>
        ))}
      </div>

      <textarea
        value={sql}
        onChange={(e) => {
          setSql(e.target.value);
          setCheckedSql(null);
        }}
        spellCheck={false}
        rows={12}
        className="w-full rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 font-mono text-[13.5px] leading-relaxed text-slate-100 outline-none focus:border-blue-500"
        placeholder="SELECT * FROM daily_grammar_mcqs WHERE day_number = 1;"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run(true)}
          disabled={Boolean(running) || enabled === false}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-slate-900 px-5 text-[14px] font-black text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {running === 'dry' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Tekshirish (o'zgarmaydi)
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("Skript BAJARILADI va o'zgarishlar saqlanadi. Davom etasizmi?")) return;
            void run(false);
          }}
          disabled={!canApply || enabled === false}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-red-600 px-5 text-[14px] font-black text-white transition active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400"
        >
          {running === 'apply' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Bajarish
        </button>
        {!canApply && !running ? (
          <span className="text-[12.5px] text-slate-500">
            «Bajarish» tugmasi tekshiruvdan keyin ochiladi
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="whitespace-pre-wrap break-words rounded-2xl bg-red-50 px-4 py-3 font-mono text-[13px] leading-relaxed text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <div
            className={`rounded-2xl px-4 py-3 text-[13.5px] font-bold ring-1 ${
              result.dryRun
                ? 'bg-slate-50 text-slate-700 ring-slate-200'
                : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
            }`}
          >
            {result.dryRun ? 'Tekshiruv (bekor qilindi): ' : 'Bajarildi: '}
            {result.totalChanged} qator o'zgaradi · {result.results.length} ta buyruq ·{' '}
            {result.durationMs} ms
            {result.truncated ? ' · natija qisqartirildi (birinchi 400 qator)' : ''}
          </div>

          {result.ignoredCommands && result.ignoredCommands.length > 0 ? (
            <div className="rounded-2xl bg-blue-50 px-4 py-3 text-[13px] text-blue-900 ring-1 ring-blue-200">
              Skriptdagi{' '}
              <b className="font-mono">{[...new Set(result.ignoredCommands)].join(', ')}</b>{' '}
              buyruqlari e'tiborga olinmadi — konsol skriptni o'zi tranzaksiyaga o'raydi.
              Ular qolsa «Tekshirish» o'zgarishlarni bekor qila olmaydi.
            </div>
          ) : null}

          {result.transactionEscaped ? (
            <div className="flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-800 ring-1 ring-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>
                <b>Diqqat:</b> skript tranzaksiyani o'zi yopib yuborgan — o'zgarishlar
                bekor qilinmagan bo'lishi mumkin. Bazani tekshiring.
              </span>
            </div>
          ) : null}

          {result.results.map((r, i) =>
            r.rows.length > 0 ? (
              <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
                  {r.command} · {r.rows.length} qator
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-[11px] uppercase text-slate-500">
                        {r.columns.map((c) => (
                          <th key={c} className="px-3 py-2 font-black">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-slate-50 last:border-0">
                          {r.columns.map((c) => (
                            <td key={c} className="max-w-[280px] truncate px-3 py-2 text-slate-700">
                              {row[c] == null ? '—' : String(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div key={i} className="rounded-2xl bg-white px-4 py-2.5 text-[13px] text-slate-600 ring-1 ring-slate-200">
                {r.command || 'Buyruq'} · {r.rowCount} qator
              </div>
            ),
          )}
        </div>
      ) : null}

      {showHistory ? (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-2.5 text-[12px] font-black uppercase tracking-wide text-slate-500">
            Oxirgi bajarilganlar
          </div>
          {history.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-slate-500">Hozircha yozuv yo'q.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((h) => (
                <li key={h.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-black ${
                        h.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {h.ok ? (h.dry_run ? 'tekshiruv' : 'bajarildi') : 'xato'}
                    </span>
                    <span className="text-slate-500">{new Date(h.created_at).toLocaleString()}</span>
                    {h.admin_email ? <span className="text-slate-400">· {h.admin_email}</span> : null}
                    {h.ok && !h.dry_run ? (
                      <span className="font-bold text-slate-700">· {h.rows_changed} qator</span>
                    ) : null}
                  </div>
                  <pre className="mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3 py-2 font-mono text-[12px] text-slate-700">
                    {h.sql_text}
                  </pre>
                  {h.error ? <p className="mt-1 font-mono text-[12px] text-red-600">{h.error}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
