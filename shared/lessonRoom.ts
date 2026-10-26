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
 *   klient → {t:'draft', …}                           chizilayotgan chiziq (saqlanmaydi, faqat uzatiladi)
 *   klient → {t:'laser', x, y} / {t:'laser', end:true} — saqlanmaydi, faqat uzatiladi
 *   klient → {t:'view', key, s, x, y}                o'qituvchi sahifani kattalashtirdi/surdi — o'quvchi ergashadi
 *   klient → {t:'ping', c} → server {t:'pong', c, s}  — soat farqi (audio sinxroni uchun)
 *
 * Chizmalar sahifaga nisbatan 0..1 koordinatada saqlanadi — har xil ekranda bir joyda turadi.
 */
import type { MaterialKind } from './teacherMaterials';

export type LessonKind = 'lesson' | 'trial';
export type RoomRole = 'teacher' | 'student';

export type RoomMaterial = {
  id: number; title: string; kind: MaterialKind; mime: string; size_bytes: number;
  /** PDF sahifalari soni (rasmda 1, audio/videoda null). */
  page_count: number | null;
};

export type InkTool = 'pen' | 'marker' | 'text';

/**
 * Bitta chizma. `pts` — [x, y, x, y, …], 0..1 (sahifa eni va bo'yiga nisbatan).
 * `size` — sahifa enining mingdan bir ulushlarida (ekran o'lchamidan qat'i nazar bir xil qalinlik).
 * Matn: `pts` = [x, y] (chap-yuqori burchak), `text`.
 */
export type Stroke = {
  id: string;
  tool: InkTool;
  color: string;
  size: number;
  pts: number[];
  text?: string;
  /** Kim chizgan — server qo'yadi (o'quvchi faqat o'zinikini o'chira oladi). */
  by?: RoomRole;
};

/**
 * Audio/video materialni ijro etish holati. `position` — `at` paytidagi joy (soniya),
 * `at` — server soati (ms). Hozirgi joy: playing ? position + (hozir − at) / 1000 : position.
 */
export type MediaPlayback = { playing: boolean; position: number; at: number };

export type RoomState = {
  material: RoomMaterial | null;
  /** Doskadagi audio/video ijrosi (o'qituvchi boshqaradi); boshqa materialda null. */
  media: MediaPlayback | null;
  page: number;
  /** Ochiq oq varaq raqami (1 dan); null — material ko'rsatilmoqda. */
  blank: number | null;
  /** Shu darsda ochilgan oq varaqlar soni. */
  blankCount: number;
  /** O'quvchiga doskada chizishga ruxsat. */
  studentCanDraw: boolean;
  /** Sahifa kaliti (`inkKeyOf`) → chizmalar. */
  ink: Record<string, Stroke[]>;
  /** Har qo'llangan o'zgarishda +1. */
  seq: number;
};

export type RoomOp =
  | { type: 'show'; material: RoomMaterial | null; page: number }
  | { type: 'page'; page: number }
  /** Oq varaq: `n` — ochiladigan varaq (blankCount + 1 — yangisi); null — materialga qaytish. */
  | { type: 'blank'; n: number | null }
  /** Doskani yopish (oddiy video qo'ng'iroqqa qaytish). */
  | { type: 'close' }
  | { type: 'ink'; key: string; add?: Stroke[]; remove?: string[]; clear?: boolean }
  | { type: 'permit'; studentCanDraw: boolean }
  /** Ijro / pauza / o'tkazish. `at` ni server qo'yadi (klientning soatiga ishonilmaydi). */
  | { type: 'media'; playing: boolean; position: number; at: number };

export type Presence = { teacher: boolean; student: boolean };

/**
 * O'qituvchining sahifa ko'rinishi: `s` — kattalashtirish (1..MAX_VIEW_SCALE), `x`, `y` — siljish
 * sahifa eni/bo'yiga nisbatan (ekran o'lchamidan qat'i nazar bir joy). `key` — qaysi sahifa (`inkKeyOf`).
 */
export type BoardView = { key: string; s: number; x: number; y: number };
export const MAX_VIEW_SCALE = 4;

/** Chizilayotgan chiziqning yangi nuqtalari (barmoq hali ko'tarilmagan). `cancel` — chiziq bekor qilindi. */
export type DraftMessage = { t: 'draft'; key: string; id: string; tool: InkTool; color: string; size: number; pts: number[]; cancel?: boolean };

export type ClientMessage =
  | { t: 'hello'; token: string; kind: LessonKind; lessonId: number }
  | { t: 'op'; id: string; op: RoomOp }
  | DraftMessage
  | { t: 'laser'; x: number; y: number }
  | { t: 'laser'; end: true }
  | ({ t: 'view' } & BoardView)
  | { t: 'ping'; c: number };

export type ServerMessage =
  | { t: 'state'; state: RoomState; role: RoomRole; presence: Presence }
  | { t: 'ack'; id: string; seq: number }
  | { t: 'op'; seq: number; op: RoomOp }
  | { t: 'reject'; id: string; error: string }
  | (DraftMessage & { by: RoomRole })
  | { t: 'laser'; x: number; y: number }
  | { t: 'laser'; end: true }
  | ({ t: 'view' } & BoardView)
  | { t: 'presence'; presence: Presence }
  | { t: 'pong'; c: number; s: number };

/** Ulanishni yopish kodlari (klient shunga qarab qayta urinadi yoki to'xtaydi). */
export const ROOM_CLOSE = {
  auth: 4401,
  forbidden: 4403,
  early: 4425,
  closed: 4410,
} as const;

/** Bu kodlarda qayta ulanish befoyda — xona yopiq yoki kirish huquqi yo'q. */
export const FINAL_CLOSE_CODES: number[] = [ROOM_CLOSE.auth, ROOM_CLOSE.forbidden, ROOM_CLOSE.closed];

export const ROOM_WS_PATH = '/api/lesson-room/ws';
export const MAX_PAGE = 10_000;
export const MAX_BLANKS = 50;
/** Eng uzun audio/video — 6 soat (noto'g'ri qiymat o'ynatgichni buzmasin). */
export const MAX_MEDIA_SECONDS = 6 * 3600;

/** Chizma cheklovlari: bitta sahifa va bitta chiziq hajmi chegaralangan (xona holati yengil qolsin). */
export const INK_MAX_STROKES_PER_PAGE = 1500;
export const INK_MAX_POINTS = 1500;
export const INK_MAX_TEXT = 200;
export const INK_MAX_ADD = 400;
/** Oq varaq nisbati (eni/bo'yi) — hamma ekranda bir xil, chizmalar joyidan siljimaydi. */
export const BLANK_RATIO = 4 / 3;

export const emptyRoomState = (): RoomState => ({
  material: null, media: null, page: 1, blank: null, blankCount: 0, studentCanDraw: false, ink: {}, seq: 0,
});

const clampPage = (n: unknown) => Math.max(1, Math.min(MAX_PAGE, Math.floor(Number(n)) || 1));

/** Doska ko'rinadimi (material yoki oq varaq ochiq). */
export const boardOpen = (s: RoomState) => s.material !== null || s.blank !== null;

/** Hozir ko'rinayotgan sahifaning chizmalar kaliti; audio/video va yopiq doskada — null. */
export function inkKeyOf(s: Pick<RoomState, 'material' | 'page' | 'blank'>): string | null {
  if (s.blank !== null) return `b${s.blank}`;
  const m = s.material;
  if (!m || (m.kind !== 'pdf' && m.kind !== 'image')) return null;
  return `m${m.id}:${m.kind === 'image' ? 1 : s.page}`;
}

/** Holatga o'zgarishni qo'llaydi (yangi obyekt qaytaradi, `seq` ni oshirmaydi). */
export function applyRoomOp(state: RoomState, op: RoomOp): RoomState {
  switch (op.type) {
    case 'show':
      return { ...state, material: op.material, media: null, blank: null, page: op.material ? clampPage(op.page) : 1 };
    case 'page': {
      if (state.blank !== null) return { ...state, blank: Math.max(1, Math.min(state.blankCount, Math.floor(op.page) || 1)) };
      if (!state.material) return state;
      const last = state.material.page_count ?? MAX_PAGE;
      return { ...state, page: Math.min(clampPage(op.page), last) };
    }
    case 'blank': {
      if (op.n === null) return state.material ? { ...state, blank: null } : state;
      const n = Math.max(1, Math.min(state.blankCount + 1, MAX_BLANKS, Math.floor(op.n) || 1));
      return { ...state, blank: n, blankCount: Math.max(state.blankCount, n) };
    }
    case 'close':
      return { ...state, material: null, media: null, blank: null, page: 1 };
    case 'media': {
      const kind = state.material?.kind;
      if (kind !== 'audio' && kind !== 'video') return state;
      return { ...state, media: { playing: op.playing, position: op.position, at: op.at } };
    }
    case 'ink': {
      const before = state.ink[op.key] ?? [];
      const removed = new Set(op.remove ?? []);
      let next = op.clear ? [] : removed.size ? before.filter((s) => !removed.has(s.id)) : before;
      if (op.add?.length) {
        const have = new Set(next.map((s) => s.id));
        next = [...next, ...op.add.filter((s) => !have.has(s.id))];
      }
      return { ...state, ink: { ...state.ink, [op.key]: next } };
    }
    case 'permit':
      return { ...state, studentCanDraw: op.studentCanDraw };
  }
}

/**
 * Kim qaysi o'zgarishni qila oladi. O'qituvchi — hammasini. O'quvchi — ruxsat berilganda faqat
 * hozirgi sahifaga chizadi va faqat o'z chizmalarini o'chiradi (butun sahifani tozalay olmaydi).
 */
export function canApply(role: RoomRole, op: RoomOp, state: RoomState): boolean {
  if (role === 'teacher') return true;
  if (op.type !== 'ink' || !state.studentCanDraw || op.clear || op.key !== inkKeyOf(state)) return false;
  if (op.remove?.length) {
    const mine = new Set((state.ink[op.key] ?? []).filter((s) => s.by === 'student').map((s) => s.id));
    if (!op.remove.every((id) => mine.has(id))) return false;
  }
  return true;
}

/** Chizish ruxsati: o'qituvchi doim, o'quvchi — ruxsat berilganda. */
export const canDraw = (role: RoomRole | null, state: RoomState | null) =>
  role === 'teacher' || (role === 'student' && Boolean(state?.studentCanDraw));

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;
const isId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,40}$/.test(v);
const isKey = (v: unknown): v is string => typeof v === 'string' && /^(b\d{1,3}|m\d{1,12}:\d{1,5})$/.test(v);
export const isInkColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

/** Nuqtalar ro'yxatini tekshiradi va qisqartiradi (0..1, 4 xona). */
export function cleanPoints(raw: unknown, max = INK_MAX_POINTS): number[] | null {
  if (!Array.isArray(raw) || raw.length % 2 !== 0 || raw.length > max * 2) return null;
  const out: number[] = [];
  for (const v of raw) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    out.push(round4(Math.max(0, Math.min(1, v))));
  }
  return out;
}

export function parseStroke(raw: unknown): Stroke | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || !isId(o.id) || !isInkColor(o.color)) return null;
  if (o.tool !== 'pen' && o.tool !== 'marker' && o.tool !== 'text') return null;
  const size = Number(o.size);
  if (!Number.isFinite(size) || size <= 0 || size > 120) return null;
  const pts = cleanPoints(o.pts);
  if (!pts || pts.length < 2) return null;
  if (o.tool === 'text') {
    const text = String(o.text ?? '').replace(/\s+/g, ' ').trim().slice(0, INK_MAX_TEXT);
    if (!text) return null;
    return { id: o.id, tool: 'text', color: o.color, size, pts: pts.slice(0, 2), text };
  }
  return { id: o.id, tool: o.tool, color: o.color, size, pts };
}

/** Tarmoqdan kelgan o'zgarishni tekshiradi; noto'g'ri bo'lsa null. Materialning tafsilotini server bazadan oladi. */
export function parseRoomOp(raw: unknown): RoomOp | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  if (o.type === 'show') {
    if (o.material === null) return { type: 'show', material: null, page: 1 };
    const id = Number((o.material as { id?: unknown } | undefined)?.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { type: 'show', material: { id, title: '', kind: 'pdf', mime: '', size_bytes: 0, page_count: null }, page: clampPage(o.page) };
  }
  if (o.type === 'page') return { type: 'page', page: clampPage(o.page) };
  if (o.type === 'blank') {
    if (o.n === null) return { type: 'blank', n: null };
    const n = Math.floor(Number(o.n));
    return n >= 1 && n <= MAX_BLANKS ? { type: 'blank', n } : null;
  }
  if (o.type === 'close') return { type: 'close' };
  if (o.type === 'permit' && typeof o.studentCanDraw === 'boolean') return { type: 'permit', studentCanDraw: o.studentCanDraw };
  if (o.type === 'media' && typeof o.playing === 'boolean') {
    const position = Number(o.position);
    if (!Number.isFinite(position)) return null;
    return { type: 'media', playing: o.playing, position: Math.max(0, Math.min(MAX_MEDIA_SECONDS, Math.round(position * 1000) / 1000)), at: 0 };
  }
  if (o.type === 'ink' && isKey(o.key)) {
    const add = o.add === undefined ? [] : Array.isArray(o.add) && o.add.length <= INK_MAX_ADD ? o.add.map(parseStroke) : null;
    const remove = o.remove === undefined ? [] : Array.isArray(o.remove) && o.remove.length <= INK_MAX_STROKES_PER_PAGE ? o.remove : null;
    if (!add || add.some((s) => !s) || !remove || !remove.every(isId)) return null;
    const op: RoomOp = { type: 'ink', key: o.key };
    if (add.length) op.add = add as Stroke[];
    if (remove.length) op.remove = remove as string[];
    if (o.clear === true) op.clear = true;
    return op.add || op.remove || op.clear ? op : null;
  }
  return null;
}

/** Chizilayotgan chiziq xabarini tekshiradi. */
export function parseDraft(raw: unknown): DraftMessage | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || !isKey(o.key) || !isId(o.id) || !isInkColor(o.color) || (o.tool !== 'pen' && o.tool !== 'marker')) return null;
  const size = Number(o.size);
  const pts = cleanPoints(o.pts, 400);
  if (!Number.isFinite(size) || size <= 0 || size > 120 || !pts) return null;
  return { t: 'draft', key: o.key, id: o.id, tool: o.tool, color: o.color, size, pts, ...(o.cancel === true ? { cancel: true } : {}) };
}

/** Ijro holatidan hozirgi joy (soniya), `now` — server soati. */
export function mediaPositionAt(m: MediaPlayback, now: number): number {
  return m.playing ? m.position + Math.max(0, now - m.at) / 1000 : m.position;
}

/** Lazer nuqtasi sahifaga nisbatan 0..1 — har xil ekranda bir joyda turadi. */
export const validUnit = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

/** Ko'rinish xabarini tekshiradi (siljish sahifadan uzoqqa ketmasin). */
export function parseView(raw: unknown): BoardView | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || !isKey(o.key)) return null;
  const s = Number(o.s), x = Number(o.x), y = Number(o.y);
  if (![s, x, y].every(Number.isFinite)) return null;
  const lim = (n: number) => round4(Math.max(-MAX_VIEW_SCALE, Math.min(MAX_VIEW_SCALE, n)));
  return { key: o.key, s: round4(Math.max(1, Math.min(MAX_VIEW_SCALE, s))), x: lim(x), y: lim(y) };
}
