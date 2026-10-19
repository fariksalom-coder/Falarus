import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { apiUrl } from '../api';
import { CatalogScreen } from './CatalogScreen';
import { LessonScreen } from './LessonScreen';
import { lessonFromDocument, localLessonRepository, type Lesson } from './lesson';
import type { PublishedVideo, VideoLessonDocument, VideoLessonRecord } from '../../shared/videoLesson';
import './exercise.css';

async function json<T>(url: string, headers?: HeadersInit): Promise<T> {
  const response = await fetch(apiUrl(url), { headers, cache: 'no-store' });
  if (!response.ok) throw new Error(response.status === 401 ? 'Войдите в админку для предпросмотра.' : response.status === 404 ? 'Видео не найдено или ещё не опубликовано.' : 'Не удалось загрузить видео. Попробуйте ещё раз.');
  return response.json();
}
function App() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [videos, setVideos] = useState<PublishedVideo[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true, objectUrl = '';
    const load = async () => {
      const params = new URLSearchParams(location.search);
      const draft = params.get('draft'), id = params.get('lesson');
      if (draft) {
        const headers = { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` };
        const record = await json<VideoLessonRecord>(`/api/admin/video-lessons/${encodeURIComponent(draft)}`, headers);
        const response = await fetch(apiUrl(`/api/admin/video-lessons/${encodeURIComponent(draft)}/video`), { headers });
        if (!response.ok) throw new Error('Видео недоступно. Войдите в админку.');
        const blob = await response.blob();
        if (!mounted) return;
        objectUrl = URL.createObjectURL(blob);
        setLesson(lessonFromDocument(record.lesson, objectUrl));
      } else if (id) {
        const document = await json<VideoLessonDocument>(`/api/video-lessons/${encodeURIComponent(id)}`);
        if (mounted) setLesson(lessonFromDocument(document, apiUrl(document.video)));
      } else if (params.get('demo') === '1') {
        const value = await localLessonRepository.getLesson('introduction');
        if (mounted) setLesson(value);
      } else {
        const published = await json<PublishedVideo[]>('/api/video-lessons');
        if (mounted) setVideos(published);
      }
    };
    void load().catch(e => { if (mounted) setError(e.message); });
    return () => { mounted = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, []);
  if (videos) return <CatalogScreen videos={videos}/>;
  if (lesson) return <LessonScreen key={lesson.id} lesson={lesson}/>;
  return <div className="ex-loading" role="status"><div>{error || 'Загружаем видео…'}{error && <><p><button onClick={() => location.reload()}>Попробовать ещё раз</button></p><a href="/exercise.html">К списку видео</a></>}</div></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
