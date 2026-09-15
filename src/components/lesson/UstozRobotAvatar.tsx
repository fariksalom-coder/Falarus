import { useEffect, useRef, useState } from 'react';
import { RobotAvatar, type RobotAvatarState } from '../../utils/robotAvatar';

const LISTENING_SRC = '/app-mobile/images/ustoz/robot-listening.mp4';
const SPEAKING_SRC = '/app-mobile/images/ustoz/robot-speaking.mp4';
const POSTER_SRC = '/app-mobile/images/ustoz/robot-poster.png';

type Props = {
  /** true = ustoz gapiryapti, false = tinglayapti */
  speaking: boolean;
  className?: string;
  /** Canvas ichki o'lchami (px). */
  size?: number;
  /** Ekranda ko'rinadigan balandlik (px). */
  displayHeight?: number;
};

/**
 * Jonli suhbatdagi robot — robot-preview.html animatsiyasi.
 * Faqat UI: speaking prop orqali tinglash ↔ gapirish almashadi.
 */
export default function UstozRobotAvatar({
  speaking,
  className = '',
  size = 512,
  displayHeight = 300,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarRef = useRef<RobotAvatar | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let avatar: RobotAvatar | null = null;

    try {
      avatar = new RobotAvatar(canvas, {
        listening: LISTENING_SRC,
        speaking: SPEAKING_SRC,
        transitionMs: 240,
        onError: () => {
          if (!cancelled) setFailed(true);
        },
      });
      avatarRef.current = avatar;
      void avatar.ready
        .then(() => {
          if (!cancelled) setLoaded(true);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    } catch {
      setFailed(true);
    }

    const onVisibility = () => {
      if (!avatar) return;
      if (document.hidden) avatar.pause();
      else void avatar.resume().catch(() => setFailed(true));
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      avatar?.dispose();
      avatarRef.current = null;
    };
  }, []);

  useEffect(() => {
    const next: RobotAvatarState = speaking ? 'speaking' : 'listening';
    avatarRef.current?.setState(next);
  }, [speaking]);

  const boxStyle = { width: displayHeight, height: displayHeight };

  if (failed) {
    return (
      <img
        src="/app-mobile/images/ustoz/robot.png"
        alt=""
        aria-hidden
        draggable={false}
        className={`relative select-none object-contain ${className}`}
        style={boxStyle}
      />
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={boxStyle}>
      {!loaded ? (
        <img
          src={POSTER_SRC}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 m-auto h-full w-full object-contain opacity-90"
        />
      ) : null}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        aria-hidden
        className={`relative h-full w-full object-contain transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
