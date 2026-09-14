import { useState } from 'react';
import { resolveAssetUrl } from '../api';

/**
 * Chat va relslardagi kichik avatar.
 *
 * NEGA ALOHIDA KOMPONENT: bir xil doira uch joyda kerak — guruh chatidagi
 * xabar, rels muallifi va rels kommentariyasi.
 *
 * NEGA `UserAvatar` EMAS: u suratsiz odamga jins belgisini chizadi. Chatda
 * esa ism bosh harflari yaxshiroq — kim yozganini bir qarashda ajratish
 * oson va bu ko'rinish avvaldan shunday edi.
 *
 * SURAT KATTA OCHILMAYDI — bu ataylab. Kattalashtirish faqat supportda,
 * foydalanuvchi kartasi orqali (`UserCard`).
 */

function boshHarflar(ism: string): string {
  return ism
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ChatAvatar({
  url,
  ism,
  olcham = 30,
}: {
  url?: string | null;
  /** To'liq ism — surat bo'lmasa bosh harflari chiziladi. */
  ism: string;
  /** Doira o'lchami (px). */
  olcham?: number;
}) {
  const [xato, setXato] = useState(false);
  const manzil = resolveAssetUrl(url ?? null);
  const olchov = { width: olcham, height: olcham };

  if (manzil && !xato) {
    return (
      <img
        src={manzil}
        alt=""
        style={olchov}
        className="shrink-0 rounded-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setXato(true)}
      />
    );
  }

  return (
    <span
      style={{ ...olchov, background: 'linear-gradient(145deg, #8B5CF6, #6D28D9)' }}
      className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
    >
      {boshHarflar(ism) || '?'}
    </span>
  );
}
