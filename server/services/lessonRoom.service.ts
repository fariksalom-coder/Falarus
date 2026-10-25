/**
 * DARS XONASI — real vaqt kanali (WebSocket, /api/lesson-room/ws).
 *
 * Server — yakuniy hakam: kim ulanayotganini (o'qituvchi/o'quvchi, xona ochiq vaqti) tekshiradi,
 * xona holatini (doskadagi material, sahifa, ruxsatlar) xotirada ushlaydi va bazaga yozib boradi.
 * Qayta ulangan klient darhol to'liq holatni oladi. Video (Jitsi) uzilib qolsa ham doska ishlaydi.
 *
 * Ilova bitta jarayonda ishlaydi (pm2 fork, 1 nusxa) — xonalar xotirada. Bir necha nusxaga
 * o'tilsa, xabarlarni Redis pub/sub orqali tarqatish kerak bo'ladi.
 */
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import { pool } from '../lib/db.js';
import { registerWsRoute } from '../lib/wsRoutes.js';
import { checkLessonAccess, LessonAccessError, parseLessonKind, type AccessQuery } from './lessonRoomAccess.js';
import {
  ROOM_CLOSE, ROOM_WS_PATH, applyRoomOp, canApply, emptyRoomState, parseRoomOp, validUnit,
  type ClientMessage, type LessonKind, type Presence, type RoomMaterial, type RoomOp, type RoomRole, type RoomState, type ServerMessage,
} from '../../shared/lessonRoom.js';

export type RoomDeps = {
  q?: AccessQuery | null;
  /** Token → foydalanuvchi id (yoki null). Standart: JWT_SECRET bilan tekshirish. */
  verifyToken?: (token: string) => number | null;
  now?: () => number;
};

type Conn = { ws: WebSocket; userId: number; role: RoomRole; alive: boolean; laser: { at: number; n: number } };

type Room = {
  key: string;
  kind: LessonKind;
  lessonId: number;
  teacherId: number;
  closesAt: number;
  state: RoomState;
  conns: Set<Conn>;
  /** Yaqinda qo'llangan klient o'zgarishlari: id → seq (qayta yuborilganini tanish uchun). */
  recent: Map<string, number>;
  /** O'zgarishlar ketma-ket qayta ishlanadi — bazadan material o'qish tartibni buzmasin. */
  queue: Promise<void>;
};

const HELLO_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 25_000;
const RECENT_OPS = 500;
const LASER_PER_SECOND = 40;
const MAX_MESSAGE_BYTES = 64 * 1024;

const defaultVerify = (token: string): number | null => {
  try {
    const payload = jwt.verify(token, String(process.env.JWT_SECRET)) as { id?: number };
    return payload?.id ? Number(payload.id) : null;
  } catch {
    return null;
  }
};

const materialOf = (m: any): RoomMaterial => ({
  id: Number(m.id), title: m.title, kind: m.kind, mime: m.mime, size_bytes: Number(m.size_bytes),
  page_count: m.page_count == null ? null : Number(m.page_count),
});

const CLOSE_FOR: Record<string, number> = { not_found: ROOM_CLOSE.forbidden, unpaid: ROOM_CLOSE.forbidden, early: ROOM_CLOSE.early, closed: ROOM_CLOSE.closed };

export function createLessonRoomServer(deps: RoomDeps = {}) {
  const q: AccessQuery | null = deps.q === undefined ? (pool ? (sql, params) => pool!.query(sql, params) : null) : deps.q;
  const verifyToken = deps.verifyToken ?? defaultVerify;
  const now = deps.now ?? Date.now;
  const rooms = new Map<string, Room>();
  /** Bo'shab qolgan xonaning tugallanmagan yozuvi — qayta ochilganda shuni kutib o'qiladi. */
  const pendingSaves = new Map<string, Promise<void>>();
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

  const send = (ws: WebSocket, msg: ServerMessage) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };
  const presenceOf = (room: Room): Presence => ({
    teacher: [...room.conns].some((c) => c.role === 'teacher'),
    student: [...room.conns].some((c) => c.role === 'student'),
  });
  const broadcast = (room: Room, msg: ServerMessage, except?: Conn) => {
    for (const c of room.conns) if (c !== except) send(c.ws, msg);
  };

  async function loadRoom(kind: LessonKind, lessonId: number, teacherId: number, closesAt: number): Promise<Room> {
    const key = `${kind}:${lessonId}`;
    const existing = rooms.get(key);
    if (existing) return existing;
    await pendingSaves.get(key);
    const state = emptyRoomState();
    const b = q ? (await q(`SELECT b.page, b.version, b.student_can_draw, m.id, m.title, m.kind, m.mime, m.size_bytes, m.page_count
      FROM teacher_lesson_boards b LEFT JOIN teacher_materials m ON m.id = b.material_id
      WHERE b.lesson_kind = $1 AND b.lesson_id = $2`, [kind, lessonId])).rows[0] : null;
    if (b) {
      state.material = b.id ? materialOf(b) : null;
      state.page = Number(b.page) || 1;
      state.studentCanDraw = Boolean(b.student_can_draw);
      state.seq = Number(b.version) || 0;
    }
    // Ikki klient bir vaqtda kirsa, ikkinchisi birinchisi yaratgan xonani oladi.
    const raced = rooms.get(key);
    if (raced) return raced;
    const room: Room = { key, kind, lessonId, teacherId, closesAt, state, conns: new Set(), recent: new Map(), queue: Promise.resolve() };
    rooms.set(key, room);
    return room;
  }

  function save(room: Room) {
    if (!q) return;
    const s = room.state;
    const write = q(`INSERT INTO teacher_lesson_boards (lesson_kind, lesson_id, material_id, page, student_can_draw, version)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (lesson_kind, lesson_id) DO UPDATE SET material_id = EXCLUDED.material_id, page = EXCLUDED.page,
        student_can_draw = EXCLUDED.student_can_draw, version = EXCLUDED.version, updated_at = now()`,
    [room.kind, room.lessonId, s.material?.id ?? null, s.page, s.studentCanDraw, s.seq])
      .then(() => undefined, (e) => console.error('[lessonRoom] save', e?.message ?? e));
    const chained = (pendingSaves.get(room.key) ?? Promise.resolve()).then(() => write);
    pendingSaves.set(room.key, chained);
    void chained.then(() => { if (pendingSaves.get(room.key) === chained) pendingSaves.delete(room.key); });
  }

  /** Material shu xonaning o'qituvchisiga tegishli va tayyormi — tafsilotini bazadan oladi. */
  async function resolveMaterial(room: Room, id: number): Promise<RoomMaterial | 'not_ready' | null> {
    if (!q) return null;
    const m = (await q('SELECT id, title, kind, mime, size_bytes, page_count, status FROM teacher_materials WHERE id = $1 AND teacher_user_id = $2', [id, room.teacherId])).rows[0];
    if (!m) return null;
    return m.status === 'ready' ? materialOf(m) : 'not_ready';
  }

  async function handleOp(room: Room, conn: Conn, id: string, raw: unknown) {
    const seen = room.recent.get(id);
    if (seen !== undefined) return send(conn.ws, { t: 'ack', id, seq: seen });
    let op: RoomOp | null = parseRoomOp(raw);
    if (!op) return send(conn.ws, { t: 'reject', id, error: 'Notoʻgʻri amal' });
    if (!canApply(conn.role, op, room.state)) return send(conn.ws, { t: 'reject', id, error: 'Bu amal faqat oʻqituvchiga ruxsat etilgan' });
    if (op.type === 'show' && op.material) {
      const material = await resolveMaterial(room, op.material.id);
      if (material === 'not_ready') return send(conn.ws, { t: 'reject', id, error: 'Material hali tayyorlanmoqda — biroz kuting' });
      if (!material) return send(conn.ws, { t: 'reject', id, error: 'Material topilmadi' });
      op = { ...op, material };
    }
    room.state = { ...applyRoomOp(room.state, op), seq: room.state.seq + 1 };
    room.recent.set(id, room.state.seq);
    if (room.recent.size > RECENT_OPS) room.recent.delete(room.recent.keys().next().value as string);
    send(conn.ws, { t: 'ack', id, seq: room.state.seq });
    // Yuboruvchining boshqa oynalari ham yangilansin — `op` ni hamma oladi, yuboruvchi ack'ni.
    broadcast(room, { t: 'op', seq: room.state.seq, op }, conn);
    save(room);
  }

  function leave(room: Room, conn: Conn) {
    if (!room.conns.delete(conn)) return;
    if (room.conns.size === 0) {
      rooms.delete(room.key);
    } else {
      broadcast(room, { t: 'presence', presence: presenceOf(room) });
      if (conn.role === 'teacher' && !presenceOf(room).teacher) broadcast(room, { t: 'laser', end: true });
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    let room: Room | null = null;
    let conn: Conn | null = null;
    let greeting = false;
    const helloTimer = setTimeout(() => { if (!conn) ws.close(ROOM_CLOSE.auth, 'Salom kutilmoqda'); }, HELLO_TIMEOUT_MS);

    ws.on('message', async (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!conn) {
        if (msg.t !== 'hello' || greeting) return;
        greeting = true;
        const userId = verifyToken(String(msg.token ?? ''));
        if (!userId) return ws.close(ROOM_CLOSE.auth, 'Avtorizatsiya kerak');
        const kind = parseLessonKind(msg.kind);
        if (!kind || !q) return ws.close(ROOM_CLOSE.forbidden, 'Dars topilmadi');
        try {
          const access = await checkLessonAccess(q, kind, Number(msg.lessonId), userId, now());
          const r = await loadRoom(kind, access.lessonId, access.teacherId, access.closesAt);
          if (ws.readyState !== WebSocket.OPEN) return;
          clearTimeout(helloTimer);
          room = r;
          conn = { ws, userId, role: access.role, alive: true, laser: { at: 0, n: 0 } };
          r.conns.add(conn);
          send(ws, { t: 'state', state: r.state, role: access.role, presence: presenceOf(r) });
          broadcast(r, { t: 'presence', presence: presenceOf(r) }, conn);
        } catch (e) {
          if (e instanceof LessonAccessError) return ws.close(CLOSE_FOR[e.reason], e.message);
          console.error('[lessonRoom] hello', e);
          ws.close(1011, 'Server xatosi');
        }
        return;
      }

      const r = room!;
      const c = conn;
      if (msg.t === 'op') {
        const id = String(msg.id ?? '').slice(0, 64);
        if (!id) return;
        r.queue = r.queue.then(() => handleOp(r, c, id, msg.op)).catch((e) => console.error('[lessonRoom] op', e));
      } else if (msg.t === 'laser') {
        if (c.role !== 'teacher') return;
        const t = now();
        if (t - c.laser.at >= 1000) c.laser = { at: t, n: 0 };
        if (++c.laser.n > LASER_PER_SECOND) return;
        if ('end' in msg) broadcast(r, { t: 'laser', end: true }, c);
        else if (validUnit(msg.x) && validUnit(msg.y)) broadcast(r, { t: 'laser', x: msg.x, y: msg.y }, c);
      } else if (msg.t === 'ping') {
        send(ws, { t: 'pong', c: Number(msg.c) || 0, s: now() });
      }
    });

    ws.on('pong', () => { if (conn) conn.alive = true; });
    ws.on('close', () => {
      clearTimeout(helloTimer);
      if (room && conn) leave(room, conn);
    });
    ws.on('error', () => undefined);
  });

  // Yurak urishi (o'lik ulanishlarni tozalash) va dars vaqti tugagan xonalarni yopish.
  const timer = setInterval(() => {
    const t = now();
    for (const room of [...rooms.values()]) {
      for (const c of [...room.conns]) {
        if (t > room.closesAt) { c.ws.close(ROOM_CLOSE.closed, 'Dars vaqti tugadi'); continue; }
        if (!c.alive) { c.ws.terminate(); leave(room, c); continue; }
        c.alive = false;
        c.ws.ping();
      }
    }
  }, HEARTBEAT_MS);
  timer.unref();

  return {
    wss,
    /** Xona xotirada bo'lsa — doskadagi material (null — doska bo'sh); bo'lmasa undefined (bazadan o'qing). */
    currentMaterialId(kind: LessonKind, lessonId: number): number | null | undefined {
      const room = rooms.get(`${kind}:${lessonId}`);
      return room ? room.state.material?.id ?? null : undefined;
    },
    /** Material o'chirilganda: ochiq xonalarda doska yopiladi. */
    materialDeleted(materialId: number) {
      for (const room of rooms.values()) {
        if (room.state.material?.id !== materialId) continue;
        const op: RoomOp = { type: 'show', material: null, page: 1 };
        room.state = { ...applyRoomOp(room.state, op), seq: room.state.seq + 1 };
        broadcast(room, { t: 'op', seq: room.state.seq, op });
        save(room);
      }
    },
    close() {
      clearInterval(timer);
      for (const c of wss.clients) c.terminate();
      wss.close();
    },
  };
}

export type LessonRoomServer = ReturnType<typeof createLessonRoomServer>;

let shared: LessonRoomServer | null = null;

/** server.ts dan: xona kanalini HTTP serverga ulaydi. */
export function attachLessonRoom(server: Server, deps: RoomDeps = {}): LessonRoomServer {
  shared = createLessonRoomServer(deps);
  registerWsRoute(server, ROOM_WS_PATH, shared.wss);
  return shared;
}

/** Material marshrutlari uchun (fayl kimga berilishini xona holatidan bilish). */
export const lessonRoomServer = () => shared;
