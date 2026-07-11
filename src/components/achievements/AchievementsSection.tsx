import { useEffect, useMemo, useState } from 'react';
import {
  Flame,
  Zap,
  Star,
  Medal,
  Trophy,
  Crown,
  Sparkles,
  BookOpen,
  Library,
  GraduationCap,
  Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchAchievements, type AchievementItem } from '../../api/achievements';

const ICON_BY_KEY: Record<string, LucideIcon> = {
  flame: Flame,
  zap: Zap,
  star: Star,
  medal: Medal,
  trophy: Trophy,
  crown: Crown,
  sparkles: Sparkles,
  book: BookOpen,
  library: Library,
  graduation: GraduationCap,
};

type Props = {
  token: string | null;
};

/**
 * Premium achievements card per mockup:
 *   • Header (trophy chip + title + subtitle)
 *   • Section 1: "Ketma-ket kunlar" streak medals (4×2 grid with "yana" tile)
 *   • Section 2: "So'zlar to'plami" words medals
 */
export default function AchievementsSection({ token }: Props) {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllDays, setShowAllDays] = useState(false);
  const [showAllWords, setShowAllWords] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await fetchAchievements(token);
      if (!alive) return;
      if (res) setItems(res.items);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const daysItems = useMemo(
    () =>
      items
        .filter((it) => it.kind === 'days')
        .sort((a, b) => a.order - b.order),
    [items],
  );
  const wordsItems = useMemo(
    () =>
      items
        .filter((it) => it.kind === 'words')
        .sort((a, b) => a.order - b.order),
    [items],
  );

  return (
    <div
      className="rounded-[24px] bg-pmn-card p-5 shadow-[0_14px_28px_-16px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[13px]"
          style={{
            background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)',
            boxShadow: '0 6px 14px -6px rgba(212,172,92,0.55)',
          }}
        >
          <Trophy className="h-5 w-5 text-[#0A1638]" strokeWidth={2.4} />
        </div>
        <div>
          <h2
            className="text-[19px] font-black leading-none text-pmn-text"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Yutuqlar
          </h2>
          <p className="mt-1 text-[12.5px] font-semibold text-pmn-text-muted">
            Yakunlangan kunlar va so'zlar yutug'i
          </p>
        </div>
      </div>

      {/* Section: completed-days medals */}
      <SectionBlock
        title="Yakunlangan kunlar"
        loading={loading}
        items={daysItems}
        showAll={showAllDays}
        onToggle={() => setShowAllDays((v) => !v)}
        emptyHint="Birinchi Kunlik reja kuningizni yakunlab medalingizni oling"
      />

      {/* Section: words medals */}
      <SectionBlock
        title="O'rgangan so'zlar"
        loading={loading}
        items={wordsItems}
        showAll={showAllWords}
        onToggle={() => setShowAllWords((v) => !v)}
        emptyHint="Lug'at bilan mashg'ulot boshlab so'z medallarini oling"
      />
    </div>
  );
}

function SectionBlock({
  title,
  loading,
  items,
  showAll,
  onToggle,
  emptyHint,
}: {
  title: string;
  loading: boolean;
  items: AchievementItem[];
  showAll: boolean;
  onToggle: () => void;
  emptyHint: string;
}) {
  const HIDDEN_ROW_LIMIT = 7; // 7 tiles + "yana" = 8 = 4×2
  const visible = showAll ? items : items.slice(0, HIDDEN_ROW_LIMIT);
  const hiddenCount = Math.max(0, items.length - HIDDEN_ROW_LIMIT);
  const unlockedCount = items.filter((it) => it.unlocked).length;

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h3
          className="text-[13px] font-black uppercase tracking-[0.14em]"
          style={{ color: '#9E9787' }}
        >
          {title}
        </h3>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-black tabular-nums"
          style={{
            background: 'rgba(212,172,92,0.12)',
            color: '#B98A3E',
          }}
        >
          {unlockedCount} / {items.length}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse rounded-[16px] bg-pmn-cream-strong"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[12.5px] font-semibold text-pmn-text-muted">{emptyHint}</p>
      ) : (
        <div className="grid grid-cols-4 gap-2.5">
          {visible.map((it) => (
            <MedalTile key={it.key} item={it} />
          ))}
          {!showAll && hiddenCount > 0 && (
            <button
              type="button"
              onClick={onToggle}
              className="flex h-[76px] flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-pmn-cream-border bg-pmn-cream/50 transition-transform active:scale-95"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(212,172,92,0.18)' }}
              >
                <Plus className="h-4 w-4 text-pmn-gold-deep" strokeWidth={2.8} />
              </span>
              <span className="text-[10.5px] font-black text-pmn-gold-deep">
                yana
              </span>
            </button>
          )}
          {showAll && items.length > HIDDEN_ROW_LIMIT && (
            <button
              type="button"
              onClick={onToggle}
              className="flex h-[76px] flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-pmn-cream-border bg-pmn-cream/50 transition-transform active:scale-95"
            >
              <span className="text-[10.5px] font-black text-pmn-text-muted">
                yopish
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MedalTile({ item }: { item: AchievementItem }) {
  const Icon = ICON_BY_KEY[item.icon] ?? Zap;
  const isUnlocked = item.unlocked;
  const label = item.kind === 'days'
    ? `${item.threshold} kun`
    : `${item.threshold} so'z`;

  return (
    <div
      className={
        isUnlocked
          ? 'flex h-[76px] flex-col items-center justify-center gap-1 rounded-[16px] transition-transform'
          : 'flex h-[76px] flex-col items-center justify-center gap-1 rounded-[16px] bg-pmn-cream transition-transform'
      }
      style={
        isUnlocked
          ? {
              background:
                'linear-gradient(155deg, rgba(245,212,143,0.24) 0%, rgba(212,172,92,0.14) 100%)',
              border: '1.5px solid rgba(212,172,92,0.45)',
              boxShadow: '0 6px 14px -6px rgba(212,172,92,0.35)',
            }
          : {
              border: '1.5px solid transparent',
            }
      }
    >
      <span
        className={
          isUnlocked
            ? 'flex h-8 w-8 items-center justify-center rounded-[10px]'
            : 'flex h-8 w-8 items-center justify-center rounded-[10px] bg-pmn-cream-border'
        }
        style={
          isUnlocked
            ? {
                background:
                  'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)',
                boxShadow: 'inset 0 -2px 4px rgba(80,50,10,0.2)',
              }
            : undefined
        }
      >
        <Icon
          className="h-4 w-4"
          strokeWidth={2.4}
          style={{ color: isUnlocked ? '#3B2A0A' : '#B5AE97' }}
        />
      </span>
      <span
        className="text-[11.5px] font-black leading-none"
        style={{ color: isUnlocked ? '#B98A3E' : '#B5AE97' }}
      >
        {label}
      </span>
    </div>
  );
}
