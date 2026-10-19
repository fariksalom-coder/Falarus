import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { activeWord, sentenceAt, type Lesson } from './lesson';

const speeds = [0.5, 0.8, 1, 1.25, 1.5];
const formatTime = (value: number) => {
  const minutes = Math.floor(value / 60);
  const seconds = String(Math.floor(value % 60)).padStart(2, '0');
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
};

export function LessonScreen({ lesson }: { lesson: Lesson }) {
  const video = useRef<HTMLVideoElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const currentIndex = lesson.sentences.findIndex(sentence => time >= sentence.start && time < sentence.end);
  const index = currentIndex >= 0 ? currentIndex : sentenceAt(lesson, time);

  // A film can contain thousands of subtitles. Render the nearby dialogue only.
  const firstVisible = lesson.sentences.length > 100 ? Math.max(0, index - 3) : 0;
  const visibleSentences = lesson.sentences.length > 100 ? lesson.sentences.slice(firstVisible, index + 8) : lesson.sentences;

  // Media time drives the transcript; sentence boundaries never alter playback.
  useEffect(() => {
    if (!playing) return;
    let frame = 0, lastSample = -Infinity;
    const tick = (timestamp: number) => {
      if (video.current && timestamp - lastSample >= 50) { setTime(video.current.currentTime); lastSample = timestamp; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    if (currentIndex < 0) return;
    const container = list.current, row = rows.current[currentIndex];
    if (!container || !row) return;
    const outer = container.getBoundingClientRect(), inner = row.getBoundingClientRect();
    if (lesson.sentences.length > 100 || inner.top < outer.top || inner.bottom > outer.bottom) container.scrollTop += inner.top - outer.top - 8;
  }, [currentIndex, lesson.sentences.length]);

  useEffect(() => { if (video.current) video.current.playbackRate = speed; }, [speed]);
  useEffect(() => {
    const player = video.current;
    return () => { player?.pause(); };
  }, []);

  const play = async () => {
    const player = video.current;
    if (!player || !ready) return;
    if (player.ended) player.currentTime = 0;
    try { await player.play(); setError(''); }
    catch { setError('Нажмите ▶, чтобы продолжить видео.'); }
  };
  const seek = (target: number) => {
    const player = video.current;
    if (!player || !ready) return;
    player.currentTime = Math.max(0, Math.min(target, duration));
    setTime(player.currentTime);
    void play();
  };

  return <main className="ex-app" aria-label={lesson.title}>
    <section className="ex-media" aria-label="Видео урока">
      <a className="ex-back" href="/exercise.html" onClick={() => video.current?.pause()} aria-label="К списку видео"><ArrowLeft size={18}/>Назад</a>
      <video ref={video} src={lesson.video.src} poster={lesson.video.poster} playsInline preload="metadata"
        onLoadedMetadata={() => {
          const player = video.current!;
          setDuration(Number.isFinite(player.duration) ? player.duration : 0);
          player.playbackRate = speed;
          setTime(player.currentTime);
          setReady(true);
          setError('');
        }}
        onTimeUpdate={() => setTime(video.current?.currentTime ?? 0)}
        onSeeking={() => setTime(video.current?.currentTime ?? 0)}
        onSeeked={() => setTime(video.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setTime(video.current?.currentTime ?? 0); }}
        onError={() => { setReady(false); setPlaying(false); setError('Не удалось загрузить видео урока.'); }}
        aria-label={`Видео: ${lesson.title}`}/>
      {!ready && <div className="ex-media-status" role="status">{error || 'Загружаем видео…'}</div>}
    </section>
    <ol className="ex-sentences" ref={list} aria-label="Текст видео" tabIndex={0} translate="no">
      {visibleSentences.map((item, visibleIndex) => {
        const i = firstVisible + visibleIndex;
        const wordIndex = i === currentIndex ? activeWord(item, time) : -1;
        return <li key={item.id} ref={element => { rows.current[i] = element; }} className={`ex-row ${i === currentIndex ? 'current' : ''}`} aria-current={i === currentIndex ? 'true' : undefined}>
          <span className="ex-number">{i + 1}.</span>
          <div className="ex-row-text"><div className="ex-sentence" lang={lesson.language}>
            {item.words.length ? item.words.map((word, j) => <button key={word.id} className={`ex-word ${j === wordIndex ? 'active' : ''}`} aria-current={j === wordIndex ? 'true' : undefined} disabled={!ready} onClick={() => seek(word.start >= 0 ? word.start : item.start)} aria-label={`${word.text} — перейти к слову`}>{word.text}</button>) : item.text}
          </div>{item.translation && <p className="ex-translation" lang="uz">{item.translation}</p>}</div>
        </li>;
      })}
    </ol>
    <section className="ex-player" aria-label="Управление воспроизведением">
      {error && ready && <p className="ex-error" role="alert">{error}</p>}
      <div className="ex-timeline"><span>{formatTime(time)}</span><input type="range" min="0" max={duration || 1} step="0.01" value={Math.min(time, duration || 1)} disabled={!ready} onChange={e => seek(Number(e.target.value))} aria-label="Позиция видео"/><span>{formatTime(duration)}</span></div>
      <div className="ex-controls">
        <button className="ex-icon" onClick={() => seek(0)} disabled={!ready} aria-label="Видео с начала" title="С начала"><RotateCcw size={21}/></button>
        <button className="ex-icon" disabled={!ready || index <= 0} onClick={() => seek(lesson.sentences[index - 1].start)} aria-label="Предыдущее предложение" title="Назад"><SkipBack size={21}/></button>
        <button className="ex-play" onClick={() => playing ? video.current?.pause() : void play()} disabled={!ready} aria-label={playing ? 'Пауза' : 'Воспроизвести'}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button>
        <button className="ex-icon" disabled={!ready || index >= lesson.sentences.length - 1} onClick={() => seek(lesson.sentences[index + 1].start)} aria-label="Следующее предложение" title="Далее"><SkipForward size={21}/></button>
      </div>
      <div className="ex-speeds" aria-label="Скорость речи">{speeds.map(value => <button key={value} onClick={() => setSpeed(value)} aria-label={`Скорость ${value}x`} aria-pressed={speed === value}>{value}x</button>)}</div>
    </section>
  </main>;
}
