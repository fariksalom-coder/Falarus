import { useState } from 'react';
import { Star } from 'lucide-react';
import { submitTeacherReview } from '../../api/teachers';

/** Tugallangan sinov darsdan keyin o'quvchi sharh qoldiradigan forma. */
export default function TeacherReviewForm({
  token,
  trialId,
  onSubmitted,
}: {
  token: string;
  trialId: number;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [whatLiked, setWhatLiked] = useState('');
  const [opinion, setOpinion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      await submitTeacherReview(token, trialId, {
        rating,
        what_liked: whatLiked.trim(),
        opinion: opinion.trim(),
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sharh saqlanmadi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[20px] border border-app-border bg-app-surface p-5 shadow-app-soft">
      <h2 className="text-lg font-black text-app-text">Sharh qoldiring</h2>
      <p className="mt-1 text-sm font-medium text-app-text-muted">Darsingiz qanday o'tdi? Boshqalarga yordam bering.</p>

      <div className="mt-4 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} yulduz`}
            className="transition active:scale-90"
          >
            <Star
              className={`h-8 w-8 ${
                n <= (hover || rating) ? 'fill-app-accent text-app-accent' : 'text-app-border-strong'
              }`}
            />
          </button>
        ))}
      </div>

      <input
        value={whatLiked}
        onChange={(e) => setWhatLiked(e.target.value)}
        placeholder="Nima yoqdi? (masalan: sabrli tushuntiradi)"
        className="mt-4 w-full rounded-2xl border border-app-border bg-app-surface px-3.5 py-3 text-sm text-app-text outline-none transition placeholder:text-app-text-secondary focus:border-app-primary focus:ring-2 focus:ring-app-primary/15"
      />
      <textarea
        value={opinion}
        onChange={(e) => setOpinion(e.target.value)}
        rows={3}
        placeholder="Umumiy fikringiz (ixtiyoriy)"
        className="mt-3 w-full rounded-2xl border border-app-border bg-app-surface px-3.5 py-3 text-sm text-app-text outline-none transition placeholder:text-app-text-secondary focus:border-app-primary focus:ring-2 focus:ring-app-primary/15"
      />

      {error ? (
        <p className="mt-3 rounded-2xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-app-primary-deep px-5 py-3 font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? 'Saqlanmoqda...' : 'Sharhni yuborish'}
      </button>
    </section>
  );
}
