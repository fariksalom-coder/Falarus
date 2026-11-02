import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Eye, FileVideo, LoaderCircle, Plus, Save, Sparkles, Trash2, Upload } from 'lucide-react';
import { adminApi, getAdminToken } from '../../lib/adminApi';
import { apiUrl } from '../../api';
import { MAX_VIDEO_BYTES, lessonIssues, running, type VideoLessonRecord, type VideoSentence, type VideoWord } from '../../../shared/videoLesson';
import '../../components/videoLessons/editor.css';
import { uploadLessonVideo } from '../../components/videoLessons/api';
type Row = Omit<VideoLessonRecord, 'lesson'> & { title: string; sentences: number };
const base = '/video-lessons';
const number = (s: string) => s === '' ? null : Number(s);
const phaseNames = { uploaded: 'Видео загружено', recognizing: 'WhisperX: распознавание и timestamps…', translating: 'Переводим на узбекский Latin…', ready: 'Готово к проверке', error: 'Обработка остановлена' };
export default function AdminVideoLessonsPage() {
  const [rows,setRows] = useState<Row[]>([]); const [record,setRecord] = useState<VideoLessonRecord|null>(null);
  const [file,setFile] = useState<File|null>(null); const [url,setUrl] = useState(''); const [duration,setDuration] = useState(0);
  const [uploadProgress,setUploadProgress] = useState<number|null>(null);
  const [busy,setBusy] = useState(false); const [dirty,setDirty] = useState(false); const [error,setError] = useState(''); const [message,setMessage] = useState(''); const [drag,setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null); const video = useRef<HTMLVideoElement>(null); const stopAt = useRef<number|null>(null); const request = useRef(0);
  const processing = !!record && running(record.phase); const disabled = busy || processing;
  const issues = record ? lessonIssues(record.lesson,record.duration) : [];
  const refreshList = () => adminApi<Row[]>(base).then(setRows);
  useEffect(() => { void refreshList().catch(e=>setError(e.message)); }, []);
  useEffect(() => () => { if(url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => { const warn=(event:BeforeUnloadEvent)=>{if(dirty||busy){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn); }, [dirty,busy]);
  useEffect(() => {
    if (!record || !running(record.phase)) return;
    let disposed=false;
    const timer=setInterval(()=>{ void adminApi<VideoLessonRecord>(`${base}/${record.id}`).then(next=>{if(!disposed){setRecord(next);if(!running(next.phase))void refreshList().catch(()=>{});}}).catch(e=>{if(!disposed)setError(e.message);}); },2000);
    return()=>{disposed=true;clearInterval(timer);};
  }, [record?.id, record?.phase]);
  const execute = async (action:()=>Promise<void>) => {setBusy(true);setError('');setMessage('');try{await action();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const choose = (selected?:File) => {
    if(!selected || disabled)return;
    if(dirty&&!window.confirm('Есть несохранённые изменения. Открыть другое видео?'))return;
    if(selected.size>MAX_VIDEO_BYTES){setError('Максимальный размер — 100 МБ.');return;}
    request.current++;setFile(selected);setRecord(null);setDirty(false);setDuration(0);setUrl(URL.createObjectURL(selected));setError('');setMessage('');
  };
  const open = async (id:string) => {
    if(dirty&&!window.confirm('Есть несохранённые изменения. Открыть другой урок?'))return;
    const seq=++request.current;
    await execute(async()=>{
      const result=await adminApi<VideoLessonRecord>(`${base}/${id}`);
      const media=await fetch(apiUrl(`/api/admin${base}/${id}/video`),{headers:{Authorization:`Bearer ${getAdminToken()}`}});
      if(!media.ok)throw new Error('Не удалось загрузить видео.');const blob=await media.blob();if(seq!==request.current)return;
      setRecord(result);setFile(null);setUrl(URL.createObjectURL(blob));setDuration(result.duration);setDirty(false);
    });
  };
  const uploadFile = () => execute(async()=>{if(!file)return;setUploadProgress(0);let saved:VideoLessonRecord;try{saved=await uploadLessonVideo(file,setUploadProgress);}finally{setUploadProgress(null);}setRecord(saved);setDirty(false);setMessage('Видео загружено. Теперь можно распознать речь.');await refreshList();});
  const save = async (force=false) => {
    if(!record)throw new Error('Сначала загрузите видео.');
    if(!dirty&&!force)return record;
    const next=await adminApi<VideoLessonRecord>(`${base}/${record.id}`,{method:'PUT',body:JSON.stringify({revision:record.revision,lesson:record.lesson})});setRecord(next);setDirty(false);await refreshList();return next;
  };
  const process = (kind:'recognize'|'align'|'translate') => execute(async()=>{
    if(!record)return;
    if(record.lesson.sentences.length&&kind!=='translate'&&!window.confirm('Текст и временные метки будут обновлены, перевод будет создан заново. Продолжить?'))return;
    const saved=await save();setRecord(await adminApi<VideoLessonRecord>(`${base}/${saved.id}/process`,{method:'POST',body:JSON.stringify({revision:saved.revision,kind})}));
  });
  const edit = (fn:(copy:VideoLessonRecord)=>void) => {setRecord(old=>{if(!old)return old;const copy=structuredClone(old);fn(copy);return copy;});setDirty(true);setMessage('');};
  const sentence = (i:number,fn:(s:VideoSentence)=>void) => edit(r=>fn(r.lesson.sentences[i]));
  const word = (i:number,j:number,key:keyof VideoWord,value:string|number|null) => sentence(i,s=>{s.words[j]={...s.words[j],[key]:value};});
  const syncWords = (i:number) => sentence(i,s=>{s.words=s.text.trim().split(/\s+/).filter(Boolean).map((text,j)=>s.words[j]?.text===text?s.words[j]:{text,start:null,end:null});});
  const move = (i:number,j:number,delta:number) => sentence(i,s=>{const target=j+delta;if(target<0||target>=s.words.length)return;[s.words[j],s.words[target]]=[s.words[target],s.words[j]];s.text=s.words.map(w=>w.text).join(' ');});
  const preview = () => {
    const popup=window.open('about:blank','_blank');
    void execute(async()=>{try{const saved=await save();if(!popup)throw new Error('Разрешите открытие новой вкладки для предпросмотра.');popup.opener=null;popup.location.href=`/exercise.html?draft=${saved.id}`;}catch(e){popup?.close();throw e;}});
  };
  const publish = () => execute(async()=>{const saved=await save();const published=await adminApi<VideoLessonRecord>(`${base}/${saved.id}/publish`,{method:'POST',body:JSON.stringify({revision:saved.revision})});setRecord(published);setMessage('Урок опубликован. Теперь он доступен в «Живой речи».');await refreshList();});
  const download = () => execute(async()=>{const saved=await save();const blob=URL.createObjectURL(new Blob([JSON.stringify(saved.lesson,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=blob;a.download=`${saved.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(blob),1000);});
  const listen = async (s:VideoSentence) => {if(!video.current||s.start===null||s.end===null)return;stopAt.current=s.end;video.current.currentTime=s.start;try{await video.current.play();}catch{setError('Не удалось воспроизвести видео.');}};
  return <div className="vl-editor">
    <header className="vl-heading"><div><span>FALARUS · СТУДИЯ УРОКОВ</span><h1>Создание нового урока</h1><p>Из живой речи — в упражнение с подсветкой каждого слова.</p></div><a href="/exercise.html" target="_blank" rel="noreferrer">Открыть «Живую речь» ↗</a></header>
    <div className="vl-toolbar"><label>Мои уроки<select value={record?.id||''} disabled={disabled} onChange={e=>{if(e.target.value)void open(e.target.value);}}><option value="">Выберите сохранённый урок</option>{rows.map(row=><option key={row.id} value={row.id}>{row.title} · {row.status==='published'?'Опубликован':'Черновик'}</option>)}</select></label><button onClick={()=>input.current?.click()} disabled={disabled}><Plus size={17}/>Новое видео</button></div>
    {error&&<div className="vl-alert error" role="alert">{error}</div>}{message&&<div className="vl-alert" role="status">{message}</div>}
    <div className="vl-layout"><aside className="vl-source">
      <div className={`vl-drop ${drag?'drag':''}`} onDragOver={e=>{e.preventDefault();if(!disabled)setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(e.dataTransfer.files[0]);}}>
        <FileVideo size={34}/><strong>{file?.name||record?.filename||'Перетащите видео сюда'}</strong><p>{file||record?`${((file?.size||record?.bytes||0)/1024/1024).toFixed(1)} МБ · ${duration.toFixed(1)} сек`:'MP4, WebM, MOV · до 100 МБ · до 30 минут'}</p><button onClick={()=>input.current?.click()} disabled={disabled}>Выбрать файл</button>
      </div>
      <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/>
      {url&&<video ref={video} src={url} controls playsInline preload="metadata" onLoadedMetadata={()=>setDuration(video.current?.duration||0)} onTimeUpdate={()=>{if(stopAt.current!==null&&video.current&&video.current.currentTime>=stopAt.current){video.current.pause();stopAt.current=null;}}}/>}
      <div className="vl-actions"><button className="primary" disabled={!file||!!record||disabled} onClick={()=>void uploadFile()}><Upload size={17}/>{uploadProgress===null?'Загрузить':`Загрузка ${uploadProgress}%`}</button><button disabled={!record||disabled||record.status==='published'} onClick={()=>void process('recognize')}><Sparkles size={17}/>Распознать речь</button></div>
      {record&&<div className="vl-status" role="status">{processing&&<LoaderCircle className="vl-spin" size={18}/>}<strong>{phaseNames[record.phase]}</strong>{processing&&record.progress&&<div className="vl-job-progress"><span>{record.progress.stage} · {record.progress.percent}%</span><progress max={100} value={record.progress.percent}/></div>}<span>{record.status==='published'?'Опубликован':'Черновик'}{record.processingSeconds?` · ${record.processingSeconds} сек обработки`:''}</span></div>}
      {record?.error&&<div className="vl-alert error" role="alert">{record.error}<p>Распознанный текст сохранён. Можно исправить его вручную или повторить нужный шаг.</p></div>}
      <p className="vl-note">WhisperX работает на сервере. Перевод создаётся автоматически на узбекском Latin. Перед публикацией проверьте текст и синхронизацию.</p>
    </aside><section className="vl-content">
      {!record?<div className="vl-empty"><Sparkles size={32}/><h2>Начните с видео</h2><p>Загрузите запись, затем нажмите «Распознать речь». Здесь появятся предложения, перевод и временные метки.</p></div>:<>
        <label className="vl-title">Название урока<input value={record.lesson.title} maxLength={180} disabled={disabled} onChange={e=>edit(r=>{r.lesson.title=e.target.value;})}/></label>
        <div className="vl-savebar"><button disabled={disabled} onClick={()=>void execute(async()=>{await save(true);setMessage('Черновик сохранён.');})}><Save size={17}/>Сохранить урок{dirty?' *':''}</button><button disabled={disabled||!!issues.length} onClick={preview}><Eye size={17}/>Предпросмотр урока</button><button disabled={disabled} onClick={()=>void download()} aria-label="Скачать lesson JSON"><Download size={18}/>JSON</button><button className="primary" disabled={disabled||!!issues.length} onClick={()=>void publish()}>Опубликовать</button></div>
        {record.lesson.sentences.length>0&&<div className="vl-actions"><button disabled={disabled||record.status==='published'} onClick={()=>void process('align')}>Перепривязать исправленный текст</button><button disabled={disabled||record.status==='published'} onClick={()=>void process('translate')}>Перевести заново на узбекский</button></div>}
        {record.lesson.sentences.map((s,i)=><article className="vl-sentence" key={i}><header><h2>Предложение {i+1}</h2><button disabled={s.start===null||s.end===null} onClick={()=>void listen(s)}>▶ Прослушать</button></header><div className="vl-languages"><label>Русский<textarea value={s.text} disabled={disabled} maxLength={5000} onChange={e=>sentence(i,v=>{v.text=e.target.value;})}/></label><label>O‘zbekcha · Latin<textarea value={s.translation} disabled={disabled} maxLength={5000} onChange={e=>sentence(i,v=>{v.translation=e.target.value;})}/></label></div>
          <div className="vl-bounds"><label>Начало предложения<input type="number" min="0" step="0.01" value={s.start??''} disabled={disabled} onChange={e=>sentence(i,v=>{v.start=number(e.target.value);})}/></label><label>Конец<input type="number" min="0" step="0.01" value={s.end??''} disabled={disabled} onChange={e=>sentence(i,v=>{v.end=number(e.target.value);})}/></label><button disabled={disabled} onClick={()=>syncWords(i)}>Обновить слова из текста</button></div>
          <div className="vl-word-scroll"><table><thead><tr><th>Слово</th><th>Start, сек</th><th>End, сек</th><th>Порядок</th></tr></thead><tbody>{s.words.map((w,j)=><tr key={j}><td><input aria-label={`Предложение ${i+1}, слово ${j+1}`} value={w.text} maxLength={250} disabled={disabled} onChange={e=>{word(i,j,'text',e.target.value);sentence(i,v=>{v.text=v.words.map(x=>x.text).join(' ');});}}/></td><td><input aria-label={`Начало слова ${j+1}`} type="number" min="0" step="0.01" value={w.start??''} disabled={disabled} onChange={e=>word(i,j,'start',number(e.target.value))}/></td><td><input aria-label={`Конец слова ${j+1}`} type="number" min="0" step="0.01" value={w.end??''} disabled={disabled} onChange={e=>word(i,j,'end',number(e.target.value))}/></td><td><div className="vl-word-buttons"><button aria-label="Переместить слово вверх" disabled={disabled||j===0} onClick={()=>move(i,j,-1)}><ArrowUp size={15}/></button><button aria-label="Переместить слово вниз" disabled={disabled||j===s.words.length-1} onClick={()=>move(i,j,1)}><ArrowDown size={15}/></button><button aria-label="Удалить слово" disabled={disabled} onClick={()=>sentence(i,v=>{v.words.splice(j,1);v.text=v.words.map(x=>x.text).join(' ');})}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>
          <div className="vl-actions"><button disabled={disabled} onClick={()=>sentence(i,v=>{v.words.push({text:'',start:null,end:null});})}><Plus size={15}/>Добавить слово</button><button disabled={disabled} onClick={()=>edit(r=>{r.lesson.sentences.splice(i,1);})}>Удалить предложение</button></div>
        </article>)}
        <button disabled={disabled} onClick={()=>edit(r=>{r.lesson.sentences.push({text:'',translation:'',start:null,end:null,words:[]});})}><Plus size={16}/>Добавить предложение</button>
        {!!issues.length&&<details className="vl-issues"><summary>Перед публикацией исправьте: {issues.length}</summary><ul>{issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></details>}

        {record.status==='published'&&<p className="vl-note">Ссылка: <a href={`/exercise.html?lesson=${record.id}`} target="_blank" rel="noreferrer">Открыть опубликованный урок ↗</a>. Сохранение изменений вернёт урок в черновик до повторной публикации.</p>}
      </>}
    </section></div>
  </div>;
}
