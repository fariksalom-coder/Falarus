import { useState, useEffect } from 'react';
import { getPayments, confirmPayment, rejectPayment, refundPayment, type AdminPaymentRow } from '../../api/admin';
import { AlertCircle, ExternalLink } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
  refunded: "Qaytarilgan",
};

const FISCAL_LABELS: Record<string, string> = {
  pending: "Fiskal: kutilmoqda",
  success: "Fiskal: OK",
  failed: "Fiskal: xato",
};

function paymentChannelLabel(ch: string | null | undefined): string {
  switch (ch) {
    case 'click_button':
      return 'Click tugma';
    case 'click_auto_token':
      return 'Click token';
    case 'click_auto_cron':
      return 'Click avto';
    case 'manual':
      return 'Qo‘lda';
    case 'rahmat':
      return 'Rahmat';
    default:
      return '—';
  }
}

export default function AdminPaymentsPage() {
  const [list, setList] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<number | null>(null);

  function load() {
    setLoading(true);
    getPayments()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirm(id: number) {
    setError('');
    setActioning(id);
    try {
      await confirmPayment(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tasdiqlash amalga oshmadi');
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(id: number) {
    setError('');
    setActioning(id);
    try {
      await rejectPayment(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rad etish amalga oshmadi');
    } finally {
      setActioning(null);
    }
  }

  async function handleRefund(id: number) {
    setError('');
    setActioning(id);
    try {
      await refundPayment(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refund amalga oshmadi');
    } finally {
      setActioning(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-app-text mb-4">To'lovlarni tekshirish</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-app-text-muted">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-app-bg-muted border-b border-app-border">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Foydalanuvchi</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Obuna / kurs</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Usul</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Kanal</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Click payment id</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Fiskal</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Fiskal chek</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Valyuta</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">To'lov vaqti</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Chek</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Holat</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-app-border hover:bg-app-bg-muted">
                    <td className="py-3 px-4 font-medium text-app-text">{p.user}</td>
                    <td className="py-3 px-4 text-app-text-muted">{p.user_email}</td>
                    <td className="py-3 px-4 text-app-text-muted">{p.user_phone ?? '—'}</td>
                    <td className="py-3 px-4">{p.product_label}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-app-bg-subtle px-2.5 py-1 text-xs font-semibold text-app-text">
                        {p.payment_provider === 'click'
                          ? 'Click'
                          : p.payment_provider === 'rahmat'
                            ? 'Rahmat'
                            : 'Manual'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-app-text-muted">{paymentChannelLabel(p.payment_channel)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-app-text-muted max-w-[140px] truncate" title={p.click_merchant_payment_id ?? ''}>
                      {p.click_merchant_payment_id ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-app-text-muted">
                      {p.fiscal_status ? FISCAL_LABELS[p.fiscal_status] ?? p.fiscal_status : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-app-text-muted max-w-[180px] truncate" title={p.fiscal_receipt_id ?? ''}>
                      {p.fiscal_receipt_id ? (
                        /^https?:\/\//i.test(p.fiscal_receipt_id) ? (
                          <a
                            href={p.fiscal_receipt_id}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-app-brand hover:underline"
                          >
                            Ochish
                          </a>
                        ) : (
                          p.fiscal_receipt_id
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">{p.currency}</td>
                    <td className="py-3 px-4 text-app-text-muted">
                      {p.payment_time ? new Date(p.payment_time).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {p.payment_proof_url ? (
                        <a
                          href={p.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-app-brand hover:underline"
                        >
                          {p.payment_provider === 'click' ? 'Ochish' : "Ko'rish"} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          p.status === 'approved'
                            ? 'text-green-600 font-medium'
                            : p.status === 'rejected'
                              ? 'text-red-600 font-medium'
                              : 'text-amber-600 font-medium'
                        }
                      >
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'pending' && (
                        <span className="flex flex-col items-end gap-2">
                          {(p.payment_channel === 'click_button' ||
                            (p.payment_channel === 'rahmat' &&
                              p.product_code !== 'teacher_trial' &&
                              p.product_code !== 'teacher_listing')) && (
                            <span className="text-xs text-app-text-muted">
                              {p.payment_channel === 'rahmat' ? 'Rahmat' : 'Click'} — toʻlov yakunlangacha kuting
                            </span>
                          )}
                          <span className="flex items-center justify-end gap-2">
                            {(p.payment_channel !== 'click_button' &&
                              (p.payment_channel !== 'rahmat' ||
                                p.product_code === 'teacher_trial' ||
                                p.product_code === 'teacher_listing')) && (
                              <button
                                type="button"
                                onClick={() => handleConfirm(p.id)}
                                disabled={actioning !== null}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                              >
                                {actioning === p.id ? '...' : 'Tasdiqlash'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReject(p.id)}
                              disabled={actioning !== null}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                              title={
                                p.payment_channel === 'click_button' || p.payment_channel === 'rahmat'
                                  ? 'Foydalanuvchi toʻlamagan bo‘lsa, kutishni bekor qilish'
                                  : undefined
                              }
                            >
                              {actioning === p.id ? '...' : 'Rad etish'}
                            </button>
                          </span>
                        </span>
                      )}
                      {p.status === 'approved' && p.payment_provider === 'click' && (
                        <button
                          type="button"
                          onClick={() => handleRefund(p.id)}
                          disabled={actioning !== null}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-white text-xs font-medium hover:bg-slate-900 disabled:opacity-50"
                        >
                          {actioning === p.id ? '...' : 'Refund'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-app-text-muted">To'lovlar yo'q.</div>
        )}
      </div>
    </div>
  );
}
