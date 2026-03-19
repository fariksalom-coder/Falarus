import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyPayments, type MyPaymentRow } from '../api/payment';
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
  History,
} from 'lucide-react';

const TARIFF_LABELS: Record<string, string> = {
  month: '1 OY',
  '3months': '3 OY',
  year: '1 YIL',
};

function formatPlanTimeLeft(planExpiresAt: string | null | undefined): string {
  if (!planExpiresAt) return '—';
  const end = new Date(planExpiresAt);
  const now = new Date();
  if (end <= now) return "Muddati tugagan";
  const days = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return `${days} kun`;
}

function formatPaymentDateTime(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }) + ' — ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<MyPaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const pendingPayment = payments.find((p) => p.status === 'pending') ?? null;
  const hasPendingPayment = !!pendingPayment;
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

          {/* To'lov holati */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">To'lov holati</p>
            {hasPendingPayment && pendingPayment ? (
              <div className="text-left space-y-1">
                <p className="text-amber-700 font-medium">Tekshirilmoqda</p>
                <p className="text-slate-700 text-sm">Tarif: {TARIFF_LABELS[pendingPayment.tariff_type] ?? pendingPayment.tariff_type}</p>
                <p className="text-slate-600 text-sm">To'lov vaqti: {formatPaymentDateTime(pendingPayment.created_at)}</p>
              </div>
            ) : hasActivePlan && user?.planName ? (
              <p className="text-slate-900 font-medium">{user.planName} — {formatPlanTimeLeft(user?.planExpiresAt)} qoldi</p>
            ) : (
              <p className="text-slate-500">Tarif yo'q</p>
            )}
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
          <button
            onClick={() => navigate('/payment-history')}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <History className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-slate-700 flex-1 text-left">To'lovlar tarixi</span>
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
