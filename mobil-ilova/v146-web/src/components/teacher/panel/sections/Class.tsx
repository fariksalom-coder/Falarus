import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import {
  createMeetSession,
  deleteMeetSession,
  getTeacherMeetRooms,
  type TeacherMeetResponse,
} from '../../../../api/meet';
import { adminContact } from '../../../../config/adminContact';
import { usePanel } from '../panelContext';
import {
  Card,
  Empty,
  ErrorNote,
  Field,
  GhostButton,
  PageHead,
  PrimaryButton,
  Skeleton,
  Tag,
  fmtDateTime,
  inputClass,
} from '../ui';

/**
 * Onlayn dars bo'limi.
 *
 * Prototipdagi to'liq ekranli video interfeys FalaRus'da Jitsi xonasi bilan
 * almashtirilgan: xonani admin biriktiradi, ustoz dars vaqtini qo'shadi va
 * o'sha havoladan kiradi — o'quvchi ham shu xonaga tushadi.
 */
export default function Class() {
  const { token, t, lang } = usePanel();
  const navigate = useNavigate();
  const [data, setData] = useState<TeacherMeetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ title: '', starts_at: '', duration: 60 });

  const load = useCallback(async () => {
    try {
      setData(await getTeacherMeetRooms(token));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [token, t.errorGeneric]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton rows={3} />;

  const room = data?.rooms?.[0] ?? null;
  const sessions = (data?.sessions ?? []).filter((s) => s.status !== 'cancelled');

  const add = async () => {
    if (!form.starts_at) return;
    setBusy(true);
    setErr('');
    try {
      await createMeetSession(token, {
        title: form.title || undefined,
        starts_at: new Date(form.starts_at).toISOString(),
        duration_minutes: form.duration,
      });
      setForm({ title: '', starts_at: '', duration: 60 });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHead title={t.classTitle} subtitle={t.classSubtitle} />
      {err ? <ErrorNote text={err} /> : null}

      {room ? (
        <div className="mb-4 flex flex-col gap-4 rounded-[22px] bg-[linear-gradient(135deg,#12265F,#1D1B63)] p-5 text-white sm:flex-row sm:items-center sm:justify-between lg:p-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">
              {t.classTitle}
            </p>
            <p className="mt-1.5 text-[18px] font-semibold">{room.title || room.room_slug}</p>
            <p className="mt-1 text-[12.5px] text-white/60">
              {data?.domain} · {room.room_slug}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(`${window.location.origin}/dars/${room.id}`);
              }}
              className="min-h-[44px] rounded-[12px] bg-app-surface/12 px-4 text-[13px] font-medium text-white"
            >
              {t.classCopyLink}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/dars/${room.id}`)}
              className="flex min-h-[44px] items-center gap-2 rounded-[12px] bg-app-surface px-5 text-[13px] font-semibold text-[#12265F]"
            >
              <Video className="h-[18px] w-[18px]" />
              {t.classEnter}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <Empty text={t.classNoRoom} hint={t.classNoRoomHint} />
          <div className="mt-3 flex justify-center">
            <GhostButton onClick={() => window.open(adminContact.telegram, '_blank')}>
              {t.helpContact}
            </GhostButton>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card className="p-5">
          <p className="mb-3 text-[16px] font-semibold text-app-text">{t.classSessions}</p>
          {sessions.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-app-text-muted">{t.classNoSessions}</p>
          ) : (
            <ul className="divide-y divide-[#F6F5FC]">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-app-text">
                      {s.title || t.classTitle}
                    </span>
                    <span className="block text-[11.5px] text-app-text-muted">
                      {fmtDateTime(s.starts_at, lang)} · {s.duration_minutes} {t.minutesShort}
                    </span>
                  </span>
                  <Tag tone={s.status === 'live' ? 'green' : s.status === 'ended' ? 'grey' : 'violet'}>
                    {s.status}
                  </Tag>
                  <button
                    type="button"
                    onClick={() => navigate(`/dars/s/${s.id}`)}
                    className="min-h-[38px] rounded-[10px] bg-app-bg-muted px-3.5 text-[12px] font-semibold text-app-text transition hover:bg-[#EAE9F8]"
                  >
                    {t.classJoin}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await deleteMeetSession(token, s.id);
                        await load();
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : t.errorGeneric);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="text-[12px] font-semibold text-[#C23A3F] disabled:opacity-50"
                  >
                    {t.delete}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <p className="mb-3 text-[16px] font-semibold text-app-text">{t.classAddSession}</p>
          <div className="flex flex-col gap-3">
            <Field label={t.classSessionTitle}>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label={t.classSessionStart}>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label={t.classSessionDuration}>
              <select
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                className={inputClass}
              >
                {[30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <PrimaryButton onClick={add} disabled={busy || !form.starts_at}>
              {busy ? t.saving : t.add}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
