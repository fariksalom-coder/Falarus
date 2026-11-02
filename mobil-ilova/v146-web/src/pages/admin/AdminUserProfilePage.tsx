import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile, type AdminUserProfile } from '../../api/admin';
import { ArrowLeft } from 'lucide-react';
import { adminPath } from '../../constants/adminPath';
import AdminUserManagePage from './AdminUserManagePage';

export default function AdminUserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setProfile(null); setError('');
    getUserProfile(Number(id)).then(r => { if (!cancelled) setProfile(r); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [id]);
  return <div className="max-w-5xl space-y-5">
    <Link to={adminPath('/users')} className="inline-flex min-h-11 items-center gap-2 text-sm text-app-primary"><ArrowLeft size={18} /> Foydalanuvchilar</Link>
    <h1 className="text-2xl font-semibold">Foydalanuvchi profili</h1>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <AdminUserManagePage key={id} userId={Number(id)} />
    {profile ? <div className="grid gap-4 sm:grid-cols-2">
      <section className="rounded-lg border border-app-border bg-app-surface p-5"><h2 className="font-semibold">O‘quv natijalari</h2><p className="mt-3 text-xl tabular-nums">{profile.statistics.total_points.toLocaleString()} ball</p></section>
      <section className="rounded-lg border border-app-border bg-app-surface p-5"><h2 className="font-semibold">Takliflar</h2><p className="mt-3 text-xl tabular-nums">{profile.referral.referral_balance.toLocaleString()} so‘m</p><p className="mt-1 text-sm text-app-text-muted">{profile.referral.invited_users} ta foydalanuvchi</p></section>
    </div> : null}
  </div>;
}
