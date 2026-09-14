import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, PauseCircle, PlayCircle, Plus, Search, Trash2, Video } from 'lucide-react';
import {
  createAdminMeetRooms,
  deleteAdminMeetRoom,
  getAdminMeetRooms,
  getAdminTeachers,
  updateAdminMeetRoom,
  type AdminMeetRoom,
  type AdminMeetRoomStatus,
  type AdminTeacherRow,
} from '../../api/admin';

const STATUS_LABELS: Record<AdminMeetRoomStatus, string> = {
  free: "Bo'sh",
  assigned: 'Biriktirilgan',
  paused: "To'xtatilgan",
  archived: 'Arxiv',
};

const STATUS_CLASSES: Record<AdminMeetRoomStatus, string> = {
  free: 'bg-app-bg-subtle text-app-text-muted',
  assigned: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  archived: 'bg-slate-200 text-app-text-muted',
};

const FILTERS: { id: AdminMeetRoomStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Hammasi' },
  { id: 'free', label: "Bo'sh" },
  { id: 'assigned', label: 'Biriktirilgan' },
  { id: 'paused', label: "To'xtatilgan" },
];

function roomLink(roomId: number): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/dars/${roomId}`;
}

export default function AdminMeetRoomsPage() {
  const [rooms, setRooms] = useState<AdminMeetRoom[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<AdminMeetRoomStatus | 'all'>('all');
  const [q, setQ] = useState('');
  const [actioning, setActioning] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Yangi xona ochish formasi.
  const [count, setCount] = useState(5);
  const [title, setTitle] = useState('');
  const [assignTo, setAssignTo] = useState<string>('');
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    getAdminMeetRooms()
      .then((data) => setRooms(data?.rooms ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Yuklash xatosi'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    getAdminTeachers()
      .then((data) => setTeachers(data ?? []))
      .catch(() => setTeachers([]));
  }, []);

  const stats = useMemo(() => {
    const free = rooms.filter((r) => r.status === 'free').length;
    const assigned = rooms.filter((r) => r.status === 'assigned').length;
    return { total: rooms.length, free, assigned };
  }, [rooms]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rooms
      .filter((r) => (filter === 'all' ? true : r.status === filter))
      .filter((r) =>
        !needle
          ? true
          : [r.title, r.room_slug, r.teacher_name, String(r.id)]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(needle)),
      );
  }, [rooms, filter, q]);

  async function handleCreate() {
    setError('');
    setMessage('');
    setCreating(true);
    try {
      const res = await createAdminMeetRooms({
        count,
        title: title.trim(),
        teacher_user_id: assignTo ? Number(assignTo) : null,
      });
      setMessage(`${res.rooms.length} ta xona ochildi.`);
      setTitle('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xona ochilmadi');
    } finally {
      setCreating(false);
    }
  }

  async function handleAssign(room: AdminMeetRoom, teacherId: string) {
    setError('');
    setActioning(room.id);
    try {
      await updateAdminMeetRoom(room.id, { teacher_user_id: teacherId ? Number(teacherId) : null });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Biriktirilmadi');
    } finally {
      setActioning(null);
    }
  }

  async function handleStatus(room: AdminMeetRoom, status: AdminMeetRoomStatus) {
    setError('');
    setActioning(room.id);
    try {
      await updateAdminMeetRoom(room.id, { status });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Amal bajarilmadi');
    } finally {
      setActioning(null);
    }
  }

  async function handleDelete(room: AdminMeetRoom) {
    if (!window.confirm(`#${room.id} xona o'chirilsinmi? Dars vaqtlari ham o'chadi.`)) return;
    setError('');
    setActioning(room.id);
    try {
      await deleteAdminMeetRoom(room.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "O'chirilmadi");
    } finally {
      setActioning(null);
    }
  }

  async function handleCopy(room: AdminMeetRoom) {
    try {
      await navigator.clipboard.writeText(roomLink(room.id));
      setCopiedId(room.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError('Havola nusxalanmadi');
    }
  }

  const activeTeachers = useMemo(
    () => teachers.filter((t) => t.profile_status === 'active' || t.profile_status === 'paused'),
    [teachers],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Video xonalar</h1>
          <p className="text-sm text-app-text-muted">
            Xonalarni oching va o'qituvchilarga yo'naltiring. Xona faqat shu o'qituvchiga yozilgan
            o'quvchilarga ko'rinadi.
          </p>
        </div>
        <div className="flex gap-2 text-sm font-semibold text-app-text">
          <div className="rounded-xl bg-app-surface px-4 py-3 shadow-sm ring-1 ring-slate-200">Jami: {stats.total}</div>
          <div className="rounded-xl bg-app-surface px-4 py-3 shadow-sm ring-1 ring-slate-200">Bo'sh: {stats.free}</div>
          <div className="rounded-xl bg-app-surface px-4 py-3 shadow-sm ring-1 ring-slate-200">
            Biriktirilgan: {stats.assigned}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl bg-app-surface p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-app-text">
          <Video className="h-4 w-4 text-blue-600" /> Yangi xona ochish
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-app-text-muted">Nechta</span>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 50))}
              className="w-24 rounded-lg border border-app-border px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1" style={{ minWidth: 220 }}>
            <span className="text-xs font-semibold text-app-text-muted">Nomi (ixtiyoriy)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Kechki guruh"
              className="rounded-lg border border-app-border px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1" style={{ minWidth: 240 }}>
            <span className="text-xs font-semibold text-app-text-muted">Darhol biriktirish (ixtiyoriy)</span>
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="rounded-lg border border-app-border px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Biriktirilmasin (zaxira)</option>
              {activeTeachers.map((t) => (
                <option key={t.user_id} value={t.user_id}>
                  {t.display_name} (#{t.user_id})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Ochilmoqda...' : 'Xona ochish'}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-app-surface p-1 shadow-sm ring-1 ring-slate-200">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                filter === f.id ? 'bg-blue-600 text-white' : 'text-app-text-muted hover:bg-app-bg-subtle'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex max-w-xs flex-1 items-center gap-2 rounded-xl bg-app-surface px-3 py-2 shadow-sm ring-1 ring-slate-200">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Xona nomi yoki o'qituvchi"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl bg-app-surface shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-app-bg-muted text-left text-xs font-bold uppercase text-app-text-muted">
              <tr>
                <th className="px-4 py-3">Xona</th>
                <th className="px-4 py-3">O'qituvchi</th>
                <th className="px-4 py-3">O'quvchilar</th>
                <th className="px-4 py-3">Kelgusi darslar</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-app-text-muted" colSpan={6}>
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-app-text-muted" colSpan={6}>
                    Xona yo'q. Yuqoridan yangi xona oching.
                  </td>
                </tr>
              ) : (
                filtered.map((room) => (
                  <tr key={room.id} className="hover:bg-app-bg-muted/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-app-text">{room.title || `Xona #${room.id}`}</div>
                      <div className="font-mono text-xs text-app-text-muted">{room.room_slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={room.teacher_user_id ?? ''}
                        disabled={actioning === room.id}
                        onChange={(e) => void handleAssign(room, e.target.value)}
                        className="w-56 rounded-lg border border-app-border px-2 py-1.5 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="">— biriktirilmagan —</option>
                        {activeTeachers.map((t) => (
                          <option key={t.user_id} value={t.user_id}>
                            {t.display_name} (#{t.user_id})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-semibold text-app-text">{room.students_count}</td>
                    <td className="px-4 py-3 font-semibold text-app-text">{room.upcoming_sessions}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_CLASSES[room.status]}`}>
                        {STATUS_LABELS[room.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopy(room)}
                          className="inline-flex items-center gap-1 rounded-lg bg-app-bg-subtle px-3 py-1.5 text-xs font-bold text-app-text hover:bg-slate-200"
                        >
                          {copiedId === room.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedId === room.id ? 'Nusxalandi' : 'Havola'}
                        </button>
                        {room.status === 'assigned' ? (
                          <button
                            type="button"
                            disabled={actioning === room.id}
                            onClick={() => void handleStatus(room, 'paused')}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                          >
                            <PauseCircle className="h-3.5 w-3.5" /> To'xtatish
                          </button>
                        ) : null}
                        {room.status === 'paused' ? (
                          <button
                            type="button"
                            disabled={actioning === room.id}
                            onClick={() => void handleStatus(room, 'assigned')}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <PlayCircle className="h-3.5 w-3.5" /> Yoqish
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={actioning === room.id}
                          onClick={() => void handleDelete(room)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
