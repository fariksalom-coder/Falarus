import type { VideoSentence } from '../../shared/videoLesson.js';

export type MovieTranscription = {
  words: {word: string; start: number; end: number}[];
  segments: {text: string; start: number; end: number; no_speech_prob?: number; avg_logprob?: number}[];
};
const normalized = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const round = (value: number) => Math.round(value * 1000) / 1000;

/** Keep each overlap word in exactly one chunk; timestamps remain relative to the full film. */
export function movieChunkSentences(raw: MovieTranscription, offset: number, coreStart: number, coreEnd: number): VideoSentence[] {
  if (!Array.isArray(raw.words) || !Array.isArray(raw.segments)) throw new Error('Transcription has no word timestamps.');
  const output: VideoSentence[] = [];
  for (const segment of raw.segments) {
    if ((segment.no_speech_prob ?? 0) > .6 && (segment.avg_logprob ?? 0) < -1) continue;
    const words = raw.words.filter(word => {
      const mid = (word.start + word.end) / 2;
      return mid >= segment.start && mid < segment.end && mid + offset >= coreStart && mid + offset < coreEnd;
    }).filter(word => word.word.trim() && Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start)
      .map(word => ({text: word.word.trim(), start: round(Math.max(coreStart, offset + word.start)), end: round(Math.min(coreEnd, offset + word.end))}));
    if (!words.length) continue;
    const joined = words.map(word => word.text).join(' ');
    const text = normalized(segment.text) === normalized(joined) ? segment.text.trim() : joined;
    output.push({text, translation: '', start: words[0].start, end: words.at(-1)!.end, words});
  }
  return output;
}

/** Remove zero-length/overlapping ASR boundaries without shifting later dialogue. */
export function normalizeMovieTimeline(sentences: VideoSentence[]): VideoSentence[] {
  let previous = 0;
  return sentences.flatMap(sentence => {
    const words = sentence.words.flatMap(word => {
      const start = round(Math.max(previous, word.start!));
      const end = round(word.end!);
      if (end <= start) return [];
      previous = end;
      return [{...word, start, end}];
    });
    if (!words.length) return [];
    const joined = words.map(word => word.text).join(' ');
    return [{...sentence, text: normalized(sentence.text) === normalized(joined) ? sentence.text : joined, start: words[0].start, end: words.at(-1)!.end, words}];
  });
}
