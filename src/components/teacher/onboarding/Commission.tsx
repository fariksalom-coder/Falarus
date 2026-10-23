/**
 * Komissiya (TZ 9.2): joriy stavka, keyingi pasayishgacha qolgan darslar va butun shkala.
 * `compact` — kabinet yon menyusidagi kichik karta.
 */
import { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { usePanel } from '../panel/panelContext';
import { Card, ProgressBar, Skeleton } from '../panel/ui';
import { teacherNet, type CommissionTier } from '../../../../shared/teacherOnboarding';
import { getCommission } from '../../../api/teacherOnboarding';

type Data = Awaited<ReturnType<typeof getCommission>>;
const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');

const TEXT = {
  uz: {
    title: 'Platforma komissiyasi',
    now: (p: number) => `Hozir: ${p}%`,
    left: (n: number, p: number) => `Yana ${n} ta darsdan keyin — ${p}%`,
    floor: 'Eng past stavka — doimiy',
    done: (n: number) => `Oʻtkazilgan darslar: ${n}`,
    scale: 'Shkala',
    range: (from: number, to: number | null) => (to == null ? `${from}-darsdan` : `${from}–${to}-darslar`),
    perLesson: (price: number, net: number) => `Dars narxi ${fmt(price)} soʻm → sizga ${fmt(net)} soʻm`,
    trial: 'Sinov darsi uchun toʻlov toʻliq FalaRus’ga tushadi.',
  },
  ru: {
    title: 'Комиссия платформы',
    now: (p: number) => `Сейчас: ${p}%`,
    left: (n: number, p: number) => `Ещё ${n} уроков — и ставка ${p}%`,
    floor: 'Минимальная ставка — постоянно',
    done: (n: number) => `Проведено уроков: ${n}`,
    scale: 'Шкала',
    range: (from: number, to: number | null) => (to == null ? `с ${from}-го урока` : `${from}–${to}-й урок`),
    perLesson: (price: number, net: number) => `Цена урока ${fmt(price)} сум → вам ${fmt(net)} сум`,
    trial: 'Оплата за пробный урок полностью идёт FalaRus.',
  },
};

function rows(tiers: CommissionTier[]) {
  return tiers.map((t, i) => ({ from: i === 0 ? 1 : (tiers[i - 1].up_to ?? 0) + 1, to: t.up_to, percent: t.percent }));
}

export default function Commission({ compact = false }: { compact?: boolean }) {
  const { token, lang } = usePanel();
  const t = TEXT[lang];
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { getCommission(token).then(setData).catch(() => {}); }, [token]);

  if (!data) return compact ? null : <Card className="p-5"><Skeleton rows={3} /></Card>;
  const tier = rows(data.tiers).find((r) => r.to == null || data.completed + 1 <= r.to)!;
  const span = tier.to == null ? 1 : tier.to - tier.from + 1;
  const pct = tier.to == null ? 100 : ((data.completed + 1 - tier.from) / span) * 100;

  if (compact) {
    return (
      <div className="rounded-[16px] bg-app-surface/7 p-3.5">
        <p className="flex items-center gap-2 text-[12.5px] font-semibold text-white"><TrendingDown className="h-4 w-4 text-[#6CE0A0]" />{t.now(data.percent)}</p>
        <p className="mt-1.5 text-[11.5px] leading-[1.5] text-white/55">
          {data.lessons_until_next != null && data.next_percent != null ? t.left(data.lessons_until_next, data.next_percent) : t.floor}
        </p>
      </div>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-semibold text-app-text-muted">{t.title}</p>
          <p className="text-[28px] font-bold tabular-nums text-app-text">{data.percent}%</p>
          <p className="text-[12.5px] text-app-text-muted">{t.done(data.completed)}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#E8F7EE] text-[#17803D]"><TrendingDown className="h-5 w-5" /></span>
      </div>
      <div>
        <ProgressBar percent={pct} tone="green" />
        <p className="mt-2 text-[13px] font-semibold text-app-text">
          {data.lessons_until_next != null && data.next_percent != null ? t.left(data.lessons_until_next, data.next_percent) : t.floor}
        </p>
      </div>
      {data.lesson_price_uzs ? <p className="rounded-[12px] bg-app-bg-subtle p-3 text-[13px] text-app-text">{t.perLesson(data.lesson_price_uzs, teacherNet(data.lesson_price_uzs, data.percent))}</p> : null}
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-app-text">{t.scale}</p>
        <ul className="divide-y divide-app-border rounded-[14px] border border-app-border">
          {rows(data.tiers).map((r) => {
            const on = r === tier || (r.from === tier.from);
            return (
              <li key={r.from} className={`flex items-center justify-between px-3.5 py-2.5 text-[13px] ${on ? 'bg-[#F5F8FF] font-bold text-app-text' : 'text-app-text-muted'}`}>
                <span>{t.range(r.from, r.to)}</span><span className="tabular-nums">{r.percent}%</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[12px] text-app-text-muted">{t.trial}</p>
      </div>
    </Card>
  );
}
