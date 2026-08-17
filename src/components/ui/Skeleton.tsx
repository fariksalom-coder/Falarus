/**
 * Skeleton — yuklanish paytida kelayotgan kontentning shakli.
 *
 * NIMA UCHUN SPINNER EMAS: aylanma spinner "kutyapsiz" deydi, lekin nima
 * kutilayotganini aytmaydi va ko'z ilinadigan narsa topolmaydi — shu sababli
 * kutish uzoq tuyuladi. Skeleton esa kelayotgan kartaning o'lchami va
 * joylashuvini oldindan ko'rsatadi: ekran to'satdan sakrab o'zgarmaydi va
 * ilova tezroq his qilinadi.
 *
 * Ilovada 19 ta sahifada spinner bor edi — shular o'rniga ishlatiladi.
 */

type Props = {
  className?: string;
};

/** Bitta bo'lak — balandligi va kengligi `className` orqali beriladi. */
export function Skeleton({ className = '' }: Props) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Matn qatorlari — oxirgisi qisqaroq, haqiqiy matndagidek. */
export function SkeletonMatn({ qatorlar = 3, className = '' }: { qatorlar?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: qatorlar }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3.5"
          style={{ width: i === qatorlar - 1 ? '62%' : '100%' }}
        />
      ))}
    </div>
  );
}

/**
 * Karta shakli — ilovadagi asosiy blok ko'rinishi (dumaloq burchak,
 * chap tomonda belgi, o'ngda matn).
 */
export function SkeletonKarta({ className = '' }: Props) {
  return (
    <div
      className={`flex items-start gap-3 rounded-[24px] bg-app-surface p-4 shadow-app-soft ${className}`}
      aria-hidden="true"
    >
      <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Bir nechta karta — ro'yxat yuklanayotganda. */
export function SkeletonRoyxat({ soni = 3, className = '' }: { soni?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`} aria-hidden="true">
      {Array.from({ length: soni }).map((_, i) => (
        <SkeletonKarta key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
