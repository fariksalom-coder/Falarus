export interface VideoWord { text: string; start: number | null; end: number | null }
export interface VideoSentence { text: string; translation: string; start: number | null; end: number | null; words: VideoWord[] }
export interface VideoLessonDocument { id: string; title: string; video: string; language: 'ru'; translationLanguage: 'uz'; sentences: VideoSentence[] }
export type PreparationPhase = 'uploaded' | 'recognizing' | 'translating' | 'ready' | 'error';
export interface VideoLessonRecord {
  id: string; revision: number; status: 'draft' | 'published'; phase: PreparationPhase;
  lesson: VideoLessonDocument; filename: string; bytes: number; duration: number; mime: string;
  createdAt: string; updatedAt: string; error?: string; jobOwner?: number; processingSeconds?: number; progress?: { stage: string; percent: number };
}
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 30 * 60;
export const running = (phase: PreparationPhase) => phase === 'recognizing' || phase === 'translating';
const normalized = (s: string) => s.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]/gu, '');
export function lessonIssues(lesson: VideoLessonDocument, duration: number): string[] {
  const issues: string[] = [];
  if (!lesson.title.trim()) issues.push('Укажите название урока.');
  if (!lesson.sentences.length) issues.push('Добавьте хотя бы одно предложение.');
  let priorEnd = 0;
  lesson.sentences.forEach((sentence, i) => {
    const label = `Предложение ${i + 1}`;
    if (!sentence.text.trim() || !/[а-яё]/i.test(sentence.text)) issues.push(`${label}: нужен русский текст.`);
    if (!sentence.translation.trim() || /[а-яё]/i.test(sentence.translation) || sentence.translation.includes('[Tushunarsiz parcha]')) issues.push(`${label}: нужен перевод на узбекский Latin.`);
    if (!sentence.words.length) issues.push(`${label}: нет слов.`);
    if (normalized(sentence.text) !== normalized(sentence.words.map(w => w.text).join(' '))) issues.push(`${label}: текст не совпадает со словами. Обновите слова или выполните перепривязку.`);
    const valid = (start: number | null, end: number | null): boolean => typeof start === 'number' && typeof end === 'number' && Number.isFinite(start) && Number.isFinite(end) && start >= 0 && start < end && end <= duration + .05;
    if (!valid(sentence.start, sentence.end)) issues.push(`${label}: неверные границы предложения.`);
    if (sentence.start !== null && sentence.start < priorEnd - .001) issues.push(`${label}: предложения пересекаются во времени.`);
    let wordEnd = sentence.start ?? 0;
    for (const [j, word] of sentence.words.entries()) {
      if (!word.text.trim() || !valid(word.start, word.end)) issues.push(`${label}, слово ${j + 1}: проверьте текст и start/end.`);
      else {
        if (word.start! < wordEnd - .001 || word.start! < priorEnd - .001 || word.end! > (sentence.end ?? 0) + .001) issues.push(`${label}, слово ${j + 1}: нарушен временной порядок или границы.`);
        wordEnd = word.end!; priorEnd = word.end!;
      }
    }
  });
  return issues;
}
