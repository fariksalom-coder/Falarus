type Props = {
  className?: string;
  size?: number;
};

/** PWA / favicon assets in `public/icons` (same as manifest). */
export function FalaRusLogoMark({ className = '', size = 40 }: Props) {
  return (
    <img
      src="/icons/icon-192.png"
      alt="FalaRus"
      width={size}
      height={size}
      className={`shrink-0 rounded-xl object-cover ${className}`.trim()}
      decoding="async"
    />
  );
}
