export interface LessonWord { id: string; text: string; start: number; end: number }
export interface LessonSentence { id: string; text: string; translation?: string; start: number; end: number; words: LessonWord[] }
export interface Lesson { id: string; title: string; label: string; language: string; video: { src: string; poster?: string }; sentences: LessonSentence[] }
export interface LessonRepository { getLesson(id: string): Promise<Lesson> }

export const demoLesson: Lesson = {
  id: 'introduction', title: 'Знакомство', label: 'Урок 01', language: 'ru',
  video: { src: '/test/video.mp4' },
  sentences: [{ id: 's1', text: 'Меня зовут Алише.', translation: 'Mening ismim Alishe.', start: 1.2, end: 2.8,
    words: [{ id: 'w1', text: 'Меня', start: 1.2, end: 1.65 }, { id: 'w2', text: 'зовут', start: 1.7, end: 2.1 }, { id: 'w3', text: 'Алише.', start: 2.15, end: 2.8 }] }],
};
// Replace this adapter with fetch later; the screen only receives a Lesson.
export const localLessonRepository: LessonRepository = {
  async getLesson(id) { if (id !== demoLesson.id) throw new Error('Урок не найден'); return structuredClone(demoLesson); },
};
export function activeWord(sentence: LessonSentence, time: number) {
  return sentence.words.findIndex(word => time >= word.start && time < word.end);
}
export function sentenceAt(lesson: Lesson, time: number) {
  const current = lesson.sentences.findIndex(sentence => time >= sentence.start && time < sentence.end);
  if (current >= 0) return current;
  const next = lesson.sentences.findIndex(sentence => time < sentence.start);
  return next >= 0 ? next : lesson.sentences.length - 1;
}

/** Wire format stays independent of the player's view model. */
export function lessonFromDocument(document: import('../../shared/videoLesson').VideoLessonDocument, videoSrc = document.video): Lesson {
  if (!document.sentences.length) throw new Error('В уроке пока нет предложений.');
  return {
    id: document.id, title: document.title, label: 'Живая речь', language: document.language, video: { src: videoSrc },
    sentences: document.sentences.map((s, i) => ({
      id: `s${i}`, text: s.text, translation: s.translation, start: s.start ?? 0, end: s.end ?? 0,
      words: s.words.map((w, j) => ({ id: `s${i}w${j}`, text: w.text, start: w.start ?? -1, end: w.end ?? -1 })),
    })),
  };
}

/** Stop at the last aligned word, bounded by the next sentence. Lead-in is start-only. */
export function sentenceEnd(lesson: Lesson, index: number): number {
  const sentence = lesson.sentences[index];
  const lastWordEnd = sentence.words.at(-1)?.end;
  return Math.min(sentence.end, lastWordEnd && lastWordEnd > sentence.start ? lastWordEnd : sentence.end,
    lesson.sentences[index + 1]?.start ?? Infinity);
}
