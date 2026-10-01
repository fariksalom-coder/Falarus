import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';

export default function TrialHandAnimation() {
  const container = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let animation: AnimationItem | undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => {
      if (motion.matches) animation?.goToAndStop(30, true);
      else animation?.play();
    };
    void Promise.all([import('lottie-web'), import('../data/trialHandAnimation.json')])
      .then(([lottie, data]) => {
        if (disposed || !container.current) return;
        animation = lottie.default.loadAnimation({
          container: container.current,
          renderer: 'svg',
          loop: true,
          autoplay: !motion.matches,
          animationData: data.default,
        });
        animation.addEventListener('DOMLoaded', updateMotion);
        motion.addEventListener('change', updateMotion);
      })
      .catch(() => { if (!disposed) setFailed(true); });
    return () => {
      disposed = true;
      motion.removeEventListener('change', updateMotion);
      animation?.destroy();
    };
  }, []);

  return <span aria-hidden="true" className="trial-day-pointer">
    {failed ? '👇' : <span ref={container} className="block h-16 w-16" />}
  </span>;
}
