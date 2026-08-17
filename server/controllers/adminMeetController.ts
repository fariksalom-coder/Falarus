import type { Request, Response } from 'express';
import type { DbClient } from '../types/dbClient';
import {
  ENROLLED_TRIAL_STATUSES,
  MEET_DOMAIN,
  generateRoomSlug,
  notifyTeacher,
  type MeetRoom,
} from '../services/teacherMeet.service.js';

const MAX_BULK_CREATE = 50;

/** Admin paneli: video xonalarni yaratish va o'qituvchilarga yo'naltirish. */
export function createAdminMeetController(supabase: DbClient) {
  /** Xonalar ro'yxati + o'qituvchi ismi, o'quvchilar soni, kelgusi darslar soni. */
  async function listRooms(req: Request, res: Response) {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    let query = supabase
      .from('teacher_meet_rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const rooms = ((data as MeetRoom[]) ?? []).map((r) => ({ ...r, id: Number(r.id) }));

    const teacherIds = Array.from(
      new Set(rooms.map((r) => Number(r.teacher_user_id)).filter((id) => Number.isFinite(id)))
    );

    const teacherNames = new Map<number, string>();
    if (teacherIds.length > 0) {
      const { data: profiles } = await supabase
        .from('teacher_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', teacherIds);
      for (const p of ((profiles as { user_id: number; first_name: string; last_name: string }[]) ?? [])) {
        const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
        teacherNames.set(Number(p.user_id), name || `#${p.user_id}`);
      }
    }

    // Har bir o'qituvchiga yozilgan (unikal) o'quvchilar soni.
    const studentCounts = new Map<number, number>();
    if (teacherIds.length > 0) {
      const { data: trials } = await supabase
        .from('teacher_trial_lessons')
        .select('teacher_user_id, student_user_id, status')
        .in('teacher_user_id', teacherIds)
        .in('status', [...ENROLLED_TRIAL_STATUSES]);
      const seen = new Map<number, Set<number>>();
      for (const t of ((trials as { teacher_user_id: number; student_user_id: number }[]) ?? [])) {
        const tid = Number(t.teacher_user_id);
        if (!seen.has(tid)) seen.set(tid, new Set());
        seen.get(tid)!.add(Number(t.student_user_id));
      }
      for (const [tid, set] of seen) studentCounts.set(tid, set.size);
    }

    // Kelgusi darslar soni (xona bo'yicha).
    const upcomingCounts = new Map<number, number>();
    if (rooms.length > 0) {
      const { data: sessions } = await supabase
        .from('teacher_meet_sessions')
        .select('room_id, starts_at, status')
        .in('room_id', rooms.map((r) => r.id))
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString());
      for (const s of ((sessions as { room_id: number }[]) ?? [])) {
        const rid = Number(s.room_id);
        upcomingCounts.set(rid, (upcomingCounts.get(rid) ?? 0) + 1);
      }
    }

    return res.json({
      domain: MEET_DOMAIN,
      rooms: rooms.map((r) => ({
        ...r,
        teacher_name: r.teacher_user_id != null ? teacherNames.get(Number(r.teacher_user_id)) ?? null : null,
        students_count: r.teacher_user_id != null ? studentCounts.get(Number(r.teacher_user_id)) ?? 0 : 0,
        upcoming_sessions: upcomingCounts.get(r.id) ?? 0,
      })),
    });
  }

  /** Bir yoki ko'p xona yaratish. teacher_user_id berilsa darhol biriktiriladi. */
  async function createRooms(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawCount = Number(body.count ?? 1);
    const count = Number.isFinite(rawCount) ? Math.min(Math.max(Math.trunc(rawCount), 1), MAX_BULK_CREATE) : 1;
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';

    const teacherRaw = body.teacher_user_id;
    const teacherId =
      teacherRaw == null || teacherRaw === '' ? null : Number(teacherRaw);
    if (teacherId != null && !Number.isFinite(teacherId)) {
      return res.status(400).json({ error: 'teacher_user_id noto‘g‘ri' });
    }

    if (teacherId != null) {
      const { data: teacher } = await supabase
        .from('teacher_profiles')
        .select('user_id')
        .eq('user_id', teacherId)
        .maybeSingle();
      if (!teacher) return res.status(404).json({ error: 'O‘qituvchi topilmadi' });
    }

    const now = new Date().toISOString();
    const adminId = Number((req as unknown as { adminId?: number }).adminId) || null;
    const rows = Array.from({ length: count }, (_, i) => ({
      room_slug: generateRoomSlug(),
      title: count > 1 && title ? `${title} ${i + 1}` : title,
      note,
      teacher_user_id: teacherId,
      status: teacherId != null ? 'assigned' : 'free',
      created_by_admin_id: adminId,
      assigned_at: teacherId != null ? now : null,
    }));

    const { data, error } = await supabase.from('teacher_meet_rooms').insert(rows).select('*');
    if (error) return res.status(500).json({ error: error.message });

    const created = ((data as MeetRoom[]) ?? []).map((r) => ({ ...r, id: Number(r.id) }));
    if (teacherId != null && created.length > 0) {
      await notifyTeacher(
        supabase,
        teacherId,
        'meet_room_assigned',
        'Sizga video xona biriktirildi',
        `${created.length} ta video dars xonasi biriktirildi. Kabinetdan dars vaqtini qo‘shing.`,
        created[0].id
      );
    }

    return res.status(201).json({ rooms: created });
  }

  /** Xonani tahrirlash: o'qituvchiga biriktirish/olib qo'yish, nom, holat. */
  async function updateRoom(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id kerak' });

    const { data: existing, error: findErr } = await supabase
      .from('teacher_meet_rooms')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (findErr) return res.status(500).json({ error: findErr.message });
    const room = existing as MeetRoom | null;
    if (!room) return res.status(404).json({ error: 'Xona topilmadi' });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    let assignedTo: number | null = null;

    if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 120);
    if (typeof body.note === 'string') patch.note = body.note.trim().slice(0, 500);

    if ('teacher_user_id' in body) {
      const raw = body.teacher_user_id;
      if (raw == null || raw === '') {
        // Biriktirishni bekor qilish — xona zaxiraga qaytadi.
        patch.teacher_user_id = null;
        patch.status = 'free';
        patch.assigned_at = null;
      } else {
        const teacherId = Number(raw);
        if (!Number.isFinite(teacherId)) return res.status(400).json({ error: 'teacher_user_id noto‘g‘ri' });
        const { data: teacher } = await supabase
          .from('teacher_profiles')
          .select('user_id')
          .eq('user_id', teacherId)
          .maybeSingle();
        if (!teacher) return res.status(404).json({ error: 'O‘qituvchi topilmadi' });
        patch.teacher_user_id = teacherId;
        patch.status = 'assigned';
        patch.assigned_at = new Date().toISOString();
        if (Number(room.teacher_user_id) !== teacherId) assignedTo = teacherId;
      }
    }

    if (typeof body.status === 'string') {
      const status = body.status.trim();
      if (!['free', 'assigned', 'paused', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'status noto‘g‘ri' });
      }
      const teacherAfter = 'teacher_user_id' in patch ? patch.teacher_user_id : room.teacher_user_id;
      if (status === 'free') {
        patch.teacher_user_id = null;
        patch.assigned_at = null;
      } else if (teacherAfter == null) {
        return res.status(400).json({ error: 'Avval xonani o‘qituvchiga biriktiring' });
      }
      patch.status = status;
    }

    const { data, error } = await supabase
      .from('teacher_meet_rooms')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    if (assignedTo != null) {
      await notifyTeacher(
        supabase,
        assignedTo,
        'meet_room_assigned',
        'Sizga video xona biriktirildi',
        'Kabinetdagi «Video darslar» bo‘limidan dars vaqtini qo‘shing.',
        id
      );
    }

    return res.json({ room: data ?? null });
  }

  /** Xonani o'chirish (dars vaqtlari ham cascade bilan o'chadi). */
  async function deleteRoom(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id kerak' });
    const { error } = await supabase.from('teacher_meet_rooms').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  /** Xonaning dars vaqtlari (admin ko'rish uchun). */
  async function listRoomSessions(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id kerak' });
    const { data, error } = await supabase
      .from('teacher_meet_sessions')
      .select('*')
      .eq('room_id', id)
      .order('starts_at', { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ sessions: data ?? [] });
  }

  return { listRooms, createRooms, updateRoom, deleteRoom, listRoomSessions };
}
