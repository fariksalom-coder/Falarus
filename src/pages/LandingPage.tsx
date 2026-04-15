import { motion } from 'motion/react';
import { Link, Navigate } from 'react-router-dom';
import {
  Target,
  MessageCircle,
  Users,
  Gamepad2,
  TrendingUp,
  HeartHandshake,
  ArrowRight,
} from 'lucide-react';
import { FalaRusLogoMark } from '../components/FalaRusLogoMark';
import { useAuth } from '../context/AuthContext';

const benefits = [
  {
    icon: Target,
    title: 'Imtihonlarga tayyorgarlik',
    description: 'Patent va VNJ uchun aniq va samarali tayyorgarlik',
  },
  {
    icon: MessageCircle,
    title: 'Gapirish amaliyoti',
    description: 'Qo‘rqmasdan gapirishga o‘rgatadigan real mashqlar',
  },
  {
    icon: Users,
    title: 'Sherik bilan o‘rganish',
    description: 'Birga o‘rganib, tezroq natijaga erishing',
  },
  {
    icon: Gamepad2,
    title: 'Qiziqarli format',
    description: 'O‘yin elementlari bilan zerikmasdan o‘rganing',
  },
  {
    icon: TrendingUp,
    title: 'Bosqichma-bosqich o‘sish',
    description: 'A1 dan boshlab oddiydan murakkabga o‘tasiz',
  },
  {
    icon: HeartHandshake,
    title: 'Psixologik yengillik',
    description: 'Xatodan qo‘rqmasdan erkin gapirishni boshlaysiz',
  },
] as const;

export default function LandingPage() {
  const { user } = useAuth();

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <FalaRusLogoMark size={34} className="shadow-sm ring-1 ring-slate-200/80" />
            <span className="text-lg font-bold tracking-tight text-slate-900">FalaRus</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Kirish
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Ro‘yxatdan o‘tish
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-10 shadow-[0_18px_48px_rgba(37,99,235,0.12)] sm:px-10 sm:py-14"
        >
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-blue-200/40 blur-2xl" />
          <div className="absolute -bottom-10 left-6 h-40 w-40 rounded-full bg-indigo-200/40 blur-2xl" />
          <div className="relative max-w-3xl">
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Rus tilini tez va oson o‘rganing
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              Patent, VNJ imtihonlariga tayyorlaning va qo‘rqmasdan gapirishni boshlang
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2 }}
              >
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-3.5 text-base font-extrabold text-white shadow-[0_14px_34px_rgba(37,99,235,0.34)] transition hover:bg-blue-700"
                >
                  Boshlash
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <Link
                to="/login"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Kirish
              </Link>
            </div>
            <p className="mt-5 text-sm font-semibold text-blue-700 sm:text-base">
              🎯 +500 o‘quvchi allaqachon FalaRus bilan o‘rganmoqda
            </p>
          </div>
        </motion.section>

        <section className="mt-10 sm:mt-14">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Nega FalaRus?</h2>
            <span className="text-xs font-medium text-slate-500 sm:text-sm">
              Qisqa, aniq, amaliy
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx, duration: 0.35 }}
                  className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(37,99,235,0.16)]"
                >
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </motion.article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <p className="text-base font-semibold text-slate-800">Rus tilini bugunoq o‘rganishni boshlang</p>
          <Link
            to="/register"
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Ro‘yxatdan o‘tish
          </Link>
        </div>
      </footer>
    </div>
  );
}
