import type { LessonSentence } from './lesson';

/** The subtitle is the full recognized sentence, never a truncated list of aligned words. */
export function FilmSubtitles({ sentence }: { sentence?: LessonSentence }) {
  return <section className="ex-film-captions" aria-label="Субтитры фильма" translate="no">
    <p className="ex-subtitle-label">СУБТИТРЫ · RU + UZ</p>
    {sentence ? <div key={sentence.id} className="ex-film-line">
      <p className="ex-film-source" lang="ru">{sentence.text}</p>
      {sentence.translation && <p className="ex-film-translation" lang="uz">{sentence.translation}</p>}
    </div> : <p className="ex-subtitle-gap" aria-label="Пауза в субтитрах">…</p>}
  </section>;
}
