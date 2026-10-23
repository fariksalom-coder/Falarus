/**
 * 2-qadam: surat. Tanlangan rasm darhol kesish oynasida ochiladi: o'qituvchi
 * kvadrat qismini o'zi tanlaydi (surish + kattalashtirish), tasdiqlangach u
 * 800×800 JPEG bo'lib yuklanadi. Asl fayl hajmi muhim emas — serverga kesilgani boradi.
 */
import { useEffect, useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { Card, ErrorNote, GhostButton } from '../panel/ui';
import { uploadPhoto } from '../../../api/teacherOnboarding';
import { resolveAssetUrl } from '../../../api';
import { ONBOARDING_TEXT } from './text';
import PhotoCropper, { loadCropImage } from './PhotoCropper';
import PhotoExamples from './PhotoExamples';
import type { StepProps } from './OnboardingWizard';

export default function StepPhoto({ state, setState, lang, token, onNext }: StepProps & { onNext: () => void }) {
  const t = ONBOARDING_TEXT[lang];
  const [crop, setCrop] = useState<{ img: HTMLImageElement; url: string } | null>(null);
  const [error, setError] = useState('');
  const current = state.data.avatar_url ? resolveAssetUrl(state.data.avatar_url) ?? state.data.avatar_url : null;

  useEffect(() => () => { if (crop) URL.revokeObjectURL(crop.url); }, [crop]);

  const pick = async (file?: File) => {
    setError('');
    if (!file) return;
    try { setCrop(await loadCropImage(file, lang)); }
    catch (e) { setError(e instanceof Error ? e.message : t.cropCantOpen); }
  };

  const save = async (blob: Blob) => {
    setState(await uploadPhoto(token, blob));
    setCrop(null);
    onNext();
  };

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <h2 className="text-[16px] font-bold text-app-text">{t.photoTitle}</h2>
      <ul className="grid grid-cols-2 gap-2 text-[12.5px] text-app-text">
        {t.photoRules.map((r) => <li key={r} className="flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0 text-[#17A34A]" />{r}</li>)}
      </ul>

      <PhotoExamples lang={lang} />

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-app-bg-subtle">
          {current ? <img src={current} alt="" className="h-full w-full object-cover" /> : <Camera className="h-10 w-10 text-app-text-muted" />}
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-[16px] bg-app-primary px-5 text-[13px] font-semibold text-white active:scale-[0.98]">
            <Camera className="h-4 w-4" />{current ? t.photoChange : t.photoPick}
            <input type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <p className="text-[11.5px] text-app-text-muted">{t.photoTypes}</p>
          {current && <GhostButton onClick={onNext}>{t.next}</GhostButton>}
        </div>
      </div>
      {error && <ErrorNote text={error} />}

      {crop && <PhotoCropper img={crop.img} src={crop.url} lang={lang} onCancel={() => setCrop(null)} onDone={save} />}
    </Card>
  );
}
