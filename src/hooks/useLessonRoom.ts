import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../api';
import {
  FINAL_CLOSE_CODES, ROOM_CLOSE, ROOM_WS_PATH, applyRoomOp,
  type DraftMessage, type LessonKind, type Presence, type RoomOp, type RoomRole, type RoomState, type ServerMessage,
} from '../../shared/lessonRoom';

/**
 * Dars xonasining real vaqt kanali (WebSocket).
 *
 * Mobil internet uchun: uzilsa o'zi qayta ulanadi (0.5 → 10 s, tasodifiy kechikish bilan),
 * internet qaytganda va ilova qayta ochilganda darhol uriniladi. Hali tasdiqlanmagan o'zgarishlar
 * navbatda turadi va qayta ulanganda yana yuboriladi — server ularni ikki marta qo'llamaydi.
 * Ekranda: server tasdiqlagan holat + navbatdagi o'zgarishlar (o'qituvchi kutib qolmaydi).
 */

export type RoomStatus = 'connecting' | 'online' | 'offline' | 'closed';
export type LaserPoint = { x: number; y: number } | null;

const BACKOFF_MS = [500, 1000, 2000, 4000, 8000, 10_000];
const PING_MS = 15_000;
/** Shuncha vaqt hech narsa kelmasa, ulanish o'lik deb hisoblanadi (mobil tarmoq jim uzilishi). */
const SILENCE_MS = 40_000;

const CLOSE_TEXT: Record<number, string> = {
  [ROOM_CLOSE.auth]: 'Qayta kiring — sessiya tugagan',
  [ROOM_CLOSE.forbidden]: 'Bu darsga kirish huquqi yoʻq',
  [ROOM_CLOSE.closed]: 'Dars vaqti tugadi',
  [ROOM_CLOSE.early]: 'Dars xonasi hali ochilmagan',
};

function socketUrl(): string {
  const http = apiUrl(ROOM_WS_PATH);
  const absolute = /^https?:\/\//.test(http) ? http : `${window.location.origin}${http}`;
  return absolute.replace(/^http/, 'ws');
}

let opCounter = 0;
const newOpId = () => `${Date.now().toString(36)}-${(opCounter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function useLessonRoom(token: string | null, kind: LessonKind, lessonId: number, enabled: boolean) {
  const [confirmed, setConfirmed] = useState<RoomState | null>(null);
  const [pending, setPending] = useState<Array<{ id: string; op: RoomOp }>>([]);
  const [role, setRole] = useState<RoomRole | null>(null);
  const [presence, setPresence] = useState<Presence>({ teacher: false, student: false });
  const [status, setStatus] = useState<RoomStatus>('connecting');
  const [closedText, setClosedText] = useState('');
  const [error, setError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const laserListeners = useRef(new Set<(p: LaserPoint) => void>());
  const draftListeners = useRef(new Set<(d: DraftMessage & { by: RoomRole }) => void>());
  /** Server soati − brauzer soati (ms): audio sinxroni uchun. Eng tez javobli o'lchov eng aniq. */
  const clockOffset = useRef(0);
  const clockSamples = useRef<Array<{ rtt: number; offset: number }>>([]);

  useEffect(() => {
    if (!enabled || !token || !lessonId) return;
    let stopped = false;
    let attempt = 0;
    let retryTimer = 0;
    let pingTimer = 0;
    let lastHeard = Date.now();

    const scheduleRetry = () => {
      if (stopped) return;
      window.clearTimeout(retryTimer);
      const base = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
      attempt++;
      retryTimer = window.setTimeout(open, base + Math.random() * base * 0.3);
    };

    function open() {
      if (stopped) return;
      window.clearTimeout(retryTimer);
      const old = wsRef.current;
      if (old && (old.readyState === WebSocket.OPEN || old.readyState === WebSocket.CONNECTING)) return;
      setStatus((s) => (s === 'online' ? 'offline' : s === 'closed' ? s : 'connecting'));
      let ws: WebSocket;
      try {
        ws = new WebSocket(socketUrl());
      } catch {
        scheduleRetry();
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        lastHeard = Date.now();
        ws.send(JSON.stringify({ t: 'hello', token, kind, lessonId }));
      };
      ws.onmessage = (e) => {
        lastHeard = Date.now();
        let m: ServerMessage;
        try { m = JSON.parse(String(e.data)); } catch { return; }
        switch (m.t) {
          case 'state':
            attempt = 0;
            setConfirmed(m.state);
            setRole(m.role);
            setPresence(m.presence);
            setStatus('online');
            // Uzilish paytida qilingan o'zgarishlar — qayta yuboriladi (server takrorini taniydi).
            for (const p of pendingRef.current) ws.send(JSON.stringify({ t: 'op', id: p.id, op: p.op }));
            // Soat farqi darhol: uchta o'lchov, eng tezi olinadi.
            for (const delay of [0, 400, 800]) {
              window.setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'ping', c: Date.now() })); }, delay);
            }
            break;
          case 'ack': {
            const done = pendingRef.current.find((p) => p.id === m.id);
            setPending((list) => list.filter((p) => p.id !== m.id));
            if (done) setConfirmed((s) => (s ? { ...applyRoomOp(s, done.op), seq: m.seq } : s));
            break;
          }
          case 'reject':
            setPending((list) => list.filter((p) => p.id !== m.id));
            setError(m.error);
            break;
          case 'op':
            setConfirmed((s) => (s ? { ...applyRoomOp(s, m.op), seq: m.seq } : s));
            break;
          case 'presence':
            setPresence(m.presence);
            if (!m.presence.teacher) laserListeners.current.forEach((fn) => fn(null));
            break;
          case 'laser':
            laserListeners.current.forEach((fn) => fn('end' in m ? null : { x: m.x, y: m.y }));
            break;
          case 'draft':
            draftListeners.current.forEach((fn) => fn(m));
            break;
          case 'pong': {
            const rtt = Date.now() - m.c;
            if (rtt < 0 || rtt > 5000) break;
            clockSamples.current = [...clockSamples.current, { rtt, offset: m.s - (m.c + rtt / 2) }].slice(-6);
            clockOffset.current = clockSamples.current.reduce((best, x) => (x.rtt < best.rtt ? x : best)).offset;
            break;
          }
        }
      };
      ws.onclose = (e) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (stopped) return;
        if (FINAL_CLOSE_CODES.includes(e.code)) {
          setStatus('closed');
          setClosedText(CLOSE_TEXT[e.code] ?? 'Aloqa yopildi');
          return;
        }
        setStatus('offline');
        scheduleRetry();
      };
      ws.onerror = () => undefined;
    }

    // Jim uzilishni sezish va soat farqini yangilab turish.
    pingTimer = window.setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastHeard > SILENCE_MS) { ws.close(); return; }
      ws.send(JSON.stringify({ t: 'ping', c: Date.now() }));
    }, PING_MS);

    const wake = () => {
      if (stopped) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) { attempt = 0; open(); }
      else if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'ping', c: Date.now() }));
    };
    const onVisible = () => { if (document.visibilityState === 'visible') wake(); };
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', onVisible);
    open();

    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', onVisible);
      wsRef.current?.close(1000);
      wsRef.current = null;
    };
  }, [enabled, token, kind, lessonId]);

  /** O'zgarish: ekranda darhol, serverga — ulanish bo'lsa hozir, bo'lmasa qayta ulanganda. */
  const send = useCallback((op: RoomOp) => {
    const item = { id: newOpId(), op };
    setPending((list) => [...list, item]);
    setError('');
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'op', id: item.id, op }));
  }, []);

  /** Lazer: saqlanmaydi, navbatga ham qo'yilmaydi — eskirgan nuqta keyin kelishidan foyda yo'q. */
  const sendLaser = useCallback((p: LaserPoint) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(p ? { t: 'laser', x: p.x, y: p.y } : { t: 'laser', end: true }));
  }, []);

  const onLaser = useCallback((fn: (p: LaserPoint) => void) => {
    laserListeners.current.add(fn);
    return () => { laserListeners.current.delete(fn); };
  }, []);

  /** Chizilayotgan chiziq: lazer kabi — navbatga qo'yilmaydi, yakuniy chiziq `send` bilan keladi. */
  const sendDraft = useCallback((d: Omit<DraftMessage, 't'>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'draft', ...d }));
  }, []);

  const onDraft = useCallback((fn: (d: DraftMessage & { by: RoomRole }) => void) => {
    draftListeners.current.add(fn);
    return () => { draftListeners.current.delete(fn); };
  }, []);

  const state = confirmed ? pending.reduce((s, p) => applyRoomOp(s, p.op), confirmed) : null;

  return {
    state, role, presence, status, closedText, error,
    /** Hali serverga yetmagan o'zgarishlar bormi (ekranda «saqlanmoqda»). */
    syncing: pending.length > 0,
    send, sendLaser, onLaser, sendDraft, onDraft,
    serverNow: () => Date.now() + clockOffset.current,
    clearError: () => setError(''),
  };
}

export type LessonRoom = ReturnType<typeof useLessonRoom>;
