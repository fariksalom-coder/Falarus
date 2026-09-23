import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, Repeat2, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { activeWord, sentenceAt, sentenceEnd, type Lesson } from './lesson';
const stages = [
  { uz: 'Tinglang', ru: 'Слушай', cue: 'listen' },
  { uz: 'Takrorlang', ru: 'Повторяй', cue: 'repeat' },
  { uz: 'Gapiring', ru: 'Говори', cue: 'speak' },
];
const leadIn = (at: number) => Math.max(0, at - 1.5);
const speeds = [0.5, 0.8, 1, 1.25, 1.5];
const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
export function LessonScreen({ lesson }: { lesson: Lesson }) {
  const video = useRef<HTMLVideoElement>(null);
  const cue = useRef<HTMLAudioElement>(null);
  const cueVersion = useRef(0);
  const announced = useRef(false);
  const taughtStages = useRef(new Set<number>());
  const boundaryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [announcing, setAnnouncing] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [cycle, setCycle] = useState({ index: 0, pass: 0, complete: false });
  const cursor = useRef(cycle);
  const repeatLesson = useRef(loop);
  repeatLesson.current = loop;
  const index = cycle.index;
  const updateCycle = (next: typeof cycle) => { cursor.current = next; setCycle(next); };
  const begin = (i: number, pass = 0, target = lesson.sentences[i].start) => {
    const player = video.current;
    if (!player) return;
    stop();
    announced.current = false;
    updateCycle({ index: i, pass, complete: false });
    player.muted = pass === 2;
    player.currentTime = leadIn(target);
    setTime(player.currentTime);
    reveal(i);
  };
  const advance = () => {
    const current = cursor.current;
    if (current.complete) return;
    if (current.pass < 2) begin(current.index, current.pass + 1);
    else if (current.index + 1 < lesson.sentences.length) begin(current.index + 1);
    else if (repeatLesson.current) begin(0);
    else { updateCycle({ ...current, complete: true }); video.current?.pause(); return; }
    void play();
  };
  const sample = () => {
    const player = video.current;
    if (!player) return;
    setTime(player.currentTime);
    if (!player.paused && !player.seeking && player.currentTime >= sentenceEnd(lesson, cursor.current.index)) advance();
  };
  const stop = () => {
    clearTimeout(boundaryTimer.current);
    cueVersion.current++;
    if (cue.current) { cue.current.pause(); cue.current.onended = null; cue.current.onerror = null; }
    setAnnouncing(false);
    video.current?.pause();
  };
  // A deadline complements animation frames (which may be throttled) and never adds lead-in to the end.
  const armBoundary = () => {
    clearTimeout(boundaryTimer.current);
    const player = video.current;
    if (!player || player.paused || player.seeking) return;
    const remaining = sentenceEnd(lesson, cursor.current.index) - player.currentTime;
    if (remaining <= 0) { advance(); return; }
    boundaryTimer.current = setTimeout(() => {
      if (player.paused || player.seeking) return;
      if (player.currentTime >= sentenceEnd(lesson, cursor.current.index) - .01) {
        player.pause();
        advance();
      } else armBoundary(); // Buffering: wait for media time, not wall time.
    }, Math.max(1, remaining / player.playbackRate * 1000));
  };
  useEffect(() => {
    const player = video.current, prompt = cue.current;
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      cueVersion.current++;
      clearTimeout(boundaryTimer.current);
      prompt?.pause(); player?.pause();
    };
  }, []);
  const reveal = (i: number) => {
    const container = list.current, row = rows.current[i];
    if (!container || !row) return;
    const outer = container.getBoundingClientRect(), inner = row.getBoundingClientRect();
    if (inner.top < outer.top || inner.bottom > outer.bottom) container.scrollTop += inner.top - outer.top - 8;
  };
  useEffect(() => { reveal(index); }, [index]);
  useEffect(() => { if (video.current) video.current.playbackRate = speed; }, [speed]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => { sample(); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  const select = (i: number, target = lesson.sentences[i].start) => {
    if (!ready) return;
    begin(i, 0, target);
    void play();
  };
  const playVideo = async (version: number) => {
    if (version !== cueVersion.current || !video.current) return;
    setAnnouncing(false);
    try { await video.current.play(); setError(''); }
    catch { if (version === cueVersion.current) setError('Нажмите ▶, чтобы продолжить видео.'); }
  };
  const play = async () => {
    if (!video.current || !ready) return;
    if (cursor.current.complete) begin(cursor.current.index);
    if (announced.current || cursor.current.index !== 0 || taughtStages.current.has(cursor.current.pass)) { await playVideo(cueVersion.current); return; }
    const prompt = cue.current;
    if (!prompt) return;
    video.current.pause();
    const version = ++cueVersion.current;
    setAnnouncing(true);
    prompt.src = `/exercise/cues/${stages[cursor.current.pass].cue}.mp3`;
    prompt.currentTime = 0;
    const finish = () => {
      if (version !== cueVersion.current) return;
      prompt.onended = null; prompt.onerror = null;
      announced.current = true;
      taughtStages.current.add(cursor.current.pass);
      void playVideo(version);
    };
    prompt.onended = finish;
    prompt.onerror = () => {
      if (version !== cueVersion.current) return;
      setAnnouncing(false);
      announced.current = true;
      setError('Команда показана на экране. Нажмите ▶, чтобы продолжить.');
    };
    try { await prompt.play(); }
    catch { if (version === cueVersion.current) prompt.onerror?.(new Event('error')); }
  };
  const running = playing || announcing;
  return <main className="ex-app" aria-label={lesson.title}>
    <section className="ex-media" aria-label="Видео урока">
      <a className="ex-back" href="/games" onClick={stop} aria-label="Назад к играм"><ArrowLeft size={18}/>Назад</a>
      <video ref={video} src={lesson.video.src} poster={lesson.video.poster} playsInline preload="metadata" muted={cycle.pass === 2}
        onLoadedMetadata={() => { const player = video.current!; setDuration(Number.isFinite(player.duration) ? player.duration : 0); player.playbackRate = speed; setReady(true); setError(''); begin(0); }}
        onTimeUpdate={() => { sample(); armBoundary(); }} onPlaying={armBoundary} onSeeked={armBoundary} onRateChange={armBoundary} onSeeking={() => setTime(video.current?.currentTime || 0)}
        onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); clearTimeout(boundaryTimer.current); }} onEnded={() => { setPlaying(false); if (video.current?.ended && video.current.currentTime >= sentenceEnd(lesson, cursor.current.index)) advance(); }}
        onError={() => { setReady(false); setPlaying(false); setError('Не удалось загрузить видео урока.'); }}
        aria-label={`Видео: ${lesson.title}`}/>
      <audio ref={cue} preload="auto" src="/exercise/cues/listen.mp3"/>
      <div className={`ex-stage ${announcing ? 'announcing' : ''}`} data-pass={cycle.pass} role="status" aria-live="polite">
        <span className="ex-stage-count">{cycle.pass + 1}/3</span><strong lang="uz">{stages[cycle.pass].uz}</strong><span>{stages[cycle.pass].ru}</span>
      </div>
      {!ready && <div className="ex-media-status" role="status">{error || 'Загружаем видео…'}</div>}
    </section>
    <ol className="ex-sentences" ref={list} aria-label="Предложения урока" tabIndex={0}>
      {lesson.sentences.map((item, i) => {
        const wordIndex = i === index ? activeWord(item, time) : -1;
        return <li key={item.id} ref={element => { rows.current[i] = element; }} className={`ex-row ${i === index ? 'current' : ''}`} aria-current={i === index ? 'true' : undefined}>
          <span className="ex-number">{i + 1}.</span>
          <div className="ex-row-text"><div className="ex-sentence" lang={lesson.language}>
            {item.words.map((word, j) => <button key={word.id} className={`ex-word ${j === wordIndex ? 'active' : ''}`} aria-current={j === wordIndex ? 'true' : undefined} disabled={!ready} onClick={() => select(i, word.start)} aria-label={`${word.text} — перейти к слову`}>{word.text}</button>)}
          </div>{item.translation && <p className="ex-translation" lang="uz">{item.translation}</p>}</div>
        </li>;
      })}
    </ol>
    <section className="ex-player" aria-label="Управление воспроизведением">
      {error && ready && <p className="ex-error" role="alert">{error}</p>}
      <div className="ex-timeline"><span>{formatTime(time)}</span><input type="range" min="0" max={duration || 1} step="0.01" value={Math.min(time, duration || 1)} disabled={!ready} onChange={e => { const at = Number(e.target.value); const i = sentenceAt(lesson, at); select(i, Math.max(lesson.sentences[i].start, Math.min(at, lesson.sentences[i].end - .01))); }} aria-label="Позиция видео"/><span>{formatTime(duration)}</span></div>
      <div className="ex-controls">
        <button className="ex-icon" onClick={() => select(index)} disabled={!ready} aria-label="Повторить предложение" title="Повторить"><RotateCcw size={21}/></button>
        <button className="ex-icon" disabled={!ready || index === 0} onClick={() => select(index - 1)} aria-label="Предыдущее предложение" title="Назад"><SkipBack size={21}/></button>
        <button className="ex-play" onClick={() => running ? stop() : void play()} disabled={!ready} aria-label={running ? 'Пауза' : 'Воспроизвести'}><>{running ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</></button>
        <button className="ex-icon" disabled={!ready || index === lesson.sentences.length - 1} onClick={() => select(index + 1)} aria-label="Следующее предложение" title="Далее"><SkipForward size={21}/></button>
        <button className="ex-icon" onClick={() => setLoop(!loop)} aria-label="Повторять видео" title="Повторять видео" aria-pressed={loop}><Repeat2 size={21}/></button>
      </div>
      <div className="ex-speeds" aria-label="Скорость речи">{speeds.map(value => <button key={value} onClick={() => setSpeed(value)} aria-label={`Скорость ${value}x`} aria-pressed={speed === value}>{value}x</button>)}</div>
    </section>
  </main>;
}
