/**
 * OnboardingPage — ro'yxatdan o'tgandan keyingi so'rovnoma.
 *
 * Har bir savol ALOHIDA ekranda: bitta ekranda 6 ta savol turса, ko'pchilik
 * uni yopib yuboradi.
 *
 * BARCHA savol majburiy — o'tkazib yuborish yo'q. Javoblar oxirida BITTA
 * so'rovda yuboriladi (yarim to'ldirilgan yozuv bazada qolib ketmasin),
 * reklama manbasi esa avtomat qo'shiladi.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveOnboarding, type OnboardingAnswers } from '../api/onboarding';

import PartnerProfileSetup from '../components/partner/PartnerProfileSetup';

type Option = { value: string; label: string; emoji?: string };
type Question = {
  key: keyof OnboardingAnswers;
  title: string;
  subtitle?: string;
  options: Option[];
};

const QUESTIONS: Question[] = [
  {
    key: 'goal',
    title: 'Rus tilini nima uchun o‘rganyapsiz?',
    subtitle: 'Shunga qarab darslarni moslaymiz',
    options: [
      { value: 'work_russia', label: 'Rossiyada ishlash uchun', emoji: '💼' },
      { value: 'living_russia', label: 'Rossiyada yashash uchun', emoji: '🏠' },
      { value: 'patent', label: 'Patent / imtihon uchun', emoji: '📄' },
      { value: 'study', label: 'O‘qish uchun', emoji: '🎓' },
      { value: 'career', label: 'Karyera uchun', emoji: '📈' },
      { value: 'communication', label: 'Muloqot uchun', emoji: '💬' },
    ],
  },
  {
    key: 'level',
    title: 'Hozirgi darajangiz qanday?',
    subtitle: 'Rostini tanlang — dars shunga qarab boshlanadi',
    options: [
      { value: 'zero', label: 'Umuman bilmayman', emoji: '🌱' },
      { value: 'words', label: 'Ba’zi so‘zlarni bilaman', emoji: '🔤' },
      { value: 'basic', label: 'Oddiy gaplar tuza olaman', emoji: '💡' },
      { value: 'intermediate', label: 'Erkin gaplasha olaman', emoji: '🗣️' },
    ],
  },
  {
    key: 'daily_minutes',
    title: 'Kuniga qancha vaqt ajrata olasiz?',
    subtitle: 'Kichik, lekin har kunlik mashq eng samarali',
    options: [
      { value: '10', label: '10 daqiqa', emoji: '⏱️' },
      { value: '20', label: '20 daqiqa', emoji: '⏰' },
      { value: '30', label: '30 daqiqa', emoji: '🕐' },
      { value: '60', label: '1 soat va undan ko‘p', emoji: '🔥' },
    ],
  },
  {
    key: 'age_range',
    title: 'Yoshingiz nechida?',
    options: [
      { value: '14_17', label: '14–17' },
      { value: '18_24', label: '18–24' },
      { value: '25_34', label: '25–34' },
      { value: '35_44', label: '35–44' },
      { value: '45_plus', label: '45 va undan katta' },
    ],
  },
  {
    key: 'country',
    title: 'Qayerda yashaysiz?',
    options: [
      { value: 'UZ', label: 'O‘zbekiston', emoji: '🇺🇿' },
      { value: 'RU', label: 'Rossiya', emoji: '🇷🇺' },
      { value: 'KZ', label: 'Qozog‘iston', emoji: '🇰🇿' },
      { value: 'KG', label: 'Qirg‘iziston', emoji: '🇰🇬' },
      { value: 'TJ', label: 'Tojikiston', emoji: '🇹🇯' },
      { value: 'other', label: 'Boshqa davlat', emoji: '🌍' },
    ],
  },
  {
    key: 'source',
    title: 'FalaRus haqida qayerdan bildingiz?',
    options: [
      { value: 'instagram', label: 'Instagram', emoji: '📸' },
      { value: 'youtube', label: 'YouTube', emoji: '▶️' },
      { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
      { value: 'telegram', label: 'Telegram', emoji: '✈️' },
      { value: 'friend', label: 'Do‘stim aytdi', emoji: '👥' },
      { value: 'google', label: 'Google’dan topdim', emoji: '🔍' },
      { value: 'ads', label: 'Reklamadan', emoji: '📢' },
      { value: 'other', label: 'Boshqa', emoji: '💭' },
    ],
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const q = QUESTIONS[step];
  const total = QUESTIONS.length + 1;

  const finish = useMemo(
    () => async (all: Record<string, string>) => {
      setSaving(true);
      const payload: OnboardingAnswers & { skipped_count: number } = {
        age_range: all.age_range ?? null,
        country: all.country ?? null,
        goal: all.goal ?? null,
        level: all.level ?? null,
        source: all.source ?? null,
        daily_minutes: all.daily_minutes ? Number(all.daily_minutes) : null,
        // Barcha savol majburiy — o'tkazib yuborilgani bo'lmaydi.
        skipped_count: 0,
      };
      try {
        const saved = await saveOnboarding(token, payload);
        if (!saved) throw new Error('Ro‘yxatdan o‘tish yakunlanmadi. Qayta saqlashni bosing.');
        navigate('/', { replace: true });
      } finally { setSaving(false); }
    },
    [token, navigate],
  );

  const choose = (value: string) => {
    if (saving || !q) return;
    const next = { ...answers, [String(q.key)]: value };
    setAnswers(next);
    setStep((s) => Math.min(total - 1, s + 1));
  };

  return (
    <div className="min-h-[100dvh] bg-app-bg-subtle px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <main className="mx-auto w-full max-w-[560px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
            aria-label="Orqaga"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-app-text shadow-app-soft ring-1 ring-app-border disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <div className="flex flex-1 gap-1.5">
            {Array.from({length: total}, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-app-brand' : 'bg-app-border'
                }`}
              />
            ))}
          </div>
          <span className="shrink-0 text-[12px] font-black tabular-nums text-app-text-muted">
            {step + 1}/{total}
          </span>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="mt-7"
        >
          {step === QUESTIONS.length ? <><h1 className="mb-5 text-2xl font-bold text-app-text">Ro‘yxatdan o‘tishni yakunlang</h1><PartnerProfileSetup onSaved={()=>finish(answers)} onBusyChange={setSaving}/></> : <>
          <h1 className="text-[24px] font-black leading-tight text-app-text">{q.title}</h1>
          {q.subtitle ? (
            <p className="mt-1.5 text-[13.5px] font-semibold text-app-text-muted">{q.subtitle}</p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2.5">
            {q.options.map((opt) => {
              const picked = answers[String(q.key)] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => choose(opt.value)}
                  disabled={saving}
                  className={`flex min-h-[58px] w-full items-center gap-3 rounded-[18px] border-2 bg-white px-4 py-3 text-left text-[16px] font-bold transition active:scale-[0.99] ${
                    picked
                      ? 'border-app-brand text-app-brand shadow-app-soft'
                      : 'border-app-border text-app-text'
                  }`}
                >
                  {opt.emoji ? (
                    <span className="text-[22px] leading-none" aria-hidden>
                      {opt.emoji}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">{opt.label}</span>
                  {picked ? <Check className="h-5 w-5 shrink-0" strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>

          {saving ? (
            <p className="mt-5 text-center text-[13.5px] font-bold text-app-text-muted">
              Saqlanmoqda…
            </p>
          ) : (
            <p className="mt-5 text-center text-[12.5px] font-semibold text-app-text-secondary">
              Javobingiz darslarni siz uchun moslashtirishga yordam beradi
            </p>
          )}
          </>}
        </motion.div>
      </main>
    </div>
  );
}
