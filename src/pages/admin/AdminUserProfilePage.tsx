import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile, type AdminUserProfile } from '../../api/admin';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { adminPath } from '../../constants/adminPath';
import ParolTiklashPanel from '../../components/support/ParolTiklashPanel';
import { adminParolTiklashById } from '../../api/parolTiklash';

export default function AdminUserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getUserProfile(Number(id))
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-app-brand border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-center gap-2 text-red-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error || 'User not found'}
        <Link to={adminPath('/users')} className="ml-2 text-app-brand hover:underline">
          Back to users
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to={adminPath('/users')}
        className="inline-flex items-center gap-1 text-sm text-app-text-muted hover:text-app-brand mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>
      <h1 className="text-2xl font-semibold text-app-text mb-6">{profile.name}</h1>

      <div className="space-y-6 max-w-2xl">
        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="text-sm font-medium text-app-text-muted mb-3">Profile</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-app-text-muted">Email</dt>
            <dd>{profile.email ?? '—'}</dd>
            <dt className="text-app-text-muted">Phone</dt>
            <dd>{profile.phone ?? '—'}</dd>
            <dt className="text-app-text-muted">Registration date</dt>
            <dd>{profile.registration_date ? new Date(profile.registration_date).toLocaleString() : '—'}</dd>
          </dl>
        </section>

        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="text-sm font-medium text-app-text-muted mb-3">Subscription</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-app-text-muted">Plan</dt>
            <dd>{profile.subscription.plan_type ?? '—'}</dd>
            <dt className="text-app-text-muted">Status</dt>
            <dd className={profile.subscription.status === 'active' ? 'text-green-600' : 'text-app-text-muted'}>
              {profile.subscription.status}
            </dd>
            <dt className="text-app-text-muted">Expires at</dt>
            <dd>
              {profile.subscription.expires_at
                ? new Date(profile.subscription.expires_at).toLocaleString()
                : '—'}
            </dd>
          </dl>
        </section>

        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="text-sm font-medium text-app-text-muted mb-3">Statistics</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-app-text-muted">Total points</dt>
            <dd>{profile.statistics.total_points.toLocaleString()}</dd>
          </dl>
        </section>

        {/*
          * Parolni tiklash — pochta sozlanmagani uchun yagona ishlaydigan yo'l.
          * `sorov` maydoni qulflangan: sahifa allaqachon aynan shu odam haqida.
          */}
        <ParolTiklashPanel
          boshlangich={profile.phone ?? profile.email ?? `#${profile.id}`}
          qulf
          onTikla={() => adminParolTiklashById(profile.id)}
        />

        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="text-sm font-medium text-app-text-muted mb-3">Referral</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-app-text-muted">Referral balance</dt>
            <dd>{profile.referral.referral_balance.toLocaleString()} so'm</dd>
            <dt className="text-app-text-muted">Invited users</dt>
            <dd>{profile.referral.invited_users}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
