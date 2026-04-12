import { getLessonOneVazifaConfig } from './lessonOneTasks';
import { getLessonTwoVazifaConfig } from './lessonTwoTasks';
import { getLessonThreeVazifaConfig } from './lessonThreeTasks';
import { getLessonFourVazifaConfig } from './lessonFourTasks';
import { getLessonFiveVazifaConfig } from './lessonFiveTasks';
import { getLessonSixVazifaConfig } from './lessonSixTasks';
import { getLessonSevenVazifaConfig } from './lessonSevenTasks';
import { getLessonEightVazifaConfig } from './lessonEightTasks';
import { getLessonNineVazifaConfig } from './lessonNineTasks';
import { getLessonTenVazifaConfig } from './lessonTenTasks';
import { LESSON_EXTENDED_EXPECTED_TASK_TOTALS } from './lessonExtendedExpectedTaskTotals.js';

export type VazifaLessonConfig = NonNullable<ReturnType<typeof getLessonOneVazifaConfig>>;

/**
 * Joriy kontent bo‘yicha vazifadagi savollar soni.
 * Eski saqlanmada bitta "mustahkamlash" barcha turlarni birlashtirgan bo‘lsa, `total` boshqacha bo‘ladi — natija e’tiborsiz qoldiriladi.
 */
export function getExpectedVazifaTaskCount(lessonPath: string, vazifaId: number): number | null {
  const m = lessonPath.match(/^\/lesson-(\d+)$/);
  if (!m) return null;
  const lessonNum = Number(m[1]);
  const cfg = getUnifiedVazifaConfig(lessonNum, vazifaId);
  return cfg ? cfg.tasks.length : null;
}

/**
 * Barcha darslar (1–24): vazifa/topshiriq bo‘yicha kutilgan `total` (TASKS.length).
 * 1–10: unified vazifa konfiglari; 11–24: `lessonExtendedExpectedTaskTotals`.
 */
export function getExpectedLessonTaskCount(lessonPath: string, taskNumber: number): number | null {
  const fromUnified = getExpectedVazifaTaskCount(lessonPath, taskNumber);
  if (fromUnified != null) return fromUnified;
  const ext = LESSON_EXTENDED_EXPECTED_TASK_TOTALS[lessonPath]?.[taskNumber];
  return ext !== undefined ? ext : null;
}

/** 1–10-dars: mustahkamlash → alohida vazifalar */
export function getUnifiedVazifaConfig(lessonNum: number, vazifaId: number): VazifaLessonConfig | null {
  switch (lessonNum) {
    case 1:
      return getLessonOneVazifaConfig(vazifaId);
    case 2:
      return getLessonTwoVazifaConfig(vazifaId);
    case 3:
      return getLessonThreeVazifaConfig(vazifaId);
    case 4:
      return getLessonFourVazifaConfig(vazifaId);
    case 5:
      return getLessonFiveVazifaConfig(vazifaId);
    case 6:
      return getLessonSixVazifaConfig(vazifaId);
    case 7:
      return getLessonSevenVazifaConfig(vazifaId);
    case 8:
      return getLessonEightVazifaConfig(vazifaId);
    case 9:
      return getLessonNineVazifaConfig(vazifaId);
    case 10:
      return getLessonTenVazifaConfig(vazifaId);
    default:
      return null;
  }
}
