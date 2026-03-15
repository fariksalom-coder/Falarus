import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyPayments, type MyPaymentRow, type PaymentStatus } from '../api/payment';
import { adminContact } from '../config/adminContact';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  LogOut,
  User,
  Mail,
  Settings,
  CreditCard,
  UserPlus,
  Calendar,
  Package,
  MessageCircle,
  History,
} from 'lucide-react';

function formatPlanTimeLeft(planExpiresAt: string | null | undefined): string {
  if (!planExpiresAt) return '—';
  const end = new Date(planExpiresAt);
  const now = new Date();
  if (end <= now) return "Muddati tugagan";
  const days = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} oy`;
  }
  return `${days} kun`;
}

const TARIFF_LABELS: Record<string, string> = {
  month: '1 OY',
  '3months': '3 OY',
  year: '1 YIL',
};

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

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<MyPaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const hasPendingPayment = payments.some((p) => p.status === 'pending');
  const hasActivePlan = user?.planExpiresAt && new Date(user.planExpiresAt) > new Date();

  useEffect(() => {
    if (!token) return;
    getMyPayments(token)
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false));
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Profile Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center"
        >
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{user?.firstName} {user?.lastName}</h2>
          <p className="text-slate-500 flex items-center justify-center gap-2 mt-1">
            <Mail className="w-4 h-4" /> {user?.email}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <Package className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 uppercase font-bold">Tarif</p>
              <p className="text-lg font-bold text-slate-900">{user?.planName || "Tarif yo'q"}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <Calendar className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 uppercase font-bold">Qolgan muddat</p>
              <p className={`text-lg font-bold ${user?.planExpiresAt && new Date(user.planExpiresAt) <= new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                {formatPlanTimeLeft(user?.planExpiresAt)}
              </p>
            </div>
          </div>

          {/* Faol to'lov */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Faol to'lov</p>
            {hasPendingPayment ? (
              <p className="text-amber-700 font-medium">To'lov tekshirilmoqda</p>
            ) : hasActivePlan && user?.planName ? (
              <p className="text-slate-900 font-medium">{user.planName} — {formatPlanTimeLeft(user?.planExpiresAt)} qoldi</p>
            ) : (
              <p className="text-slate-500">Tarif yo'q</p>
            )}
          </div>
        </motion.div>

        {/* To'lovlar tarixi */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
        >
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
            <History className="w-5 h-5 text-indigo-600" />
            To'lovlar tarixi
          </h3>
          {paymentsLoading ? (
            <p className="text-slate-500 text-sm">Yuklanmoqda...</p>
          ) : payments.length === 0 ? (
            <p className="text-slate-500 text-sm">To'lovlar yo'q.</p>
          ) : (
            <div className="space-y-4">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-semibold text-slate-900">{TARIFF_LABELS[p.tariff_type] ?? p.tariff_type}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-slate-700 text-sm">
                    Summa: {formatPaymentAmount(p.amount, p.currency)}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    Sana: {formatPaymentDate(p.created_at)}
                  </p>
                  <a
                    href={adminContact.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Administrator bilan bog'lanish
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Administrator bilan bog'lanish — links */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold mb-3">Administrator bilan bog'lanish</p>
            <div className="flex flex-wrap gap-2">
              {adminContact.telegram && (
                <a
                  href={adminContact.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Telegram
                </a>
              )}
              {adminContact.whatsapp && (
                <a
                  href={adminContact.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  WhatsApp
                </a>
              )}
              {adminContact.email && (
                <a
                  href={`mailto:${adminContact.email}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Email
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Settings List */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => navigate('/invite')}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <UserPlus className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-slate-700 flex-1 text-left">Do'stlarni taklif qiling</span>
            <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
          </button>
          <button
            onClick={() => navigate('/tariflar')}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <CreditCard className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-slate-700 flex-1 text-left">Tariflar</span>
            <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
          </button>
          <button className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <Settings className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-slate-700 flex-1 text-left">Sozlamalar</span>
            <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-red-50 transition-colors text-red-600"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold flex-1 text-left">Chiqish</span>
          </button>
        </div>
      </main>
    </div>
  );
}
