import {useEffect,useRef,useState} from 'react';
import {useNavigate,useParams,useSearchParams,Link} from 'react-router-dom';
import {ArrowLeft,Headphones,Play,Pause,Volume2,VolumeX,Check,RotateCcw} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {dictationApi} from '../api/dictation';
import {apiUrl} from '../api';
import type {DictationTopic,DictationRound,DictationFeedback} from '../../shared/dictation';
import {playCorrectSound,prepareFeedbackSound} from '../utils/sound';
import GameBackground from '../components/dictation/GameBackground';
import '../components/dictation/dictation.css';
export default function DictationPage(){const {topicId}=useParams();return topicId?<DictationGame key={topicId} topicId={topicId}/>:<DictationTopics/>;}
function DictationTopics(){
 const {token}=useAuth();const navigate=useNavigate();const [topics,setTopics]=useState<DictationTopic[]>([]),[error,setError]=useState(''),[count,setCount]=useState(10),[loaded,setLoaded]=useState(false);
 useEffect(()=>{if(token)void dictationApi<DictationTopic[]>(token,'/topics').then(setTopics).catch(e=>setError(e.message)).finally(()=>setLoaded(true));},[token]);
 return <main className="dt-page"><Link className="dt-back" to="/games"><ArrowLeft size={18}/>Игры</Link><header className="dt-heading"><span className="dt-kicker">TINGLANG · YOZING · O‘RGANING</span><h1>Диктант <Headphones/></h1><p>Слушайте русскую речь и записывайте услышанное.</p></header><div className="dt-topic-options"><h2>Выберите тему</h2><label>Заданий <select value={count} onChange={e=>setCount(Number(e.target.value))}>{[10,20,50].map(n=><option key={n}>{n}</option>)}</select></label></div>{error&&<p className="dt-error" role="alert">{error}</p>}{!loaded&&!error&&<p role="status">Загружаем темы…</p>}<div className="dt-topics">{topics.map(t=>{const percent=t.total_items?Math.round(t.completed_items/t.total_items*100):0;return <button key={t.id} className="dt-topic" disabled={!t.total_items} onClick={()=>navigate(`/games/dictation/${t.id}?count=${count}&run=${crypto.randomUUID()}`)}><span className="dt-topic-icon">{t.icon}</span><strong>{t.title_ru}</strong><span lang="uz">{t.title_uz}</span><p>{t.description_ru}</p><div className="dt-topic-progress"><span>{t.completed_items} / {t.total_items}</span><span>{percent}%</span></div><progress max={100} value={percent}/>{!t.total_items&&<small>Аудио готовится</small>}</button>;})}</div></main>;
}
function DictationGame({topicId}:{topicId:string}){
 const {token,user}=useAuth();const navigate=useNavigate();const [params]=useSearchParams();
 const count=[10,20,50].includes(Number(params.get('count')))?Number(params.get('count')):10;
 const run=params.get('run')||'default',review=params.get('review')==='1';
 const [round,setRound]=useState<DictationRound|null>(null),[topic,setTopic]=useState<DictationTopic|null>(null),[answer,setAnswer]=useState(''),[feedback,setFeedback]=useState<DictationFeedback|null>(null),[nextRound,setNextRound]=useState<DictationRound|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[audioError,setAudioError]=useState(''),[volume,setVolume]=useState(.85),[muted,setMuted]=useState(false),[audioPlaying,setAudioPlaying]=useState(false),[audioStarted,setAudioStarted]=useState(false),[audioEnded,setAudioEnded]=useState(false),[audioLoading,setAudioLoading]=useState(false);
 const audio=useRef<HTMLAudioElement>(null),input=useRef<HTMLInputElement>(null);const loading=useRef<{key:string;promise:Promise<DictationRound>}|null>(null);
 const audioSettings=useRef({muted,volume});audioSettings.current={muted,volume};
 const storageKey=`dictation:${user?.id}:${topicId}:${run}`;
 useEffect(()=>{
  if(!token)return;let alive=true;setError('');setRound(null);setFeedback(null);setNextRound(null);setAnswer('');
  const key=token+storageKey;
  if(loading.current?.key!==key){const saved=sessionStorage.getItem(storageKey);const promise=saved?dictationApi<DictationRound>(token,`/sessions/${saved}`):dictationApi<DictationRound>(token,'/sessions',{topic_id:topicId,count,review,request_id:crypto.randomUUID()});loading.current={key,promise};}
  loading.current.promise.then(r=>{sessionStorage.setItem(storageKey,r.id);if(alive)setRound(r);}).catch(e=>{if(alive)setError(e.message);});
  void dictationApi<DictationTopic[]>(token,'/topics').then(ts=>{if(alive)setTopic(ts.find(t=>t.id===topicId)||null);}).catch(()=>{});
  return()=>{alive=false;};
 },[token,storageKey,count,review,topicId]);
 useEffect(()=>{if(audio.current){audio.current.volume=volume;audio.current.muted=muted;}},[volume,muted,round?.question?.id,feedback]);
 useEffect(()=>{setAudioError('');setAudioPlaying(false);setAudioStarted(false);setAudioEnded(false);setAudioLoading(false);if(round&&!round.finished&&!feedback)input.current?.focus({preventScroll:true});},[round?.position,round?.id]);
 // Reuse the same media element, preserving playback permission between questions.
 useEffect(()=>{
  const player=audio.current;if(!player||!round?.question||round.finished)return;
  let active=true;
  if(!document.hidden){
   setAudioLoading(true);
   void player.play().catch(()=>{if(active){setAudioLoading(false);setAudioPlaying(false);setAudioError('Нажмите ▶, чтобы включить аудио. Дальше задания будут звучать автоматически.');}});
  }
  return()=>{active=false;player.pause();};
 },[round?.id,round?.position,round?.question?.id]);
 const advance=()=>{if(!nextRound)return;audio.current?.pause();setRound(nextRound);setNextRound(null);setFeedback(null);setAnswer('');};
 useEffect(()=>{if(feedback?.is_correct&&nextRound){const timer=setTimeout(()=>{setRound(nextRound);setNextRound(null);setFeedback(null);setAnswer('');},nextRound.combo>0&&nextRound.combo%5===0?2400:1700);return()=>clearTimeout(timer);}},[feedback,nextRound]);
 useEffect(()=>()=>{audio.current?.pause();},[]);
 const play=async(restart=false)=>{
  const player=audio.current;if(!player)return;
  input.current?.focus({preventScroll:true});
  if(!restart&&!player.paused){player.pause();return;}
  if(restart||player.ended)player.currentTime=0;
  setAudioLoading(true);setAudioError('');
  try{await player.play();}catch{setAudioLoading(false);setAudioPlaying(false);setAudioError('Не удалось воспроизвести. Нажмите ещё раз.');}
 };
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!round||!token||busy||feedback||!answer.trim())return;setBusy(true);setError('');if(!muted&&volume>0)prepareFeedbackSound();audio.current?.pause();try{const result=await dictationApi<{feedback:DictationFeedback;round:DictationRound}>(token,`/sessions/${round.id}/answer`,{position:round.position,answer});setFeedback(result.feedback);setNextRound(result.round);if(result.feedback.is_correct&&!audioSettings.current.muted&&audioSettings.current.volume>0)playCorrectSound(audioSettings.current.volume);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const again=(errors=false)=>navigate(`/games/dictation/${topicId}?count=${count}&review=${errors?1:0}&run=${crypto.randomUUID()}`);
 const shown=nextRound||round;
 if(!round)return <main className="dt-page"><Link to="/games/dictation" className="dt-back"><ArrowLeft/>К темам</Link><p role={error?'alert':'status'}>{error||'Готовим задания…'}</p></main>;
 if(round.finished){const accuracy=round.position?Math.round(round.correct/round.position*100):0;return <main className="dt-page dt-result"><span className="dt-result-icon">🏆</span><h1>Игра завершена!</h1><p>{topic?.title_ru}</p><div className="dt-results">{[['Заданий',round.position],['Правильно',round.correct],['Ошибок',round.wrong],['Точность',accuracy+'%'],['Лучший Combo','×'+round.best_combo],['Очки',round.score]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{round.mistakes.length>0&&<><p>Стоит повторить: {round.mistakes.join(' · ')}</p><button className="ui-button ui-button--primary" onClick={()=>again(true)}><RotateCcw size={18}/>Повторить ошибки</button></>}<button className="ui-button ui-button--secondary" onClick={()=>again()}>Играть ещё</button><Link className="dt-back" to="/games/dictation">Вернуться к темам</Link></main>;}
 return <main className="dt-page dt-game"><header className="dt-game-header"><Link to="/games/dictation" aria-label="Вернуться к темам"><ArrowLeft/></Link><div><h1>{topic?.title_ru||'Диктант'}</h1><span>{round.position+1} / {round.total}</span></div><span className="dt-lives" aria-label={`Жизней: ${shown?.lives}`}>{[0,1,2].map(i=><span key={i} className={i<(shown?.lives||0)?'':'lost'}>♥</span>)}</span></header><progress className="dt-round-progress" max={round.total} value={round.position}/><div className="dt-score"><span>🔥 Combo ×{shown?.combo}</span><strong>{shown?.score} очков</strong></div><div className="dt-task-notice" key={`${round.id}:${round.position}`} role="status"><strong>{round.position===0?'Задание':'Новое задание'} {round.position+1}</strong><span>{round.question?.type==='word'?'Послушайте и напишите слово':'Послушайте и напишите предложение'}</span></div><div className="dt-audio-stage"><GameBackground background_id={topic?.background_id}/><button className={`dt-play ${audioPlaying?'playing':''}`} onClick={()=>void play()} aria-label={audioPlaying?'Пауза':audioEnded?'Послушать снова':audioStarted?'Продолжить':'Послушать задание'}>{audioPlaying?<Pause size={30} fill="currentColor"/>:<Play size={30} fill="currentColor"/>}</button><span className="dt-play-status" role="status">{audioLoading?'Загружаем аудио…':audioPlaying?'Слушайте…':audioEnded?'Прослушано · ▶ ещё раз':audioStarted?'Пауза · ▶ продолжить':'Нажмите ▶, чтобы послушать'}</span></div><div className="dt-volume"><button aria-label={muted?'Включить звук':'Выключить звук'} onClick={()=>setMuted(!muted)}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button><input aria-label="Громкость" type="range" min={0} max={1} step={.05} value={volume} onChange={e=>{setVolume(Number(e.target.value));setMuted(false);}}/><span>{round.question?.type==='word'?'Одно слово':'Короткое предложение'}</span></div><audio ref={audio} src={apiUrl(feedback?.audio_url||round.question?.audio_url||'')} preload="auto" onPlay={()=>{setAudioPlaying(true);setAudioStarted(true);setAudioEnded(false);}} onPlaying={()=>setAudioLoading(false)} onWaiting={()=>setAudioLoading(true)} onPause={()=>{setAudioPlaying(false);setAudioLoading(false);}} onEnded={()=>{setAudioEnded(true);setAudioPlaying(false);setAudioLoading(false);}} onError={()=>{setAudioLoading(false);setAudioPlaying(false);setAudioError('Аудио недоступно. Попробуйте прослушать ещё раз.');}}/>{audioError&&<p className="dt-error" role="alert">{audioError}</p>}<form onSubmit={submit}><label className="dt-answer-label" htmlFor="dictation-answer">Напишите, что услышали</label><input ref={input} id="dictation-answer" className="dt-answer" lang="ru" value={answer} onChange={e=>setAnswer(e.target.value)} onFocus={e=>e.currentTarget.scrollIntoView({block:'nearest',behavior:'smooth'})} autoFocus autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" maxLength={300} disabled={busy||!!feedback} placeholder="Ваш ответ…"/>{!feedback&&<button className="ui-button ui-button--primary dt-check" disabled={busy||!answer.trim()} type="submit">{busy?'Проверяем…':'Проверить'}<Check size={19}/></button>}</form>{error&&<p className="dt-error" role="alert">{error}</p>}{feedback&&<section className={`dt-feedback ${feedback.is_correct?'correct':'wrong'}`} role="status"><strong>{feedback.is_correct?'✓ Правильно!':'Пока не совпало'}</strong>{feedback.is_correct?<><p>{nextRound&&nextRound.combo>0&&nextRound.combo%5===0?`${nextRound.combo} правильных ответов подряд! Отличная внимательность — так держать!`:'Вы верно записали услышанное.'}</p><span>+{feedback.points} очков · {nextRound?.finished?'Показываем результат…':'Переходим к новому заданию…'}</span></>:<><p>Послушайте ещё раз и сравните написание.</p><p>Правильный ответ: <b>{feedback.correct_answer}</b></p><p lang="uz">{feedback.translation_uz}</p><button className="ui-button ui-button--secondary" onClick={()=>void play(true)}><Volume2 size={18}/>Послушать ещё раз</button><button className="ui-button ui-button--primary" onClick={advance}>{nextRound?.finished?'Результат':'Дальше'}</button></>}</section>}</main>;
}
