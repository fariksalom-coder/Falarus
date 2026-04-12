/**
 * Map browser pathname → (lessonPath, taskNumber) for access guards.
 * Task numbers match setLessonTaskResult(lessonPath, taskNumber, ...).
 */

const LESSON_PATH_RE = /^(\/lesson-\d+)/;

/** Lesson 11: mustahkamlash=1, zadanie-1=2, topshiriq-N → task N+1 (N≥2) */
function parseLesson11(pathname: string): number | null {
  if (pathname.includes('/mustahkamlash')) return 1;
  if (pathname.includes('/zadanie-1')) return 2;
  const m = pathname.match(/\/topshiriq-(\d+)(?:\/|$)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 2) return n + 1;
  }
  return null;
}

function defaultTopshiriq(pathname: string): number | null {
  const m = pathname.match(/\/topshiriq-(\d+)(?:\/|$)/);
  if (m) return parseInt(m[1], 10);
  return null;
}

/**
 * Returns task number for sub-routes, or null for lesson index / unknown extras.
 */
export function parseTaskNumberFromPathname(pathname: string): { lessonPath: string; taskNumber: number | null } | null {
  const lm = pathname.match(LESSON_PATH_RE);
  if (!lm) return null;
  const lessonPath = lm[1];

  if (pathname === lessonPath || pathname === `${lessonPath}/`) {
    return { lessonPath, taskNumber: null };
  }

  const vazifaMatch = pathname.match(/\/lesson-(\d+)\/vazifa\/(\d+)(?:\/|$)/);
  if (vazifaMatch) {
    const lessonNum = parseInt(vazifaMatch[1], 10);
    const n = parseInt(vazifaMatch[2], 10);
    if (lessonNum >= 1 && lessonNum <= 10 && n >= 1 && n <= 10) {
      return { lessonPath: `/lesson-${lessonNum}`, taskNumber: n };
    }
  }

  if (pathname.includes('/mustahkamlash') || pathname.includes('/bitta-mashq')) {
    return { lessonPath, taskNumber: 1 };
  }

  if (lessonPath === '/lesson-11') {
    const t = parseLesson11(pathname);
    return { lessonPath, taskNumber: t };
  }

  const topshiriq = defaultTopshiriq(pathname);
  if (topshiriq != null) {
    return { lessonPath, taskNumber: topshiriq };
  }

  if (pathname.includes('/salomlashish-test') || pathname.includes('/juftini-toping') || pathname.includes('/gapni-tuzing')) {
    return { lessonPath: '/lesson-1', taskNumber: null };
  }

  return { lessonPath, taskNumber: null };
}
