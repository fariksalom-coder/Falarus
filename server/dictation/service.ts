import {randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {pool} from '../lib/db';
import {dictationMistakes,dictationPoints,pickDictationItems,type DictationItem,type DictationFeedback,type DictationRound} from '../../shared/dictation';
export class DictationError extends Error {constructor(public status:number,message:string){super(message);}}
interface State {items:DictationItem[];answers:DictationFeedback[];lives:number;combo:number;best_combo:number;score:number;question_started:number;finished:boolean}
export class DictationService {
 constructor(private database:Pool=pool!){ }
 private async tx<T>(fn:(db:PoolClient)=>Promise<T>):Promise<T>{const db=await this.database.connect();try{await db.query('BEGIN');const r=await fn(db);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
 async topics(user:number){return (await this.database.query(`SELECT t.*,count(i.id)::int total_items,count(latest.is_correct)::int completed_items,count(i.id) FILTER(WHERE latest.is_correct)::int correct_items,count(i.id) FILTER(WHERE NOT latest.is_correct)::int wrong_items,coalesce(p.best_score,0) best_score,coalesce(p.best_combo,0) best_combo FROM dictation_topics t LEFT JOIN dictation_items i ON i.topic_id=t.id AND i.is_active AND i.audio_url IS NOT NULL LEFT JOIN LATERAL (SELECT a.is_correct FROM dictation_attempts a WHERE a.user_id=$1 AND a.item_id=i.id ORDER BY a.id DESC LIMIT 1) latest ON true LEFT JOIN dictation_progress p ON p.topic_id=t.id AND p.user_id=$1 WHERE t.is_active GROUP BY t.id,p.id ORDER BY t.sort_order`,[user])).rows;}

 private view(row:{id:string;topic_id:string;state:State}):DictationRound {
 const s=row.state,item=s.items[s.answers.length];return {id:row.id,topic_id:row.topic_id,position:s.answers.length,total:s.items.length,lives:s.lives,combo:s.combo,best_combo:s.best_combo,score:s.score,correct:s.answers.filter(a=>a.is_correct).length,wrong:s.answers.filter(a=>!a.is_correct).length,finished:s.finished,question:s.finished||!item?null:{id:item.id,type:item.type,audio_url:item.audio_url!,difficulty:item.difficulty},mistakes:s.answers.filter(a=>!a.is_correct).map(a=>a.correct_answer)};
 }
 async get(user:number,id:string){const row=(await this.database.query('SELECT * FROM dictation_sessions WHERE id=$1 AND user_id=$2',[id,user])).rows[0];if(!row)throw new DictationError(404,'Игра не найдена.');return this.view(row);}
 async start(user:number,topic:string,count:number,review:boolean,requestId:string){return this.tx(async db=>{
 // Serializes duplicate starts and progress changes for the same existing user.
 await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user]);
 const old=(await db.query('SELECT * FROM dictation_sessions WHERE user_id=$1 AND request_id=$2',[user,requestId])).rows[0];if(old)return this.view(old);
 const exists=(await db.query('SELECT id FROM dictation_topics WHERE id=$1 AND is_active',[topic])).rows[0];if(!exists)throw new DictationError(404,'Тема не найдена.');
 const all=(await db.query('SELECT * FROM dictation_items WHERE topic_id=$1 AND is_active AND audio_url IS NOT NULL',[topic])).rows as DictationItem[];
 const history=(await db.query(`SELECT item_id,count(*) FILTER(WHERE NOT is_correct)::int mistakes,(array_agg(is_correct ORDER BY id DESC))[1] latest_correct FROM dictation_attempts WHERE user_id=$1 GROUP BY item_id`,[user])).rows;
 const weights=new Map<string,number>(history.filter(h=>!h.latest_correct).map(h=>[h.item_id,h.mistakes]));
 const items=pickDictationItems(review?all.filter(i=>weights.has(i.id)):all,count,weights);
 if(!items.length)throw new DictationError(400,review?'Нет ошибок для повторения.':'Для этой темы ещё не подготовлены аудиозадания.');
 const state:State={items,answers:[],lives:3,combo:0,best_combo:0,score:0,question_started:Date.now(),finished:false};
 const row=(await db.query('INSERT INTO dictation_sessions(id,user_id,topic_id,request_id,state) VALUES($1,$2,$3,$4,$5) RETURNING *',[randomUUID(),user,topic,requestId,JSON.stringify(state)])).rows[0];return this.view(row);
 });}
 async answer(user:number,id:string,position:number,answer:string){return this.tx(async db=>{
 await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user]);
 const row=(await db.query('SELECT * FROM dictation_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,user])).rows[0];if(!row)throw new DictationError(404,'Игра не найдена.');
 const s:State=row.state;
 if(position<s.answers.length)return {feedback:s.answers[position],round:this.view(row)};
 if(s.finished||position!==s.answers.length)throw new DictationError(409,'Задание уже изменилось. Обновите игру.');
 const item=s.items[position],mistakes=dictationMistakes(answer,item.text,item.type),correct=mistakes===0;
 s.combo=correct?s.combo+1:0;s.best_combo=Math.max(s.best_combo,s.combo);if(!correct)s.lives--;
 const points=correct?dictationPoints(item.type,s.combo):0;s.score+=points;
 const feedback:DictationFeedback={position,is_correct:correct,correct_answer:item.text,translation_uz:item.translation_uz,user_answer:answer,mistake_count:mistakes,points,audio_url:item.audio_url!};
 await db.query(`INSERT INTO dictation_attempts(user_id,item_id,session_id,position,user_answer,correct_answer,is_correct,mistake_count,response_time_ms) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[user,item.id,id,position,answer,item.text,correct,mistakes,Math.min(2147483647,Math.max(0,Date.now()-s.question_started))]);
 s.answers.push(feedback);s.finished=s.lives===0||s.answers.length===s.items.length;s.question_started=Date.now();
 await db.query('UPDATE dictation_sessions SET state=$2,updated_at=now() WHERE id=$1',[id,JSON.stringify(s)]);
 await db.query(`INSERT INTO dictation_progress(user_id,topic_id,completed_items,correct_items,wrong_items,best_score,best_combo) SELECT $1,$2,count(*)::int,count(*) FILTER(WHERE is_correct)::int,count(*) FILTER(WHERE NOT is_correct)::int,$3,$4 FROM (SELECT DISTINCT ON(a.item_id) a.item_id,a.is_correct FROM dictation_attempts a JOIN dictation_items i ON i.id=a.item_id WHERE a.user_id=$1 AND i.topic_id=$2 AND i.is_active AND i.audio_url IS NOT NULL ORDER BY a.item_id,a.id DESC) latest ON CONFLICT(user_id,topic_id) DO UPDATE SET completed_items=excluded.completed_items,correct_items=excluded.correct_items,wrong_items=excluded.wrong_items,best_score=greatest(dictation_progress.best_score,excluded.best_score),best_combo=greatest(dictation_progress.best_combo,excluded.best_combo),last_played_at=now(),updated_at=now()`,[user,row.topic_id,s.score,s.best_combo]);
 return {feedback,round:this.view(row)};
 });}
}
export const dictation=new DictationService();
