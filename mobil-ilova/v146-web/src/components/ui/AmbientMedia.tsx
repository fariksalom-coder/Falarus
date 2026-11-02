import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { usePanelScene } from './PanelScene';

const MOTION_KEY = 'falarus-ambient-motion';
const MOTION_EVENT = 'falarus-ambient-change';

/** Decorative media stays silent and stops offscreen, in background tabs, or on request. */
export function AmbientMedia() {
  const scene = usePanelScene();
  const lessonVideo = !scene || scene === 'learning';
  const poster = lessonVideo ? '/kunlik/dars-fon.jpg' : `/backgrounds/${scene}.svg`;
  const video = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const sync = () => {
      let requested = false;
      try { requested = localStorage.getItem(MOTION_KEY) === 'playing'; } catch { /* Storage may be unavailable. */ }
      const active = requested && !reduced.matches && !connection?.saveData;
      setEnabled(active);
      document.documentElement.dataset.ambientMotion = active ? 'on' : 'off';
    };
    const visibility = () => setForeground(!document.hidden);
    sync();
    visibility();
    reduced.addEventListener('change', sync);
    window.addEventListener(MOTION_EVENT, sync);
    window.addEventListener('storage', sync);
    document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (container.current) observer.observe(container.current);
    return () => {
      observer.disconnect();
      reduced.removeEventListener('change', sync);
      window.removeEventListener(MOTION_EVENT, sync);
      window.removeEventListener('storage', sync);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  const playing = enabled && visible && foreground && !failed;
  useEffect(() => {
    if (!video.current) return;
    if (playing) void video.current.play().catch(() => setFailed(true));
    else video.current.pause();
  }, [playing]);

  const toggle = () => {
    const active = !enabled;
    try { localStorage.setItem(MOTION_KEY, active ? 'playing' : 'paused'); } catch { /* Still support this view. */ }
    setEnabled(active);
    setFailed(false);
    document.documentElement.dataset.ambientMotion = active ? 'on' : 'off';
    window.dispatchEvent(new Event(MOTION_EVENT));
  };

  return (
    <>
      <div ref={container} className={`ambient-media${lessonVideo ? '' : ' ambient-media--illustrated'}`} aria-hidden="true">
        <img src={poster} alt="" decoding="async" />
        {lessonVideo && enabled && visible && !failed && (
          <video ref={video} src="/kunlik/dars-fon.mp4" muted loop playsInline preload="none"
            poster="/kunlik/dars-fon.jpg" tabIndex={-1} onError={() => setFailed(true)} />
        )}
      </div>
      <button type="button" className="ambient-toggle" onClick={toggle}
        aria-label={enabled ? 'Fon animatsiyasini to‘xtatish' : 'Fon animatsiyasini yoqish'}
        aria-pressed={enabled} title={enabled ? 'Animatsiyani to‘xtatish' : 'Animatsiyani yoqish'}>
        {enabled ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </>
  );
}
