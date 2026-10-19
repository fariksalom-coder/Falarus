import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Clapperboard, Film, Play, Search } from 'lucide-react';
import { apiUrl } from '../api';
import type { PublishedVideo } from '../../shared/videoLesson';

function durationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин` : minutes > 0 ? `${minutes} мин` : `${Math.ceil(seconds)} сек`;
}

export function CatalogScreen({ videos }: { videos: PublishedVideo[] }) {
  const [query, setQuery] = useState('');
  const visible = videos.filter(video => video.title.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
  return <main className="ex-catalog">
    <header className="ex-catalog-header">
      <a className="ex-catalog-back" href="/games"><ArrowLeft size={18}/>К играм</a>
      <span className="ex-catalog-brand"><Clapperboard size={20}/>Фильм с субтитрами</span>
    </header>
    <section className="ex-catalog-intro">
      <p className="ex-catalog-eyebrow">СМОТРИ · СЛУШАЙ · ЧИТАЙ</p>
      <h1>Выберите, что посмотреть</h1>
      <p>Видео и фильмы с русскими субтитрами и узбекским переводом.</p>
      <label className="ex-catalog-search"><Search size={20}/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Найти видео или фильм" aria-label="Найти видео или фильм"/></label>
    </section>
    {visible.length > 0 ? <div className="ex-catalog-grid">
      {visible.map(video => <a className="ex-video-card" key={video.id} href={`/exercise.html?lesson=${encodeURIComponent(video.id)}`} aria-label={`Смотреть: ${video.title}`}>
        <div className={`ex-video-cover ${video.kind === 'film' ? 'film' : ''}`}>
          {video.poster ? <img src={apiUrl(video.poster)} alt="" loading="lazy"/> : <span className="ex-video-placeholder">{video.kind === 'film' ? <Film size={56}/> : <Clapperboard size={56}/>}</span>}
          <span className="ex-video-play"><Play size={22} fill="currentColor"/></span>
          <span className="ex-video-duration">{durationLabel(video.duration)}</span>
        </div>
        <div className="ex-video-info">
          <div className="ex-video-meta"><span>{video.kind === 'film' ? 'Фильм' : 'Видео'}</span><span>RU + UZ</span></div>
          <h2>{video.title}</h2>
          <span className="ex-video-watch">Смотреть<ArrowUpRight size={18}/></span>
        </div>
      </a>)}
    </div> : <div className="ex-catalog-empty" role="status"><Film size={38}/><h2>{videos.length ? 'Ничего не найдено' : 'Здесь появятся видео и фильмы'}</h2><p>{videos.length ? 'Попробуйте другое название.' : 'Загляните сюда чуть позже.'}</p></div>}
  </main>;
}
