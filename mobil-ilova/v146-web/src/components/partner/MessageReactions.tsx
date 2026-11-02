import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import type { MessageReaction, ReactionOption } from '../../api/communityChat';

/**
 * XABAR REAKSIYALARI — Telegramdagi kabi.
 *
 * Ikki qism: qo'yilgan reaksiyalar qatori va yangi qo'yish uchun tanlagich.
 * Tanlagich xabar YONIDA ochiladi (portal emas) — chat ro'yxati suriladi
 * va portal bilan joylashuvni kuzatib turish kerak bo'lardi.
 *
 * Bosish DARHOL ko'rinadi: server javobini kutmasdan son o'zgaradi, javob
 * kelgach haqiqiy yig'ma bilan almashtiriladi. Sekin tarmoqda ham tugma
 * "o'lik" bo'lib tuyulmasin.
 */

/**
 * Zaxira to'plam — ro'yxat hali yuklanmagan bo'lsa ishlatiladi.
 * Haqiqiy ro'yxat serverdan keladi va uni support hisobi boshqaradi.
 */
const ZAXIRA: ReactionOption[] = ['👍', '❤️', '🔥', '😁', '😮', '😢', '🙏', '👏'].map((e) => ({
  emoji: e,
}));

/**
 * Bitta reaksiya belgisi — unicode emoji yoki maxsus rasm.
 *
 * Rasm 18px da chiziladi va har bir xabar ostida takrorlanishi mumkin,
 * shuning uchun `loading="lazy"` bilan keladi.
 */
function Belgi({ emoji, imageUrl, olcham }: { emoji: string; imageUrl?: string | null; olcham: number }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={emoji.replace(/:/g, '')}
        loading="lazy"
        decoding="async"
        style={{ width: olcham, height: olcham }}
        className="inline-block shrink-0 object-contain align-middle"
      />
    );
  }
  return <span style={{ fontSize: olcham }} className="leading-none">{emoji}</span>;
}

export default function MessageReactions({
  reactions,
  oziniki,
  emojilar,
  onToggle,
}: {
  reactions: MessageReaction[];
  /** O'z xabarimi — ranglar shunga qarab tanlanadi. */
  oziniki: boolean;
  /** Taklif etiladigan reaksiyalar (serverdan). */
  emojilar?: ReactionOption[];
  onToggle: (emoji: string) => void;
}) {
  const royxat = emojilar && emojilar.length ? emojilar : ZAXIRA;
  const [ochiq, setOchiq] = useState(false);

  const bor = reactions.length > 0;

  return (
    <div className="relative mt-1 flex flex-wrap items-center gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle(r.emoji)}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[12px] font-bold transition ${
            r.meni
              ? oziniki
                ? 'bg-white/30 text-white ring-1 ring-white/50'
                : 'bg-[#0EA5A5]/15 text-[#0B7C7C] ring-1 ring-[#0EA5A5]/40'
              : oziniki
                ? 'bg-white/12 text-white/80'
                : 'bg-black/5 text-pmn-text-muted'
          }`}
          aria-label={`${r.emoji} ${r.soni}`}
          aria-pressed={r.meni}
        >
          <Belgi emoji={r.emoji} imageUrl={r.image_url} olcham={14} />
          <span className="tabular-nums">{r.soni}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => setOchiq((v) => !v)}
        className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-full transition ${
          oziniki ? 'text-white/60 hover:bg-white/15' : 'text-pmn-text-muted hover:bg-black/5'
        } ${bor ? '' : 'opacity-70'}`}
        aria-label="Reaksiya qo'shish"
        aria-expanded={ochiq}
      >
        <SmilePlus className="h-[14px] w-[14px]" />
      </button>

      {ochiq ? (
        <>
          {/* Tashqariga bosilganda yopiladi. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOchiq(false)}
            className="fixed inset-0 z-[40] cursor-default"
          />
          <div
            className={`absolute z-[41] flex max-w-[280px] flex-wrap gap-0.5 rounded-[18px] bg-pmn-card p-1.5 shadow-lg ring-1 ring-pmn-border ${
              oziniki ? 'right-0' : 'left-0'
            } bottom-full mb-1`}
          >
            {royxat.map((o) => (
              <button
                key={o.emoji}
                type="button"
                onClick={() => {
                  onToggle(o.emoji);
                  setOchiq(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110 hover:bg-black/5 active:scale-95"
                aria-label={o.label || o.emoji}
                title={o.label || undefined}
              >
                <Belgi emoji={o.emoji} imageUrl={o.image_url} olcham={20} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
