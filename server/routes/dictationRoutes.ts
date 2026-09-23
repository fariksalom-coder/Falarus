import type {Pool} from 'pg';
import {Router,type RequestHandler} from 'express';
import multer from 'multer';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pool} from '../lib/db';
import {dictation,DictationError,type DictationService} from '../dictation/service';
const run=(fn:Function):RequestHandler=>(req,res,next)=>{Promise.resolve(fn(req,res)).catch(next);};
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
const key=(v:unknown)=>typeof v==='string'&&/^[a-z0-9][a-z0-9_-]{0,79}$/.test(v);
const fail=(message:string)=>{throw new DictationError(400,message);};
const errors=(err:any,_req:any,res:any,_next:any)=>{console.error('[dictation]',err.message);res.status(err instanceof DictationError?err.status:err instanceof multer.MulterError?400:500).json({error:err instanceof DictationError?err.message:'Не удалось выполнить действие.'});};
export function createDictationRoutes(authenticate:RequestHandler,service:DictationService=dictation){
 const r=Router();r.use(authenticate);r.use((_q,s,n)=>{s.setHeader('Cache-Control','no-store');n();});
 r.get('/topics',run(async(req,res)=>res.json(await service.topics(req.userId))));
 r.post('/sessions',run(async(req,res)=>{const {topic_id,count=10,review=false,request_id}=req.body||{};if(!key(topic_id)||![10,20,50].includes(count)||typeof review!=='boolean'||!uuid(request_id))fail('Некорректные настройки игры.');res.status(201).json(await service.start(req.userId,topic_id,count,review,request_id));}));
 r.get('/sessions/:id',run(async(req,res)=>{if(!uuid(req.params.id))fail('Некорректный ID.');res.json(await service.get(req.userId,req.params.id));}));
 r.post('/sessions/:id/answer',run(async(req,res)=>{const {position,answer}=req.body||{};if(!uuid(req.params.id)||!Number.isInteger(position)||position<0||typeof answer!=='string'||!answer.trim()||answer.length>300)fail('Введите ответ длиной до 300 символов.');res.json(await service.answer(req.userId,req.params.id,position,answer));}));
 r.use(errors);return r;
}
const text=(v:unknown,max=200)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail('Заполните текстовые поля.');return (v as string).trim();};
export function createAdminDictationRoutes(database:Pool=pool!){
 const r=Router();const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
 r.get('/topics',run(async(_req,res)=>res.json((await database.query(`SELECT t.*,count(i.id)::int total_items,count(i.id) FILTER(WHERE i.audio_url IS NOT NULL)::int audio_count FROM dictation_topics t LEFT JOIN dictation_items i ON i.topic_id=t.id GROUP BY t.id ORDER BY t.sort_order`)).rows)));
 r.post('/topics',run(async(req,res)=>{const b=req.body;if(!key(b.id)||typeof b.is_active!=='boolean'||!Number.isInteger(b.sort_order))fail('Проверьте ID и порядок темы.');const vals=[b.id,text(b.title_ru),text(b.title_uz),text(b.icon,20),text(b.description_ru,500),text(b.description_uz,500),text(b.background_id,40),b.sort_order,b.is_active];res.json((await database.query(`INSERT INTO dictation_topics(id,title_ru,title_uz,icon,description_ru,description_uz,background_id,sort_order,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET title_ru=excluded.title_ru,title_uz=excluded.title_uz,icon=excluded.icon,description_ru=excluded.description_ru,description_uz=excluded.description_uz,background_id=excluded.background_id,sort_order=excluded.sort_order,is_active=excluded.is_active RETURNING *`,vals)).rows[0]);}));
 r.get('/items',run(async(req,res)=>{if(!key(req.query.topic))fail('Выберите тему.');res.json((await database.query(`SELECT i.*,count(a.id)::int attempts,count(a.id) FILTER(WHERE NOT a.is_correct)::int errors FROM dictation_items i LEFT JOIN dictation_attempts a ON a.item_id=i.id WHERE i.topic_id=$1 GROUP BY i.id ORDER BY i.sort_order,i.id`,[req.query.topic])).rows);}));
 r.post('/items',run(async(req,res)=>{const b=req.body;if(!key(b.topic_id)||!['word','sentence'].includes(b.type)||!Number.isInteger(b.difficulty)||b.difficulty<1||b.difficulty>5||!Number.isInteger(b.sort_order)||typeof b.is_active!=='boolean')fail('Проверьте поля задания.');const id=b.id||`item-${randomUUID()}`;if(!key(id))fail('Некорректный ID.');res.json((await database.query(`INSERT INTO dictation_items(id,topic_id,type,text,translation_uz,difficulty,sort_order,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET topic_id=excluded.topic_id,type=excluded.type,text=excluded.text,translation_uz=excluded.translation_uz,difficulty=excluded.difficulty,sort_order=excluded.sort_order,is_active=excluded.is_active,audio_url=CASE WHEN dictation_items.text=excluded.text THEN dictation_items.audio_url ELSE NULL END RETURNING *`,[id,b.topic_id,b.type,text(b.text),text(b.translation_uz,500),b.difficulty,b.sort_order,b.is_active])).rows[0]);}));
 r.post('/items/:id/audio',upload.single('audio'),run(async(req,res)=>{
 if(!key(req.params.id)||!req.file)fail('Выберите MP3.');const item=(await database.query('SELECT id FROM dictation_items WHERE id=$1',[req.params.id])).rows[0];if(!item)throw new DictationError(404,'Задание не найдено.');
 const dir=path.resolve('uploads/dictation',item.id);await fs.mkdir(dir,{recursive:true});const name=randomUUID()+'.mp3',file=path.join(dir,name);
 try{await fs.writeFile(file,req.file.buffer);const {stdout}=await promisify(execFile)('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,codec_type','-of','json',file],{timeout:10000});const info=JSON.parse(stdout);if(!info.streams?.some((s:any)=>s.codec_name==='mp3')||info.streams.some((s:any)=>s.codec_type==='video')||!(Number(info.format?.duration)>0&&Number(info.format.duration)<=60))fail('Нужен MP3 длительностью до 60 секунд.');const url=`/uploads/dictation/${item.id}/${name}`;await database.query('UPDATE dictation_items SET audio_url=$2 WHERE id=$1',[item.id,url]);res.json({audio_url:url});}catch(e){await fs.unlink(file).catch(()=>{});throw e;}
 }));r.use(errors);return r;
}
