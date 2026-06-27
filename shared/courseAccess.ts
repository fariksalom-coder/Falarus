/** When true, all patent exam variants are open without purchase. */
export const PATENT_COURSE_FREE_FOR_ALL = true;

export type PatentAccessLike = { patent_course_active?: boolean } | null | undefined;

export function hasPatentCourseAccess(access: PatentAccessLike): boolean {
  if (PATENT_COURSE_FREE_FOR_ALL) return true;
  return access?.patent_course_active === true;
}
