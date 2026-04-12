import { LESSONS } from '../../data/lessonsList';

type LessonHubTitleProps = {
  lessonPath: string;
  /** Eski sahifalarda qo‘shimcha izoh (masalan, ruscha sarlavha) */
  subtitle?: string;
};

export function LessonHubTitle({ lessonPath, subtitle }: LessonHubTitleProps) {
  const meta = LESSONS.find((l) => l.path === lessonPath);

  if (!meta) {
    return (
      <h1 className="mb-4 text-center text-xl font-bold text-slate-900">
        {lessonPath}
      </h1>
    );
  }

  return (
    <>
      <h1
        className="mb-4 text-balance text-center text-xl font-bold leading-snug text-slate-900 sm:mb-5 sm:text-2xl"
        title={meta.titleRu ? `${meta.titleUz} (${meta.titleRu})` : meta.titleUz}
      >
        <span>{meta.num}-dars</span>
        <span className="font-normal text-slate-300"> — </span>
        <span>{meta.titleUz}</span>
        {meta.titleRu ? <span className="sr-only"> ({meta.titleRu})</span> : null}
      </h1>
      {subtitle ? <p className="-mt-2 mb-4 text-center text-sm text-slate-500 sm:-mt-3">{subtitle}</p> : null}
    </>
  );
}
