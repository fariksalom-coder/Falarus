/**
 * Admin darsga kiradi (nazorat): O'qituvchilar → Darslar jadvalidan. Ishtirokchilardan
 * farqi — vaqt cheklovi yo'q, ism «FalaRus nazorat», mikrofon o'chiq holda kiradi.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import JitsiRoom from '../../components/meet/JitsiRoom';
import { adminApi } from '../../lib/adminApi';
import { adminPath } from '../../constants/adminPath';

type Join = { domain: string; room_slug: string; display_name: string };

export default function AdminLessonRoomPage() {
  const { kind, id } = useParams<{ kind: string; id: string }>();
  const navigate = useNavigate();
  const [join, setJoin] = useState<Join | null>(null);
  const [error, setError] = useState('');
  const back = () => navigate(adminPath('/teachers?tab=lessons'));

  useEffect(() => {
    if (kind !== 'paid' && kind !== 'trial') { setError('Dars topilmadi'); return; }
    adminApi<Join>(`/teacher-money/join/${kind}/${Number(id)}`).then(setJoin).catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [kind, id]);

  return (
    <div className="flex h-[calc(100dvh-120px)] min-h-[480px] flex-col gap-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-app-border bg-app-surface px-4 text-sm font-semibold text-app-text hover:bg-app-bg-muted">
          <ArrowLeft className="h-4 w-4" />Darslar jadvali
        </button>
        <p className="text-sm text-app-text-muted">{kind === 'trial' ? 'Sinov darsi' : 'Pullik dars'} #{id} · siz «FalaRus nazorat» nomi bilan kirasiz</p>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
        : !join ? <div className="flex-1 animate-pulse rounded-2xl bg-slate-200" aria-busy="true" />
        : (
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
            <JitsiRoom domain={join.domain} roomName={join.room_slug} displayName={join.display_name} subject="FalaRus darsi" onLeave={back} />
          </div>
        )}
    </div>
  );
}
