import { useCallback, useEffect, useState } from 'react';
import { Lock, Pencil, RefreshCw, Trash2, Unlock } from 'lucide-react';
import {
  blockChatUser,
  deleteCommunityMessage,
  editCommunityMessage,
  getChatBlocks,
  getCommunityMessages,
  unblockChatUser,
  type AdminChatBlock,
  type AdminCommunityMessage,
} from '../../api/admin';

/*
 * CHAT NAZORATI.
 *
 * Bloklash — o'chirish emas: odam chatni o'qiyveradi, lekin yozolmaydi.
 * Yagona ochiq kanal Support bo'lib qoladi, shuning uchun bloklangan odam
 * sababini so'ray oladi.
 */
export default function AdminChatModerationPage() {
  const [blocks, setBlocks] = useState<AdminChatBlock[]>([]);
  const [messages, setMessages] = useState<AdminCommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [tahrir, setTahrir] = useState<{ id: number; matn: string } | null>(null);
  const [yangi, setYangi] = useState({ userId: '', reason: '', days: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [b, m] = await Promise.all([getChatBlocks(), getCommunityMessages(60)]);
      setBlocks(b);
      setMessages(m);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function amal(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      await load();
      setTahrir(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Amal bajarilmadi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-black text-app-text">Chat nazorati</h1>
          <p className="mt-1 text-[13px] font-semibold text-app-text-muted">
            Bloklangan odam chatlarda yozolmaydi — faqat o'qiydi va Support'ga yoza oladi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex h-10 items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3.5 text-[13px] font-bold text-app-text disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Yangilash
        </button>
      </div>

      {err ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">{err}</p>
      ) : null}

      {/* Yangi blok */}
      <section className="mb-6 rounded-2xl border border-app-border bg-app-surface p-5">
        <h2 className="mb-3 text-[15px] font-black text-app-text">Yangi blok</h2>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_140px_auto]">
          <input
            value={yangi.userId}
            onChange={(e) => setYangi((v) => ({ ...v, userId: e.target.value }))}
            placeholder="Foydalanuvchi ID"
            className="h-11 rounded-xl border border-app-border px-3 text-[14px] font-semibold text-app-text outline-none"
          />
          <input
            value={yangi.reason}
            onChange={(e) => setYangi((v) => ({ ...v, reason: e.target.value }))}
            placeholder="Sabab (ixtiyoriy)"
            className="h-11 rounded-xl border border-app-border px-3 text-[14px] font-semibold text-app-text outline-none"
          />
          <input
            value={yangi.days}
            onChange={(e) => setYangi((v) => ({ ...v, days: e.target.value }))}
            placeholder="Kun (bo'sh = doim)"
            className="h-11 rounded-xl border border-app-border px-3 text-[14px] font-semibold text-app-text outline-none"
          />
          <button
            type="button"
            disabled={busy || !yangi.userId.trim()}
            onClick={() =>
              void amal(async () => {
                await blockChatUser({
                  user_id: Number(yangi.userId.trim()),
                  reason: yangi.reason.trim(),
                  days: yangi.days.trim() ? Number(yangi.days.trim()) : null,
                });
                setYangi({ userId: '', reason: '', days: '' });
              })
            }
            className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-black text-white disabled:opacity-60"
          >
            <Lock className="h-4 w-4" aria-hidden />
            Bloklash
          </button>
        </div>
      </section>

      {/* Bloklanganlar */}
      <section className="mb-6 rounded-2xl border border-app-border bg-app-surface p-5">
        <h2 className="mb-3 text-[15px] font-black text-app-text">
          Bloklanganlar ({blocks.length})
        </h2>
        {blocks.length === 0 ? (
          <p className="text-[13px] font-semibold text-app-text-muted">Hozircha hech kim bloklanmagan.</p>
        ) : (
          <div className="space-y-2.5">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-app-bg-muted px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-black text-app-text">
                    {b.full_name}{' '}
                    <span className="text-[12px] font-bold text-slate-400">#{b.user_id}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-app-text-muted">
                    {b.phone ?? '—'} · {b.reason || 'sabab yozilmagan'} ·{' '}
                    {b.expires_at
                      ? `${new Date(b.expires_at).toLocaleDateString('uz-UZ')} gacha`
                      : 'muddatsiz'}
                    {b.blocked_by_name ? ` · ${b.blocked_by_name}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void amal(() =>
                      blockChatUser({
                        user_id: b.user_id,
                        reason: window.prompt('Yangi sabab:', b.reason ?? '') ?? b.reason ?? '',
                        days: (() => {
                          const k = window.prompt("Necha kunga? (bo'sh = muddatsiz)", '');
                          return k && k.trim() ? Number(k.trim()) : null;
                        })(),
                      })
                    )
                  }
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 text-[12.5px] font-bold text-app-text disabled:opacity-60"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Tahrirlash
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void amal(() => unblockChatUser(b.user_id))}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[12.5px] font-bold text-white disabled:opacity-60"
                >
                  <Unlock className="h-3.5 w-3.5" aria-hidden />
                  Blokdan chiqarish
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Guruh xabarlari */}
      <section className="rounded-2xl border border-app-border bg-app-surface p-5">
        <h2 className="mb-3 text-[15px] font-black text-app-text">Savol-Javob guruhi — oxirgi xabarlar</h2>
        <div className="space-y-2.5">
          {messages.map((m) => (
            <div key={m.id} className="rounded-xl bg-app-bg-muted px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13.5px] font-black text-app-text">
                  {m.sender_name}{' '}
                  <span className="text-[12px] font-bold text-slate-400">#{m.sender_user_id}</span>
                </p>
                <span className="text-[11.5px] font-bold text-slate-400">
                  {new Date(m.created_at).toLocaleString('uz-UZ')}
                  {m.edited_at ? ' · tahrirlangan' : ''}
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTahrir({ id: m.id, matn: m.content })}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-2.5 text-[12px] font-bold text-app-text"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Tahrir
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void amal(() => deleteCommunityMessage(m.id))}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-2.5 text-[12px] font-bold text-white disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    O'chirish
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void amal(() =>
                        blockChatUser({
                          user_id: m.sender_user_id,
                          reason: window.prompt('Bloklash sababi:') ?? '',
                          days: (() => {
                            const k = window.prompt("Necha kunga? (bo'sh = muddatsiz)", '');
                            return k && k.trim() ? Number(k.trim()) : null;
                          })(),
                        })
                      )
                    }
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 text-[12px] font-bold text-white disabled:opacity-60"
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden />
                    Bloklash
                  </button>
                </div>
              </div>

              {tahrir?.id === m.id ? (
                <div className="mt-2.5 flex gap-2">
                  <textarea
                    value={tahrir.matn}
                    onChange={(e) => setTahrir({ ...tahrir, matn: e.target.value })}
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-app-border px-3 py-2 text-[13.5px] font-semibold text-app-text outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy || !tahrir.matn.trim()}
                    onClick={() => void amal(() => editCommunityMessage(m.id, tahrir.matn.trim()))}
                    className="h-10 self-end rounded-xl bg-slate-900 px-4 text-[13px] font-black text-white disabled:opacity-60"
                  >
                    Saqlash
                  </button>
                </div>
              ) : (
                <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] font-semibold text-app-text">
                  {m.content}
                </p>
              )}
            </div>
          ))}
          {messages.length === 0 && !loading ? (
            <p className="text-[13px] font-semibold text-app-text-muted">Xabar yo'q.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
