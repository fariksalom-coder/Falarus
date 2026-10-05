import {randomUUID} from 'node:crypto';
import type {Pool, PoolClient} from 'pg';
import type {DialogueAnswer, DialogueRound, Situation, SituationCatalog} from '../../shared/situations';

export class DialogueError extends Error {
  constructor(public status: number, message: string) {super(message);}
}
type State = {
  content: Situation; position: number; mistakes: number; finished: boolean; freePlay: boolean;
  options: {id: string; text: string; correct: boolean}[][];
  messages: DialogueRound['messages']; stars: number; earned: number;
  requests: Record<string, {position: number; optionId: string; correct: boolean}>;
};
function shuffledOptions(step: Situation['steps'][number]) {
  const options = [step.correct,...step.wrong].map((text,i)=>({id:randomUUID(),text,correct:i===0}));
  for (let i=options.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [options[i],options[j]]=[options[j],options[i]];
  }
  return options;
}
export class DialogueService {
  constructor(private database: Pool, private premium: (user: number) => Promise<boolean>) {}
  private async transaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.database.connect();
    try {await db.query('BEGIN'); const result = await fn(db); await db.query('COMMIT'); return result;}
    catch (error) {await db.query('ROLLBACK'); throw error;}
    finally {db.release();}
  }
  private view(row: {id: string; situation_id: string; state: State}): DialogueRound {
    const s = row.state, step = s.content.steps[s.position];
    return {id:row.id,situationId:row.situation_id,position:s.position,total:s.content.steps.length,mistakes:s.mistakes,finished:s.finished,stars:s.stars,earned:s.earned,messages:s.messages,
      question:s.finished ? null : {partnerRu:step.partnerRu,partnerUz:step.partnerUz,options:s.options[s.position].map(({id,text})=>({id,text}))}};
  }
  async catalog(user: number): Promise<SituationCatalog> {
    const [topics,situations,progress] = await Promise.all([
      this.database.query('SELECT metadata FROM dialogue_topics ORDER BY sort_order'),
      this.database.query('SELECT topic_id,content FROM dialogue_situations ORDER BY sort_order'),
      this.database.query('SELECT situation_id,stars FROM dialogue_progress WHERE user_id=$1',[user]),
    ]);
    return {topics:topics.rows.map(t=>({...t.metadata,situations:situations.rows.filter(s=>s.topic_id===t.metadata.id).map(s=>{const {steps,...meta}=s.content;return {...meta,steps:steps.map(()=>({}))};})})),completed:progress.rows.map(p=>p.situation_id),stars:progress.rows.reduce((n,p)=>n+p.stars,0)};
  }
  async start(user: number, situation: string, requestId: string): Promise<DialogueRound> {
    const premium = await this.premium(user);
    return this.transaction(async db => {
      const account = (await db.query('SELECT id,access_frozen_at FROM users WHERE id=$1 FOR UPDATE',[user])).rows[0];
      if (!account || account.access_frozen_at) throw new DialogueError(403,'Hisobga kirish cheklangan.');
      const previous = (await db.query('SELECT * FROM dialogue_sessions WHERE user_id=$1 AND request_id=$2',[user,requestId])).rows[0];
      if (previous) {
        if (previous.situation_id !== situation) throw new DialogueError(409,'So‘rov allaqachon ishlatilgan.');
        if (!previous.finished && !premium && !previous.state.freePlay) throw new DialogueError(402,'Davom etish uchun premium kerak.');
        return this.view(previous);
      }
      const content: Situation | undefined = (await db.query('SELECT content FROM dialogue_situations WHERE id=$1',[situation])).rows[0]?.content;
      if (!content) throw new DialogueError(404,'Vaziyat topilmadi.');
      const active = (await db.query('SELECT * FROM dialogue_sessions WHERE user_id=$1 AND situation_id=$2 AND NOT finished',[user,situation])).rows[0];
      if (active) {
        if (!premium && !active.state.freePlay) throw new DialogueError(402,'Davom etish uchun premium kerak.');
        return this.view(active);
      }
      if (!premium) {
        const used = Number((await db.query('SELECT count(*) FROM user_game_plays WHERE user_id=$1',[user])).rows[0].count);
        if (used >= 3) throw new DialogueError(402,'Bepul urinishlar tugadi. Premium sotib oling.');
        await db.query("INSERT INTO user_game_plays(user_id,game) VALUES($1,'dialogue')",[user]);
      }
      const state: State = {content,position:0,mistakes:0,finished:false,freePlay:!premium,messages:[],stars:0,earned:0,requests:{},options:content.steps.map(shuffledOptions)};
      const row = (await db.query('INSERT INTO dialogue_sessions(id,user_id,situation_id,request_id,state) VALUES($1,$2,$3,$4,$5) RETURNING *',[randomUUID(),user,situation,requestId,JSON.stringify(state)])).rows[0];
      return this.view(row);
    });
  }
  async answer(user: number, id: string, position: number, optionId: string, requestId: string): Promise<DialogueAnswer> {
    const premium = await this.premium(user);
    return this.transaction(async db => {
      const account = (await db.query('SELECT id,access_frozen_at FROM users WHERE id=$1 FOR UPDATE',[user])).rows[0];
      if (!account || account.access_frozen_at) throw new DialogueError(403,'Hisobga kirish cheklangan.');
      const row = (await db.query('SELECT * FROM dialogue_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,user])).rows[0];
      if (!row) throw new DialogueError(404,'Suhbat topilmadi.');
      const s: State = row.state;
      const old = s.requests[requestId];
      if (old) {
        if (old.position !== position || old.optionId !== optionId) throw new DialogueError(409,'So‘rov allaqachon ishlatilgan.');
        return this.result(db,user,row,old.correct);
      }
      if (!premium && !s.freePlay) throw new DialogueError(402,'Davom etish uchun premium kerak.');
      if (s.finished || position !== s.position) throw new DialogueError(409,'Savol o‘zgargan. Suhbatni qayta oching.');
      const option = s.options[position].find(o=>o.id===optionId);
      if (!option) throw new DialogueError(400,'Javobni tanlang.');
      const previouslyWrong = Object.values(s.requests).some(r=>r.position===position && r.optionId===optionId && !r.correct);
      if (!option.correct) {if (!previouslyWrong) s.mistakes++;}
      else {
        const step = s.content.steps[position];
        s.messages.push({from:'partner',ru:step.partnerRu,uz:step.partnerUz},{from:'me',ru:option.text,uz:step.correctUz});
        s.position++;
        if (s.position === s.content.steps.length) {
          s.finished = true; s.stars = s.mistakes===0 ? 3 : s.mistakes===1 ? 2 : 1;
          const previous = (await db.query('SELECT stars FROM dialogue_progress WHERE user_id=$1 AND situation_id=$2',[user,row.situation_id])).rows[0];
          s.earned = Math.max(0,s.stars-(previous?.stars||0));
          await db.query('INSERT INTO dialogue_progress(user_id,situation_id,stars,best_mistakes) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,situation_id) DO UPDATE SET stars=greatest(dialogue_progress.stars,excluded.stars),best_mistakes=least(dialogue_progress.best_mistakes,excluded.best_mistakes),attempts=dialogue_progress.attempts+1,completed_at=now()',[user,row.situation_id,s.stars,s.mistakes]);
        }
      }
      s.requests[requestId] = {position,optionId,correct:option.correct};
      await db.query('UPDATE dialogue_sessions SET state=$2,finished=$3,updated_at=now() WHERE id=$1',[id,JSON.stringify(s),s.finished]);
      return this.result(db,user,row,option.correct);
    });
  }
  private async result(db: PoolClient, user: number, row: any, correct: boolean): Promise<DialogueAnswer> {
    const result: DialogueAnswer = {correct,round:this.view(row)};
    if (row.state.finished) {
      const progress = (await db.query('SELECT situation_id,stars FROM dialogue_progress WHERE user_id=$1',[user])).rows;
      result.completed = progress.map(p=>p.situation_id); result.totalStars = progress.reduce((n,p)=>n+p.stars,0);
    }
    return result;
  }
}
