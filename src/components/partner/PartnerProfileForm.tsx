import { useState } from 'react';
import { motion } from 'motion/react';
import { savePartnerProfile, type PartnerProfile } from '../../api/partner';
import { useAuth } from '../../context/AuthContext';

type Props = {
  existing?: PartnerProfile | null;
  onSaved: () => void;
};

const LEVELS = [
  { value: 'beginner', label: 'Boshlang\'ich (A1)' },
  { value: 'elementary', label: 'Asosiy (A2)' },
  { value: 'intermediate', label: 'O\'rta (B1)' },
  { value: 'upper', label: 'Yuqori o\'rta (B2)' },
  { value: 'advanced', label: 'Ilg\'or (C1)' },
];

const GOALS = [
  { value: 'work', label: 'Ish uchun' },
  { value: 'conversation', label: 'Suhbat uchun' },
];

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[0.95rem] text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.04)] outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700';

export default function PartnerProfileForm({ existing, onSaved }: Props) {
  const { token } = useAuth();
  const [displayName, setDisplayName] = useState(existing?.display_name ?? '');
  const [age, setAge] = useState(existing?.age?.toString() ?? '');
  const [gender, setGender] = useState<string>(existing?.gender ?? '');
  const [level, setLevel] = useState(existing?.language_level ?? '');
  const [goal, setGoal] = useState<string>(existing?.goal ?? '');
  const [about, setAbout] = useState(existing?.about ?? '');
  const [seeking, setSeeking] = useState(existing?.seeking ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
        seeking: seeking.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
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
        <h2 className="text-xl font-bold text-slate-900">Anketa to'ldiring</h2>
        <p className="mt-1 text-sm text-slate-500">Naparnik topish uchun ma'lumotlaringizni kiriting</p>
      </div>

      <div>
        <label className={labelClass}>Ism</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ismingiz"
          required
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Yosh</label>
          <input
            type="number"
            min={10}
            max={99}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="25"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Jins</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Tanlang</option>
            <option value="male">Erkak</option>
            <option value="female">Ayol</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Til darajasi</label>
        <select value={level} onChange={(e) => setLevel(e.target.value)} required className={inputClass}>
          <option value="">Tanlang</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Maqsad</label>
        <div className="flex gap-3">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGoal(g.value)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                goal === g.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-[0_2px_12px_rgba(37,99,235,0.15)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>O'zingiz haqida</label>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Qisqacha o'zingiz haqida yozing..."
          rows={3}
          className={inputClass + ' resize-none'}
        />
      </div>

      <div>
        <label className={labelClass}>Kimni qidiryapsiz</label>
        <textarea
          value={seeking}
          onChange={(e) => setSeeking(e.target.value)}
          placeholder="Qanday naparnik qidiryapsiz..."
          rows={2}
          className={inputClass + ' resize-none'}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={saving || !displayName.trim() || !age || !gender || !level || !goal}
        className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_12px_32px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:shadow-none"
      >
        {saving ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </motion.form>
  );
}
