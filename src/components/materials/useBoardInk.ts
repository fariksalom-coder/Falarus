import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { INK_MAX_POINTS, canDraw, inkKeyOf, type InkTool, type RoomState, type Stroke } from '../../../shared/lessonRoom';
import type { LessonRoom } from '../../hooks/useLessonRoom';
import { INK_COLORS, MARKER_COLORS, TOOL_SIZE, hitStroke, newStrokeId, textBox, type BoardTool } from './ink';
import { LaserTrail, type LiveStroke } from './InkLayer';
import type { DrawHandlers } from './useZoomPan';

/**
 * Doskaga chizish: asbob tanlash, o'z chizig'i (boshqalar uni chizilayotganda ko'radi),
 * o'chirgich, matn, lazer va «orqaga qaytarish» (faqat o'z amallari, hozirgi sahifada).
 */

const DRAFT_EVERY_MS = 50;
const LASER_EVERY_MS = 33;
/** Boshqa tomonning chizilayotgan chizig'i shuncha vaqt yangilanmasa — yo'qoladi (aloqa uzilgan). */
const DRAFT_STALE_MS = 4000;
const MIN_STEP = 0.0015;

type UndoEntry = { key: string; added?: Stroke[]; removed?: Stroke[] };

/** Juda uzun chiziqni ruxsat etilgan nuqtalar soniga siqadi (shakli saqlanadi). */
function decimate(pts: number[]): number[] {
  const n = pts.length / 2;
  if (n <= INK_MAX_POINTS) return pts;
  const step = n / INK_MAX_POINTS;
  const out: number[] = [];
  for (let i = 0; i < INK_MAX_POINTS - 1; i++) {
    const k = Math.floor(i * step) * 2;
    out.push(pts[k], pts[k + 1]);
  }
  out.push(pts[pts.length - 2], pts[pts.length - 1]);
  return out;
}

export function useBoardInk(room: LessonRoom, state: RoomState | null, overlay: MutableRefObject<HTMLDivElement | null>) {
  const { role, send, sendDraft, sendLaser, onDraft, onLaser } = room;
  const key = state ? inkKeyOf(state) : null;
  const allowed = Boolean(key) && canDraw(role, state);
  const [tool, setToolState] = useState<BoardTool>('view');
  const [penColor, setPenColor] = useState<string>(INK_COLORS[1]);
  const [markerColor, setMarkerColor] = useState<string>(MARKER_COLORS[0]);
  const [local, setLocal] = useState<LiveStroke | null>(null);
  const [remote, setRemote] = useState<Record<string, LiveStroke & { key: string; seen: number }>>({});
  const [textAt, setTextAt] = useState<{ x: number; y: number } | null>(null);
  const [textDraft, setTextDraftState] = useState('');
  // Ref'larda ham: matn oynasidan chiqish (blur) va doskaga yangi bosish bir hodisada kelishi mumkin.
  const textAtRef = useRef(textAt);
  const draftRef = useRef('');
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  /** Tahrirlanayotgan eski matn (yangi matn yozilayotgan bo'lsa — null). */
  const [editing, setEditing] = useState<Stroke | null>(null);
  const editingRef = useRef<Stroke | null>(null);
  /** Surilayotgan matn: asl nusxa va hozirgi joyi. */
  const [dragged, setDragged] = useState<{ from: Stroke; pts: [number, number] } | null>(null);
  const draggedRef = useRef<{ from: Stroke; pts: [number, number] } | null>(null);
  const [undoCount, setUndoCount] = useState(0);
  const laser = useMemo(() => new LaserTrail(), []);

  const undoStack = useRef<UndoEntry[]>([]);
  const drawing = useRef<{ stroke: LiveStroke; sent: number; timer: number; key: string } | null>(null);
  const erasing = useRef<Stroke[] | null>(null);
  const eraserLast = useRef<{ x: number; y: number } | null>(null);
  const lastLaser = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const setTool = useCallback((t: BoardTool) => setToolState(t), []);
  const color = tool === 'marker' ? markerColor : penColor;
  const setColor = (c: string) => (tool === 'marker' ? setMarkerColor(c) : setPenColor(c));

  /** Chala chiziqni tashlaydi: taymer to'xtaydi, boshqa tomondagi chizilayotgan nusxa ham o'chadi. */
  const dropDrawing = () => {
    const d = drawing.current;
    drawing.current = null;
    if (d) {
      window.clearInterval(d.timer);
      if (d.key) sendDraft({ key: d.key, id: d.stroke.id, tool: d.stroke.tool as 'pen' | 'marker', color: d.stroke.color, size: d.stroke.size, pts: [], cancel: true });
    }
    setLocal(null);
  };

  // Ruxsat olib qo'yilsa yoki sahifa almashsa — chala chiziq va matn oynasi yopiladi.
  useEffect(() => {
    if (!allowed && tool !== 'view') setToolState('view');
    if (!allowed) dropDrawing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, tool]);
  useEffect(() => {
    dropDrawing();
    // Telefon klaviaturasi ochiq qolib, yozilgani hech qayerga ketmasin.
    textInputRef.current?.blur();
    textAtRef.current = null;
    setTextAt(null);
    draftRef.current = '';
    setTextDraftState('');
    editingRef.current = null;
    setEditing(null);
    setDragged(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Boshqa tomonning chizilayotgan chiziqlari.
  useEffect(() => onDraft((d) => {
    setRemote((all) => {
      const next = { ...all };
      if (d.cancel) { delete next[d.id]; return next; }
      const prev = next[d.id];
      next[d.id] = { id: d.id, key: d.key, tool: d.tool, color: d.color, size: d.size, pts: [...(prev?.pts ?? []), ...d.pts], seen: Date.now() };
      return next;
    });
  }), [onDraft]);

  // Yakuniy chiziq kelganda yoki aloqa uzilib eskirganda — chizilayotgan nusxa olib tashlanadi.
  const savedIds = useMemo(() => new Set(key && state ? (state.ink[key] ?? []).map((s) => s.id) : []), [state, key]);
  useEffect(() => {
    const ids = Object.keys(remote);
    if (!ids.length) return;
    const stale = ids.filter((id) => savedIds.has(id) || Date.now() - remote[id].seen > DRAFT_STALE_MS);
    if (stale.length) setRemote((all) => { const n = { ...all }; stale.forEach((id) => delete n[id]); return n; });
    const timer = window.setTimeout(() => setRemote((all) => ({ ...all })), DRAFT_STALE_MS);
    return () => window.clearTimeout(timer);
  }, [remote, savedIds]);

  // Lazer: o'qituvchidan keladi (o'quvchida), o'zimizniki — mahalliy izga.
  useEffect(() => onLaser((p) => (p ? laser.push(p.x, p.y) : laser.end())), [onLaser, laser]);

  const toUnit = useCallback((cx: number, cy: number) => {
    const r = overlay.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return null;
    return { x: Math.max(0, Math.min(1, (cx - r.left) / r.width)), y: Math.max(0, Math.min(1, (cy - r.top) / r.height)) };
  }, [overlay]);

  const pushUndo = (e: UndoEntry) => {
    undoStack.current.push(e);
    if (undoStack.current.length > 100) undoStack.current.shift();
    setUndoCount(undoStack.current.length);
  };

  const flushDraft = useCallback(() => {
    const d = drawing.current;
    if (!d || !key) return;
    const fresh = d.stroke.pts.slice(d.sent);
    if (!fresh.length) return;
    d.sent = d.stroke.pts.length;
    sendDraft({ key, id: d.stroke.id, tool: d.stroke.tool as 'pen' | 'marker', color: d.stroke.color, size: d.stroke.size, pts: fresh });
  }, [key, sendDraft]);

  /**
   * Shu foydalanuvchi o'zgartira oladigan chizma: o'qituvchi — hammasini, o'quvchi — o'zinikini.
   * Belgisiz (`by` yo'q) chizma — shu qurilmada hozirgina qo'shilgani: server belgini boshqalarga
   * yuboradi, yozganning o'ziga esa faqat tasdiq keladi. Shuning uchun u ham «o'ziniki».
   */
  const mine = useCallback((st: Stroke) => role === 'teacher' || st.by !== 'teacher', [role]);

  /** O'chirgich tegib o'tgan chizmalar (o'quvchi faqat o'zinikini o'chira oladi). */
  const eraseAt = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    if (!s || !key || !erasing.current) return;
    const already = new Set(erasing.current.map((st) => st.id));
    // Sahifa nisbati qatlamning o'lchamidan (kattalashtirish ikkala tomonga bir xil ta'sir qiladi).
    const r = overlay.current?.getBoundingClientRect();
    const ratio = r && r.height ? r.width / r.height : 1;
    const hits = (s.ink[key] ?? []).filter((st) => !already.has(st.id) && mine(st) && hitStroke(st, x, y, ratio));
    if (!hits.length) return;
    erasing.current.push(...hits);
    send({ type: 'ink', key, remove: hits.map((h) => h.id) });
  }, [key, overlay, mine, send]);

  const draw: DrawHandlers | null = useMemo(() => {
    if (!allowed || !key || tool === 'view' || (tool === 'laser' && role !== 'teacher')) return null;
    return {
      down: (cx, cy) => {
        const p = toUnit(cx, cy);
        if (!p) return;
        if (tool === 'pen' || tool === 'marker') {
          const stroke: LiveStroke = { id: newStrokeId(), tool, color, size: TOOL_SIZE[tool], pts: [p.x, p.y] };
          drawing.current = { stroke, sent: 0, timer: window.setInterval(flushDraft, DRAFT_EVERY_MS), key };
          setLocal({ ...stroke });
        } else if (tool === 'eraser') {
          erasing.current = [];
          eraserLast.current = p;
          eraseAt(p.x, p.y);
        } else if (tool === 'laser') {
          laser.push(p.x, p.y);
          sendLaser(p);
          lastLaser.current = performance.now();
        }
      },
      move: (cx, cy) => {
        const p = toUnit(cx, cy);
        if (!p) return;
        if (tool === 'pen' || tool === 'marker') {
          const d = drawing.current;
          if (!d) return;
          const pts = d.stroke.pts;
          if (Math.hypot(p.x - pts[pts.length - 2], p.y - pts[pts.length - 1]) < MIN_STEP) return;
          pts.push(p.x, p.y);
          setLocal({ ...d.stroke, pts: [...pts] });
        } else if (tool === 'eraser') {
          // Tez surilganda barmoq oralig'idagi chiziqlar ham o'chsin — yo'l bo'ylab tekshiriladi.
          const from = eraserLast.current ?? p;
          const steps = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / 0.01));
          for (let i = 1; i <= steps; i++) eraseAt(from.x + ((p.x - from.x) * i) / steps, from.y + ((p.y - from.y) * i) / steps);
          eraserLast.current = p;
        } else if (tool === 'laser') {
          laser.push(p.x, p.y);
          const now = performance.now();
          if (now - lastLaser.current >= LASER_EVERY_MS) { lastLaser.current = now; sendLaser(p); }
        }
      },
      up: () => {
        if (tool === 'pen' || tool === 'marker') {
          const d = drawing.current;
          drawing.current = null;
          if (!d) return;
          window.clearInterval(d.timer);
          flushDraft();
          const stroke: Stroke = { ...d.stroke, pts: decimate(d.stroke.pts) };
          send({ type: 'ink', key, add: [stroke] });
          pushUndo({ key, added: [stroke] });
          setLocal(null);
        } else if (tool === 'eraser') {
          if (erasing.current?.length) pushUndo({ key, removed: erasing.current });
          erasing.current = null;
        } else if (tool === 'laser') {
          laser.end();
          sendLaser(null);
        }
      },
      cancel: () => {
        const d = drawing.current;
        drawing.current = null;
        if (d) {
          window.clearInterval(d.timer);
          sendDraft({ key, id: d.stroke.id, tool: d.stroke.tool as 'pen' | 'marker', color: d.stroke.color, size: d.stroke.size, pts: [], cancel: true });
        }
        setLocal(null);
        if (erasing.current?.length) pushUndo({ key, removed: erasing.current });
        erasing.current = null;
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, key, tool, color, role, toUnit, flushDraft, eraseAt, laser, send, sendDraft, sendLaser]);

  const setTextDraft = useCallback((v: string) => { draftRef.current = v; setTextDraftState(v); }, []);

  const closeText = () => {
    textAtRef.current = null;
    setTextAt(null);
    draftRef.current = '';
    setTextDraftState('');
    editingRef.current = null;
    setEditing(null);
  };

  /**
   * Yozilganni doskaga qo'yadi. Eski matn tahrirlangan bo'lsa — u yangisiga almashtiriladi
   * (bitta amal: «orqaga» bilan eski matn qaytadi); bo'shatib qo'yilgan bo'lsa — o'chiriladi.
   */
  const commitText = useCallback(() => {
    const at = textAtRef.current;
    const old = editingRef.current;
    const t = draftRef.current.replace(/\s+/g, ' ').trim().slice(0, 200);
    closeText();
    if (!at || !key) return;
    if (old) {
      if (t === old.text) return;
      if (!t) {
        send({ type: 'ink', key, remove: [old.id] });
        pushUndo({ key, removed: [old] });
        return;
      }
      const next: Stroke = { id: newStrokeId(), tool: 'text', color: old.color, size: old.size, pts: [old.pts[0], old.pts[1]], text: t };
      send({ type: 'ink', key, add: [next], remove: [old.id] });
      pushUndo({ key, added: [next], removed: [old] });
      return;
    }
    if (!t) return;
    const stroke: Stroke = { id: newStrokeId(), tool: 'text', color: penColor, size: TOOL_SIZE.text, pts: [at.x, at.y], text: t };
    send({ type: 'ink', key, add: [stroke] });
    pushUndo({ key, added: [stroke] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, penColor, send]);

  const cancelText = useCallback(() => closeText(), []);

  /** Burchakdagi savat: tahrirlanayotgan matn butunlay o'chadi (yangisi bo'lsa — shunchaki yopiladi). */
  const deleteText = useCallback(() => {
    const old = editingRef.current;
    closeText();
    textInputRef.current?.blur();
    if (!old || !key) return;
    send({ type: 'ink', key, remove: [old.id] });
    pushUndo({ key, removed: [old] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, send]);

  // Boshqa asbobga o'tilsa — yozilgan matn yo'qolmasin.
  useEffect(() => {
    if (tool !== 'text' && textAtRef.current) commitText();
  }, [tool, commitText]);

  /** Doskadagi har qanday matnni (ustozniki ham, o'quvchiniki ham) ikkala tomon tahrirlay oladi. */
  const canEdit = useCallback((st: Stroke) => st.tool === 'text', []);

  /** Bosilgan joydagi eng ustidagi matn (bo'lmasa — null). */
  const textAtPoint = useCallback((x: number, y: number): Stroke | null => {
    const s = stateRef.current;
    if (!s || !key) return null;
    const r = overlay.current?.getBoundingClientRect();
    const ratio = r && r.height ? r.width / r.height : 1;
    const list = (s.ink[key] ?? []).filter((st) => st.tool === 'text');
    for (let i = list.length - 1; i >= 0; i--) if (hitStroke(list[i], x, y, ratio, 0.012)) return list[i];
    return null;
  }, [key, overlay]);

  /**
   * Matn asbobi:
   *  - bo'sh joyga BIR bosish — shu joyda yozish boshlanadi;
   *  - eski matnni bosish — uni tahrirlash (eski so'zni o'chirib, yangisini yozish);
   *  - eski matnni bosib surish — boshqa joyga ko'chirish.
   * Klaviatura shu bosishning o'zida ochiladi (maydon oldindan tayyor turadi; keyinroq fokus
   * bersak Android klaviaturani ochmaydi).
   */
  const textDraw: DrawHandlers | null = useMemo(() => {
    if (!allowed || !key || tool !== 'text') return null;
    let at: { x: number; y: number } | null = null;
    let grab: { stroke: Stroke; dx: number; dy: number; moved: boolean } | null = null;
    const startEditing = (p: { x: number; y: number }, old: Stroke | null) => {
      if (textAtRef.current) commitText();
      textAtRef.current = p;
      setTextAt(p);
      editingRef.current = old;
      setEditing(old);
      const v = old?.text ?? '';
      draftRef.current = v;
      setTextDraftState(v);
      const el = textInputRef.current;
      if (el) {
        el.value = v;
        el.focus({ preventScroll: true });
        el.setSelectionRange(v.length, v.length);
      }
    };
    return {
      down: (cx, cy) => {
        at = toUnit(cx, cy);
        grab = null;
        if (!at) return;
        // Matn ustiga yangi matn yozilmaydi: bosilgan joyda matn bo'lsa — o'shani tahrirlash/surish.
        const hit = textAtPoint(at.x, at.y);
        if (hit && canEdit(hit)) grab = { stroke: hit, dx: at.x - hit.pts[0], dy: at.y - hit.pts[1], moved: false };
        else if (hit) at = null;
      },
      move: (cx, cy) => {
        if (!grab || !at) return;
        const p = toUnit(cx, cy);
        if (!p) return;
        if (!grab.moved && Math.hypot(p.x - at.x, p.y - at.y) < 0.012) return;
        grab.moved = true;
        const r = overlay.current?.getBoundingClientRect();
        const box = textBox(grab.stroke, r && r.height ? r.width / r.height : 1);
        // Matn sahifadan chiqib ketmasin.
        const nx = Math.max(0, Math.min(1 - Math.min(box.w, 0.9), p.x - grab.dx));
        const ny = Math.max(0, Math.min(1 - box.h, p.y - grab.dy));
        draggedRef.current = { from: grab.stroke, pts: [nx, ny] };
        setDragged(draggedRef.current);
      },
      up: () => {
        const p = at;
        const g = grab;
        at = null;
        grab = null;
        if (!p) return;
        if (g?.moved) {
          const d = draggedRef.current;
          draggedRef.current = null;
          setDragged(null);
          if (d && key) {
            const next: Stroke = { id: newStrokeId(), tool: 'text', color: d.from.color, size: d.from.size, pts: d.pts, text: d.from.text };
            send({ type: 'ink', key, add: [next], remove: [d.from.id] });
            pushUndo({ key, added: [next], removed: [d.from] });
          }
          return;
        }
        if (g) startEditing({ x: g.stroke.pts[0], y: g.stroke.pts[1] }, g.stroke);
        else startEditing(p, null);
      },
      cancel: () => { at = null; grab = null; draggedRef.current = null; setDragged(null); },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, key, tool, toUnit, commitText, textAtPoint, canEdit, overlay, send]);


  // Navbat ref'da; `undoCount` o'zgarganda komponent qayta chiziladi va tugma holati yangilanadi.
  const canUndo = undoCount > 0 && Boolean(key) && undoStack.current.some((e) => e.key === key);
  const undo = () => {
    if (!key) return;
    const i = undoStack.current.map((e) => e.key).lastIndexOf(key);
    if (i < 0) return;
    const [e] = undoStack.current.splice(i, 1);
    setUndoCount(undoStack.current.length);
    // Bitta amal (o'chirish + qaytarish) — biri rad etilib, doska yarim qaytgan holda qolmasin.
    // Juda ko'p chizma (tozalangan sahifa) — server cheklovi doirasida bo'laklab yuboriladi.
    const restore = (e.removed ?? []).map(({ by: _by, ...st }) => st);
    const CHUNK = 300;
    send({ type: 'ink', key, ...(e.added?.length ? { remove: e.added.map((st) => st.id) } : {}), ...(restore.length ? { add: restore.slice(0, CHUNK) } : {}) });
    for (let i = CHUNK; i < restore.length; i += CHUNK) send({ type: 'ink', key, add: restore.slice(i, i + CHUNK) });
  };

  /** Butun sahifani tozalash (faqat o'qituvchi) — «orqaga» bilan qaytariladi. */
  const clear = () => {
    const s = stateRef.current;
    if (!key || !s || role !== 'teacher') return;
    const all = s.ink[key] ?? [];
    if (!all.length) return;
    send({ type: 'ink', key, clear: true });
    pushUndo({ key, removed: all });
  };

  const live: Array<LiveStroke & { text?: string }> = [
    ...Object.values(remote).filter((d) => d.key === key && !savedIds.has(d.id)),
    ...(local ? [local] : []),
    // Surilayotgan matn — barmoq ostida.
    ...(dragged ? [{ ...dragged.from, id: `drag-${dragged.from.id}`, pts: dragged.pts }] : []),
  ];

  return {
    key, allowed, tool, setTool, color, setColor,
    colors: tool === 'marker' ? MARKER_COLORS : INK_COLORS,
    draw: tool === 'text' ? textDraw : draw,
    strokes: key && state ? state.ink[key] ?? [] : [],
    live, laser,
    textAt, textDraft, setTextDraft, commitText, cancelText, deleteText, textInputRef,
    textSize: editing?.size ?? TOOL_SIZE.text, textColor: editing?.color ?? penColor,
    hiddenTextId: editing?.id ?? dragged?.from.id ?? null,
    canUndo, undo, clear,
  };
}

export type BoardInk = ReturnType<typeof useBoardInk>;
export type { InkTool };
