import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Foundation';
import { getSupportCrmStats, type SupportCrmStats } from '../../api/supportCrm';
import { supportCrmPath } from '../../constants/supportCrmPath';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] font-medium text-app-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-app-text">{value}</p>
    </Card>
  );
}

export default function SupportCrmDashboardPage() {
  const [stats, setStats] = useState<SupportCrmStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSupportCrmStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Xatolik');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-app-text">Bugun</h1>

      {loading ? (
        <p className="text-sm text-app-muted">Yuklanmoqda…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-app-danger">
          {error}
        </p>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Navbat" value={stats.queue_count} />
          <StatCard label="Bugun qo‘ng‘iroq" value={stats.contacted_today} />
          <StatCard label="Bog‘landi" value={stats.reached_today} />
          <StatCard label="Ko‘tarmadi" value={stats.no_pickup_today} />
        </div>
      ) : null}

      <Link
        to={supportCrmPath('/queue')}
        className="ui-button ui-button--primary flex min-h-12 w-full items-center justify-center text-base"
      >
        Navbatni ochish
      </Link>
    </div>
  );
}
