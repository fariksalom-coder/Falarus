import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, MoreVertical, Pencil, RefreshCw, Search, Trash2, Unlock, X } from 'lucide-react';
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
 * CHAT NAZORATI — «Savol-Javob» guruhi messenjer ko'rinishida.
 *
 * Bloklash — o'chirish emas: odam chatni o'qiyveradi, lekin yozolmaydi.
 * Yagona ochiq kanal Support bo'lib qoladi, shuning uchun bloklangan odam
 * sababini so'ray oladi. Brauzer prompt/confirm oynalari ishlatilmaydi:
 * bloklash — o'z oynasida, o'chirish — ikki bosqichli tugma.
 */

const DAY_OPTIONS = [
  { value: '1', label: '1 kun' },
  { value: '3', label: '3 kun' },
  { value: '7', label: '7 kun' },
  { value: '30', label: '30 kun' },
  { value: '', label: 'Muddatsiz' },
];

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
const AVATAR_TONES = ['bg-blue-100 text-blue-800', 'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-800', 'bg-rose-100 text-rose-800'];
const toneOf = (id: number) => AVATAR_TONES[id % AVATAR_TONES.length];
const time = (iso: string) => new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
// Brauzerlarning uz-UZ formati ishonchsiz («M10 24»), shuning uchun oy nomlari qo'lda.
const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const dayKey = (iso: string) => { const d = new Date(iso); return `${d.getDate()}-${OYLAR[d.getMonth()]}`; };

type BlockDraft = { userId: string; name: string; reason: string; days: string; editing: boolean };

function BlockDialog({ draft, busy, onChange, onClose, onSubmit }: {
  draft: BlockDraft; busy: boolean; onChange: (d: BlockDraft) => void; onClose: () => void; onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" onClick={onClose}>
      <form
        className="w-full max-w-md rounded-[24px] bg-app-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-app-text">{draft.editing ? 'Blokni o‘zgartirish' : 'Chatda bloklash'}</h2>
            <p className="mt-0.5 text-xs text-app-text-muted">Odam chatni o‘qiydi, lekin yozolmaydi. Support ochiq qoladi.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-app-bg-muted"><X className="h-4 w-4" /></button>
        </div>
        {draft.name ? (
          <p className="mb-3 rounded-xl bg-app-bg-muted px-3 py-2 text-sm font-semibold text-app-text">{draft.name} <span className="text-xs text-slate-400">#{draft.userId}</span></p>
        ) : (
          <label className="mb-3 block text-xs font-semibold text-app-text-muted">Foydalanuvchi ID
            <input autoFocus inputMode="numeric" value={draft.userId} onChange={(e) => onChange({ ...draft, userId: e.target.value.replace(/\D/g, '') })}
              className="mt-1 h-11 w-full rounded-xl border border-app-border px-3 text-sm font-semibold text-app-text outline-none focus:border-blue-400" />
          </label>
        )}
        <label className="mb-3 block text-xs font-semibold text-app-text-muted">Sabab
          <input value={draft.reason} maxLength={300} onChange={(e) => onChange({ ...draft, reason: e.target.value })} placeholder="Masalan: reklama, haqorat"
            className="mt-1 h-11 w-full rounded-xl border border-app-border px-3 text-sm font-semibold text-app-text outline-none focus:border-blue-400" />
        </label>
        <p className="mb-1.5 text-xs font-semibold text-app-text-muted">Muddat</p>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {DAY_OPTIONS.map((o) => (
            <button key={o.label} type="button" aria-pressed={draft.days === o.value} onClick={() => onChange({ ...draft, days: o.value })}
              className={`min-h-10 rounded-full px-3.5 text-sm font-semibold transition active:scale-[0.97] ${draft.days === o.value ? 'bg-slate-900 text-white' : 'border border-app-border text-app-text hover:bg-app-bg-muted'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <button type="submit" disabled={busy || !draft.userId} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 text-sm font-bold text-white transition hover:bg-amber-600 active:scale-[0.99] disabled:opacity-60">
          <Lock className="h-4 w-4" />{draft.editing ? 'Saqlash' : 'Bloklash'}
        </button>
      </form>
    </div>
  );
}

function MessageRow({ m, blocked, busy, editing, onEdit, onSaveEdit, onCancelEdit, onDelete, onBlock }: {
  m: AdminCommunityMessage; blocked: boolean; busy: boolean; editing: boolean;
  onEdit: () => void; onSaveEdit: (text: string) => void; onCancelEdit: () => void; onDelete: () => void; onBlock: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [text, setText] = useState(m.content);
  useEffect(() => { if (editing) setText(m.content); }, [editing, m.content]);
  useEffect(() => { if (!menu) setConfirmDelete(false); }, [menu]);

  return (
    <div className="group flex gap-2.5 px-3 py-1.5 sm:px-4" onMouseLeave={() => setMenu(false)}>
      <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${toneOf(m.sender_user_id)}`}>{initials(m.sender_name)}</span>
      <div className="min-w-0 max-w-[min(560px,100%)] flex-1">
        <div className="relative inline-block max-w-full rounded-2xl rounded-tl-md bg-app-surface px-3.5 py-2 shadow-sm ring-1 ring-app-border">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-bold text-app-text">
            {m.sender_name}<span className="text-[11px] font-semibold text-slate-400">#{m.sender_user_id}</span>
            {blocked && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">bloklangan</span>}
          </p>
          {editing ? (
            <div className="mt-1.5 w-[min(480px,70vw)]">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} autoFocus
                className="w-full resize-none rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none focus:border-blue-400" />
              <div className="mt-1.5 flex justify-end gap-2">
                <button type="button" onClick={onCancelEdit} className="min-h-9 rounded-xl px-3 text-sm font-semibold text-app-text-muted hover:bg-app-bg-muted">Bekor</button>
                <button type="button" disabled={busy || !text.trim()} onClick={() => onSaveEdit(text.trim())} className="min-h-9 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white disabled:opacity-60">Saqlash</button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-app-text">{m.content}</p>
          )}
          <p className="mt-0.5 text-right text-[10.5px] font-semibold text-slate-400">{m.edited_at ? 'tahrirlangan · ' : ''}{time(m.created_at)}</p>
        </div>
      </div>
      {!editing && (
        <div className="relative shrink-0 self-center">
          <button type="button" aria-label="Amallar" aria-expanded={menu} onClick={() => setMenu((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-app-surface hover:text-app-text sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
            <MoreVertical className="h-4 w-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-2xl border border-app-border bg-app-surface py-1 shadow-xl">
              <button type="button" onClick={() => { setMenu(false); onEdit(); }} className="flex min-h-11 w-full items-center gap-2.5 px-3 text-sm font-semibold text-app-text hover:bg-app-bg-muted"><Pencil className="h-4 w-4" />Tahrirlash</button>
              <button type="button" onClick={() => { setMenu(false); onBlock(); }} className="flex min-h-11 w-full items-center gap-2.5 px-3 text-sm font-semibold text-amber-700 hover:bg-amber-50"><Lock className="h-4 w-4" />{blocked ? 'Blokni o‘zgartirish' : 'Bloklash'}</button>
              <button type="button" disabled={busy} onClick={() => (confirmDelete ? (setMenu(false), onDelete()) : setConfirmDelete(true))}
                className={`flex min-h-11 w-full items-center gap-2.5 px-3 text-sm font-semibold ${confirmDelete ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50'}`}>
                <Trash2 className="h-4 w-4" />{confirmDelete ? 'Ha, o‘chirilsin' : 'O‘chirish'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminChatModerationPage() {
  const [blocks, setBlocks] = useState<AdminChatBlock[]>([]);
  const [messages, setMessages] = useState<AdminCommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [query, setQuery] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [b, m] = await Promise.all([getChatBlocks(), getCommunityMessages(200)]);
      setBlocks(b);
      setMessages(m);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function amal(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      setEditingId(null);
      setDraft(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Amal bajarilmadi');
    } finally {
      setBusy(false);
    }
  }

  const blockedIds = useMemo(() => new Set(blocks.map((b) => b.user_id)), [blocks]);
  // Server eng yangisini birinchi beradi; chatda eng yangisi pastda.
  const feed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...messages].reverse().filter((m) => !q || m.content.toLowerCase().includes(q) || m.sender_name.toLowerCase().includes(q) || String(m.sender_user_id) === q);
  }, [messages, query]);

  useEffect(() => {
    if (!loading && feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [loading, feed.length]);

  const openBlock = (userId: number, name: string) => {
    const existing = blocks.find((b) => b.user_id === userId);
    setDraft({ userId: String(userId), name, reason: existing?.reason ?? '', days: '', editing: Boolean(existing) });
  };

  return (
    <div className="max-w-[1200px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Chat nazorati</h1>
          <p className="mt-1 text-sm text-app-text-muted">«Savol-Javob» guruhi. Xabar ustidagi ⋮ — tahrirlash, o‘chirish, bloklash.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setDraft({ userId: '', name: '', reason: '', days: '', editing: false })}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white transition active:scale-[0.98]">
            <Lock className="h-4 w-4" />ID bo‘yicha bloklash
          </button>
          <button type="button" onClick={() => void load()} disabled={loading} aria-label="Yangilash"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-text disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {err ? <p role="alert" className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{err}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex h-[min(72vh,760px)] flex-col overflow-hidden rounded-[24px] border border-app-border bg-[#EEF2F7] shadow-app-card" aria-label="Guruh xabarlari">
          <div className="flex items-center gap-3 border-b border-app-border bg-app-surface px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-app-text">Savol-Javob</p>
              <p className="text-xs text-app-text-muted">{messages.length} ta oxirgi xabar</p>
            </div>
            <label className="relative w-44 sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ism, ID yoki matn" aria-label="Xabarlardan qidirish"
                className="h-10 w-full rounded-xl border border-app-border bg-app-bg-muted pl-9 pr-3 text-sm text-app-text outline-none focus:border-blue-400" />
            </label>
          </div>
          <div ref={feedRef} className="flex-1 overflow-y-auto py-3">
            {loading && messages.length === 0 ? (
              <div className="space-y-3 px-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 w-2/3 animate-pulse rounded-2xl bg-white/70" />)}</div>
            ) : feed.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-app-text-muted">{query ? 'Hech narsa topilmadi.' : 'Xabar yo‘q.'}</p>
            ) : feed.map((m, i) => (
              <div key={m.id}>
                {(i === 0 || dayKey(feed[i - 1].created_at) !== dayKey(m.created_at)) && (
                  <p className="my-2 text-center"><span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-app-text-muted">{dayKey(m.created_at)}</span></p>
                )}
                <MessageRow
                  m={m}
                  blocked={blockedIds.has(m.sender_user_id)}
                  busy={busy}
                  editing={editingId === m.id}
                  onEdit={() => setEditingId(m.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={(text) => void amal(() => editCommunityMessage(m.id, text))}
                  onDelete={() => void amal(() => deleteCommunityMessage(m.id))}
                  onBlock={() => openBlock(m.sender_user_id, m.sender_name)}
                />
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-[24px] border border-app-border bg-app-surface p-4 shadow-app-card lg:max-h-[min(72vh,760px)] lg:overflow-y-auto" aria-labelledby="blocked-heading">
          <h2 id="blocked-heading" className="mb-3 font-bold text-app-text">Bloklanganlar <span className="text-app-text-muted">({blocks.length})</span></h2>
          {blocks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-app-border p-5 text-center text-sm text-app-text-muted">Hozircha hech kim bloklanmagan.</p>
          ) : (
            <ul className="space-y-2.5">
              {blocks.map((b) => (
                <li key={b.id} className="rounded-2xl bg-app-bg-muted p-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${toneOf(b.user_id)}`}>{initials(b.full_name)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-app-text">{b.full_name} <span className="text-xs font-semibold text-slate-400">#{b.user_id}</span></p>
                      <p className="truncate text-xs text-app-text-muted">{b.expires_at ? `${dayKey(b.expires_at)} gacha` : 'Muddatsiz'}{b.blocked_by_name ? ` · ${b.blocked_by_name}` : ''}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-app-text">{b.reason || 'Sabab yozilmagan'}</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button type="button" disabled={busy} onClick={() => setDraft({ userId: String(b.user_id), name: b.full_name, reason: b.reason ?? '', days: '', editing: true })}
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-app-border bg-app-surface text-xs font-bold text-app-text disabled:opacity-60">
                      <Pencil className="h-3.5 w-3.5" />O‘zgartirish
                    </button>
                    <button type="button" disabled={busy} onClick={() => void amal(() => unblockChatUser(b.user_id))}
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white disabled:opacity-60">
                      <Unlock className="h-3.5 w-3.5" />Ochish
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {draft && (
        <BlockDialog
          draft={draft}
          busy={busy}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSubmit={() => void amal(() => blockChatUser({ user_id: Number(draft.userId), reason: draft.reason.trim(), days: draft.days ? Number(draft.days) : null }))}
        />
      )}
    </div>
  );
}
