import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {pool} from '../lib/db';
import {normalizeDictation} from '../../shared/dictation';
export function validateContent(data:any){
 if(!Array.isArray(data.topics)||!data.topics.length)throw Error('No topics');
 const keys=new Set<string>();let total=0;
 for(const topic of data.topics){if(!/^[a-z0-9_-]+$/.test(topic.key)||keys.has(topic.key))throw Error('Invalid/duplicate topic key');keys.add(topic.key);
 if(!topic.title_ru||!topic.title_uz||!topic.icon||!topic.description_ru||!topic.description_uz||!Array.isArray(topic.items))throw Error('Incomplete topic');
 const seen=new Set<string>();for(const item of topic.items){if(!['word','sentence'].includes(item.type)||typeof item.text!=='string'||!/[а-яё]/i.test(item.text)||item.text.length>200||!item.translation_uz||/[а-яё]/i.test(item.translation_uz)||!Number.isInteger(item.difficulty)||item.difficulty<1||item.difficulty>5)throw Error('Invalid item '+JSON.stringify(item));const key=item.type+':'+normalizeDictation(item.text,item.type);if(seen.has(key))throw Error('Duplicate '+key);seen.add(key);total++;}
 }return {topics:keys.size,items:total};
}
async function main(){
 const filename=process.argv.find(a=>a.startsWith('--file='))?.slice(7)||'content/dictation/dictation_content.json';const data=JSON.parse(await readFile(filename,'utf8'));console.log(validateContent(data));
 if(process.argv.includes('--validate'))return;
 if(!pool)throw Error('DATABASE_URL is required');const client=await pool.connect();
 try{await client.query('BEGIN');for(const t of data.topics){await client.query(`INSERT INTO dictation_topics(id,title_ru,title_uz,icon,description_ru,description_uz,background_id,sort_order,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING`,[t.key,t.title_ru,t.title_uz,t.icon,t.description_ru,t.description_uz,t.background_id||'city',t.sort_order,t.is_active!==false]);let n=0;for(const i of t.items){n++;await client.query(`INSERT INTO dictation_items(id,topic_id,type,text,translation_uz,difficulty,sort_order,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,true) ON CONFLICT(id) DO NOTHING`,[`${t.key}-${String(n).padStart(3,'0')}`,t.key,i.type,i.text,i.translation_uz,i.difficulty,n]);}}await client.query('COMMIT');console.log('Seed complete; existing admin edits preserved.');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
if(process.argv[1]?.endsWith('seedDictation.ts'))main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool?.end());
