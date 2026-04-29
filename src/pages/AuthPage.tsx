import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import { motion } from 'motion/react';
import { UserPlus, LogIn } from 'lucide-react';
import { FalaRusLogoMark } from '../components/FalaRusLogoMark';
import { IntlPhoneInput, type IntlPhoneInputHandle } from '../components/auth/IntlPhoneInput';

export default function AuthPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref') ?? '';
  const pathMode = useMemo(() => {
    if (location.pathname === '/register') return 'register';
    if (location.pathname === '/login' || location.pathname === '/auth') return 'login';
    return 'login';
  }, [location.pathname]);
  const [isLogin, setIsLogin] = useState(pathMode !== 'register');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [registerContactMode, setRegisterContactMode] = useState<'email' | 'phone'>('phone');
  const [registerEmail, setRegisterEmail] = useState('');
  const registerPhoneRef = useRef<IntlPhoneInputHandle>(null);
  const [loginContactMode, setLoginContactMode] = useState<'email' | 'phone'>('phone');
  const [loginEmail, setLoginEmail] = useState('');
  const loginPhoneRef = useRef<IntlPhoneInputHandle>(null);

  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const effectiveIsLogin = pathMode === 'register' ? false : isLogin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!effectiveIsLogin && formData.password !== formData.confirmPassword) {
      setError('Parollar mos kelmadi');
      return;
    }

    let identifierValue = '';

    if (effectiveIsLogin) {
      if (loginContactMode === 'email') {
        identifierValue = loginEmail.trim();
        if (!identifierValue) {
          setError('Email kiritilishi shart');
          return;
        }
      } else {
        const e164 = await loginPhoneRef.current?.getE164();
        if (!e164) {
          setError("Telefon raqami noto'g'ri yoki to'liq emas");
          return;
        }
        identifierValue = e164;
      }
    } else if (registerContactMode === 'email') {
      identifierValue = registerEmail.trim();
      if (!identifierValue) {
        setError('Email kiritilishi shart');
        return;
      }
    } else {
      const e164 = await registerPhoneRef.current?.getE164();
      if (!e164) {
        setError("Telefon raqami noto'g'ri yoki to'liq emas");
        return;
      }
      identifierValue = e164;
    }

    const payload = effectiveIsLogin
      ? { identifier: identifierValue, password: formData.password }
      : {
          firstName: formData.firstName,
          lastName: formData.lastName,
          identifier: identifierValue,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          ref: refFromUrl || undefined,
        };
    const endpoint = apiUrl(effectiveIsLogin ? '/api/auth/login' : '/api/auth/register');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data: { token?: string; user?: unknown; error?: string } = {};
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        setError('Server javobi noto\'g\'ri');
        return;
      }
    } else {
      const text = await response.text();
      console.error('API returned non-JSON:', text?.slice(0, 200));
      setError(response.ok ? 'Xatolik yuz berdi' : 'Server xatosi. Keyinroq urinib ko\'ring.');
      return;
    }

    if (response.ok && data.token && data.user) {
      login(data.token, data.user as Parameters<typeof login>[1]);
      navigate('/');
    } else {
      setError(data.error || 'Xatolik yuz berdi');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="flex justify-center mb-8">
          <FalaRusLogoMark size={48} className="shadow-md ring-1 ring-slate-200/80" />
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
          {effectiveIsLogin ? 'Xush kelibsiz!' : 'Ro‘yxatdan o‘tish'}
        </h2>
        <p className="text-slate-500 text-center mb-8">
          {effectiveIsLogin ? 'Hisobingizga kiring' : 'Yangi hisob yarating'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!effectiveIsLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ism</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Familiya</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="rounded-xl bg-slate-100 p-1 flex gap-1">
            <button
              type="button"
              className={`flex-1 min-h-11 rounded-lg text-sm font-semibold transition ${
                (effectiveIsLogin ? loginContactMode : registerContactMode) === 'phone'
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => (effectiveIsLogin ? setLoginContactMode('phone') : setRegisterContactMode('phone'))}
            >
              Telefon
            </button>
            <button
              type="button"
              className={`flex-1 min-h-11 rounded-lg text-sm font-semibold transition ${
                (effectiveIsLogin ? loginContactMode : registerContactMode) === 'email'
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => (effectiveIsLogin ? setLoginContactMode('email') : setRegisterContactMode('email'))}
            >
              Email
            </button>
          </div>

          {effectiveIsLogin ? loginContactMode === 'email' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="username"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="pochta@example.com"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefon raqami</label>
              <IntlPhoneInput ref={loginPhoneRef} />
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Kod va format avtomatik tekshiriladi (E.164).
              </p>
            </div>
          ) : registerContactMode === 'email' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="pochta@example.com"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Telefon raqami
              </label>
              <IntlPhoneInput ref={registerPhoneRef} />
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                O‘zbekiston, Rossiya, Tojikiston va Qirg‘iziston raqamlari. Mintaqani bayroqdan tanlang —
                kod avtomatik qo‘shiladi.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parol</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {!effectiveIsLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parolni tasdiqlash</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 min-h-12 shadow-[0_14px_34px_rgba(37,99,235,0.22)]"
          >
            {effectiveIsLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {effectiveIsLogin ? 'Kirish' : 'Ro‘yxatdan o‘tish'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              if (pathMode === 'register' || pathMode === 'login' || pathMode === 'auth') {
                navigate(effectiveIsLogin ? '/register' : '/login');
              } else {
                setIsLogin(!effectiveIsLogin);
              }
            }}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            {effectiveIsLogin ? 'Hisobingiz yo‘qmi? Ro‘yxatdan o‘ting' : 'Hisobingiz bormi? Kirish'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
