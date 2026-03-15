import { useState, useEffect } from 'react';
import { getSupportMessages, replySupport, type AdminSupportRow } from '../../api/admin';
import { AlertCircle } from 'lucide-react';

export default function AdminSupportPage() {
  const [list, setList] = useState<AdminSupportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  function load() {
    setLoading(true);
    getSupportMessages()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleReply(id: number) {
    if (!replyText.trim()) return;
    setReplyingTo(id);
    try {
      await replySupport(id, replyText.trim());
      setReplyText('');
      setReplyingTo(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setReplyingTo(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Support</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((m) => (
              <div key={m.id} className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{m.user}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                    </p>
                    <p className="mt-2 text-slate-700 whitespace-pre-wrap">{m.message}</p>
                    {m.reply && (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                        <span className="text-slate-500">Reply: </span>
                        {m.reply}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        m.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>
                {m.status === 'new' && (
                  <div className="mt-3 flex gap-2">
                    {replyingTo === m.id ? (
                      <>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Javob yozing..."
                          className="flex-1 rounded-lg border border-slate-300 p-2 text-sm min-h-[80px]"
                          rows={3}
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleReply(m.id)}
                            disabled={!replyText.trim()}
                            className="rounded bg-indigo-600 px-3 py-1.5 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            className="rounded bg-slate-300 px-3 py-1.5 text-slate-700 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(m.id)}
                        className="rounded bg-indigo-600 px-3 py-1.5 text-white text-sm hover:bg-indigo-700"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-slate-500">No support messages.</div>
        )}
      </div>
    </div>
  );
}
