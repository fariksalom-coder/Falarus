import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, PageHeader } from '../../components/ui/Foundation';
import { supportCrmLogin } from '../../api/supportCrm';
import { useSupportCrmAuth } from '../../context/SupportCrmAuthContext';
import { setSupportCrmToken } from '../../lib/supportCrmApi';
import { supportCrmPath } from '../../constants/supportCrmPath';

export default function SupportCrmLoginPage() {
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useSupportCrmAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await supportCrmLogin(loginValue.trim().toLowerCase(), password);
      setSupportCrmToken(token);
      login(token);
      navigate(supportCrmPath('/dashboard'), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirish amalga oshmadi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg-muted p-5">
      <Card className="w-full max-w-[420px]">
        <PageHeader title="Support CRM" description="Premium o‘quvchilar bilan aloqa paneli" />
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            label="Login"
            autoComplete="username"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            required
          />
          <Field
            label="Parol"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="text-sm text-app-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            {loading ? 'Kirilmoqda…' : 'Kirish'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
