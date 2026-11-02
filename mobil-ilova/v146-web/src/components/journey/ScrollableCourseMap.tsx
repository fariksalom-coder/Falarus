import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ArrowDown, BookOpen, Check, ChevronRight, Flame, Lock, Mic, Play, Settings, Sun, X } from 'lucide-react';
import { useMapDrag } from './useMapDrag';
import type { QuestSlot } from '../../utils/kunlikBloklar';
import '../../styles/scrollable-course-map.css';
const stages = [{title:'Asoslar',start:1,end:30},{title:'Kundalik so‘zlashuv',start:31,end:60},{title:'Grammatikani mustahkamlash',start:61,end:90},{title:'Amaliy nutq',start:91,end:120},{title:'Test va yozma javob',start:121,end:150},{title:'Imtihonga tayyorgarlik',start:151,end:182}];
const labels = ['Grammatika','Lug‘at','O‘qish','Gapirish','Savol-javob'];
const descriptions = ['Asosiy tushunchalar','Yangi so‘zlar','Matnlar bilan ishlash','Amaliy mashqlar','O‘z bilimingizni tekshiring'];
const positions = [[35,29.5],[50,32],[63,36],[75,40],[86,44.5],[88,49.5],[80,55],[79,62],[78,69],[70,81]];
type Props={allowFuture?:boolean;currentDay:number;selectedDay:number|null;slots:QuestSlot[];isDone:(day:number)=>boolean;onSelect:(day:number|null)=>void;onLesson:(slot:QuestSlot)=>void;loaded:boolean};
export default function ScrollableCourseMap({allowFuture=false,currentDay,selectedDay,slots,isDone,onSelect,onLesson,loaded}:Props){
 const [cardOpen,setCardOpen]=useState(true),[menuOpen,setMenuOpen]=useState(false);
 const viewport=useRef<HTMLDivElement>(null),initial=useRef(false);
 const {page,moveTo}=useMapDrag(viewport);
 const day=selectedDay??currentDay;
 const stage=stages.find(s=>day>=s.start&&day<=s.end)!;
 const stageIndex=stages.indexOf(stage);
 const completed=Array.from({length:stage.end-stage.start+1},(_,i)=>stage.start+i).filter(isDone).length;
 const active=slots.find(s=>s.state==='active')??slots.find(s=>s.state==='done');
 const jump=(n:number)=>moveTo(Math.floor((n-1)/10));
 useEffect(()=>{if(loaded&&!initial.current){initial.current=true;if(currentDay>10)requestAnimationFrame(()=>jump(currentDay));}},[loaded,currentDay]);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setCardOpen(false);setMenuOpen(false);}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
 function select(n:number){onSelect(n);setCardOpen(true);}
 return <main className="fantasy-map" aria-label="To‘liq yo‘l xaritasi">
 <div className="fantasy-controls">
 <header className="fantasy-toolbar">
 <button className="fantasy-glass fantasy-back" aria-label="Bugungi kunga qaytish" onClick={()=>{select(currentDay);jump(currentDay);}}><ArrowLeft/></button>
 <div className="fantasy-glass fantasy-progress"><h1>To‘liq yo‘l xaritasi</h1><p>Hozir: Kun {currentDay} · Bosqich {stageIndex+1} · {stage.title}</p><div><progress value={completed} max={stage.end-stage.start+1} aria-label="Bosqichdagi bajarilgan kunlar"/><span>{completed} / {stage.end-stage.start+1} kun</span></div></div>
 <div className="fantasy-glass fantasy-achievement"><Flame/><span><strong>{Array.from({length:182},(_,i)=>i+1).filter(isDone).length}</strong><small>bajarilgan kun</small></span></div>
 <button className="fantasy-glass fantasy-settings" aria-label="Bosqichlarni tanlash" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}><Settings/></button>
 {menuOpen&&<nav className="fantasy-stage-menu" aria-label="Bosqichlar">{stages.map((s,i)=><button key={s.start} onClick={()=>{setMenuOpen(false);jump(s.start);}}>{i+1}. {s.title}<small>{s.start}–{s.end} kun</small></button>)}</nav>}
 </header></div>
 <div className="fantasy-viewport" ref={viewport} tabIndex={0} aria-label="Xaritani yuqoriga yoki pastga suring">
 <div className="fantasy-world" style={{transform:`translate3d(0, -${page*100}%, 0)`}} data-map-page={page}>
 {!loaded?<p className="fantasy-loading" role="status">Xarita yuklanmoqda…</p>:Array.from({length:19},(_,group)=>{
 const first=group*10+1,last=Math.min(182,first+9),sceneStage=stages.find(s=>first>=s.start&&first<=s.end)!;
 return <section className="fantasy-scene" inert={group!==page} key={group} aria-label={`${first}–${last} kunlar`}>
 <div className="fantasy-wood fantasy-stage"><strong>BOSQICH {stages.indexOf(sceneStage)+1}</strong><span>{sceneStage.title.toUpperCase()}</span></div>
 {Array.from({length:last-first+1},(_,i)=>{const n=first+i,done=isDone(n),locked=!allowFuture&&n>currentDay&&!done;return <button key={n} id={`trail-day-${n}`} data-map-day={n} className="fantasy-node" data-state={done?'done':n===currentDay?'current':'future'} aria-current={n===currentDay?'step':undefined} aria-label={`${n}-kun${locked?', qulflangan':''}`} aria-disabled={locked} style={{left:`${positions[i][0]}%`,top:`${positions[i][1]}%`}} onClick={()=>{if(!locked)select(n);}}>
 {n===currentDay&&<span className="fantasy-here">Bugun shu yerda<ArrowDown/></span>}
 <span className="fantasy-disc">{locked?<><Lock/><small>{n}</small></>:n}</span>
 {n%7===0&&<span className="fantasy-reward" aria-hidden><img src="/xarita/sandiq.png" alt=""/></span>}
 </button>;})}
 {cardOpen&&day>=first&&day<=last&&<section className="fantasy-lesson-card" aria-label={`${day}-kun darslari`}>
 <header><Sun/><div><h2>Kun {day}</h2><p>{day===currentDay?'Bugun shu yerda':'Bilimlar sari sayohat'}</p></div><button aria-label="Dars oynasini yopish" onClick={()=>setCardOpen(false)}><X/></button></header>
 <div className="fantasy-lesson-body"><p className="fantasy-welcome">Keling, yangi bilimlar sari ilk qadamni birga tashlaymiz!</p>
 {slots.map((slot,i)=><button className="fantasy-lesson" key={slot.id} disabled={slot.state==='locked'} onClick={()=>onLesson(slot)} style={{'--lesson-color':['#16bd69','#8133ff','#ff9c00','#007aff','#ff2870'][i]} as CSSProperties}>
 <span className="fantasy-lesson-icon">{i===0||i===2?<BookOpen/>:i===1?'Aa':i===3?<Mic/>:'?'}</span><span><strong>{labels[i]}</strong><small>{slot.state==='done'?'Bajarildi · Takrorlash':descriptions[i]}</small></span>{slot.state==='done'?<Check/>:slot.state==='locked'?<Lock className="fantasy-lesson-lock"/>:<ChevronRight/>}
 </button>)}
 <button className="fantasy-start" disabled={!active} onClick={()=>active&&onLesson(active)}><Play fill="currentColor"/>{slots.every(s=>s.state==='done')?'Takrorlash':'Kunni boshlash'}<ArrowRight/></button>
 </div></section>}
 {[1,2].map(offset=>{const next=stages[stages.indexOf(sceneStage)+offset];return next?<button key={offset} className={`fantasy-distant-stage fantasy-distant-stage-${offset}`} onClick={()=>jump(next.start)} aria-label={`${stages.indexOf(next)+1}-bosqichni xaritada ko‘rish`}><strong>BOSQICH {stages.indexOf(next)+1}</strong><span>{next.title}</span>{!allowFuture&&next.start>currentDay&&<Lock/>}</button>:null;})}
 <div className="fantasy-wood fantasy-quote"><strong>Bilim</strong><span>yangi imkoniyatlar<br/>eshigini ochadi</span></div>
 <button className="fantasy-scroll-hint" onClick={()=>jump(Math.min(182,last+1))}><ArrowDown/><span>{last===182?'Sayohatning so‘nggi kuni':'Pastga suring'}<small>{last<182?'yana ko‘p kunlar sizni kutmoqda!':'182 kunlik bilim yo‘li'}</small></span></button>
 </section>;})}
 </div></div><nav className="fantasy-page-nav" aria-label="Xarita sahifalari"><button disabled={page===0} onClick={()=>moveTo(page-1)} aria-label="Oldingi 10 kun">↑</button><span aria-live="polite">{page*10+1}–{Math.min(182,page*10+10)} kun</span><button disabled={page===18} onClick={()=>moveTo(page+1)} aria-label="Keyingi 10 kun">↓</button></nav></main>;
}
