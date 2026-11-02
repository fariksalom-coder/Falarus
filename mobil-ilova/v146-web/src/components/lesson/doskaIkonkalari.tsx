import type { ReactNode } from 'react';
import type { DoskaIkonka } from '../../../shared/nutqBolaklari';

/**
 * DOSKA IKONKALARI — `dars-1-vizual.html` taqdimotidagi figuralar.
 *
 * Nima uchun kerak: dars matnini o'qib o'tirgan o'quvchi so'zni unutadi,
 * RASMNI esa eslab qoladi. Taqdimotda har kartochka yonida odam figurasi
 * turadi — «ОН» yonida erkak, «ОНА» yonida ayol, «Политsiya — ВЫ» yonida
 * militsioner. Xotira aynan shu bog'lanish orqali ishlaydi.
 *
 * Nima uchun ichkarida chizilgan: tashqi kutubxona (lucide va h.k.) bu
 * ma'nolarni bermaydi — bu yerda kerak bo'lgani «odam» emas, «boshliq»,
 * «quruvchi», «talaba». Fayl kichik: har biri bir-ikki shakl, `currentColor`
 * bilan bo'yaladi, ya'ni rangni chaqiruvchi tomon beradi.
 */
const CHIZMALAR: Record<DoskaIkonka, ReactNode> = {
  odam: (
    <>
      <circle cx="32" cy="17" r="10" fill="currentColor" />
      <path d="M12 56c0-13 9-22 20-22s20 9 20 22z" fill="currentColor" opacity=".85" />
    </>
  ),
  ozim: (
    <>
      <circle cx="36" cy="16" r="9" fill="currentColor" />
      <path d="M18 56c0-12 8-20 18-20s18 8 18 20z" fill="currentColor" opacity=".85" />
      <path d="M22 34c-8 2-12 7-12 13" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M10 41l-5 6 8 2z" fill="currentColor" />
    </>
  ),
  erkak: (
    <>
      <path d="M21 15a11 11 0 0 1 22 0v2H21z" fill="currentColor" />
      <circle cx="32" cy="19" r="10" fill="currentColor" />
      <path d="M12 56c0-13 9-22 20-22s20 9 20 22z" fill="currentColor" opacity=".85" />
    </>
  ),
  ayol: (
    <>
      <path
        d="M18 24c0-10 5-16 14-16s14 6 14 16c0 6-2 10-2 14h-6V20H26v18h-6c0-4-2-8-2-14z"
        fill="currentColor"
        opacity=".9"
      />
      <circle cx="32" cy="20" r="10" fill="currentColor" />
      <path d="M14 56l8-20h20l8 20z" fill="currentColor" opacity=".85" />
    </>
  ),
  juft: (
    <>
      <circle cx="21" cy="20" r="8" fill="currentColor" />
      <path d="M5 54c0-10 7-17 16-17s16 7 16 17z" fill="currentColor" opacity=".85" />
      <circle cx="45" cy="22" r="7" fill="currentColor" opacity=".75" />
      <path d="M31 54c0-9 6-15 14-15s14 6 14 15z" fill="currentColor" opacity=".6" />
    </>
  ),
  guruh: (
    <>
      <circle cx="14" cy="24" r="7" fill="currentColor" opacity=".7" />
      <path d="M2 52c0-9 5-15 12-15s12 6 12 15z" fill="currentColor" opacity=".55" />
      <circle cx="50" cy="24" r="7" fill="currentColor" opacity=".7" />
      <path d="M38 52c0-9 5-15 12-15s12 6 12 15z" fill="currentColor" opacity=".55" />
      <circle cx="32" cy="19" r="9" fill="currentColor" />
      <path d="M16 54c0-11 7-18 16-18s16 7 16 18z" fill="currentColor" opacity=".9" />
    </>
  ),
  korsat: (
    <>
      <circle cx="20" cy="17" r="9" fill="currentColor" />
      <path d="M4 54c0-12 7-20 16-20s16 8 16 20z" fill="currentColor" opacity=".85" />
      <path d="M34 33h18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 27l10 6-10 6z" fill="currentColor" />
    </>
  ),
  quruvchi: (
    <>
      <path d="M14 26a18 18 0 0 1 36 0z" fill="currentColor" />
      <rect x="8" y="26" width="48" height="5" rx="2.5" fill="currentColor" />
      <circle cx="32" cy="38" r="7" fill="currentColor" opacity=".9" />
      <path d="M16 60c0-8 7-14 16-14s16 6 16 14z" fill="currentColor" opacity=".8" />
    </>
  ),
  talaba: (
    <>
      <path d="M32 8l26 12-26 12L6 20z" fill="currentColor" />
      <path d="M16 26v12c0 5 7 9 16 9s16-4 16-9V26" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M56 22v16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  boshliq: (
    <>
      <circle cx="32" cy="16" r="9" fill="currentColor" />
      <path d="M12 58c0-12 9-20 20-20s20 8 20 20z" fill="currentColor" opacity=".55" />
      <path d="M26 30h12l-6 8z" fill="currentColor" />
      <path d="M32 38l4 20h-8z" fill="currentColor" />
    </>
  ),
  politsiya: (
    <>
      <path d="M10 34a22 22 0 0 1 44 0z" fill="currentColor" />
      <rect x="6" y="34" width="52" height="8" rx="4" fill="currentColor" opacity=".75" />
      <path d="M32 12l3 6 6 1-4.5 4.5 1 6-5.5-3-5.5 3 1-6L23 19l6-1z" fill="#0B1F26" />
      <rect x="12" y="46" width="40" height="6" rx="3" fill="currentColor" opacity=".45" />
    </>
  ),
  dostlar: (
    <>
      <circle cx="20" cy="20" r="8" fill="currentColor" />
      <path d="M6 54c0-10 6-16 14-16s14 6 14 16z" fill="currentColor" opacity=".8" />
      <circle cx="45" cy="20" r="8" fill="currentColor" opacity=".8" />
      <path d="M31 54c0-10 6-16 14-16s14 6 14 16z" fill="currentColor" opacity=".6" />
      <path d="M26 34l12-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  hujjat: (
    <>
      <rect x="6" y="14" width="52" height="38" rx="7" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="24" y="6" width="16" height="12" rx="4" fill="currentColor" />
      <rect x="14" y="28" width="24" height="5" rx="2.5" fill="currentColor" opacity=".8" />
      <rect x="14" y="39" width="36" height="5" rx="2.5" fill="currentColor" opacity=".45" />
    </>
  ),
  gap: (
    <path
      d="M8 14a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H26L12 54V42h2a6 6 0 0 1-6-6z"
      fill="currentColor"
      opacity=".9"
    />
  ),
  savol: (
    <>
      <path
        d="M8 14a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H26L12 54V42h2a6 6 0 0 1-6-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path d="M26 20a6 6 0 1 1 8 6c-1.6 1-2 2-2 4" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="35" r="2.6" fill="currentColor" />
    </>
  ),
  joy: (
    <>
      <path d="M32 4c11 0 20 9 20 20 0 14-20 36-20 36S12 38 12 24c0-11 9-20 20-20z" fill="currentColor" opacity=".9" />
      <circle cx="32" cy="24" r="8" fill="#0B1F26" />
    </>
  ),
};

export default function DoskaIkonka({
  nom,
  className,
  rang,
}: {
  nom: DoskaIkonka;
  className?: string;
  rang?: string;
}) {
  const chizma = CHIZMALAR[nom];
  if (!chizma) return null;
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={className} style={rang ? { color: rang } : undefined}>
      {chizma}
    </svg>
  );
}

/** «U» ning ikkiga ayrilishini ko'rsatuvchi chiziq (taqdimotdagi `i-fork`). */
export function AyriChiziq({ className, rang }: { className?: string; rang?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 60" className={className} style={rang ? { color: rang } : undefined}>
      <path
        d="M60 2v18M60 20C60 34 26 30 26 46M60 20c0 14 34 10 34 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M26 58l-5-10h10zM94 58l-5-10h10z" fill="currentColor" />
    </svg>
  );
}
