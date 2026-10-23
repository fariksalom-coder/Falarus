/**
 * 2-qadam: surat. Tanlangan rasm kvadrat ramkaga kesiladi (surish + kattalashtirish),
 * oldindan ko'rsatiladi va 800×800 JPEG bo'lib yuklanadi. Kesish brauzerda —
 * kutubxonasiz, canvas bilan.
 */
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Camera, Check, Loader2 } from 'lucide-react';
import { Card, ErrorNote, GhostButton, PrimaryButton } from '../panel/ui';
import { PHOTO_MAX_BYTES } from '../../../../shared/teacherOnboarding';
import { uploadPhoto } from '../../../api/teacherOnboarding';
import { resolveAssetUrl } from '../../../api';
import { ONBOARDING_TEXT } from './text';
import type { StepProps } from './OnboardingWizard';

const BOX = 280;
const OUT = 800;

export default function StepPhoto({ state, setState, lang, token, onNext }: StepProps & { onNext: () => void }) {
  const t = ONBOARDING_TEXT[lang];
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const current = state.data.avatar_url ? resolveAssetUrl(state.data.avatar_url) ?? state.data.avatar_url : null;

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  // Rasm ramkani to'liq yopadigan eng kichik o'lcham × zoom.
  const base = img ? BOX / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const w = img ? img.naturalWidth * base * zoom : BOX;
  const h = img ? img.naturalHeight * base * zoom : BOX;
  const clamp = (x: number, y: number) => ({ x: Math.min(0, Math.max(BOX - w, x)), y: Math.min(0, Math.max(BOX - h, y)) });

  const pick = (file?: File) => {
    setError('');
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError(t.photoTypes); return; }
    if (file.size > PHOTO_MAX_BYTES) { setError(t.photoTypes); return; }
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => {
      const b = BOX / Math.min(i.naturalWidth, i.naturalHeight);
      setImg(i); setZoom(1);
      setPos({ x: (BOX - i.naturalWidth * b) / 2, y: (BOX - i.naturalHeight * b) / 2 });
    };
    i.onerror = () => setError(t.photoTypes);
    i.src = url;
    setSrc(url);
  };

  const onZoom = (z: number) => {
    // Markaz atrofida kattalashtirish.
    const cx = BOX / 2 - pos.x, cy = BOX / 2 - pos.y;
    const k = z / zoom;
    setZoom(z);
    const nw = img!.naturalWidth * base * z, nh = img!.naturalHeight * base * z;
    setPos({ x: Math.min(0, Math.max(BOX - nw, BOX / 2 - cx * k)), y: Math.min(0, Math.max(BOX - nh, BOX / 2 - cy * k)) });
  };

  const down = (e: PointerEvent<HTMLDivElement>) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; };
  const move = (e: PointerEvent<HTMLDivElement>) => { const d = drag.current; if (d) setPos(clamp(d.px + e.clientX - d.x, d.py + e.clientY - d.y)); };

  const save = async () => {
    if (!img) return;
    setBusy(true); setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUT; canvas.height = OUT;
      const scale = img.naturalWidth / w;
      canvas.getContext('2d')!.drawImage(img, -pos.x * scale, -pos.y * scale, BOX * scale, BOX * scale, 0, 0, OUT, OUT);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      if (!blob) throw new Error(t.photoTypes);
      setState(await uploadPhoto(token, blob));
      setImg(null); setSrc(null);
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <h2 className="text-[16px] font-bold text-app-text">{t.photoTitle}</h2>
      <ul className="grid grid-cols-2 gap-2 text-[12.5px] text-app-text">
        {t.photoRules.map((r) => <li key={r} className="flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0 text-[#17A34A]" />{r}</li>)}
      </ul>

      {img && src ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative touch-none select-none overflow-hidden rounded-[20px] bg-app-bg-subtle ring-2 ring-app-brand" style={{ width: BOX, height: BOX }}
            onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
            <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ width: w, height: h, left: pos.x, top: pos.y }} />
          </div>
          <p className="text-center text-[12px] text-app-text-muted">{t.photoDrag}</p>
          <label className="flex w-full max-w-[280px] items-center gap-3 text-[12.5px] font-semibold text-app-text">
            {t.photoZoom}
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => onZoom(Number(e.target.value))} className="flex-1 accent-[#2563EB]" />
          </label>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <GhostButton onClick={() => { setImg(null); setSrc(null); }}>{t.photoChange}</GhostButton>
            <PrimaryButton onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t.photoSave}</PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-app-bg-subtle">
            {current ? <img src={current} alt="" className="h-full w-full object-cover" /> : <Camera className="h-10 w-10 text-app-text-muted" />}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-[16px] bg-app-primary px-5 text-[13px] font-semibold text-white active:scale-[0.98]">
              <Camera className="h-4 w-4" />{current ? t.photoChange : t.photoPick}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <p className="text-[11.5px] text-app-text-muted">{t.photoTypes}</p>
            {current && <GhostButton onClick={onNext}>{t.next}</GhostButton>}
          </div>
        </div>
      )}
      {error && <ErrorNote text={error} />}
    </Card>
  );
}
