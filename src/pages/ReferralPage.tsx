import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import {
  UserPlus,
  Copy,
  Check,
  Banknote,
  ChevronLeft,
  Users,
  CheckCircle,
  Wallet,
} from 'lucide-react';
import * as referralApi from '../api/referral';

export default function ReferralPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [referralLink, setReferralLink] = useState<string>('');
  const [referralStats, setReferralStats] = useState<referralApi.ReferralStats | null>(null);
  const [referralList, setReferralList] = useState<referralApi.ReferralListItem[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLinkError('');
    referralApi
      .getReferralPageData(token)
      .then((data) => {
        setReferralLink(data.referral_link);
        setReferralStats({
          invited_users: data.invited_users,
          registered_users: data.registered_users,
          paid_users: data.paid_users,
          total_earned: data.total_earned,
          balance: data.balance,
        });
        setReferralList(data.list ?? []);
      })
      .catch((e) => setLinkError(e instanceof Error ? e.message : "Ma'lumotlar yuklanmadi"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawError('');
    setWithdrawSuccess(false);
    const amount = Math.round(Number(withdrawAmount));
    if (!amount || amount < 50000) {
      setWithdrawError("Minimal summa 50 000 so'm");
      return;
    }
    if (!token) return;
    try {
      await referralApi.withdrawReferral(token, amount);
      setWithdrawSuccess(true);
      setWithdrawAmount('');
      const data = await referralApi.getReferralPageData(token);
      setReferralStats({
        invited_users: data.invited_users,
        registered_users: data.registered_users,
        paid_users: data.paid_users,
        total_earned: data.total_earned,
        balance: data.balance,
      });
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : 'Xatolik');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 mb-6 hover:text-slate-900"
        >
          <ChevronLeft className="w-5 h-5" />
          Orqaga
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
        >
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
            <UserPlus className="w-6 h-6 text-indigo-600" />
            Do‘stlarni taklif qiling
          </h1>

          {/* Referral link */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Taklif havolasi</label>
            {loading ? (
              <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ) : linkError ? (
              <p className="text-red-600 text-sm">{linkError}</p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shrink-0 transition-all duration-200 ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> Nusxalandi!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Nusxa
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          {referralStats && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <Users className="w-5 h-5 text-indigo-600 mb-2" />
                <p className="text-xs text-slate-500 uppercase font-bold">Taklif qilingan</p>
                <p className="text-xl font-bold text-slate-900">{referralStats.invited_users}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                <p className="text-xs text-slate-500 uppercase font-bold">To‘lov qilgan</p>
                <p className="text-xl font-bold text-slate-900">{referralStats.paid_users}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 col-span-2">
                <Wallet className="w-5 h-5 text-indigo-600 mb-2" />
                <p className="text-xs text-slate-500 uppercase font-bold">Balans</p>
                <p className="text-xl font-bold text-indigo-600">
                  {referralStats.balance.toLocaleString()} so‘m
                </p>
              </div>
            </div>
          )}
          {loading && !referralStats && (
            <div className="h-24 bg-slate-100 rounded-xl animate-pulse mb-6" />
          )}

          {/* Withdraw */}
          <div className="border-t border-slate-100 pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Yechib olish</label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Summa (min 50 000)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleWithdraw}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-green-700 shrink-0"
                >
                  <Banknote className="w-4 h-4" /> Yechib olish
                </button>
              </div>
              {withdrawError && <p className="text-sm text-red-600">{withdrawError}</p>}
              {withdrawSuccess && (
                <p className="text-sm text-green-600">So‘rov qabul qilindi.</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* List of referred users */}
        {referralList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">Taklif qilinganlar</h2>
            <ul className="space-y-2">
              {referralList.map((item, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                >
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span
                    className={`text-sm ${
                      item.status === 'rewarded'
                        ? 'text-green-600'
                        : item.status === 'paid'
                          ? 'text-indigo-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {item.status === 'rewarded'
                      ? "To'langan"
                      : item.status === 'paid'
                        ? "To'lov qilgan"
                        : "Ro'yxatdan o'tgan"}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </main>
    </div>
  );
}
