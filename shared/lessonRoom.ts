/**
 * DARS XONASI — real vaqt kanali (WebSocket) protokoli. Server ham, brauzer ham shu
 * faylni ishlatadi: holat bir xil qoida bilan o'zgaradi (`applyRoomOp`), shuning uchun
 * o'qituvchi ekrani serverni kutmasdan yangilanadi, server esa yakuniy hakam.
 *
 * Oqim:
 *   klient → {t:'hello', token, kind, lessonId}      birinchi xabar (token manzilda emas — loglarga tushmasin)
 *   server → {t:'state', state, role, presence}      to'liq holat (ulanish va qayta ulanishda)
 *   klient → {t:'op', id, op}                        o'zgarish; `id` — klient raqami (qayta yuborilsa ikki marta qo'llanmaydi)
 *   server → {t:'ack', id, seq} yuboruvchiga, {t:'op', seq, op} qolganlarga
 *   klient → {t:'laser', x, y} / {t:'laser', end:true} — saqlanmaydi, faqat uzatiladi
 *   klient → {t:'ping', c} → server {t:'pong', c, s}  — soat farqi (audio sinxroni uchun)
 */
import type { MaterialKind } from './teacherMaterials';

export type LessonKind = 'lesson' | 'trial';
export type RoomRole = 'teacher' | 'student';

export type RoomMaterial = { id: number; title: string; kind: MaterialKind; mime: string; size_bytes: number };

export type RoomState = {
  material: RoomMaterial | null;
  page: number;
  /** O'quvchiga doskada chizishga ruxsat (4-bosqich). */
  studentCanDraw: boolean;
  /** Har qo'llangan o'zgarishda +1. */
  seq: number;
};

export type RoomOp =
  | { type: 'show'; material: RoomMaterial | null; page: number }
  | { type: 'page'; page: number }
  | { type: 'permit'; studentCanDraw: boolean };

export type Presence = { teacher: boolean; student: boolean };

export type ClientMessage =
  | { t: 'hello'; token: string; kind: LessonKind; lessonId: number }
  | { t: 'op'; id: string; op: RoomOp }
  | { t: 'laser'; x: number; y: number }
  | { t: 'laser'; end: true }
  | { t: 'ping'; c: number };

export type ServerMessage =
  | { t: 'state'; state: RoomState; role: RoomRole; presence: Presence }
  | { t: 'ack'; id: string; seq: number }
  | { t: 'op'; seq: number; op: RoomOp }
  | { t: 'reject'; id: string; error: string }
  | { t: 'laser'; x: number; y: number }
  | { t: 'laser'; end: true }
  | { t: 'presence'; presence: Presence }
  | { t: 'pong'; c: number; s: number };

/** Ulanishni yopish kodlari (klient shunga qarab qayta urinadi yoki to'xtaydi). */
export const ROOM_CLOSE = {
  auth: 4401,
  forbidden: 4403,
  early: 4425,
  closed: 4410,
  replaced: 4409,
} as const;

/** Bu kodlarda qayta ulanish befoyda — xona yopiq yoki kirish huquqi yo'q. */
export const FINAL_CLOSE_CODES: number[] = [ROOM_CLOSE.auth, ROOM_CLOSE.forbidden, ROOM_CLOSE.closed];

export const ROOM_WS_PATH = '/api/lesson-room/ws';
export const MAX_PAGE = 10_000;

export const emptyRoomState = (): RoomState => ({ material: null, page: 1, studentCanDraw: false, seq: 0 });

const clampPage = (n: unknown) => Math.max(1, Math.min(MAX_PAGE, Math.floor(Number(n)) || 1));

/** Holatga o'zgarishni qo'llaydi (yangi obyekt qaytaradi, `seq` ni oshirmaydi). */
export function applyRoomOp(state: RoomState, op: RoomOp): RoomState {
  switch (op.type) {
    case 'show':
      return { ...state, material: op.material, page: op.material ? clampPage(op.page) : 1 };
    case 'page':
      return state.material ? { ...state, page: clampPage(op.page) } : state;
    case 'permit':
      return { ...state, studentCanDraw: op.studentCanDraw };
  }
}

/** Kim qaysi o'zgarishni qila oladi. Hozircha hammasi — faqat o'qituvchi. */
export const canApply = (role: RoomRole, _op: RoomOp, _state: RoomState) => role === 'teacher';

/** Tarmoqdan kelgan o'zgarishni tekshiradi; noto'g'ri bo'lsa null. Materialning tafsilotini server bazadan oladi. */
export function parseRoomOp(raw: unknown): RoomOp | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  if (o.type === 'show') {
    if (o.material === null) return { type: 'show', material: null, page: 1 };
    const id = Number((o.material as { id?: unknown } | undefined)?.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { type: 'show', material: { id, title: '', kind: 'pdf', mime: '', size_bytes: 0 }, page: clampPage(o.page) };
  }
  if (o.type === 'page') return { type: 'page', page: clampPage(o.page) };
  if (o.type === 'permit' && typeof o.studentCanDraw === 'boolean') return { type: 'permit', studentCanDraw: o.studentCanDraw };
  return null;
}

/** Lazer nuqtasi sahifaga nisbatan 0..1 — har xil ekranda bir joyda turadi. */
export const validUnit = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
