import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crosshair, Eraser, FilePlus2, Hand, Highlighter, PenLine, Trash2, Type, Undo2, UserPen, X } from 'lucide-react';
import type { BoardInk } from './useBoardInk';
import type { BoardTool } from './ink';

/**
 * Chizish asboblari paneli (doska ostida). Telefonda tor bo'lsa gorizontal suriladi —
 * sahifaning o'zi yon tomonga surilmaydi. Barcha tugmalar 44 px.
 */

const TOOLS: Array<{ key: BoardTool; label: string; icon: typeof Hand; teacherOnly?: boolean }> = [
  { key: 'view', label: 'Koʻrish (kattalashtirish, surish)', icon: Hand },
  { key: 'pen', label: 'Qalam', icon: PenLine },
  { key: 'marker', label: 'Marker', icon: Highlighter },
  { key: 'text', label: 'Matn', icon: Type },
  { key: 'eraser', label: 'Oʻchirgich', icon: Eraser },
  { key: 'laser', label: 'Lazer koʻrsatkich', icon: Crosshair, teacherOnly: true },
];

const btnBase = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] transition active:scale-95 disabled:opacity-35 disabled:active:scale-100';

export function InkBar({ ink, teacher, studentCanDraw, onPermit, onBlank }: {
  ink: BoardInk; teacher: boolean; studentCanDraw: boolean;
  onPermit: (on: boolean) => void; onBlank: () => void;
}) {
  const [palette, setPalette] = useState(false);
  const colorTool = ink.tool === 'pen' || ink.tool === 'marker' || ink.tool === 'text';

  return (
    <div className="relative border-t border-white/10">
      <AnimatePresence>
        {palette && colorTool ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 gap-2 rounded-[18px] bg-[#111C30] p-2 shadow-[0_18px_44px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
            role="listbox"
            aria-label="Rang"
          >
            {ink.colors.map((c) => (
              <button
                key={c}
                type="button"
                role="option"
                aria-selected={ink.color === c}
                aria-label={c}
                onClick={() => { ink.setColor(c); setPalette(false); }}
                className={`h-10 w-10 rounded-full ring-2 transition active:scale-90 ${ink.color === c ? 'ring-white' : 'ring-white/15'}`}
                style={{ background: c }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center gap-1 overflow-x-auto px-2.5 py-1.5 [scrollbar-width:none] sm:justify-center">
        {TOOLS.filter((t) => teacher || !t.teacherOnly).map((t) => {
          const on = ink.tool === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => { ink.setTool(t.key); setPalette(false); }}
              aria-label={t.label}
              aria-pressed={on}
              title={t.label}
              className={`${btnBase} ${on ? (t.key === 'laser' ? 'bg-[#DC2626] text-white' : 'bg-[#2563EB] text-white') : 'text-white/80 hover:bg-white/10'}`}
            >
              <t.icon className="h-5 w-5" />
            </button>
          );
        })}

        <span className="mx-1 h-6 w-px shrink-0 bg-white/15" />
        <button
          type="button"
          onClick={() => setPalette((p) => !p)}
          disabled={!colorTool}
          aria-label="Rangni tanlash"
          title="Rang"
          className={`${btnBase} hover:bg-white/10`}
        >
          <span className="h-6 w-6 rounded-full ring-2 ring-white/70" style={{ background: ink.color }} />
        </button>
        <button type="button" onClick={ink.undo} disabled={!ink.canUndo} aria-label="Orqaga qaytarish" title="Orqaga" className={`${btnBase} text-white/85 hover:bg-white/10`}>
          <Undo2 className="h-5 w-5" />
        </button>

        {teacher ? (
          <>
            <button type="button" onClick={ink.clear} disabled={!ink.strokes.length} aria-label="Sahifani tozalash" title="Tozalash" className={`${btnBase} text-white/85 hover:bg-white/10`}>
              <Trash2 className="h-5 w-5" />
            </button>
            <span className="mx-1 h-6 w-px shrink-0 bg-white/15" />
            <button type="button" onClick={onBlank} aria-label="Yangi oq varaq" title="Oq varaq" className={`${btnBase} text-white/85 hover:bg-white/10`}>
              <FilePlus2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onPermit(!studentCanDraw)}
              aria-pressed={studentCanDraw}
              aria-label={studentCanDraw ? 'Oʻquvchiga chizishni taqiqlash' : 'Oʻquvchiga chizishga ruxsat berish'}
              title={studentCanDraw ? 'Oʻquvchi chiza oladi' : 'Oʻquvchiga ruxsat berish'}
              className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[12.5px] font-bold transition active:scale-95 ${
                studentCanDraw ? 'bg-[#16A34A] text-white' : 'text-white/85 ring-1 ring-white/20 hover:bg-white/10'
              }`}
            >
              <UserPen className="h-[18px] w-[18px]" />
              <span className="whitespace-nowrap">{studentCanDraw ? 'Oʻquvchi chizmoqda' : 'Oʻquvchiga ruxsat'}</span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Matn yozish oynasi: telefon klaviaturasi bilan qulay — pastdan chiqadi. */
export function TextSheet({ open, color, onCommit, onCancel }: {
  open: boolean; color: string; onCommit: (text: string) => void; onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!open) return;
    setValue('');
    const t = window.setTimeout(() => input.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="text"
          className="fixed inset-0 z-[66] flex items-end justify-center bg-[rgba(2,6,23,0.45)] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.form
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); onCommit(value); }}
            className="w-full max-w-[460px] rounded-t-[24px] bg-[#111C30] p-4 pb-[max(env(safe-area-inset-bottom,0px),16px)] text-white ring-1 ring-white/10 sm:rounded-[24px]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-extrabold">Doskaga matn</p>
              <button type="button" onClick={onCancel} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:scale-95">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                ref={input}
                value={value}
                maxLength={200}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Masalan: я был — men edim"
                aria-label="Matn"
                className="min-h-[48px] min-w-0 flex-1 rounded-[14px] bg-white/[0.08] px-3.5 text-[16px] font-bold outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-[#3B82F6]"
                style={{ color }}
              />
              <button type="submit" disabled={!value.trim()} className="min-h-[48px] shrink-0 rounded-[14px] bg-[#2563EB] px-4 text-[14px] font-extrabold transition active:scale-95 disabled:opacity-40">
                Qoʻshish
              </button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
