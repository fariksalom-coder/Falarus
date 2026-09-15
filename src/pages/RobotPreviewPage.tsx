import { useState } from 'react';
import UstozRobotAvatar from '../components/lesson/UstozRobotAvatar';

/**
 * Lokal ko‘rib chiqish: robot animatsiyasi (tinglash / gapirish).
 * Faqat UI — AI/backend yo‘q.
 */
export default function RobotPreviewPage() {
  const [speaking, setSpeaking] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-[#101728] px-4 pb-8 pt-6">
      <div className="flex w-full flex-1 items-center justify-center">
        <UstozRobotAvatar speaking={speaking} displayHeight={360} />
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSpeaking(false)}
          className={`min-h-[48px] rounded-2xl text-[14px] font-black transition active:scale-[0.98] ${
            !speaking ? 'bg-white text-[#101728]' : 'bg-white/10 text-white'
          }`}
        >
          Tinglash
        </button>
        <button
          type="button"
          onClick={() => setSpeaking(true)}
          className={`min-h-[48px] rounded-2xl text-[14px] font-black transition active:scale-[0.98] ${
            speaking ? 'bg-white text-[#101728]' : 'bg-white/10 text-white'
          }`}
        >
          Gapirish
        </button>
      </div>
    </div>
  );
}
