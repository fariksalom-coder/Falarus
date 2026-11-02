import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LessonScreen } from './LessonScreen';
import { lessonFromDocument, localLessonRepository, type Lesson } from './lesson';
import type { VideoLessonDocument, VideoLessonRecord } from '../../shared/videoLesson';
import './exercise.css';
async function json<T>(url:string, headers?:HeadersInit):Promise<T>{const response=await fetch(url,{headers,cache:'no-store'});if(!response.ok)throw new Error(response.status===401?'Войдите в админку для предпросмотра.':'Урок не найден или ещё не опубликован.');return response.json();}
function App() {
  const [lesson,setLesson]=useState<Lesson|null>(null);const [error,setError]=useState('');
  useEffect(()=>{
    let mounted=true;let objectUrl='';
    const load=async()=>{
      const params=new URLSearchParams(location.search);const draft=params.get('draft');let id=params.get('lesson');
      if(draft){
        const headers={Authorization:`Bearer ${localStorage.getItem('adminToken')||''}`};
        const record=await json<VideoLessonRecord>(`/api/admin/video-lessons/${encodeURIComponent(draft)}`,headers);
        const response=await fetch(`/api/admin/video-lessons/${encodeURIComponent(draft)}/video`,{headers});
        if(!response.ok)throw new Error('Видео недоступно. Войдите в админку.');
        const blob=await response.blob();if(!mounted)return;objectUrl=URL.createObjectURL(blob);
        setLesson(lessonFromDocument(record.lesson,objectUrl));return;
      }
      if(!id){try{const published=await json<{id:string}[]>('/api/video-lessons');id=published[0]?.id||null;}catch{/* Standalone local mock preview has no backend. */}}
      const value=id?lessonFromDocument(await json<VideoLessonDocument>(`/api/video-lessons/${encodeURIComponent(id)}`)):await localLessonRepository.getLesson('introduction');
      if(mounted)setLesson(value);
    };
    void load().catch(e=>{if(mounted)setError(e.message);});
    return()=>{mounted=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[]);
  return lesson?<LessonScreen key={lesson.id} lesson={lesson}/>:<div className="ex-loading" role="status"><div>{error||'Загружаем урок…'}{error&&<p><a href="/games">Вернуться к играм</a></p>}</div></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
