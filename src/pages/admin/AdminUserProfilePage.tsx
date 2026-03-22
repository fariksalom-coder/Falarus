import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile, type AdminUserProfile } from '../../api/admin';
import { AlertCircle, ArrowLeft } from 'lucide-react';

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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-center gap-2 text-red-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error || 'User not found'}
        <Link to="/admin/users" className="ml-2 text-indigo-600 hover:underline">
          Back to users
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">{profile.name}</h1>

      <div className="space-y-6 max-w-2xl">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-medium text-slate-500 mb-3">Profile</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Email</dt>
            <dd>{profile.email ?? '—'}</dd>
            <dt className="text-slate-500">Phone</dt>
            <dd>{profile.phone ?? '—'}</dd>
            <dt className="text-slate-500">Registration date</dt>
            <dd>{profile.registration_date ? new Date(profile.registration_date).toLocaleString() : '—'}</dd>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-medium text-slate-500 mb-3">Subscription</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Plan</dt>
            <dd>{profile.subscription.plan_type ?? '—'}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd className={profile.subscription.status === 'active' ? 'text-green-600' : 'text-slate-600'}>
              {profile.subscription.status}
            </dd>
            <dt className="text-slate-500">Expires at</dt>
            <dd>
              {profile.subscription.expires_at
                ? new Date(profile.subscription.expires_at).toLocaleString()
                : '—'}
            </dd>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-medium text-slate-500 mb-3">Statistics</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Total points</dt>
            <dd>{profile.statistics.total_points.toLocaleString()}</dd>
            <dt className="text-slate-500">Lessons completed</dt>
            <dd>{profile.statistics.lessons_completed}</dd>
            <dt className="text-slate-500">Words learned</dt>
            <dd>{profile.statistics.words_learned}</dd>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-medium text-slate-500 mb-3">Referral</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Referral balance</dt>
            <dd>{profile.referral.referral_balance.toLocaleString()} so'm</dd>
            <dt className="text-slate-500">Invited users</dt>
            <dd>{profile.referral.invited_users}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
