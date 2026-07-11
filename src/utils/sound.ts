/** Lightweight Web Audio "success" chime — no external file, cached AudioContext. */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx && ctx.state !== 'closed') return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

function tone(context: AudioContext, freq: number, startAt: number, duration: number, gainPeak = 0.14) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(context.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/** Two-note "ding-ding" chime (C6 → E6) — cheerful, unobtrusive. */
export function playCorrectSound() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    c.resume().catch(() => {});
  }
  const now = c.currentTime;
  tone(c, 1046.5, now, 0.18);          // C6
  tone(c, 1318.5, now + 0.11, 0.22);   // E6
}

/** Soft warm buzz for wrong answers — currently unused, kept for future symmetry. */
export function playWrongSound() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;
  tone(c, 220, now, 0.22, 0.09);
  tone(c, 174.6, now + 0.11, 0.26, 0.08);
}

/** Very short high blip — flashcard flip feedback (like a card tap). */
export function playFlipSound() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;
  tone(c, 880, now, 0.06, 0.06);            // A5 tick
  tone(c, 1174.7, now + 0.04, 0.08, 0.05);  // D6 tail
}
