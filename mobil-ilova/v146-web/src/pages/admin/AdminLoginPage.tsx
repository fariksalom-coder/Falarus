import { Button, Card, Field, PageHeader } from '../../components/ui/Foundation';
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
      setError(err instanceof Error ? err.message : 'Kirish amalga oshmadi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg-muted p-5">
      <Card className="w-full max-w-[420px]">
        <PageHeader title="FalaRus Admin" description="Boshqaruv paneliga kirish" />
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
          <Field label="Parol" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">{loading ? 'Kirilmoqda…' : 'Kirish'}</Button>
        </form>
      </Card>
    </div>
  );
}
