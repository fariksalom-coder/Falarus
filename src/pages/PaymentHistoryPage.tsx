import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { type PaymentStatus } from '../api/payment';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { adminContact } from '../config/adminContact';
import { ArrowLeft } from 'lucide-react';
import { getPaymentDisplayLabel } from '../../shared/paymentProducts';
import { useLocale } from '../context/LocaleContext';

function formatPaymentAmount(amount: number, currency: string): { value: string; unit: string } {
  if (currency === 'UZS')
    return { value: Number(amount).toLocaleString('ru-RU').replace(/,/g, ' '), unit: "so'm" };
  if (currency === 'RUB') return { value: String(amount), unit: '₽' };
  return { value: String(amount), unit: '$' };
}

function formatPaymentDate(createdAt: string): string {
  const d = new Date(createdAt);
  return (
    d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  );
}

function StatusBadge({ status, label }: { status: PaymentStatus; label: string }) {
  const map = {
    pending: {
      bg: 'bg-[#F5EAC7]',
      text: 'text-[#8A6412]',
      ring: 'ring-[#E4C88A]',
      icon: '✎',
    },
    approved: {
      bg: 'bg-[#E6F2EA]',
      text: 'text-[#2E7D57]',
      ring: 'ring-[#B7DCC4]',
      icon: '✓',
    },
    rejected: {
      bg: 'bg-[#FDECEC]',
      text: 'text-[#B4282E]',
      ring: 'ring-[#F1BEBE]',
      icon: '✕',
    },
  } as const;
  const cfg =
    (map as Record<string, { bg: string; text: string; ring: string; icon: string }>)[status] ?? {
      bg: 'bg-[#F0EEE6]',
      text: 'text-pmn-text-muted',
      ring: 'ring-pmn-border',
      icon: '·',
    };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span aria-hidden>{cfg.icon}</span>
      <span>{label}</span>
    </span>
  );
}

function statusStripeColor(status: PaymentStatus): string {
  if (status === 'approved') return '#2E7D57';
  if (status === 'rejected') return '#B4282E';
  if (status === 'pending') return '#D4AC5C';
  return '#9E9787';
}

export default function PaymentHistoryPage() {
  const { token, user } = useAuth();
  const { t } = useLocale();
  const { refreshAccess } = useAccess();
  const navigate = useNavigate();
  const { payments, loading } = usePaymentStatus();
  const isTeacher = user?.accountType === 'teacher';
  const backPath = isTeacher ? '/teacher-cabinet' : '/profile';
  const visiblePayments = isTeacher
    ? payments.filter((p) => p.product_code === 'teacher_listing')
    : payments;

  useEffect(() => {
    if (!token) return;
    refreshAccess();
  }, [token, refreshAccess]);

  return (
    <div className="profile-premium min-h-screen pb-20">
      <div className="mx-auto max-w-2xl px-4 py-5">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-pmn-card text-pmn-text shadow-[0_6px_16px_-6px_rgba(15,27,59,0.28)] ring-1 ring-pmn-border transition active:scale-95"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <h1 className="profile-heading text-[24px] leading-tight text-pmn-text">
            {t('payment.historyTitle')}
          </h1>
        </div>

        {loading ? (
          <p className="py-8 text-center text-[13px] font-semibold text-pmn-text-muted">{t('common.loading')}</p>
        ) : visiblePayments.length === 0 ? (
          <div className="rounded-[22px] bg-pmn-card p-8 text-center text-[13px] font-semibold text-pmn-text-muted ring-1 ring-pmn-border">
            {t('payment.empty')}
          </div>
        ) : (
          <div className="space-y-3">
            {visiblePayments.map((p) => {
              const amount = formatPaymentAmount(p.amount, p.currency);
              const statusLabel =
                p.status === 'pending'
                  ? t('payment.statusPending')
                  : p.status === 'approved'
                    ? t('payment.statusApproved')
                    : p.status === 'rejected'
                      ? t('payment.statusRejected')
                      : p.status;
              return (
                <div
                  key={p.id}
                  className="relative overflow-hidden rounded-[20px] bg-pmn-card py-4 pl-6 pr-4 shadow-[0_10px_24px_-14px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border"
                >
                  {/* Left status stripe */}
                  <span
                    aria-hidden
                    className="absolute inset-y-3 left-0 w-1 rounded-full"
                    style={{ backgroundColor: statusStripeColor(p.status) }}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-[15px] font-black text-pmn-text">
                      {getPaymentDisplayLabel(p.product_code, p.tariff_type)}
                    </p>
                    <StatusBadge status={p.status} label={statusLabel} />
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="profile-heading text-[26px] leading-none text-pmn-text">
                      {amount.value}
                    </span>
                    <span className="text-[13px] font-bold text-pmn-text-muted">{amount.unit}</span>
                  </div>

                  <p className="mt-2 text-[12px] font-semibold text-pmn-text-soft">
                    {formatPaymentDate(p.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Administrator bilan bog'lanish */}
        <div className="mt-5 rounded-[20px] bg-pmn-card p-4 shadow-[0_10px_24px_-14px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#B0894A]">
            {t('payment.contactAdmin')}
          </p>
          <div className="flex flex-wrap gap-2">
            {adminContact.telegram ? (
              <a
                href={adminContact.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-full bg-pmn-card px-4 text-[13px] font-black text-pmn-text shadow-[0_4px_10px_-4px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border transition hover:brightness-95 active:scale-95"
              >
                Telegram
              </a>
            ) : null}
            {adminContact.whatsapp ? (
              <a
                href={adminContact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-full bg-pmn-card px-4 text-[13px] font-black text-pmn-text shadow-[0_4px_10px_-4px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border transition hover:brightness-95 active:scale-95"
              >
                WhatsApp
              </a>
            ) : null}
            {adminContact.email ? (
              <a
                href={`mailto:${adminContact.email}`}
                className="inline-flex h-10 items-center rounded-full bg-pmn-card px-4 text-[13px] font-black text-pmn-text shadow-[0_4px_10px_-4px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border transition hover:brightness-95 active:scale-95"
              >
                Email
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
