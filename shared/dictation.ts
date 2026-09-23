export type DictationType = 'word' | 'sentence';
export interface DictationTopic { id:string;title_ru:string;title_uz:string;icon:string;description_ru:string;description_uz:string;background_id:string;sort_order:number;is_active:boolean;total_items:number;completed_items:number;correct_items:number;wrong_items:number;best_score:number;best_combo:number }
export interface DictationItem { id:string;topic_id:string;type:DictationType;text:string;translation_uz:string;audio_url:string|null;difficulty:number;sort_order:number;is_active:boolean }
export interface DictationQuestion { id:string;type:DictationType;audio_url:string;difficulty:number }
export interface DictationFeedback { position:number;is_correct:boolean;correct_answer:string;translation_uz:string;user_answer:string;mistake_count:number;points:number;audio_url:string }
export interface DictationRound { id:string;topic_id:string;position:number;total:number;lives:number;combo:number;best_combo:number;score:number;correct:number;wrong:number;finished:boolean;question:DictationQuestion|null;mistakes:string[] }
export function normalizeDictation(text:string,type:DictationType):string {
 const value=text.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru');
 return type==='sentence'?value.replace(/\.$/,'').trim():value;
}
export function dictationMistakes(answer:string,expected:string,type:DictationType):number {
 const a=Array.from(normalizeDictation(answer,type)),b=Array.from(normalizeDictation(expected,type));
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=0;i<a.length;i++){const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+(a[i]===b[j]?0:1)));row=next;}
 return row[b.length];
}
export function dictationPoints(type:DictationType,combo:number):number {return (type==='word'?10:15)+Math.min(Math.max(combo-1,0),10)*2;}
/** Weighted sampling without replacement; only unresolved mistakes carry extra weight. */
export function pickDictationItems<T extends {id:string}>(items:T[],count:number,mistakes:Map<string,number>,random=Math.random):T[]{
 return items.map(item=>({item,key:-Math.log(Math.max(Number.EPSILON,random()))/(1+Math.min(mistakes.get(item.id)||0,5)*2)})).sort((a,b)=>a.key-b.key).slice(0,count).map(x=>x.item);
}
