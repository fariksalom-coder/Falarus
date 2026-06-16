import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { savePartnerProfile, type PartnerProfile } from '../../api/partner';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

type Props = {
  existing?: PartnerProfile | null;
  onSaved: () => void;
  onBack?: () => void;
  /** create = first-time anketa; edit = change existing profile */
  variant?: 'create' | 'edit';
};

const LEVELS = [
  { value: 'beginner', label: 'Boshlang\'ich (A1)' },
  { value: 'elementary', label: 'Asosiy (A2)' },
  { value: 'intermediate', label: 'O\'rta (B1)' },
  { value: 'upper', label: 'Yuqori o\'rta (B2)' },
  { value: 'advanced', label: 'Ilg\'or (C1)' },
];

const GOALS = [
  { value: 'work', labelKey: 'partner.goalWork' },
  { value: 'conversation', labelKey: 'partner.goalConversation' },
];

const inputClass =
  'w-full rounded-2xl border border-app-border bg-app-surface-elevated px-4 py-3 text-[0.95rem] text-app-text shadow-app-soft outline-none transition-colors focus:border-app-primary focus:ring-2 focus:ring-app-primary/20';
const labelClass = 'mb-1.5 block text-sm font-semibold text-app-text';

export default function PartnerProfileForm({
  existing,
  onSaved,
  onBack,
  variant = existing ? 'edit' : 'create',
}: Props) {
  const { token, user } = useAuth();
  const { t } = useLocale();
  const profileFullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const [displayName, setDisplayName] = useState(existing?.display_name ?? profileFullName);
  const [age, setAge] = useState(existing?.age?.toString() ?? '');
  const [gender, setGender] = useState<string>(existing?.gender ?? '');
  const [level, setLevel] = useState(existing?.language_level ?? '');
  const [goal, setGoal] = useState<string>(existing?.goal ?? '');
  const [about, setAbout] = useState(existing?.about ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing?.display_name) return;
    if (!displayName && profileFullName) {
      setDisplayName(profileFullName);
    }
  }, [existing?.display_name, displayName, profileFullName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await savePartnerProfile(token, {
        display_name: displayName.trim(),
        age: Number(age),
        gender: gender as 'male' | 'female',
        language_level: level,
        goal: goal as 'work' | 'conversation',
        about: about.trim(),
        seeking: existing?.seeking ?? '',
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-lg space-y-5"
    >
      <div className="text-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-app-border px-3 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-[var(--app-row-hover)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {variant === 'create' ? t('partner.later') : t('common.back')}
          </button>
        )}
        <h2 className="text-xl font-bold text-app-text">
          {variant === 'edit' ? t('partner.formEditTitle') : t('partner.formCreateTitle')}
        </h2>
        <p className="mt-1 text-sm text-app-text-muted">{t('partner.formSubtitle')}</p>
      </div>

      <div>
        <label className={labelClass}>{t('partner.formName')}</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('partner.formNamePlaceholder')}
          required
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('partner.formAge')}</label>
          <input
            type="number"
            min={10}
            max={99}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder={t('partner.formAgePlaceholder')}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('partner.formGender')}</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">{t('partner.formSelect')}</option>
            <option value="male">{t('partner.male')}</option>
            <option value="female">{t('partner.female')}</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>{t('partner.formLanguageLevel')}</label>
        <select value={level} onChange={(e) => setLevel(e.target.value)} required className={inputClass}>
          <option value="">{t('partner.formSelect')}</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.value === 'beginner'
                ? t('partner.levelBeginner')
                : l.value === 'elementary'
                  ? t('partner.levelElementary')
                  : l.value === 'intermediate'
                    ? t('partner.levelIntermediate')
                    : l.value === 'upper'
                      ? t('partner.levelUpper')
                      : l.value === 'advanced'
                        ? t('partner.levelAdvanced')
                        : l.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{t('partner.formGoal')}</label>
        <div className="flex gap-3">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGoal(g.value)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                goal === g.value
                  ? 'border-app-primary bg-app-primary/12 text-app-primary shadow-[0_2px_12px_rgba(37,99,235,0.15)]'
                  : 'border-app-border bg-app-surface-elevated text-app-text-muted hover:border-app-primary/35'
              }`}
            >
              {t(g.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>{t('partner.formAbout')}</label>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder={t('partner.formAboutPlaceholder')}
          rows={3}
          className={inputClass + ' resize-none'}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 dark:bg-red-500/15 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !displayName.trim() || !age || !gender || !level || !goal}
        className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_12px_32px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:shadow-none"
      >
        {saving ? t('common.saving') : t('common.save')}
      </button>
    </motion.form>
  );
}
