/**
 * Удаляет локальные кеши прогресса (уроки, лексика, шаги), чтобы при смене аккаунта
 * не подтягивались данные предыдущего пользователя из localStorage/sessionStorage.
 * Не трогает token / adminToken.
 */
import { useVocabularyStepsStore } from '../state/vocabularyStepsStore';

const LOCAL_STORAGE_KEEP = new Set(['token', 'adminToken']);

function clearSessionStorageCaches(): void {
  if (typeof window === 'undefined' || !('sessionStorage' in window)) return;
  try {
    const ss = window.sessionStorage;
    const keys = Object.keys(ss);
    for (const key of keys) {
      if (
        key === 'vocab_topics_progress' ||
        key === 'vocab_access' ||
        key === 'lessons_list' ||
        key.startsWith('vocab_subtopics_') ||
        key.startsWith('vocab_word_groups_') ||
        key.startsWith('vocab_tasks_') ||
        key.startsWith('vocab_steps_')
      ) {
        ss.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

function clearLocalStorageProgress(): void {
  if (typeof window === 'undefined' || !('localStorage' in window)) return;
  try {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (LOCAL_STORAGE_KEEP.has(key)) continue;
      if (
        key === 'lessonTaskResults' ||
        key.startsWith('vocab-') ||
        key.startsWith('vocab_stats_')
      ) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

export function clearUserProgressCaches(): void {
  clearLocalStorageProgress();
  clearSessionStorageCaches();
  try {
    useVocabularyStepsStore.setState({
      byGroup: {},
      statusByGroup: {},
      errorByGroup: {},
    });
  } catch {
    /* ignore */
  }
}
