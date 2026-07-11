import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminLogin } from '../../api/admin';
import { setAdminToken } from '../../lib/adminApi';
import { adminPath } from '../../constants/adminPath';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await adminLogin(email.trim(), password);
      setAdminToken(token);
      login(token);
      navigate(adminPath('/dashboard'), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0C1526] flex items-center justify-center p-4">
      <div
        className="w-[360px] max-w-full rounded-[18px] border p-[34px]"
        style={{ background: '#151F35', borderColor: '#24304C' }}
      >
        {/* Logo mark + title */}
        <div className="flex items-center gap-2.5">
          <img
            src="/landing/falarus-mark.svg"
            alt=""
            className="h-[23px] w-[30px]"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <span className="text-[19px] font-extrabold text-white">FalaRus Admin</span>
        </div>
        <p className="mt-2 mb-[26px] text-[13px] font-semibold text-[#7C89A3]">Super-admin kirish</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-[7px] block text-[13px] font-bold text-[#AEB9CE]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[46px] w-full rounded-[11px] border px-[14px] text-[14px] font-semibold text-white outline-none transition"
              style={{ background: '#0E1728', borderColor: '#2C3A5A' }}
              placeholder="admin@falarus.uz"
              required
            />
          </div>
          <div>
            <label className="mb-[7px] block text-[13px] font-bold text-[#AEB9CE]">Parol</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[46px] w-full rounded-[11px] border px-[14px] text-[14px] font-semibold tracking-[3px] text-white outline-none transition"
              style={{ background: '#0E1728', borderColor: '#2C3A5A' }}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-sm font-semibold text-[#F0656A]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-[48px] w-full rounded-[12px] bg-[#0B2A6B] text-[15px] font-extrabold text-white hover:bg-[#071B5E] disabled:opacity-50"
          >
            {loading ? 'Kirish...' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}
