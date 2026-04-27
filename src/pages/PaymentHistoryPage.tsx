import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { type PaymentStatus } from '../api/payment';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { adminContact } from '../config/adminContact';
import { ArrowLeft, History, MessageCircle } from 'lucide-react';
import { getPaymentDisplayLabel } from '../../shared/paymentProducts';

function formatPaymentAmount(amount: number, currency: string): string {
  if (currency === 'UZS') return `${Number(amount).toLocaleString('uz-UZ')} so'm`;
  if (currency === 'RUB') return `${amount} ₽`;
  return `$${amount}`;
}

function formatPaymentDate(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }) + ' — ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: 'Tekshirilmoqda', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Tasdiqlandi', className: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rad etildi', className: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  const { label, className } = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function PaymentHistoryPage() {
  const { token } = useAuth();
  const { refreshAccess } = useAccess();
  const navigate = useNavigate();
  const { payments, loading } = usePaymentStatus();

  useEffect(() => {
    if (!token) return;
    refreshAccess();
  }, [token, refreshAccess]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-2xl mx-auto p-6">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Orqaga
        </button>

        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-6">
          <History className="w-7 h-7 text-indigo-600" />
          To'lovlar tarixi
        </h1>

        {loading ? (
          <p className="text-slate-500 py-8">Yuklanmoqda...</p>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            To'lovlar yo'q.
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="text-lg font-semibold text-slate-900">
                    {getPaymentDisplayLabel(p.product_code, p.tariff_type)}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-slate-700">
                  Summa: {formatPaymentAmount(p.amount, p.currency)}
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Sana: {formatPaymentDate(p.created_at)}
                </p>
                <a
                  href={adminContact.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <MessageCircle className="w-4 h-4" />
                  Administrator bilan bog'lanish
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Administrator bilan bog'lanish */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-xs text-slate-500 uppercase font-bold mb-3">Administrator bilan bog'lanish</p>
          <div className="flex flex-wrap gap-2">
            {adminContact.telegram && (
              <a
                href={adminContact.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Telegram
              </a>
            )}
            {adminContact.whatsapp && (
              <a
                href={adminContact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                WhatsApp
              </a>
            )}
            {adminContact.email && (
              <a
                href={`mailto:${adminContact.email}`}
                className="inline-flex items-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Email
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
