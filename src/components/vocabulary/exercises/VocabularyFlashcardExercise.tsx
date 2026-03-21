import type { VocabularyEntry } from '../../../data/vocabularyContent';

type Props = {
  entries: VocabularyEntry[];
  cardIndex: number;
  cardFlipped: boolean;
  onToggleFlip: () => void;
  knownCount: number;
  unknownCount: number;
  step1SaveError: string | null;
  onKnow: () => void;
  onUnknown: () => void;
  onContinueToTest: () => void;
};

export function VocabularyFlashcardExercise({
  entries,
  cardIndex,
  cardFlipped,
  onToggleFlip,
  knownCount,
  unknownCount,
  step1SaveError,
  onKnow,
  onUnknown,
  onContinueToTest,
}: Props) {
  const current = entries[cardIndex];
  const total = entries.length;

  if (current) {
    return (
      <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="text-center text-sm font-medium" style={{ color: '#64748B' }}>
          {cardIndex + 1} / {total} so&apos;z
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((cardIndex + 1) / total) * 100}%`,
              backgroundColor: '#6366F1',
            }}
          />
        </div>

        <div className="mt-4" style={{ perspective: '1000px' }}>
          <button
            type="button"
            onClick={onToggleFlip}
            className="relative h-64 w-full cursor-pointer overflow-hidden rounded-[20px]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-[20px] border bg-white p-10 shadow-lg transition-transform duration-500 ease-out"
              style={{
                borderColor: '#E2E8F0',
                transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                backfaceVisibility: 'hidden',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
                <span className="mr-1.5 text-base" aria-hidden>
                  🇺🇿
                </span>
                O&apos;zbekcha
              </p>
              <p className="mt-4 text-center text-3xl font-bold" style={{ color: '#0F172A' }}>
                {current.uzbek}
              </p>
            </div>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-[20px] border bg-white p-10 shadow-lg transition-transform duration-500 ease-out"
              style={{
                borderColor: '#E2E8F0',
                transform: cardFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                backfaceVisibility: 'hidden',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
                <span className="mr-1.5 text-base" aria-hidden>
                  🇷🇺
                </span>
                Ruscha
              </p>
              <p className="mt-4 text-center text-3xl font-bold" style={{ color: '#0F172A' }}>
                {current.russian}
              </p>
            </div>
          </button>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: '#64748B' }}>
          Kartochkani aylantirish uchun bosing
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onUnknown}
            className="rounded-[14px] border-2 py-5 text-lg font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              borderColor: '#FECACA',
              backgroundColor: '#FEF2F2',
              color: '#EF4444',
            }}
          >
            Bilmayman
          </button>
          <button
            type="button"
            onClick={onKnow}
            className="rounded-[14px] border-2 py-5 text-lg font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              borderColor: '#BBF7D0',
              backgroundColor: '#F0FDF4',
              color: '#22C55E',
            }}
          >
            Bilaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="rounded-[20px] border bg-white p-12 text-center shadow-sm" style={{ borderColor: '#E2E8F0' }}>
        <p className="text-xl font-semibold" style={{ color: '#0F172A' }}>
          Tanishish yakunlandi
        </p>
        <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
          Natija saqlandi. Keyingi bosqich — test.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: '#BBF7D0', backgroundColor: '#F0FDF4', color: '#166534' }}
          >
            <span>🟢</span>
            Biladi: {knownCount}
          </div>
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: '#FECACA', backgroundColor: '#FEF2F2', color: '#B91C1C' }}
          >
            <span>🔴</span>
            Bilmaydi: {unknownCount}
          </div>
          {step1SaveError ? (
            <p className="max-w-sm text-center text-sm text-red-600">
              {step1SaveError}. Internet yoki serverni tekshirib, sahifani yangilab qayta urinib ko‘ring.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onContinueToTest}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
        >
          2-bosqichga o‘tish (test)
        </button>
      </div>
    </div>
  );
}
