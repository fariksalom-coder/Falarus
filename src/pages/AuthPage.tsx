import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import { motion } from 'motion/react';
import { UserPlus, LogIn } from 'lucide-react';
import { FalaRusLogoMark } from '../components/FalaRusLogoMark';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref') ?? '';
  const [isLogin, setIsLogin] = useState(!refFromUrl);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Parollar mos kelmadi');
      return;
    }

    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : { ...formData, ref: refFromUrl || undefined };
    const endpoint = apiUrl(isLogin ? '/api/auth/login' : '/api/auth/register');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data: { token?: string; user?: any; error?: string } = {};
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
      login(data.token, data.user);
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
          {isLogin ? 'Xush kelibsiz!' : 'Ro‘yxatdan o‘tish'}
        </h2>
        <p className="text-slate-500 text-center mb-8">
          {isLogin ? 'Hisobingizga kiring' : 'Yangi hisob yarating'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ism</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Familiya</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parol</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parolni tasdiqlash</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {isLogin ? 'Kirish' : 'Ro‘yxatdan o‘tish'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-600 text-sm font-medium hover:underline"
          >
            {isLogin ? 'Hisobingiz yo‘qmi? Ro‘yxatdan o‘ting' : 'Hisobingiz bormi? Kirish'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
